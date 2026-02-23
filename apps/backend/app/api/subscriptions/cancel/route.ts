import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { stripe } from '../../../../lib/stripe';

/**
 * POST /api/subscriptions/cancel
 *
 * Schedules a Rejuuv subscription to cancel at the end of the current
 * billing period (`cancel_at_period_end: true`).  The user retains full
 * access until `current_period_end`.
 *
 * Body:
 *   subscription_id  string  – Stripe subscription ID to cancel (required)
 *
 * Response:
 *   {
 *     subscription: {
 *       id, status, cancel_at_period_end,
 *       current_period_end, canceled_at
 *     }
 *   }
 *
 * Errors:
 *   400 – missing subscription_id, or subscription is already canceled
 *   401 – unauthenticated
 *   403 – subscription belongs to a different user or is not a Rejuuv sub
 *   404 – subscription not found
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { subscription_id } = body as { subscription_id?: string };

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'subscription_id is required' },
        { status: 400 }
      );
    }

    // Resolve the user's Stripe customer ID without creating a new one —
    // if they have no customer yet they can't own any subscription.
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      );
    }

    // Fetch the subscription from Stripe.
    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(subscription_id, {
        expand: ['items.data.price.product'],
      });
    } catch {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // ── Ownership check ────────────────────────────────────────────────────
    const subCustomerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    if (subCustomerId !== user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Subscription does not belong to this user' },
        { status: 403 }
      );
    }

    // ── Product check — reject non-Rejuuv subscriptions ───────────────────
    const rejuuvProductId = process.env.REJUUV_PRODUCT_ID;
    if (rejuuvProductId) {
      const isRejuuv = sub.items.data.some(
        (item) =>
          (item.price.product as Stripe.Product).id === rejuuvProductId
      );
      if (!isRejuuv) {
        return NextResponse.json(
          { error: 'Subscription is not a Rejuuv subscription' },
          { status: 403 }
        );
      }
    }

    // ── Guard: already canceled ────────────────────────────────────────────
    if (sub.status === 'canceled') {
      return NextResponse.json(
        { error: 'Subscription is already canceled' },
        { status: 400 }
      );
    }

    if (sub.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is already scheduled for cancellation' },
        { status: 400 }
      );
    }

    // ── Schedule cancellation at period end ───────────────────────────────
    const updated = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });

    // Keep the local subscriptions table in sync immediately (the webhook
    // will also fire, but this makes reads consistent without waiting).
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('stripe_subscription_id', subscription_id);

    return NextResponse.json({
      subscription: {
        id: updated.id,
        status: updated.status,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: new Date(
          updated.current_period_end * 1000
        ).toISOString(),
        canceled_at: updated.canceled_at
          ? new Date(updated.canceled_at * 1000).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to cancel subscription',
      },
      { status: 500 }
    );
  }
}
