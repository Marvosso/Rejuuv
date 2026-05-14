import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import {
  buildTimelineEntries,
  type CheckInTimelineRow,
  type AdaptationEventRow,
} from '../../../../lib/recovery-timeline';
import { TELEMETRY_EVENTS, trackTelemetry } from '../../../../lib/telemetry';
import {
  apiFailure,
  API_ERROR_CODES,
  apiFailureFromException,
  logApiRouteFailure,
} from '../../../../lib/api-errors';

export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'GET /recovery/timeline');
    if (!limited.ok) {
      return limited.response;
    }

    const url = new URL(request.url);
    const engage = url.searchParams.get('engage') === '1';

    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [{ data: checkIns, error: ciErr }, { data: adaptations, error: adErr }] =
      await Promise.all([
        supabase
          .from('check_ins')
          .select(
            'id, pain_level, pain_change, difficulty, recovery_plan_id, created_at, adjustments'
          )
          .eq('user_id', user_id)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('adaptation_events')
          .select('id, recovery_plan_id, check_in_id, event_type, detail, created_at')
          .eq('user_id', user_id)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true }),
      ]);

    if (ciErr) {
      logApiRouteFailure('GET /api/recovery/timeline', new Error(ciErr.message), {
        supabase_code: ciErr.code,
        step: 'check_ins',
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to load timeline. Please try again.',
        500,
        true
      );
    }
    if (adErr) {
      logApiRouteFailure('GET /api/recovery/timeline', new Error(adErr.message), {
        supabase_code: adErr.code,
        step: 'adaptation_events',
      });
    }

    const rows = (checkIns ?? []) as CheckInTimelineRow[];
    const adapts = (adErr ? [] : adaptations ?? []) as AdaptationEventRow[];

    const entries = buildTimelineEntries(rows, adapts);

    if (engage) {
      trackTelemetry(user_id, TELEMETRY_EVENTS.TIMELINE_DATA_LOADED, {
        check_in_count: rows.length,
        adaptation_count: adapts.length,
        window_days: 90,
      });
    }

    const painSeries = rows
      .filter((r) => r.pain_level != null)
      .map((r) => ({
        at: r.created_at,
        pain_level: r.pain_level as number,
        id: r.id,
      }));

    const dateSet = new Set<string>();
    const utcDayKey = (iso: string) => {
      const d = new Date(iso);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };
    for (const r of rows) {
      dateSet.add(utcDayKey(r.created_at));
    }
    let streakDays = 0;
    const now = new Date();
    const todayKey = utcDayKey(now.toISOString());
    const yest = new Date(now);
    yest.setUTCDate(yest.getUTCDate() - 1);
    const yesterdayKey = utcDayKey(yest.toISOString());
    if (dateSet.has(todayKey) || dateSet.has(yesterdayKey)) {
      const cursor = new Date(now);
      cursor.setUTCHours(0, 0, 0, 0);
      if (!dateSet.has(todayKey)) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
      for (;;) {
        const k = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`;
        if (!dateSet.has(k)) break;
        streakDays++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
    }

    const levelsWithData = rows.filter((r) => r.pain_level !== null);
    const avgPain =
      levelsWithData.length > 0
        ? Math.round(
            (levelsWithData.reduce((sum, r) => sum + (r.pain_level ?? 0), 0) / levelsWithData.length) *
              10
          ) / 10
        : null;

    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (levelsWithData.length >= 4) {
      const mid = Math.floor(levelsWithData.length / 2);
      const firstHalf = levelsWithData.slice(0, mid);
      const secondHalf = levelsWithData.slice(mid);
      const firstAvg =
        firstHalf.reduce((s, r) => s + (r.pain_level ?? 0), 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((s, r) => s + (r.pain_level ?? 0), 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      if (diff < -0.5) trend = 'improving';
      else if (diff > 0.5) trend = 'worsening';
    }

    const byPlan: Record<string, typeof rows> = {};
    for (const row of rows) {
      const key = row.recovery_plan_id ?? 'unknown';
      if (!byPlan[key]) byPlan[key] = [];
      byPlan[key].push(row);
    }

    return NextResponse.json(
      {
        entries,
        pain_series: painSeries,
        checkIns: rows,
        by_plan: byPlan,
        summary: {
          total: rows.length,
          avg_pain: avgPain,
          trend,
          streak_days: streakDays,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return apiFailureFromException('GET /api/recovery/timeline', error);
  }
}
