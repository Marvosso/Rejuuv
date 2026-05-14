import { describe, it, expect } from 'vitest';
import { sanitizeForPromptInput, stringifyForPrompt } from './prompt-sanitize';

describe('sanitizeForPromptInput', () => {
  it('drops sensitive keys', () => {
    const out = sanitizeForPromptInput({
      body_area: 'lower_back',
      password: 'secret',
      apiKey: 'x',
      notes: 'hello',
    }) as Record<string, unknown>;
    expect(out.body_area).toBe('lower_back');
    expect(out.password).toBeUndefined();
    expect(out.apiKey).toBeUndefined();
    expect(out.notes).toBe('hello');
  });

  it('truncates long strings', () => {
    const long = 'a'.repeat(5000);
    const out = sanitizeForPromptInput({ x: long }) as Record<string, unknown>;
    const s = out.x as string;
    expect(s.length).toBeLessThan(long.length);
    expect(s).toContain('truncated');
  });

  it('stringifyForPrompt caps total size', () => {
    const huge = { a: 'b'.repeat(60_000) };
    const s = stringifyForPrompt(huge, { maxJsonChars: 5000 });
    expect(s.length).toBeLessThanOrEqual(5100);
  });
});
