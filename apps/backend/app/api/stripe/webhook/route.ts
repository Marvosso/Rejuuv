import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/db';
import { TELEMETRY_EVENTS, trackTelemetry } from '../../../../lib/telemetry';
import {
  apiFailure,
  API_ERROR_CODES,
  logApiRouteFailure,
} from '../../../../lib/api-errors';
import { log } from '../../../../lib/logger';

// Required for raw body access — App Router does not pre-parse bodies,
// but marking this as nodejs runtime is an explicit safety guarantee.
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Stripe subscription statuses that grant Pro access. */
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return apiFailure(
      API_ERROR_CODES.WEBHOOK_ERROR,
      'Invalid webhook request.',
      400,
      false
    );
  }

  // Read the raw body — required for Stripe signature verification.
  const rawBody = await request.text();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logApiRouteFailure('POST /api/stripe/webhook', new Error('STRIPE_WEBHOOK_SECRET missing'));
    return apiFailure(
      API_ERROR_CODES.CONFIG_ERROR,
      'Webhook is not configured.',
      500,
      true
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logApiRouteFailure('POST /api/stripe/webhook', err, { phase: 'signature_verify' });
    return apiFailure(
      API_ERROR_CODES.WEBHOOK_ERROR,
      'Invalid webhook signature.',
      400,
      false
    );
  }

  const { data: already } = await supabase
    .from('processed_stripe_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (already) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
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

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logApiRouteFailure('POST /api/stripe/webhook', err, { event_type: event.type });
    return apiFailure(
      API_ERROR_CODES.WEBHOOK_ERROR,
      'Webhook processing failed.',
      500,
      true
    );
  }

  const { error: insErr } = await supabase
    .from('processed_stripe_events')
    .insert({ stripe_event_id: event.id });

  if (insErr && insErr.code !== '23505') {
    log.error('stripe-webhook', 'processed_stripe_events_insert_failed', {
      code: insErr.code,
      message: (insErr.message ?? '').slice(0, 300),
    });
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

  const { data: user, error } = await supabase
    .from('users')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !user) {
    log.warn('stripe-webhook', 'user_missing_for_customer', {
      stripe_customer_id_suffix: customerId.slice(-6),
    });
    return;
  }

  const priorUserTier = user.subscription_tier;

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

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
    log.error('stripe-webhook', 'subscription_upsert_failed', {
      code: upsertError.code,
      message: (upsertError.message ?? '').slice(0, 300),
    });
    return;
  }

  const tier = ACTIVE_STATUSES.has(sub.status) ? 'paid' : 'free';
  await supabase.from('users').update({ subscription_tier: tier }).eq('id', user.id);

  const statusChanged = !existingSub || existingSub.status !== sub.status;
  if (statusChanged) {
    trackTelemetry(user.id, TELEMETRY_EVENTS.SUBSCRIPTION_SYNCED, {
      from_status: existingSub?.status ?? null,
      to_status: sub.status,
    });
  }

  if (priorUserTier !== 'paid' && tier === 'paid') {
    trackTelemetry(user.id, TELEMETRY_EVENTS.SUBSCRIPTION_CONVERSION, {
      stripe_status: sub.status,
    });
  }
}
