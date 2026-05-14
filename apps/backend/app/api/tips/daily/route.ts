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

/**
 * GET /api/tips/daily
 * Returns one "today's tip" for the authenticated user.
 * Optional query: body_area to get a tip for a specific area.
 */
export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'GET /tips/daily');
    if (!limited.ok) {
      return limited.response;
    }

    const { searchParams } = new URL(request.url);
    const body_area = searchParams.get('body_area') || null;

    const dayIndex = Math.floor((Date.now() / 86400000) % 7);

    let query = supabase
      .from('daily_tips')
      .select('id, tip_text, body_area, day_index')
      .eq('day_index', dayIndex);

    if (body_area) {
      query = query.or(`body_area.eq.${body_area},body_area.is.null`);
    } else {
      query = query.is('body_area', null);
    }

    const { data: rows, error } = await query.order('body_area', { ascending: false }).limit(1);

    if (error) {
      logApiRouteFailure('GET /api/tips/daily', new Error(error.message), {
        supabase_code: error.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to fetch daily tip. Please try again.',
        500,
        true
      );
    }

    const tip = rows?.[0] ?? null;
    return NextResponse.json({ tip: tip?.tip_text ?? null, id: tip?.id ?? null }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('GET /api/tips/daily', error);
  }
}
