import type { CheckInSignalRow, AdaptiveSignals, PlanSnapshot } from './types';

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Distinct UTC calendar days in window with ≥1 check-in. */
function adherenceDaysLast14(rows: CheckInSignalRow[]): number {
  const cutoff = Date.now() - 14 * 86400000;
  const days = new Set<string>();
  for (const r of rows) {
    if (new Date(r.created_at).getTime() < cutoff) continue;
    const d = new Date(r.created_at);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    days.add(k);
  }
  return days.size;
}

function consecutiveWorseFromEnd(rowsAsc: CheckInSignalRow[]): number {
  let n = 0;
  for (let i = rowsAsc.length - 1; i >= 0; i--) {
    if (rowsAsc[i].pain_change === 'Worse') n++;
    else break;
  }
  return n;
}

function countDifficultyLastN(rowsAsc: CheckInSignalRow[], n: number, diff: string): number {
  const tail = rowsAsc.slice(-n);
  return tail.filter((r) => r.difficulty === diff).length;
}

/**
 * Builds numeric / behavioural signals from recent plan check-ins (ascending).
 */
export function buildAdaptiveSignals(
  rowsAsc: CheckInSignalRow[],
  _plan: PlanSnapshot
): AdaptiveSignals {
  const withPain = rowsAsc
    .map((r) => r.pain_level)
    .filter((x): x is number => x != null && x >= 1 && x <= 10);

  const last3 = withPain.slice(-3);
  const prev3 = withPain.slice(-6, -3);
  const last4 = withPain.slice(-4);
  const prev4 = withPain.slice(-8, -4);

  let stagnation: number | null = null;
  if (withPain.length >= 6) {
    const tail = withPain.slice(-6);
    const m = tail.reduce((s, x) => s + x, 0) / tail.length;
    const v = Math.sqrt(tail.reduce((s, x) => s + (x - m) ** 2, 0) / tail.length);
    stagnation = v;
  }

  return {
    check_in_count: rowsAsc.length,
    pain_level_last: rowsAsc.length ? rowsAsc[rowsAsc.length - 1].pain_level : null,
    avg_last_3: avg(last3),
    avg_prev_3: avg(prev3),
    avg_last_4: avg(last4),
    avg_prev_4: avg(prev4),
    consecutive_worse: consecutiveWorseFromEnd(rowsAsc),
    too_hard_in_last_5: countDifficultyLastN(rowsAsc, 5, 'Too Hard'),
    easy_in_last_5: countDifficultyLastN(rowsAsc, 5, 'Easy'),
    adherence_days_14: adherenceDaysLast14(rowsAsc),
    stagnation_index: stagnation,
  };
}
