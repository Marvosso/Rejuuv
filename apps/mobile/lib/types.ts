export interface BodyArea {
  id: string;
  label: string;
  common_triggers: string[];
  common_pain_types: string[];
}

export interface PainIntake {
  body_area: string;
  specific_location: string;
  pain_type: string[];
  duration: string;
  trigger: string[];
  pain_level: number;
  movement_limitations: string[];
}

export interface Analysis {
  summary: string;
  possible_contributors: string[];
  education: string;
  safety_note: string;
}

export interface SafetyCheck {
  red_flag_detected: boolean;
  message: string;
  recommended_action: string;
}

export interface RecoveryPhase {
  goal: string;
  activities: string[];
  avoid: string[];
}

export interface RecoveryPlan {
  focus_areas: string[];
  recovery_plan: {
    phase_1_days_1_to_7: RecoveryPhase;
    phase_2_days_8_to_21: RecoveryPhase;
    phase_3_week_4_and_beyond: RecoveryPhase;
  };
  daily_habits: string[];
  red_flags: string[];
}

export interface CheckIn {
  pain_change: string;
  pain_level: number;
  difficulty: string;
  completed_activities: string[];
  notes: string;
}

export interface CheckInResponse {
  adjustment_summary: string;
  updated_recommendations: string[];
  next_check_in: string;
  safety_reminder: string;
}

// ─── Subscription & billing ───────────────────────────────────────────────────

/**
 * Pricing details returned by GET /api/subscriptions.
 * `display` is pre-formatted by the backend, e.g. "$19.00 / month".
 */
export interface BillingInfo {
  price_id: string;
  /** Price in the currency's smallest unit (cents for USD). */
  unit_amount: number | null;
  /** ISO 4217 currency code, lowercase — e.g. "usd". */
  currency: string;
  /** Billing interval: "day" | "week" | "month" | "year" */
  interval: string | null;
  /** Number of intervals between charges (usually 1). */
  interval_count: number | null;
  /** Human-readable price string ready for UI display, e.g. "$19.00 / month". */
  display: string;
}

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'
  | 'inactive';

/** Shape returned by GET /api/subscriptions (Rejuuv-only, OdysseyOS filtered out). */
export interface Subscription {
  id: string;
  /** Product name for display, e.g. "Rejuuv Pro". */
  planName: string;
  status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  /** ISO 8601 start of the current billing period. */
  current_period_start: string;
  /** ISO 8601 end of the current billing period / access expiry. */
  current_period_end: string;
  /** ISO 8601 cancellation timestamp, or null if not yet canceled. */
  canceled_at: string | null;
  /** Pricing details for the active plan item. Null only for edge cases. */
  billing_info: BillingInfo | null;
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | null;

export interface InvoiceLine {
  id: string;
  description: string | null;
  /** Line amount in the currency's smallest unit (cents for USD). */
  amount: number;
  currency: string;
  price_id: string | null;
  period_start: string;
  period_end: string;
}

/** Shape returned by GET /api/subscriptions/invoices (Rejuuv-only). */
export interface Invoice {
  id: string;
  /** Human-readable invoice number, e.g. "INV-0001". */
  invoice_number: string | null;
  status: InvoiceStatus;
  /**
   * Display amount in the currency's smallest unit.
   * Equals amount_paid when the invoice is settled; amount_due otherwise.
   */
  amount: number;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  /** ISO 4217 currency code, lowercase. */
  currency: string;
  /** ISO 8601 invoice creation timestamp. */
  created: string;
  period_start: string;
  period_end: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  /**
   * Best available URL for a "View / Download" action.
   * Prefers invoice_pdf; falls back to hosted_invoice_url.
   */
  pdf_link: string | null;
  subscription_id: string | null;
  /** Rejuuv line items only — non-Rejuuv lines are stripped server-side. */
  lines: InvoiceLine[];
}
