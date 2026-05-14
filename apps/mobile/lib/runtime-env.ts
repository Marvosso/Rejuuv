const required = ['EXPO_PUBLIC_API_URL'] as const;

let missingEnvWarned = false;

/**
 * Warns once if public env is missing. Never throws — app keeps running with
 * `api-fetch` fallbacks (e.g. localhost in dev).
 */
export function assertPublicRuntimeConfig(): void {
  const missing: string[] = [];
  for (const key of required) {
    const v = process.env[key];
    if (typeof v !== 'string' || !v.trim()) missing.push(key);
  }
  if (missing.length === 0) return;
  if (missingEnvWarned) return;
  missingEnvWarned = true;
  console.warn(
    '[rejuuv] Missing build-time env:',
    missing.join(', '),
    '— set in .env or eas.json. API base may fall back to defaults until fixed.'
  );
}
