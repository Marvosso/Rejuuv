import { supabase } from '../db';
import type { TelemetryEventName } from './event-names';
import { sanitizeTelemetryProperties } from './telemetry-properties';

export type TelemetrySource = 'server' | 'client';

/**
 * Fire-and-forget analytics row. Never throws; failures are logged only.
 */
export function trackTelemetry(
  userId: string,
  eventName: TelemetryEventName,
  properties: Record<string, unknown> = {},
  source: TelemetrySource = 'server'
): void {
  void (async () => {
    try {
      const safeProps = sanitizeTelemetryProperties(properties);
      const { error } = await supabase.from('telemetry_events').insert({
        user_id: userId,
        event_name: eventName,
        properties: safeProps,
        source,
      });
      if (error) console.error('[telemetry]', eventName, error.message);
    } catch (e) {
      console.error('[telemetry]', eventName, e);
    }
  })();
}
