/**
 * Shared truncation limits for user-derived JSON embedded in LLM prompts.
 * Keeps prompts bounded and consistent across safety, analysis, plans, check-ins.
 */
export const INTAKE_PROMPT_STRINGIFY = {
  maxStringChars: 2_000,
  maxJsonChars: 44_000,
  maxArrayItems: 80,
  maxObjectKeys: 120,
} as const;

export const RECOVERY_PLAN_USER_STRINGIFY = {
  maxStringChars: 2_400,
  maxJsonChars: 56_000,
  maxArrayItems: 90,
  maxObjectKeys: 140,
} as const;

export const CHECKIN_STRUCTURED_STRINGIFY = {
  maxStringChars: 900,
  maxJsonChars: 14_000,
  maxArrayItems: 32,
  maxObjectKeys: 80,
} as const;
