import type {
  TimelineEntry,
  PainSeriesPoint,
  TimelineApiResponse,
} from './recovery-timeline-types';

export function filterTimelineForPlan(
  data: TimelineApiResponse,
  selectedPlanId: string
): { entries: TimelineEntry[]; pain_series: PainSeriesPoint[] } {
  if (selectedPlanId === 'all') {
    return { entries: data.entries, pain_series: data.pain_series };
  }

  const ids = new Set(
    (data.by_plan[selectedPlanId] ?? []).map((r: { id: string }) => r.id)
  );

  const entries = data.entries.filter((e) => {
    if (e.kind === 'milestone') return false;
    if (e.kind === 'check_in') return e.recovery_plan_id === selectedPlanId;
    return e.recovery_plan_id === selectedPlanId;
  });

  const pain_series = data.pain_series.filter((p) => ids.has(p.id));
  return { entries, pain_series };
}
