import { z } from 'zod';
import { log } from './logger';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ANTHROPIC_API_KEY: z.string().min(10),
  /** AI request ceiling (Anthropic SDK does not always honor AbortSignal on all transports). */
  ANTHROPIC_TIMEOUT_MS: z.coerce.number().min(10000).max(300000).optional(),
  /** Max retries for transient Anthropic failures (429 / overloaded). */
  ANTHROPIC_MAX_RETRIES: z.coerce.number().min(0).max(5).optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SKIP_ENV_VALIDATION: z.enum(['0', '1']).optional(),
  REJUUV_STRICT_ENV: z.enum(['0', '1']).optional(),
});

export type ParsedBackendEnv = z.infer<typeof envSchema>;

function rawEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_TIMEOUT_MS: process.env.ANTHROPIC_TIMEOUT_MS,
    ANTHROPIC_MAX_RETRIES: process.env.ANTHROPIC_MAX_RETRIES,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION as '0' | '1' | undefined,
    REJUUV_STRICT_ENV: process.env.REJUUV_STRICT_ENV as '0' | '1' | undefined,
  };
}

/**
 * Validates critical env at boot. Set SKIP_ENV_VALIDATION=1 for CI image builds without secrets.
 * Set REJUUV_STRICT_ENV=1 to fail fast when required vars are missing (recommended for production hosts).
 */
export function validateBackendEnv(): void {
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    log.warn('env', 'SKIP_ENV_VALIDATION=1 — skipping env validation');
    return;
  }

  const parsed = envSchema.safeParse(rawEnv());
  if (parsed.success) {
    if (!parsed.data.STRIPE_SECRET_KEY) {
      log.warn('env', 'STRIPE_SECRET_KEY not set — billing routes will fail until configured');
    }
    return;
  }

  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  log.error('env', 'Invalid or missing required environment variables', { issues });

  if (process.env.REJUUV_STRICT_ENV === '1') {
    throw new Error(`[rejuuv] Strict env validation failed: ${issues}`);
  }
}

/** Safe defaults for AI orchestration (alpha/beta). */
export function anthropicTimeoutMs(): number {
  const v = process.env.ANTHROPIC_TIMEOUT_MS;
  const n = v ? parseInt(v, 10) : NaN;
  if (Number.isFinite(n) && n >= 10000) return n;
  return 120_000;
}

export function anthropicMaxRetries(): number {
  const v = process.env.ANTHROPIC_MAX_RETRIES;
  const n = v ? parseInt(v, 10) : NaN;
  if (Number.isFinite(n) && n >= 0 && n <= 5) return n;
  return 2;
}
