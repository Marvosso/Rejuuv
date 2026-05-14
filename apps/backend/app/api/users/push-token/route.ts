import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import {
  apiFailure,
  API_ERROR_CODES,
  apiFailureFromException,
  logApiRouteFailure,
} from '../../../../lib/api-errors';

/**
 * POST /api/users/push-token
 * Register or update the Expo push token for the authenticated user.
 * Body: { token: string }
 */
export async function POST(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const body = await request.json();
    const token = body?.token;
    if (!token || typeof token !== 'string') {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'Missing or invalid token in body',
        400,
        true
      );
    }

    const { error } = await supabase.from('push_tokens').upsert(
      { user_id, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

    if (error) {
      logApiRouteFailure('POST /api/users/push-token', new Error(error.message), {
        supabase_code: error.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to save push token. Please try again.',
        500,
        true
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('POST /api/users/push-token', error);
  }
}
