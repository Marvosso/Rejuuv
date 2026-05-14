/**
 * Bounded retries for transient upstream failures (rate limits, overload).
 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableAnthropicError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const any = err as { status?: number; error?: { type?: string } };
  const status = any.status;
  if (status === 429) return true;
  if (status === 529) return true;
  if (status === 503) return true;
  const t = any.error?.type;
  if (t === 'overloaded_error' || t === 'rate_limit_error') return true;
  return false;
}

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const base = opts?.baseDelayMs ?? 800;
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt === maxAttempts || !isRetryableAnthropicError(e)) throw e;
      const jitter = Math.floor(Math.random() * 200);
      await sleep(base * attempt + jitter);
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed after retries`);
}
