/**
 * Lightweight Today-screen recovery posture (not the full adaptation engine).
 * Drives calm copy and layout variants per product spec.
 */
export type TodayRecoveryState = 'stable' | 'flare_up' | 'escalation';

export type CheckInLike = {
  pain_level: number | null;
  pain_change: string;
  created_at: string;
};

export type HistoryTrend = 'improving' | 'stable' | 'worsening' | string;

/**
 * Heuristic only: last log "Worse", sustained worsening trend, or very high recent pain
 * → gentler Today UI. Escalation stays calm-serious, not alarmist.
 */
export function deriveTodayRecoveryState(
  checkIns: CheckInLike[],
  summary: { trend?: HistoryTrend; total?: number } | null
): TodayRecoveryState {
  const sorted = [...checkIns].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const last = sorted[0];
  if (last?.pain_level != null && last.pain_level >= 9) {
    return 'escalation';
  }
  if (last?.pain_change === 'Worse') {
    return 'flare_up';
  }
  if (summary?.trend === 'worsening' && (summary.total ?? 0) >= 3) {
    return 'flare_up';
  }
  return 'stable';
}
