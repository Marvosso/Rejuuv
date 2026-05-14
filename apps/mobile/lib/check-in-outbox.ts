import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiJsonResult } from './api-fetch';
import { apiFetchJson } from './api-fetch';
import { logClientError } from './crash-reporting';
import { getUser, isSupabaseConfigured } from './auth';

const STORAGE_KEY = 'rejuuv_check_in_outbox_v1';

export type PendingCheckInEnvelope = {
  userId: string;
  clientRequestId: string;
  body: Record<string, unknown>;
  createdAt: string;
};

function isValidEnvelope(x: unknown): x is PendingCheckInEnvelope {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.userId === 'string' &&
    typeof o.clientRequestId === 'string' &&
    o.body !== null &&
    typeof o.body === 'object' &&
    typeof o.createdAt === 'string'
  );
}

async function readAll(): Promise<PendingCheckInEnvelope[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEnvelope);
  } catch {
    return [];
  }
}

async function writeAll(rows: PendingCheckInEnvelope[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function generateClientRequestId(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

/** True when the failure is likely transient (offline, server, rate limit) — safe to outbox. */
export function shouldQueueCheckInFailure<T>(result: ApiJsonResult<T>): boolean {
  if (result.ok) return false;
  if (result.status === 401 || result.status === 403) return false;
  if (result.status === 404 || result.status === 400 || result.status === 422) return false;
  if (result.status >= 500) return true;
  if (result.status === 429 || result.status === 408) return true;
  if (result.recoverable === true) return true;
  return false;
}

export async function enqueuePendingCheckIn(body: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured) return;
  const u = await getUser();
  if (!u?.id) return;
  const id = body.client_request_id;
  if (typeof id !== 'string' || !id.trim()) return;
  const rows = await readAll();
  if (rows.some((r) => r.clientRequestId === id.trim())) return;
  rows.push({
    userId: u.id,
    clientRequestId: id.trim(),
    body: { ...body, client_request_id: id.trim() },
    createdAt: new Date().toISOString(),
  });
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  await writeAll(rows);
}

export async function getPendingCheckInOutboxCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const u = await getUser();
  if (!u?.id) return 0;
  const rows = await readAll();
  return rows.filter((r) => r.userId === u.id).length;
}

let draining = false;

/** POST each pending check-in in order; drops bad rows; keeps queue on 401 or network errors. */
export async function processCheckInOutbox(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (draining) return;
  draining = true;
  try {
    const u = await getUser();
    const currentUserId = u?.id;
    if (!currentUserId) return;

    const rows = await readAll();
    if (rows.length === 0) return;

    const kept: PendingCheckInEnvelope[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (row.userId !== currentUserId) {
        kept.push(row);
        continue;
      }
      try {
        const result = await apiFetchJson<Record<string, unknown>>('/check-ins', {
          method: 'POST',
          body: JSON.stringify(row.body),
        });
        if (result.ok) {
          continue;
        }
        if (result.status === 401) {
          kept.push(row, ...rows.slice(i + 1));
          break;
        }
        if (result.status === 400 || result.status === 404) {
          logClientError(new Error(`check-in outbox dropped: ${result.message}`), {
            step: 'outbox_sync',
            status: result.status,
            clientRequestId: row.clientRequestId,
          });
          continue;
        }
        kept.push(row);
      } catch (e) {
        logClientError(e instanceof Error ? e : new Error('check-in outbox sync failed'), {
          step: 'outbox_sync',
          clientRequestId: row.clientRequestId,
        });
        kept.push(row);
      }
    }
    await writeAll(kept);
  } finally {
    draining = false;
  }
}

/**
 * POST /check-ins once with a fresh client_request_id. On transient failure, persists the exact
 * body for later sync (same id → server dedupes).
 */
export async function submitCheckInWithOfflineQueue(body: Record<string, unknown>): Promise<
  | { kind: 'success'; data: Record<string, unknown> }
  | { kind: 'queued' }
  | { kind: 'error'; message: string; unauthorized?: boolean }
> {
  const clientRequestId = generateClientRequestId();
  const fullBody: Record<string, unknown> = { ...body, client_request_id: clientRequestId };

  try {
    const result = await apiFetchJson<Record<string, unknown>>('/check-ins', {
      method: 'POST',
      body: JSON.stringify(fullBody),
    });
    if (result.ok) {
      return { kind: 'success', data: result.data };
    }
    if (result.status === 401) {
      return { kind: 'error', message: result.message, unauthorized: true };
    }
    if (shouldQueueCheckInFailure(result)) {
      await enqueuePendingCheckIn(fullBody);
      return { kind: 'queued' };
    }
    return { kind: 'error', message: result.message };
  } catch {
    await enqueuePendingCheckIn(fullBody);
    return { kind: 'queued' };
  }
}
