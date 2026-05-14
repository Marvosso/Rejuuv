/**
 * Fixture tests for `evaluateAdaptiveRules` (rule stack in rules.ts).
 *
 * Expected outcomes are documented per scenario. These tests do not call Claude or Supabase.
 *
 * Clock is fixed so `adherence_days_14` (Date.now-relative in context.ts) is stable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckInSignalRow, PlanSnapshot } from './types';
import { evaluateAdaptiveRules } from './rules';

const NOW = new Date('2026-06-15T12:00:00.000Z');

/** ISO timestamps on distinct UTC days within the 14-day window before NOW. */
function dayInWindow(day: number, hourUTC = 12): string {
  const base = Date.UTC(2026, 5, 1, hourUTC, 0, 0);
  return new Date(base + (day - 1) * 86400000).toISOString();
}

function mkRow(
  day: number,
  pain: number,
  painChange: 'Better' | 'Same' | 'Worse',
  difficulty: 'Easy' | 'Manageable' | 'Too Hard' = 'Manageable',
  hourUTC = 12
): CheckInSignalRow {
  return {
    pain_level: pain,
    pain_change: painChange,
    difficulty,
    created_at: dayInWindow(day, hourUTC),
    adjustments: null,
  };
}

const planP1: PlanSnapshot = { phase: 1, status: 'active' };
const planP2: PlanSnapshot = { phase: 2, status: 'active' };
const planP3: PlanSnapshot = { phase: 3, status: 'active' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('evaluateAdaptiveRules — fixture scenarios', () => {
  /**
   * 1. Pain improves steadily + high adherence → progress
   * Expect: `progress` from the trend rule (avg_last_3 ≤ avg_prev_3 − 0.75, count ≥ 5).
   * Note: adherence volume is not required by this branch; high adherence is a product expectation
   * documented here for regression visibility once wired.
   */
  it('1. pain improves steadily → progress (trend branch, not legacy phase flag)', () => {
    const rows: CheckInSignalRow[] = [
      mkRow(1, 8, 'Same'),
      mkRow(2, 8, 'Same'),
      mkRow(3, 7, 'Same'),
      mkRow(4, 7, 'Better'),
      mkRow(5, 6, 'Better'),
      mkRow(6, 4, 'Better'),
      mkRow(7, 3, 'Better'),
    ];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('progress');
    expect(d.reasons.some((r) => r.includes('trending down'))).toBe(true);
  });

  it('1b. legacy phase progression → progress (informational branch)', () => {
    const rows: CheckInSignalRow[] = [mkRow(5, 4, 'Same'), mkRow(6, 4, 'Same')];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: true });
    expect(d.outcome).toBe('progress');
    expect(d.reasons.some((r) => r.includes('advance the plan phase'))).toBe(true);
  });

  /**
   * 2. Pain worsens after exercise → reduce intensity
   * Expect: `reduce_intensity` when last check-in reports Worse (without hitting escalate first).
   */
  it('2. last log "Worse" with moderate pain → reduce_intensity', () => {
    const rows: CheckInSignalRow[] = [
      mkRow(1, 4, 'Same'),
      mkRow(2, 4, 'Same'),
      mkRow(3, 5, 'Worse'),
    ];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('reduce_intensity');
    expect(d.reasons.join(' ')).toMatch(/worse|Worse/i);
  });

  it('2b. several "Too Hard" in last 5 → reduce_intensity', () => {
    const rows: CheckInSignalRow[] = [
      mkRow(1, 5, 'Same', 'Too Hard'),
      mkRow(2, 5, 'Same', 'Too Hard'),
      mkRow(3, 5, 'Same', 'Too Hard'),
      mkRow(4, 5, 'Same', 'Easy'),
      mkRow(5, 5, 'Same', 'Easy'),
    ];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('reduce_intensity');
    expect(d.signals.too_hard_in_last_5).toBeGreaterThanOrEqual(3);
  });

  it('2c. pain jumps ≥2 vs prior log → reduce_intensity', () => {
    const rows: CheckInSignalRow[] = [mkRow(10, 3, 'Same'), mkRow(11, 6, 'Same')];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('reduce_intensity');
    expect(d.reasons.join(' ')).toMatch(/jump/i);
  });

  /**
   * 3. Repeated missed check-ins → gentle re-entry
   * Current engine: no dedicated "gentle_reentry" outcome. Sparse logging maps to `reassess`
   * when count ≥ 10 and ≤2 distinct logging days in last 14 (proxy for "fell off").
   */
  it('3. sparse adherence over many total logs → reassess (proxy for missed check-ins)', () => {
    const rows: CheckInSignalRow[] = [
      mkRow(14, 8, 'Same', 'Manageable', 8),
      mkRow(14, 2, 'Same', 'Manageable', 9),
      mkRow(14, 8, 'Same', 'Manageable', 10),
      mkRow(14, 2, 'Same', 'Manageable', 11),
      mkRow(14, 8, 'Same', 'Manageable', 12),
      mkRow(15, 2, 'Same', 'Manageable', 8),
      mkRow(15, 8, 'Same', 'Manageable', 9),
      mkRow(15, 2, 'Same', 'Manageable', 10),
      mkRow(15, 8, 'Same', 'Manageable', 11),
      mkRow(15, 3, 'Same', 'Manageable', 12),
    ];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('reassess');
    expect(d.signals.adherence_days_14).toBe(2);
    expect(d.reasons.join(' ')).toMatch(/sparse|Logging has been sparse/i);
  });

  /**
   * 4. Flare-up reported (engine)
   * Rule stack does not name "flare_up"; UI uses mobile `deriveTodayRecoveryState` for that label.
   * Here: single Worse maps to reduce_intensity before continue.
   */
  it('4. flare-like signal (single Worse) → reduce_intensity in engine', () => {
    const rows: CheckInSignalRow[] = [mkRow(10, 5, 'Same'), mkRow(11, 5, 'Same'), mkRow(12, 5, 'Worse')];
    const d = evaluateAdaptiveRules(rows, planP1, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('reduce_intensity');
  });

  /**
   * 5. Persistent high pain → reassessment or escalation
   */
  it('5a. last pain 9–10 → escalate', () => {
    const rows: CheckInSignalRow[] = [mkRow(12, 4, 'Same'), mkRow(13, 5, 'Same'), mkRow(14, 9, 'Worse')];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('escalate');
  });

  it('5b. average of last three logs ≥8 → escalate', () => {
    const rows: CheckInSignalRow[] = [mkRow(12, 8, 'Same'), mkRow(13, 8, 'Same'), mkRow(14, 8, 'Same')];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('escalate');
  });

  it('5c. stuck mid pain band with flat variance → reassess', () => {
    const rows: CheckInSignalRow[] = [
      mkRow(1, 6, 'Same'),
      mkRow(2, 6, 'Same'),
      mkRow(3, 6, 'Same'),
      mkRow(4, 6, 'Same'),
      mkRow(5, 6, 'Same'),
      mkRow(6, 6, 'Same'),
      mkRow(7, 6, 'Same'),
      mkRow(8, 6, 'Same'),
    ];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('reassess');
    expect(d.reasons.join(' ')).toMatch(/similar band|fresh assessment/i);
  });

  /**
   * 6. Red flag symptoms → REFER / escalation
   * The adaptive rule stack does not ingest structured red-flag fields; escalation is pain-based only.
   * This test locks current behaviour; symptom-based REFER belongs to intake/safety flows (documented gap).
   */
  it('6. engine without red-flag payload → continue on benign logs (red flags not modeled here)', () => {
    const rows: CheckInSignalRow[] = [mkRow(13, 3, 'Same'), mkRow(14, 3, 'Same')];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('continue');
  });

  /**
   * 7. Low adherence + no improvement → adherence support, not aggressive progression
   * Engine: same sparse rule as (3) → reassess, not `progress`. Progress trend would need clear
   * avg drop; here pain flat so no progress branch.
   */
  it('7. low adherence + no improving trend → reassess, not progress', () => {
    const rows: CheckInSignalRow[] = [
      mkRow(14, 8, 'Same', 'Manageable', 8),
      mkRow(14, 2, 'Same', 'Manageable', 9),
      mkRow(14, 8, 'Same', 'Manageable', 10),
      mkRow(14, 2, 'Same', 'Manageable', 11),
      mkRow(14, 8, 'Same', 'Manageable', 12),
      mkRow(15, 2, 'Same', 'Manageable', 8),
      mkRow(15, 8, 'Same', 'Manageable', 9),
      mkRow(15, 2, 'Same', 'Manageable', 10),
      mkRow(15, 8, 'Same', 'Manageable', 11),
      mkRow(15, 3, 'Same', 'Manageable', 12),
    ];
    const d = evaluateAdaptiveRules(rows, planP2, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('reassess');
    expect(d.outcome).not.toBe('progress');
  });

  it('regress: two consecutive Worse at end + phase ≥2 → regress', () => {
    const rows: CheckInSignalRow[] = [
      mkRow(1, 4, 'Same'),
      mkRow(2, 4, 'Same'),
      mkRow(3, 5, 'Worse'),
      mkRow(4, 6, 'Worse'),
    ];
    const d = evaluateAdaptiveRules(rows, planP3, { legacyPhaseProgressed: false });
    expect(d.outcome).toBe('regress');
    expect(d.signals.consecutive_worse).toBeGreaterThanOrEqual(2);
  });
});
