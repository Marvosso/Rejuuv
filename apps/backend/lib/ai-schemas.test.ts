import { describe, it, expect } from 'vitest';
import { STARTER_PLAN } from './starter-plan';
import {
  analysisResultSchema,
  checkInAdjustmentsSchema,
  recoveryPlanOutputSchema,
  safetyScreeningSchema,
} from './ai-schemas';
import { recoveryPlanSchemaFallback } from './ai-fallbacks';

describe('recoveryPlanOutputSchema', () => {
  it('accepts STARTER_PLAN', () => {
    const parsed = recoveryPlanOutputSchema.safeParse(JSON.parse(JSON.stringify(STARTER_PLAN)));
    expect(parsed.success).toBe(true);
  });

  it('recoveryPlanSchemaFallback returns valid data', () => {
    const fb = recoveryPlanSchemaFallback();
    expect(fb.focus_areas.length).toBeGreaterThan(0);
    expect(fb.recovery_plan.phase_1_days_1_to_7.exercises.length).toBeGreaterThan(0);
  });
});

describe('safetyScreeningSchema', () => {
  it('normalizes lowercase status', () => {
    const r = safetyScreeningSchema.safeParse({
      status: 'safe',
      user_message: null,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe('SAFE');
  });
});

describe('analysisResultSchema', () => {
  it('requires core string fields', () => {
    const ok = analysisResultSchema.safeParse({
      summary: 'x',
      possible_contributors: ['a'],
      education: 'y',
      safety_note: 'z',
    });
    expect(ok.success).toBe(true);
  });
});

describe('checkInAdjustmentsSchema', () => {
  it('accepts typical check-in JSON', () => {
    const ok = checkInAdjustmentsSchema.safeParse({
      adjustment_summary: 'Progress looks steady.',
      updated_recommendations: ['Consider shorter sessions'],
      next_check_in: 'In 2 days',
      safety_reminder: '',
    });
    expect(ok.success).toBe(true);
  });
});
