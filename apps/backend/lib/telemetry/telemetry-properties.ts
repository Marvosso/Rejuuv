/**
 * Strip clinical / free-text fields and cap string sizes before persisting telemetry.
 * Server events should already be sparse; this hardens client-originated properties too.
 */

const BLOCKED_KEYS = new Set(
  [
    'notes',
    'intake_data',
    'intake',
    'symptoms',
    'symptom_text',
    'message',
    'details',
    'raw',
    'narrative',
    'adjustments',
    'analysis_result',
    'plan_data',
    'education',
    'user_message',
    'reasoning_internal',
    'summary',
    'text',
    'body',
    'description',
  ].map((k) => k.toLowerCase())
);

function isBlockedTelemetryKey(k: string): boolean {
  const lower = k.toLowerCase();
  if (k.length > 64) return true;
  if (BLOCKED_KEYS.has(lower)) return true;
  if (/^(intake|symptom|narrative|detail)/i.test(k)) return true;
  return false;
}

function scrubValue(v: unknown, depth: number): unknown {
  if (depth > 4) return '[depth]';
  if (v === null || v === undefined) return v;
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (v.length > 220) return `[string:${v.length}]`;
    return v;
  }
  if (Array.isArray(v)) {
    return v.slice(0, 24).map((x) => scrubValue(x, depth + 1));
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      if (isBlockedTelemetryKey(k)) continue;
      out[k] = scrubValue(val, depth + 1);
    }
    return out;
  }
  return undefined;
}

export function sanitizeTelemetryProperties(
  properties: Record<string, unknown> | undefined | null
): Record<string, unknown> {
  if (!properties || typeof properties !== 'object') return {};
  return scrubValue(properties, 0) as Record<string, unknown>;
}
