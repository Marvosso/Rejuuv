/**
 * Next.js server bootstrap — env validation and one-line observability hook.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;

  const { validateBackendEnv } = await import('./lib/env');
  try {
    validateBackendEnv();
  } catch (e) {
    console.error('[instrumentation] env validation failed:', e);
    throw e;
  }
}
