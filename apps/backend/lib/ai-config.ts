/**
 * Central Anthropic model + token limits with env-based rollback overrides.
 * Set e.g. REJUUV_ANTHROPIC_MODEL_REASONING to pin an older model without code changes.
 */

export type ClaudeTask =
  | 'safety_screening'
  | 'assessment_analysis'
  | 'recovery_plan'
  | 'check_in'
  | 'json_repair';

const DEFAULT_MODEL_SAFETY = 'claude-haiku-4-5-20251001';
const DEFAULT_MODEL_REASONING = 'claude-sonnet-4-5-20250929';

function envStr(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : fallback;
}

function envInt(key: string, fallback: number, min: number, max: number): number {
  const raw = process.env[key];
  const n = raw != null && raw !== '' ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

function envBool(key: string, defaultTrue: boolean): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  if (v === '1' || v === 'true' || v === 'yes') return true;
  return defaultTrue;
}

/** When false, skip the one-shot JSON repair LLM call (parse failure → fallback immediately after first parse). */
export function aiJsonRepairEnabled(): boolean {
  return envBool('REJUUV_AI_JSON_REPAIR_ENABLED', true);
}

export function getAnthropicCallParams(task: ClaudeTask): { model: string; maxTokens: number } {
  switch (task) {
    case 'safety_screening':
      return {
        model: envStr('REJUUV_ANTHROPIC_MODEL_SAFETY', DEFAULT_MODEL_SAFETY),
        maxTokens: envInt('REJUUV_ANTHROPIC_MAX_TOKENS_SAFETY', 1024, 256, 4096),
      };
    case 'assessment_analysis':
      return {
        model: envStr('REJUUV_ANTHROPIC_MODEL_REASONING', DEFAULT_MODEL_REASONING),
        maxTokens: envInt('REJUUV_ANTHROPIC_MAX_TOKENS_ANALYSIS', 4096, 512, 8192),
      };
    case 'recovery_plan':
      return {
        model: envStr('REJUUV_ANTHROPIC_MODEL_REASONING', DEFAULT_MODEL_REASONING),
        maxTokens: envInt('REJUUV_ANTHROPIC_MAX_TOKENS_RECOVERY', 8192, 1024, 16384),
      };
    case 'check_in':
      return {
        model: envStr('REJUUV_ANTHROPIC_MODEL_REASONING', DEFAULT_MODEL_REASONING),
        maxTokens: envInt('REJUUV_ANTHROPIC_MAX_TOKENS_CHECKIN', 4096, 512, 8192),
      };
    case 'json_repair':
      return {
        model: envStr(
          'REJUUV_ANTHROPIC_MODEL_JSON_REPAIR',
          envStr('REJUUV_ANTHROPIC_MODEL_SAFETY', DEFAULT_MODEL_SAFETY)
        ),
        maxTokens: envInt('REJUUV_ANTHROPIC_MAX_TOKENS_JSON_REPAIR', 4096, 512, 8192),
      };
    default: {
      const _exhaustive: never = task;
      return _exhaustive;
    }
  }
}
