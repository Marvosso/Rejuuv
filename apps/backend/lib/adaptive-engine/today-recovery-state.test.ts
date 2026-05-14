/**
 * Fixture tests for Today-screen recovery posture (`deriveTodayRecoveryState` in mobile).
 * Pure heuristics — no API, no Claude.
 */
import { describe, expect, it } from 'vitest';
import { deriveTodayRecoveryState } from '../../../mobile/lib/today-recovery-state';

describe('deriveTodayRecoveryState — fixture scenarios', () => {
  /**
   * 4. Flare-up reported → flare_up recovery state
   * Expect: `flare_up` when the most recent check-in has pain_change === 'Worse'.
   */
  it('4. last check-in Worse → flare_up', () => {
    expect(
      deriveTodayRecoveryState(
        [{ pain_level: 5, pain_change: 'Worse', created_at: '2026-06-14T12:00:00.000Z' }],
        { trend: 'stable', total: 1 }
      )
    ).toBe('flare_up');
  });

  /**
   * 5 (UI slice). Very high last pain → escalation state on Today
   * (distinct from engine `escalate` outcome but aligned in spirit).
   */
  it('5. last pain ≥9 → escalation', () => {
    expect(
      deriveTodayRecoveryState(
        [{ pain_level: 9, pain_change: 'Same', created_at: '2026-06-14T12:00:00.000Z' }],
        null
      )
    ).toBe('escalation');
  });

  it('worsening trend with ≥3 total check-ins → flare_up', () => {
    expect(
      deriveTodayRecoveryState(
        [{ pain_level: 4, pain_change: 'Same', created_at: '2026-06-14T12:00:00.000Z' }],
        { trend: 'worsening', total: 3 }
      )
    ).toBe('flare_up');
  });

  it('benign last log → stable', () => {
    expect(
      deriveTodayRecoveryState(
        [{ pain_level: 3, pain_change: 'Same', created_at: '2026-06-14T12:00:00.000Z' }],
        { trend: 'stable', total: 5 }
      )
    ).toBe('stable');
  });
});
