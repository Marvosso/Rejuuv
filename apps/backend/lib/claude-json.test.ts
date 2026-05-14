import { describe, it, expect } from 'vitest';
import { tryExtractJSON } from './claude';

function mockClaudeTextResponse(text: string): unknown {
  return {
    content: [{ type: 'text', text }],
  };
}

describe('tryExtractJSON', () => {
  it('parses fenced JSON', () => {
    const r = tryExtractJSON(mockClaudeTextResponse('```json\n{"a":1}\n```'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ a: 1 });
  });

  it('salvages embedded object when outer text is noisy', () => {
    const r = tryExtractJSON(
      mockClaudeTextResponse('Here you go:\n{"status":"SAFE","user_message":null}\nThanks!')
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as { status: string }).status).toBe('SAFE');
  });

  it('returns no_text for empty blocks', () => {
    const r = tryExtractJSON({ content: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_text');
  });
});
