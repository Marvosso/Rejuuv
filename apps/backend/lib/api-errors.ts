import { NextResponse } from 'next/server';
import { log } from './logger';

/** Machine-readable codes for clients and support (stable strings). */
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CONFIG_ERROR: 'CONFIG_ERROR',
  CONFIRM_REQUIRED: 'CONFIRM_REQUIRED',
  PRO_REQUIRED: 'PRO_REQUIRED',
  STRIPE_ERROR: 'STRIPE_ERROR',
  WEBHOOK_ERROR: 'WEBHOOK_ERROR',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
} as const;

export type StandardApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    /** Hint for clients when rate limited (seconds). */
    retry_after_sec?: number;
  };
};

function defaultRecoverable(status: number): boolean {
  return status === 400 || status === 408 || status === 409 || status === 413 || status === 429 || status === 502;
}

export type ApiFailureExtras = {
  retry_after_sec?: number;
};

/**
 * Standard JSON error for API routes. Never put secrets, stack traces, prompts, or clinical text here.
 */
export function apiFailure(
  code: string,
  message: string,
  status: number,
  recoverable?: boolean,
  extras?: ApiFailureExtras
): NextResponse<StandardApiErrorBody> {
  const rec = recoverable ?? defaultRecoverable(status);
  const err: StandardApiErrorBody['error'] = {
    code,
    message,
    recoverable: rec,
    ...(extras?.retry_after_sec != null ? { retry_after_sec: extras.retry_after_sec } : {}),
  };
  return NextResponse.json({ success: false, error: err }, { status });
}

/**
 * Structured server log for failed requests. Does not log request bodies.
 */
export function logApiRouteFailure(
  route: string,
  err: unknown,
  meta?: Record<string, unknown>
): void {
  const errMessage = err instanceof Error ? err.message : String(err);
  log.error('api-route', 'handler_failed', {
    route,
    err_type: err instanceof Error ? err.name : typeof err,
    err_message: errMessage.slice(0, 500),
    ...meta,
  });
}

/**
 * Logs and returns a safe error response (never forwards raw `Error.message` to the client).
 */
export function apiFailureFromException(
  route: string,
  err: unknown,
  status: number = 500
): NextResponse<StandardApiErrorBody> {
  logApiRouteFailure(route, err);
  const recoverable = status === 502 || status === 503;
  const code =
    status === 503 ? API_ERROR_CODES.SERVICE_UNAVAILABLE : API_ERROR_CODES.INTERNAL_ERROR;
  return apiFailure(
    code,
    'Something went wrong. Please try again.',
    status,
    recoverable
  );
}

function inferCodeFromStatus(status: number, explicit?: string): string {
  if (explicit) return explicit;
  switch (status) {
    case 401:
      return API_ERROR_CODES.UNAUTHORIZED;
    case 403:
      return API_ERROR_CODES.FORBIDDEN;
    case 404:
      return API_ERROR_CODES.NOT_FOUND;
    case 409:
      return API_ERROR_CODES.CONFLICT;
    case 413:
      return API_ERROR_CODES.PAYLOAD_TOO_LARGE;
    case 429:
      return API_ERROR_CODES.RATE_LIMITED;
    case 502:
    case 503:
      return API_ERROR_CODES.SERVICE_UNAVAILABLE;
    case 500:
      return API_ERROR_CODES.INTERNAL_ERROR;
    default:
      return API_ERROR_CODES.BAD_REQUEST;
  }
}

/**
 * Legacy helper — prefer {@link apiFailure}. Emits the same wire shape as {@link apiFailure}.
 */
export function jsonError(
  message: string,
  status: number,
  code?: string
): NextResponse<StandardApiErrorBody> {
  const resolved = inferCodeFromStatus(status, code);
  const recoverable =
    code === API_ERROR_CODES.CONFIRM_REQUIRED
      ? true
      : defaultRecoverable(status) || status === 502;
  return apiFailure(resolved, message, status, recoverable);
}
