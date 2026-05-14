import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { supabase } from './db';
import { log } from './logger';
import { apiFailure, API_ERROR_CODES } from './api-errors';

export type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const n = raw != null && raw !== '' ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

/** Seconds remaining in current UTC minute (for client retry hints). */
function secondsUntilNextUtcMinute(): number {
  const s = new Date().getUTCSeconds();
  return Math.max(1, 60 - s);
}

type UserRlEntry = { env: string; default: number; min: number; max: number };

/** Per-user limits (requests per rolling UTC minute bucket). Tune via env for beta. */
const USER_RATE_LIMITS: Record<string, UserRlEntry> = {
  'POST /assessments': { env: 'REJUUV_RL_ASSESSMENTS_PER_MIN', default: 8, min: 1, max: 120 },
  'POST /recovery-plans': { env: 'REJUUV_RL_RECOVERY_PLANS_PER_MIN', default: 6, min: 1, max: 80 },
  'POST /check-ins': { env: 'REJUUV_RL_CHECK_INS_PER_MIN', default: 30, min: 5, max: 400 },
  'POST /telemetry': { env: 'REJUUV_RL_TELEMETRY_PER_MIN', default: 120, min: 10, max: 600 },
  'GET /tips/daily': { env: 'REJUUV_RL_TIPS_DAILY_PER_MIN', default: 60, min: 10, max: 400 },
  'GET /plans': { env: 'REJUUV_RL_PLANS_LIST_PER_MIN', default: 90, min: 10, max: 400 },
  'GET /plans/detail': { env: 'REJUUV_RL_PLAN_DETAIL_PER_MIN', default: 120, min: 10, max: 500 },
  'GET /exercises': { env: 'REJUUV_RL_EXERCISES_PER_MIN', default: 60, min: 10, max: 400 },
  'GET /exercise-videos': { env: 'REJUUV_RL_EXERCISE_VIDEOS_PER_MIN', default: 60, min: 10, max: 400 },
  'GET /assessments/history': {
    env: 'REJUUV_RL_ASSESSMENTS_HISTORY_PER_MIN',
    default: 60,
    min: 10,
    max: 300,
  },
  'GET /check-ins/history': {
    env: 'REJUUV_RL_CHECK_INS_HISTORY_PER_MIN',
    default: 60,
    min: 10,
    max: 300,
  },
  'GET /recovery/timeline': {
    env: 'REJUUV_RL_RECOVERY_TIMELINE_PER_MIN',
    default: 60,
    min: 10,
    max: 300,
  },
  'GET /me/continuity-snapshot': {
    env: 'REJUUV_RL_CONTINUITY_SNAPSHOT_PER_MIN',
    default: 90,
    min: 10,
    max: 400,
  },
  'DELETE /plans/detail': { env: 'REJUUV_RL_PLAN_DELETE_PER_MIN', default: 30, min: 5, max: 120 },
  'POST /subscriptions/checkout': {
    env: 'REJUUV_RL_SUBSCRIPTIONS_CHECKOUT_PER_MIN',
    default: 12,
    min: 2,
    max: 60,
  },
  'POST /stripe/checkout': { env: 'REJUUV_RL_STRIPE_CHECKOUT_PER_MIN', default: 10, min: 2, max: 40 },
  'delete-account': { env: 'REJUUV_RL_DELETE_ACCOUNT_PER_MIN', default: 3, min: 1, max: 20 },
};

const IP_RATE_LIMITS: Record<string, UserRlEntry> = {
  'GET /api/body-areas': { env: 'REJUUV_RL_IP_BODY_AREAS_PER_MIN', default: 120, min: 0, max: 2000 },
  'GET /api/public/privacy': { env: 'REJUUV_RL_IP_PRIVACY_PER_MIN', default: 90, min: 0, max: 2000 },
  'GET /api/test': { env: 'REJUUV_RL_IP_TEST_PER_MIN', default: 45, min: 0, max: 500 },
};

function configuredUserMax(route: string): number {
  const cfg = USER_RATE_LIMITS[route];
  if (!cfg) {
    return envInt('REJUUV_RL_DEFAULT_PER_MIN', 60, 5, 500);
  }
  return envInt(cfg.env, cfg.default, cfg.min, cfg.max);
}

function configuredIpMax(route: string): number {
  const cfg = IP_RATE_LIMITS[route];
  if (!cfg) return 0;
  return envInt(cfg.env, cfg.default, cfg.min, cfg.max);
}

