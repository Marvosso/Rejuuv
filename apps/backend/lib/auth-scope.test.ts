import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireUser } from './auth-scope';
import * as auth from './auth';

vi.mock('./auth');

describe('requireUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns userId when JWT resolves', async () => {
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue('user-uuid');
    const r = await requireUser(new Request('https://example.com/api/x'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.userId).toBe('user-uuid');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue(null);
    const r = await requireUser(new Request('https://example.com/api/x'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(401);
      const body = (await r.response.json()) as {
        success: boolean;
        error: { code: string; message: string; recoverable: boolean };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Unauthorized');
    }
  });
});
