import { NextResponse } from 'next/server';
import { log } from './logger';
import { apiFailure, API_ERROR_CODES } from './api-errors';

/** Total JSON size cap for any single LLM-bound request body (intake, plan+analysis, check-in). */
export const LLM_PAYLOAD_MAX_CHARS = 128_000;

const SUSPICIOUS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'ignore_prior_instructions', re: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i },
  { name: 'disregard_above', re: /disregard\s+(the\s+)?(above|all)/i },
  { name: 'override_rules', re: /override\s+(your\s+)?(instructions|rules|guidelines)/i },
  { name: 'developer_mode', re: /\bdeveloper\s+mode\b/i },
  { name: 'you_are_now_role', re: /\byou\s+are\s+now\s+(a|an)\s+(?!only\b)/i },
  { name: 'chatml_style_tags', re: /<\|?\s*(system|assistant|user)\s*\|?>/i },
  { name: 'end_instruction_markers', re: /\[\[\s*END\s*OF\s*[^\]]+\]\]/i },
  { name: 'reveal_prompt', re: /\b(repeat|print|output)\s+(the\s+)?(system|full)\s+prompt\b/i },
];

/**
 * Trim and lightly normalize free text to reduce noise and delimiter stuffing.
 */
export function normalizeUserFacingString(s: string): string {
  return s
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{6,}/g, '\n\n\n\n\n')
    .replace(/[\t ]{12,}/g, '         ');
}

/**
 * Deep-clone and normalize every string in a JSON-like tree (intake / check-in bodies).
 */
export function deepNormalizeUserStrings<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return normalizeUserFacingString(value) as T;
  if (typeof value !== 'object') return value;
  const base = structuredClone(value) as unknown;
  const walk = (o: unknown): unknown => {
    if (typeof o === 'string') return normalizeUserFacingString(o);
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === 'object') {
      const rec = o as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rec)) {
        out[k] = walk(v);
      }
      return out;
    }
    return o;
  };
  return walk(base) as T;
}

export function collectSuspiciousSignals(value: unknown): string[] {
  const found = new Set<string>();
  let maxLen = 0;

  const walk = (v: unknown, depth: number) => {
    if (depth > 14) return;
    if (typeof v === 'string') {
      maxLen = Math.max(maxLen, v.length);
      const sample = v.length > 80_000 ? `${v.slice(0, 80_000)}…` : v;
      for (const { name, re } of SUSPICIOUS) {
        if (re.test(sample)) found.add(name);
      }
    } else if (Array.isArray(v)) {
      for (const item of v.slice(0, 260)) walk(item, depth + 1);
    } else if (v && typeof v === 'object') {
      for (const k of Object.keys(v as object).slice(0, 260)) {
        walk((v as Record<string, unknown>)[k], depth + 1);
      }
    }
  };

  walk(value, 0);
  if (maxLen > 24_000) found.add('very_long_single_string');
  return [...found];
}

export function isPlainObjectBody(body: unknown): body is Record<string, unknown> {
  return body !== null && typeof body === 'object' && !Array.isArray(body);
}

/**
 * Reject unreasonably large payloads before parsing into prompts (413).
 */
export function rejectOversizedLlmPayload(body: unknown): NextResponse | null {
  let s: string;
  try {
    s = JSON.stringify(body);
  } catch {
    return apiFailure(
      API_ERROR_CODES.INVALID_PAYLOAD,
      'Invalid payload.',
      400,
      true
    );
  }
  if (s.length > LLM_PAYLOAD_MAX_CHARS) {
    return apiFailure(
      API_ERROR_CODES.PAYLOAD_TOO_LARGE,
      'Request payload is too large. Shorten free-text fields and try again.',
      413,
      true
    );
  }
  return null;
}

/**
 * Logs heuristic anomaly flags only — never logs user symptom text.
 */
export function logSuspiciousIntakeSignals(
  route: string,
  userId: string | undefined,
  signals: string[],
  approxJsonChars: number
): void {
  if (!signals.length) return;
  log.warn('prompt-injection-guard', 'suspicious_user_text_signals', {
    route,
    signals,
    approx_json_chars: approxJsonChars,
    user_id: userId ?? null,
  });
}

/** Server-side cap for persisted check-in notes (quick and full). */
export function capClinicalNotesField(value: unknown, maxChars = 8000): string {
  if (typeof value !== 'string') return '';
  return normalizeUserFacingString(value).slice(0, maxChars);
}
