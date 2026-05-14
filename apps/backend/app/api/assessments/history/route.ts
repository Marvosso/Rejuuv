import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { enforceRateLimit } from '../../../../lib/rate-limit';
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

    const limited = await enforceRateLimit(user_id, 'GET /assessments/history');
    if (!limited.ok) {
      return limited.response;
    }

    const { data: assessments, error } = await supabase
      .from('assessments')
      .select('id, body_area, intake_data, analysis_result, safety_flagged, created_at')
      .eq('user_id', user_id)
      .eq('safety_flagged', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logApiRouteFailure('GET /api/assessments/history', new Error(error.message), {
        supabase_code: error.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to fetch assessment history. Please try again.',
        500,
        true
      );
    }

    const byArea: Record<
      string,
      {
        body_area: string;
        latest_pain_level: number | null;
        latest_date: string;
        history: Array<{ id: string; pain_level: number | null; date: string }>;
      }
    > = {};

    for (const row of assessments ?? []) {
      let painLevel: number | null = null;
      try {
        const intake = JSON.parse(row.intake_data);
        painLevel = typeof intake.pain_level === 'number' ? intake.pain_level : null;
      } catch {
        // ignore parse errors
      }

      const area = row.body_area;
      if (!byArea[area]) {
        byArea[area] = {
          body_area: area,
          latest_pain_level: painLevel,
          latest_date: row.created_at,
          history: [],
        };
      }

      byArea[area].history.push({
        id: row.id,
        pain_level: painLevel,
        date: row.created_at,
      });
    }

    return NextResponse.json({ areas: Object.values(byArea) }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('GET /api/assessments/history', error);
  }
}
