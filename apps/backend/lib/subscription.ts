import { supabase } from './db';

/** Stripe statuses that grant access to Pro features. */
const ACTIVE_STATUSES = ['active', 'trialing'];

/**
 * Returns whether the user has an active (or trialing) Pro subscription.
 * Queries the subscriptions table directly — the source of truth.
 */
export async function getUserSubscriptionStatus(userId: string): Promise<{
  isActive: boolean;
  status: string;
}> {
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES);

  const isActive = (count ?? 0) > 0;
  return { isActive, status: isActive ? 'active' : 'inactive' };
}

/**
 * Returns the total number of recovery plans the user has created.
 * Used to enforce the free-tier single-plan limit.
 */
export async function getUserPlanCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('recovery_plans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  return count ?? 0;
}
