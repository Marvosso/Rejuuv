import { getAccessTokenForApi } from './auth';
import { apiFetch } from './api-fetch';

/**
 * Best-effort client funnel / screen signals (allowlisted on the server).
 * Never throws; safe to fire-and-forget from UI.
 */
export async function trackClientTelemetry(
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const token = await getAccessTokenForApi();
    if (!token) return;
    await apiFetch('/telemetry', {
      method: 'POST',
      body: JSON.stringify({ event, properties }),
    });
  } catch {
    /* ignore */
  }
}
