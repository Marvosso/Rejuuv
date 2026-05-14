import type { AdaptiveDecision, AdaptiveOutcome, AdaptiveSignals, CheckInSignalRow, PlanSnapshot } from './types';
import { buildAdaptiveSignals } from './context';

function pushReason(reasons: string[], r: string) {
  reasons.push(r);
}

/**
 * Conservative, ordered rule stack. First matching branch wins (safety-first).
 * Progress is informational when legacy phase logic already advanced the plan.
 */
export function evaluateAdaptiveRules(
  rowsAsc: CheckInSignalRow[],
  plan: PlanSnapshot,
  opts: { legacyPhaseProgressed: boolean }
): AdaptiveDecision {
  const reasons: string[] = [];
  const signals = buildAdaptiveSignals(rowsAsc, plan);

  const last = rowsAsc.length ? rowsAsc[rowsAsc.length - 1] : null;
  const prev = rowsAsc.length > 1 ? rowsAsc[rowsAsc.length - 2] : null;

  // ── Escalate: severe or sustained high pain (clinical gate, not diagnosis) ──
  const lastPain = signals.pain_level_last;
  const last3 = rowsAsc
    .slice(-3)
    .map((r) => r.pain_level)
    .filter((x): x is number => x != null);
  const avgLast3 = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : null;

  if (lastPain != null && lastPain >= 9) {
    pushReason(reasons, 'Recent pain score is very high (9–10). A clinician should help rule out urgent issues.');
    return finalize('escalate', reasons, signals);
  }
  if (avgLast3 != null && last3.length >= 3 && avgLast3 >= 8) {
    pushReason(
      reasons,
      'Pain has stayed very high across the last few logs. Professional evaluation is the safest next step.'
    );
    return finalize('escalate', reasons, signals);
  }

  // ── Reassess: stuck mid-range with enough history (symptoms not resolving as expected) ──
  if (
    signals.check_in_count >= 8 &&
    signals.stagnation_index != null &&
    signals.stagnation_index < 1.2 &&
    lastPain != null &&
    lastPain >= 5 &&
    lastPain <= 8
  ) {
    pushReason(
      reasons,
      'Pain has stayed in a similar band without clear change. A fresh assessment can realign your plan.'
    );
    return finalize('reassess', reasons, signals);
  }

  if (signals.check_in_count >= 10 && signals.adherence_days_14 <= 2) {
    pushReason(
      reasons,
      'Logging has been sparse while you have a long history. Reassessment helps us stay aligned with how you feel now.'
    );
    return finalize('reassess', reasons, signals);
  }

  // ── Regress: clear downturn vs prior window (only if not already at phase 1) ──
  if (
    plan.phase >= 2 &&
    signals.avg_last_4 != null &&
    signals.avg_prev_4 != null &&
    signals.avg_last_4 >= signals.avg_prev_4 + 1.5
  ) {
    pushReason(
      reasons,
      'Recent pain averages are meaningfully higher than the prior window. Stepping the plan back one phase is safer.'
    );
    return finalize('regress', reasons, signals);
  }

  if (plan.phase >= 2 && signals.consecutive_worse >= 2) {
    pushReason(
      reasons,
      'You reported feeling worse multiple times in a row. Easing intensity by moving back a phase supports recovery.'
    );
    return finalize('regress', reasons, signals);
  }

  // ── Reduce intensity: flare or load intolerance (no phase drop) ──
  if (last?.pain_change === 'Worse' || signals.too_hard_in_last_5 >= 3) {
    if (last?.pain_change === 'Worse') {
      pushReason(reasons, 'You noted things felt worse compared to before — lighter work is appropriate.');
    }
    if (signals.too_hard_in_last_5 >= 3) {
      pushReason(
        reasons,
        'Several recent sessions felt “too hard” — tolerance may be lower; reduce load before changing phase.'
      );
    }
    if (reasons.length === 0) {
      pushReason(reasons, 'Signals suggest backing off intensity while keeping the same phase structure.');
    }
    return finalize('reduce_intensity', reasons, signals);
  }

  if (
    prev &&
    lastPain != null &&
    prev.pain_level != null &&
    lastPain - prev.pain_level >= 2
  ) {
    pushReason(reasons, 'Pain jumped compared with your previous log. A lighter week is conservative.');
    return finalize('reduce_intensity', reasons, signals);
  }

  // ── Progress: informational; phase mutation remains legacy rule unless regress won ──
  if (opts.legacyPhaseProgressed) {
    pushReason(reasons, 'Your averages improved enough to advance the plan phase (existing progression rule).');
    return finalize('progress', reasons, signals);
  }

  if (
    signals.avg_last_3 != null &&
    signals.avg_prev_3 != null &&
    signals.avg_last_3 <= signals.avg_prev_3 - 0.75 &&
    signals.check_in_count >= 5
  ) {
    pushReason(
      reasons,
      'Pain averages are trending down versus the prior window. Continuation or phase progression may be appropriate.'
    );
    return finalize('progress', reasons, signals);
  }

  pushReason(reasons, 'Patterns fit steady continuation; no structural plan change recommended.');
  return finalize('continue', reasons, signals);
}

function finalize(outcome: AdaptiveOutcome, reasons: string[], signals: AdaptiveSignals): AdaptiveDecision {
  return { outcome, reasons, signals };
}
