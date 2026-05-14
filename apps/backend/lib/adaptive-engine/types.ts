/**
 * Rules-first adaptive recovery outcomes (no AI autonomy).
 * Each decision must carry human-readable reasons for audit and UX.
 */
export type AdaptiveOutcome =
  | 'continue'
  | 'progress'
  | 'regress'
  | 'reduce_intensity'
  | 'reassess'
  | 'escalate';

export type CheckInSignalRow = {
  pain_level: number | null;
  pain_change: string;
  difficulty: string;
  created_at: string;
  adjustments: string | null;
};

export type PlanSnapshot = {
  phase: number;
  status: string;
};

export type AdaptiveSignals = {
  check_in_count: number;
  pain_level_last: number | null;
  avg_last_3: number | null;
  avg_prev_3: number | null;
  avg_last_4: number | null;
  avg_prev_4: number | null;
  consecutive_worse: number;
  too_hard_in_last_5: number;
  easy_in_last_5: number;
  adherence_days_14: number;
  stagnation_index: number | null;
};

export type AdaptiveDecision = {
  outcome: AdaptiveOutcome;
  reasons: string[];
  signals: AdaptiveSignals;
};
