/** Types for GET /api/recovery/timeline (kept in sync with backend builder). */

export type TimelineCheckInEntry = {
  kind: 'check_in';
  at: string;
  id: string;
  pain_level: number | null;
  pain_change: string;
  difficulty: string;
  recovery_plan_id: string | null;
  is_quick: boolean;
  flare_note: string | null;
};

export type TimelineAdaptationEntry = {
  kind: 'adaptation';
  at: string;
  id: string;
  event_type: string;
  detail: string | null;
  recovery_plan_id: string;
  title: string;
  description: string;
};

export type TimelineMilestoneEntry = {
  kind: 'milestone';
  at: string;
  id: string;
  milestone_key: string;
  title: string;
  description: string;
};

export type TimelineEntry =
  | TimelineCheckInEntry
  | TimelineAdaptationEntry
  | TimelineMilestoneEntry;

export type PainSeriesPoint = { at: string; pain_level: number; id: string };

export type TimelineSummary = {
  total: number;
  avg_pain: number | null;
  trend: 'improving' | 'stable' | 'worsening';
  streak_days?: number;
};

export type TimelineApiResponse = {
  entries: TimelineEntry[];
  pain_series: PainSeriesPoint[];
  checkIns: unknown[];
  by_plan: Record<string, unknown[]>;
  summary: TimelineSummary;
};
