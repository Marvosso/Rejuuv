import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import { getContinuitySnapshot } from '../../../../lib/continuity-metrics';
import {
  apiFailure,
  API_ERROR_CODES,
  apiFailureFromException,
  logApiRouteFailure,
} from '../../../../lib/api-errors';

/**
 * Lightweight continuity metrics for the app (no free-text, no Stripe IDs).
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(userId, 'GET /me/continuity-snapshot');
    if (!limited.ok) {
      return limited.response;
    }

    const snapshot = await getContinuitySnapshot(userId);
    return NextResponse.json(snapshot, { status: 200 });
  } catch (e) {
    logApiRouteFailure('GET /api/me/continuity-snapshot', e);
    return apiFailure(
      API_ERROR_CODES.INTERNAL_ERROR,
      'Failed to load snapshot. Please try again.',
      500,
      true
    );
  }
}
