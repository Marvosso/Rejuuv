/**
 * Reduces prompt-injection surface and accidental PII dumps into LLM prompts.
 * Conservative: truncate and drop known-sensitive keys; never blocks the request.
 */

const SENSITIVE_KEY = /^(password|token|authorization|api[_-]?key|secret|cookie|ssn)$/i;

const DEFAULTS = {
  maxJsonChars: 48_000,
  maxStringChars: 2_500,
  maxArrayItems: 80,
  maxObjectKeys: 120,
  maxDepth: 8,
} as const;

export type SanitizeOptions = {
  maxJsonChars?: number;
  maxStringChars?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxDepth?: number;
};

function clampString(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…[truncated ${s.length - max} chars]`;
}

/**
 * Returns a JSON-serializable clone safe to embed in LLM user messages.
 */
export function sanitizeForPromptInput(
  value: unknown,
  opts: SanitizeOptions = {},
  depth = 0
): unknown {
  const maxDepth = opts.maxDepth ?? DEFAULTS.maxDepth;
  const maxString = opts.maxStringChars ?? DEFAULTS.maxStringChars;
  const maxArray = opts.maxArrayItems ?? DEFAULTS.maxArrayItems;
  const maxKeys = opts.maxObjectKeys ?? DEFAULTS.maxObjectKeys;

  if (depth > maxDepth) return '[max depth exceeded]';

  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return clampString(value, maxString);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const slice = value.slice(0, maxArray);
    const mapped = slice.map((v) => sanitizeForPromptInput(v, opts, depth + 1));
    if (value.length > maxArray) {
      return [...mapped, `[truncated ${value.length - maxArray} more items]`];
    }
    return mapped;
  }

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o).filter((k) => !SENSITIVE_KEY.test(k));
    const limited = keys.slice(0, maxKeys);
    const out: Record<string, unknown> = {};
    for (const k of limited) {
      out[k] = sanitizeForPromptInput(o[k], opts, depth + 1);
    }
    if (keys.length > maxKeys) {
      out._truncated_keys = keys.length - maxKeys;
    }
    return out;
  }

  return String(value);
}

export function stringifyForPrompt(value: unknown, opts: SanitizeOptions = {}): string {
  const sanitized = sanitizeForPromptInput(value, opts);
  const maxJson = opts.maxJsonChars ?? DEFAULTS.maxJsonChars;
  let s = JSON.stringify(sanitized, null, 2);
  if (s.length > maxJson) {
    s = `${s.slice(0, maxJson)}\n…[truncated total JSON to ${maxJson} chars]`;
  }
  return s;
}
