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
 * GET /api/exercise-videos
 * Returns exercise form-check videos. Optional query: body_area to filter.
 */
export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'GET /exercise-videos');
    if (!limited.ok) {
      return limited.response;
    }

    const { searchParams } = new URL(request.url);
    const body_area = searchParams.get('body_area') || null;

    let query = supabase
      .from('exercise_videos')
      .select('id, exercise_key, body_area, video_url, duration_sec');

    if (body_area) {
      query = query.or(`body_area.eq.${body_area},body_area.is.null`);
    }

    const { data: rows, error } = await query.order('exercise_key');

    if (error) {
      logApiRouteFailure('GET /api/exercise-videos', new Error(error.message), {
        supabase_code: error.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to fetch exercise videos. Please try again.',
        500,
        true
      );
    }

    return NextResponse.json({ videos: rows ?? [] }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('GET /api/exercise-videos', error);
  }
}
