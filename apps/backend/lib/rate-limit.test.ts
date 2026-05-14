import { describe, it, expect } from 'vitest';
import { getRequestIpHash } from './rate-limit';

describe('getRequestIpHash', () => {
  it('is stable for the same forwarded IP', () => {
    const req = new Request('https://example.com/', {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
    });
    expect(getRequestIpHash(req)).toBe(getRequestIpHash(req));
  });

  it('returns null when no IP headers', () => {
    const req = new Request('https://example.com/');
    expect(getRequestIpHash(req)).toBeNull();
  });
});
