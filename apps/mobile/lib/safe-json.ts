/**
 * Safe JSON.parse for route params and deep links — never throw from user-controlled strings.
 */
export function tryParseJson<T>(raw: string | undefined | null): { ok: true; data: T } | { ok: false } {
  if (raw == null || typeof raw !== 'string' || !raw.trim()) {
    return { ok: false };
  }
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}
