import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { apiFailure, API_ERROR_CODES, apiFailureFromException, logApiRouteFailure } from '../../../lib/api-errors';

export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'GET /plans');
    if (!limited.ok) {
      return limited.response;
    }

    const { data: plans, error } = await supabase
      .from('recovery_plans')
      .select('id, body_area, phase, status, created_at, plan_data, assessment_id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      logApiRouteFailure('GET /api/plans', new Error(error.message), { supabase_code: error.code });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to fetch recovery plans. Please try again.',
        500,
        true
      );
    }

    return NextResponse.json({ plans: plans ?? [] }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('GET /api/plans', error);
  }
}
