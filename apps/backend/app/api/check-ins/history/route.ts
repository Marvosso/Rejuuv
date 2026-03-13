import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';

export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the last 90 days of check-ins for this user
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const { data: checkIns, error } = await supabase
      .from('check_ins')
      .select('id, pain_level, pain_change, difficulty, recovery_plan_id, created_at')
      .eq('user_id', user_id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch check-in history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch check-in history' },
        { status: 500 }
      );
    }

    const rows = checkIns ?? [];

    // Compute streak: consecutive days (by date) with at least one check-in, ending today or yesterday
    const dateSet = new Set<string>();
    for (const r of rows) {
      const d = new Date(r.created_at);
      dateSet.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
    }
    let streakDays = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      if (dateSet.has(key)) {
        streakDays++;
      } else {
        break;
      }
    }

    // Compute summary stats
    const total = rows.length;
    const levelsWithData = rows.filter((r) => r.pain_level !== null);
    const avgPain =
      levelsWithData.length > 0
        ? Math.round(
            (levelsWithData.reduce((sum, r) => sum + (r.pain_level ?? 0), 0) /
              levelsWithData.length) *
              10
          ) / 10
        : null;

    // Trend: compare first half avg vs second half avg
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

    // Build per-plan grouped data so the client can filter by area
    const byPlan: Record<string, typeof rows> = {};
    for (const row of rows) {
      const key = row.recovery_plan_id ?? 'unknown';
      if (!byPlan[key]) byPlan[key] = [];
      byPlan[key].push(row);
    }

    return NextResponse.json(
      {
        checkIns: rows,
        summary: { total, avg_pain: avgPain, trend, streak_days: streakDays },
        by_plan: byPlan,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/check-ins/history:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
