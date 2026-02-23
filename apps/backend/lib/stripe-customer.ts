import { supabase } from './db';
import { stripe } from './stripe';

export interface ResolvedCustomer {
  customerId: string;
  /** True when a net-new Stripe Customer was created during this call. */
  created: boolean;
}

/**
 * Returns the Stripe customer ID for a Supabase user.
 *
 * If the user has no `stripe_customer_id` yet, a new Stripe Customer is
 * created and persisted to `users.stripe_customer_id` automatically.
 *
 * Throws if the user row cannot be found.
 */
export async function resolveStripeCustomer(
  userId: string
): Promise<ResolvedCustomer> {
  const { data: user, error } = await supabase
    .from('users')
    .select('email, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (error || !user) {
    // Fall back to the Supabase auth store for edge cases where the
    // public `users` row hasn't been created yet.
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    if (!authData.user) {
      throw new Error(`User ${userId} not found`);
    }

    const customer = await stripe.customers.create({
      email: authData.user.email ?? undefined,
      metadata: { supabase_user_id: userId },
    });

    await supabase
      .from('users')
      .upsert({ id: userId, stripe_customer_id: customer.id });

    return { customerId: customer.id, created: true };
  }

  if (user.stripe_customer_id) {
    return { customerId: user.stripe_customer_id, created: false };
  }

  // User row exists but no customer ID yet — create one.
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: { supabase_user_id: userId },
  });

  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return { customerId: customer.id, created: true };
}
