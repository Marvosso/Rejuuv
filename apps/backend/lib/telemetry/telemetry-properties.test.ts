import { describe, it, expect } from 'vitest';
import { sanitizeTelemetryProperties } from './telemetry-properties';

describe('sanitizeTelemetryProperties', () => {
  it('drops clinical keys and truncates long strings', () => {
    const out = sanitizeTelemetryProperties({
      plan_id: 'abc',
      notes: 'secret symptom text',
      pain_band: 'high',
      long: 'z'.repeat(500),
    });
    expect(out.notes).toBeUndefined();
    expect(out.plan_id).toBe('abc');
    expect(out.pain_band).toBe('high');
    expect(out.long).toMatch(/^\[string:/);
  });

  it('handles empty input', () => {
    expect(sanitizeTelemetryProperties(undefined)).toEqual({});
  });
});
