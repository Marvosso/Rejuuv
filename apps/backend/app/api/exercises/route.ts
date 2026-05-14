import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';
import { enforceRateLimit } from '../../../lib/rate-limit';
import {
  apiFailure,
  API_ERROR_CODES,
  apiFailureFromException,
  logApiRouteFailure,
} from '../../../lib/api-errors';

/**
 * GET /api/exercises
 * Catalog rows for plan screens. Optional: body_area, phase (1–3).
 */
export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'GET /exercises');
    if (!limited.ok) {
      return limited.response;
    }

    const { searchParams } = new URL(request.url);
    const body_area = searchParams.get('body_area');
    const phaseParam = searchParams.get('phase');

    let query = supabase
      .from('exercises')
      .select('id, exercise_key, name, phase, body_area, video_url, sets_reps, why_this_helps')
      .order('phase', { ascending: true })
      .order('name', { ascending: true });

    if (body_area) {
      query = query.or(`body_area.eq.${body_area},body_area.is.null`);
    }

    if (phaseParam) {
      const phase = parseInt(phaseParam, 10);
      if (phase >= 1 && phase <= 3) {
        query = query.eq('phase', phase);
      }
    }

    const { data: rows, error } = await query;

    if (error) {
      logApiRouteFailure('GET /api/exercises', new Error(error.message), {
        supabase_code: error.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to fetch exercises. Please try again.',
        500,
        true
      );
    }

    return NextResponse.json({ exercises: rows ?? [] }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('GET /api/exercises', error);
  }
}
