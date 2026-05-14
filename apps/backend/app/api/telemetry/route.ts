import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '../../../lib/auth';
import { enforceRateLimit } from '../../../lib/rate-limit';
import {
  CLIENT_TELEMETRY_EVENTS,
  trackTelemetry,
  type TelemetryEventName,
} from '../../../lib/telemetry';
import { apiFailure, API_ERROR_CODES, apiFailureFromException, logApiRouteFailure } from '../../../lib/api-errors';

/**
 * Authenticated client-side funnel / UX signals (allowlisted only).
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(userId, 'POST /telemetry');
    if (!limited.ok) {
      return limited.response;
    }

    const body = await request.json().catch(() => ({}));
    const event = typeof body.event === 'string' ? body.event : '';
    const properties =
      body.properties && typeof body.properties === 'object' && !Array.isArray(body.properties)
        ? (body.properties as Record<string, unknown>)
        : {};

    if (!CLIENT_TELEMETRY_EVENTS.has(event)) {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'Unknown or disallowed event',
        400,
        true
      );
    }

    trackTelemetry(userId, event as TelemetryEventName, properties, 'client');

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    logApiRouteFailure('POST /api/telemetry', e);
    return apiFailure(API_ERROR_CODES.BAD_REQUEST, 'Bad request', 400, true);
  }
}
