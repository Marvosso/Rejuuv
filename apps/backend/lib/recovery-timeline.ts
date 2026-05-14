/**
 * Builds a merged, chronological recovery timeline for the mobile client.
 * Keeps emotional copy calm; flare hints normalize setbacks without alarm.
 */

export type CheckInTimelineRow = {
  id: string;
  pain_level: number | null;
  pain_change: string;
  difficulty: string;
  recovery_plan_id: string | null;
  created_at: string;
  adjustments: string | null;
};

export type AdaptationEventRow = {
  id: string;
  recovery_plan_id: string;
  check_in_id: string | null;
  event_type: string;
  detail: string | null;
  created_at: string;
};

export type TimelineCheckInEntry = {
  kind: 'check_in';
  at: string;
  id: string;
  pain_level: number | null;
  pain_change: string;
  difficulty: string;
  recovery_plan_id: string | null;
  is_quick: boolean;
  /** Calm copy when this log looks like a setback — not a diagnosis */
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

export type TimelineEntry = TimelineCheckInEntry | TimelineAdaptationEntry | TimelineMilestoneEntry;

function parseQuick(adjustments: string | null): boolean {
  if (!adjustments) return false;
  try {
    const j = JSON.parse(adjustments) as { quick?: boolean };
    return j?.quick === true;
  } catch {
    return false;
  }
}

function isFlareHint(
  row: CheckInTimelineRow,
  prev: CheckInTimelineRow | undefined
): string | null {
  if (row.pain_change === 'Worse') {
    return 'You noted things felt harder — that happens. Gentler pacing is still progress.';
  }
  if (
    prev &&
    row.pain_level != null &&
    prev.pain_level != null &&
    row.pain_level - prev.pain_level >= 2
  ) {
    return 'Pain ticked up from your last log. Rest and lighter movement are valid choices.';
  }
  return null;
}

function adaptationCopy(eventType: string, detail: string | null): { title: string; description: string } {
  if (eventType === 'phase_progressed') {
    let to = '';
    try {
      if (detail) {
        const j = JSON.parse(detail) as { to_phase?: number; from_phase?: number };
        if (j?.to_phase != null) to = ` Phase ${j.to_phase} is now your focus.`;
      }
    } catch {
      /* ignore */
    }
    return {
      title: 'Plan adapted — new phase',
      description: `Your check-ins suggested it was time to progress.${to} Keep movements easy and reversible.`,
    };
  }
  if (eventType === 'maintenance_unlocked') {
    return {
      title: 'Maintenance chapter',
      description:
        'You reached a steady milestone in this plan. Continuity matters more than intensity from here.',
    };
  }
  if (eventType === 'engine_decision') {
    try {
      const j = detail
        ? (JSON.parse(detail) as { outcome?: string; reasons?: string[] })
        : {};
      const outcome = j.outcome ?? 'continue';
      const reasonsText = Array.isArray(j.reasons) ? j.reasons.join(' ') : '';
      const titles: Record<string, string> = {
        escalate: 'When to involve a clinician',
        reassess: 'Time to refresh your picture',
        regress: 'Plan eased back',
        reduce_intensity: 'Softer pace for now',
        progress: 'Momentum in your logs',
        continue: 'Steady as you are',
      };
      return {
        title: titles[outcome] ?? 'Adaptive note',
        description:
          reasonsText.trim() ||
          'Rule-based review of your recent check-ins suggested this next step.',
      };
    } catch {
      return {
        title: 'Adaptive note',
        description: 'Your recent signals were reviewed with conservative rules.',
      };
    }
  }
  return {
    title: 'Recovery update',
    description: detail?.trim() || 'Your plan responded to how you have been feeling.',
  };
}

/**
 * Merge check-ins, adaptation rows, and lightweight milestones (computed).
 * Sorted ascending by time (journal order: past → present).
 */
export function buildTimelineEntries(
  checkIns: CheckInTimelineRow[],
  adaptations: AdaptationEventRow[]
): TimelineEntry[] {
  const sortedCi = [...checkIns].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const entries: TimelineEntry[] = [];

  sortedCi.forEach((row, index) => {
    const prev = index > 0 ? sortedCi[index - 1] : undefined;
    const flare_note = isFlareHint(row, prev);

    entries.push({
      kind: 'check_in',
      at: row.created_at,
      id: row.id,
      pain_level: row.pain_level,
      pain_change: row.pain_change,
      difficulty: row.difficulty,
      recovery_plan_id: row.recovery_plan_id,
      is_quick: parseQuick(row.adjustments),
      flare_note,
    });
  });

  for (const ev of adaptations) {
    const { title, description } = adaptationCopy(ev.event_type, ev.detail);
    entries.push({
      kind: 'adaptation',
      at: ev.created_at,
      id: ev.id,
      event_type: ev.event_type,
      detail: ev.detail,
      recovery_plan_id: ev.recovery_plan_id,
      title,
      description,
    });
  }

  // Milestones: first log, 10th log (supportive, not gamified)
  if (sortedCi.length >= 1) {
    const first = sortedCi[0];
    entries.push({
      kind: 'milestone',
      at: first.created_at,
      id: `milestone:first:${first.id}`,
      milestone_key: 'first_log',
      title: 'Journey on record',
      description: 'You chose to track recovery here. Small logs add up to real continuity.',
    });
  }
  if (sortedCi.length >= 10) {
    const tenth = sortedCi[9];
    entries.push({
      kind: 'milestone',
      at: tenth.created_at,
      id: `milestone:ten:${tenth.id}`,
      milestone_key: 'ten_logs',
      title: 'Ten moments logged',
      description: 'Perfection is not the goal — showing up for yourself is.',
    });
  }

  const kindOrder = { milestone: 0, adaptation: 1, check_in: 2 } as const;
  entries.sort((a, b) => {
    const d = new Date(a.at).getTime() - new Date(b.at).getTime();
    if (d !== 0) return d;
    return kindOrder[a.kind] - kindOrder[b.kind];
  });
  return entries;
}
