import { supabase } from './db';
import { getUserSubscriptionStatus } from './subscription';
import { TELEMETRY_EVENTS } from './telemetry';

export type ContinuitySnapshot = {
  has_active_subscription: boolean;
  assessments_count: number;
  check_ins_7d: number;
  check_ins_30d: number;
  recovery_plans_count: number;
  timeline_opens_30d: number;
};

function sinceIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/**
 * Aggregates for Settings / internal continuity cards (no PII in payload).
 */
export async function getContinuitySnapshot(userId: string): Promise<ContinuitySnapshot> {
  const since7 = sinceIso(7);
  const since30 = sinceIso(30);

  const [
    { isActive },
    assessments,
    ci7,
    ci30,
    plans,
    timelineOpens,
  ] = await Promise.all([
    getUserSubscriptionStatus(userId),
    supabase
      .from('assessments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since7),
    supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since30),
    supabase
      .from('recovery_plans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('telemetry_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_name', TELEMETRY_EVENTS.TIMELINE_DATA_LOADED)
      .gte('created_at', since30),
  ]);

  return {
    has_active_subscription: isActive,
    assessments_count: assessments.count ?? 0,
    check_ins_7d: ci7.count ?? 0,
    check_ins_30d: ci30.count ?? 0,
    recovery_plans_count: plans.count ?? 0,
    timeline_opens_30d: timelineOpens.error ? 0 : timelineOpens.count ?? 0,
  };
}
