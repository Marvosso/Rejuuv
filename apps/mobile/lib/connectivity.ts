const DEFAULT_TIMEOUT_MS = 90_000;

/**
 * GET /api/test with short timeout — use before writes when you want a soft online check.
 */
export async function pingBackendHealth(
  apiBaseUrl: string,
  timeoutMs = 8000
): Promise<boolean> {
  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/test`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', signal: ac.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export { DEFAULT_TIMEOUT_MS };