function ipRateLimitGloballyEnabled(): boolean {
  const v = process.env.REJUUV_RL_IP_ENABLED?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

/**
 * Stable hash of client IP for rate counters (never store raw IP in DB).
 * Uses optional salt so hashes are not portable across deployments.
 */
export function getRequestIpHash(request: Request): string | null {
  const fwd = request.headers.get('x-forwarded-for');
  const first = fwd?.split(',')[0]?.trim();
  const raw =
    first ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    null;
  if (!raw) return null;
  const salt = process.env.REJUUV_RL_IP_SALT?.trim() || 'rejuuv';
  return createHash('sha256').update(`${salt}:${raw}`, 'utf8').digest('hex').slice(0, 40);
}

/**
 * Per-user sliding window (UTC minute bucket) enforced in Postgres.
 * If the RPC is missing (migration not applied), fails open and logs once.
 */
export async function enforceRateLimit(
  userId: string,
  route: string,
  maxPerMinute?: number
): Promise<RateLimitResult> {
  const max = maxPerMinute ?? configuredUserMax(route);
  try {
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_route: route,
      p_max_per_window: max,
    });

    if (error) {
      log.warn('rate-limit', 'increment_rate_limit RPC failed — allowing request', {
        message: error.message,
        code: error.code,
        route,
      });
      return { ok: true };
    }

    const row = data as { allowed?: boolean; count?: number } | null;
    if (row && row.allowed === false) {
      log.warn('rate-limit', 'user_limit_exceeded', {
        route,
        max,
        count: row.count,
        user_suffix: userId.slice(-8),
      });
      return {
        ok: false,
        response: apiFailure(
          API_ERROR_CODES.RATE_LIMITED,
          'Too many requests. Please wait a moment and try again.',
          429,
          true,
          { retry_after_sec: secondsUntilNextUtcMinute() }
        ),
      };
    }
    return { ok: true };
  } catch (e) {
    log.warn('rate-limit', 'unexpected error — allowing request', {
      message: e instanceof Error ? e.message : String(e),
      route,
    });
    return { ok: true };
  }
}

/**
 * Optional per-IP limit for public (unauthenticated) routes.
 * Set per-route env to 0 to disable that route's IP cap. Set REJUUV_RL_IP_ENABLED=0 to disable all IP limits.
 */
export async function enforceIpRateLimit(
  request: Request,
  route: string,
  maxPerMinute?: number
): Promise<RateLimitResult> {
  if (!ipRateLimitGloballyEnabled()) {
    return { ok: true };
  }
  const max = maxPerMinute ?? configuredIpMax(route);
  if (max <= 0) {
    return { ok: true };
  }

  const ipHash = getRequestIpHash(request);
  if (!ipHash) {
    return { ok: true };
  }

  try {
    const { data, error } = await supabase.rpc('increment_rate_limit_ip', {
      p_ip_hash: ipHash,
      p_route: route,
      p_max_per_window: max,
    });

    if (error) {
      log.warn('rate-limit', 'increment_rate_limit_ip RPC failed — allowing request', {
        message: error.message,
        code: error.code,
        route,
      });
      return { ok: true };
    }

    const row = data as { allowed?: boolean; count?: number } | null;
    if (row && row.allowed === false) {
      log.warn('rate-limit', 'ip_limit_exceeded', {
        route,
        max,
        count: row.count,
      });
      return {
        ok: false,
        response: apiFailure(
          API_ERROR_CODES.RATE_LIMITED,
          'Too many requests from this network. Please wait a moment and try again.',
          429,
          true,
          { retry_after_sec: secondsUntilNextUtcMinute() }
        ),
      };
    }
    return { ok: true };
  } catch (e) {
    log.warn('rate-limit', 'ip unexpected error — allowing request', {
      message: e instanceof Error ? e.message : String(e),
      route,
    });
    return { ok: true };
  }
}

/**
 * Blocks accidental double-submit of AI plan generation for the same assessment or body area
 * within a short window (sequential double-tap). Set REJUUV_RL_PLAN_DEDUPE_SECONDS=0 to disable.
 */
export async function enforceRecoveryPlanGenerationDedupe(opts: {
  userId: string;
  assessmentId: string | null;
  bodyArea: string | undefined;
}): Promise<NextResponse | null> {
  const windowSec = envInt('REJUUV_RL_PLAN_DEDUPE_SECONDS', 90, 0, 600);
  if (windowSec <= 0) return null;

  const { userId, assessmentId, bodyArea } = opts;
  const since = new Date(Date.now() - windowSec * 1000).toISOString();

  let q = supabase.from('recovery_plans').select('id').eq('user_id', userId).gte('created_at', since);

  if (assessmentId) {
    q = q.eq('assessment_id', assessmentId);
  } else if (bodyArea && typeof bodyArea === 'string') {
    q = q.eq('body_area', bodyArea);
  } else {
    return null;
  }

  const { data: row, error } = await q.maybeSingle();
  if (error) {
    log.warn('rate-limit', 'plan_dedupe_query_failed — allowing generation', {
      message: error.message,
      code: error.code,
    });
    return null;
  }
  if (!row) return null;

  return apiFailure(
    API_ERROR_CODES.CONFLICT,
    'A recovery plan was just created for this profile. Please wait a moment before generating again.',
    409,
    true,
    { retry_after_sec: Math.min(windowSec, 120) }
  );
}

/** @deprecated Use {@link configuredUserMax} via env; kept for callers that pass explicit caps. */
export const RATE_LIMITS = {
  assessments: USER_RATE_LIMITS['POST /assessments'].default,
  recovery_plans: USER_RATE_LIMITS['POST /recovery-plans'].default,
  check_ins: USER_RATE_LIMITS['POST /check-ins'].default,
} as const;
