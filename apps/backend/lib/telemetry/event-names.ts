/**
 * Canonical event names for dashboards and continuity queries.
 * Keep property payloads small and non-clinical (no free-text notes).
 */
export const TELEMETRY_EVENTS = {
  // Intake / funnel (often client-originated)
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Assessments (server)
  ASSESSMENT_SAFETY_OUTCOME: 'assessment_safety_outcome',
  ASSESSMENT_SAVED: 'assessment_saved',

  // Plans (server)
  PLAN_GENERATION_RESULT: 'plan_generation_result',

  // Check-ins & adaptation (server)
  CHECK_IN_RECORDED: 'check_in_recorded',
  FLARE_SIGNAL_LOGGED: 'flare_signal_logged',

  // Timeline (server when engage=1; client optional)
  TIMELINE_DATA_LOADED: 'timeline_data_loaded',
  TIMELINE_SCREEN_OPENED: 'timeline_screen_opened',

  // Subscription (server)
  SUBSCRIPTION_CHECKOUT_STARTED: 'subscription_checkout_started',
  SUBSCRIPTION_PLAN_CHANGED: 'subscription_plan_changed',
  SUBSCRIPTION_SYNCED: 'subscription_synced',
  SUBSCRIPTION_CONVERSION: 'subscription_conversion',
} as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENTS)[keyof typeof TELEMETRY_EVENTS];

/** Client POST /api/telemetry — must match allowlist in route handler. */
export const CLIENT_TELEMETRY_EVENTS: ReadonlySet<string> = new Set([
  TELEMETRY_EVENTS.ONBOARDING_STEP_VIEWED,
  TELEMETRY_EVENTS.ONBOARDING_COMPLETED,
  TELEMETRY_EVENTS.TIMELINE_SCREEN_OPENED,
]);
