import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/db';

// Required for raw body access — App Router does not pre-parse bodies,
// but marking this as nodejs runtime is an explicit safety guarantee.
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Stripe subscription statuses that grant Pro access. */
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // Read the raw body — required for Stripe signature verification.
  const rawBody = await request.text();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Fired when the user completes the Checkout flow.
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await upsertSubscription(sub);
        }
        break;
      }

      // Fired whenever a subscription is created or its state changes
      // (renewal, plan change, trial conversion, cancellation, etc.).
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }

      // Stripe also sends invoice.payment_failed, but the subscription
      // status transitions to `past_due` which is covered by the
      // `customer.subscription.updated` event above.

      default:
        // Unhandled event types are silently ignored.
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe event "${event.type}":`, err);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Upserts a Stripe subscription into the `subscriptions` table and keeps
 * `users.subscription_tier` in sync.
 */
async function upsertSubscription(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // Look up the internal user by their Stripe customer ID.
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !user) {
    console.error(
      `No user found for Stripe customer "${customerId}". ` +
        'Ensure the customer ID is stored in users.stripe_customer_id.'
    );
    return;
  }

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  // Upsert on the unique stripe_subscription_id column.
  const { error: upsertError } = await supabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' }
  );

  if (upsertError) {
    console.error('Failed to upsert subscription:', upsertError);
    return;
  }

  // Keep the denormalized users.subscription_tier column in sync so
  // lightweight checks don't require joining the subscriptions table.
  const tier = ACTIVE_STATUSES.has(sub.status) ? 'paid' : 'free';
  await supabase
    .from('users')
    .update({ subscription_tier: tier })
    .eq('id', user.id);
}
