import { supabase } from './db';
import { log } from './logger';

/**
 * Tables keyed by `user_id` without an FK to `public.users` will not CASCADE
 * when the user row is deleted. Clean those explicitly first.
 */
export async function deleteSupplementaryUserScopedRows(userId: string): Promise<{
  ok: boolean;
  errorMessage?: string;
}> {
  const { error } = await supabase.from('api_rate_limit_counters').delete().eq('user_id', userId);
  if (error) {
    log.warn('account-deletion', 'api_rate_limit_counters delete failed (non-fatal)', {
      message: error.message,
    });
    return { ok: false, errorMessage: error.message };
  }
  return { ok: true };
}

/**
 * Deletes `public.users` by primary key. FK CASCADE removes assessments, plans,
 * check-ins, adaptation_events, push_tokens, telemetry_events, subscriptions (app mirror), etc.
 *
 * Does **not** modify Stripe objects — billing history and legal retention remain in Stripe
 * unless you add a separate, counsel-approved flow.
 */
export async function deletePublicUserRow(userId: string) {
  return supabase.from('users').delete().eq('id', userId);
}
