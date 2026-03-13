import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { stripe } from '../../../../lib/stripe';
import { resolveStripeCustomer } from '../../../../lib/stripe-customer';

/**
 * POST /api/subscriptions/checkout
 *
 * Two distinct behaviours depending on the request body:
 *
 * ① New subscription  (no `subscription_id`)
 *    → Creates a Stripe Checkout Session in `subscription` mode.
 *    → Response: { url: string }   — redirect the user here.
 *
 * ② Upgrade / downgrade  (`subscription_id` + `price_id` provided)
 *    → Updates the existing subscription item to the new price immediately
 *      (Stripe prorates the difference automatically).
 *    → Response: { subscription: { id, status, items } }
 *
 * Body:
 *   price_id        string?  – target Stripe price ID (defaults to STRIPE_PRICE_ID_PRO)
 *   subscription_id string?  – existing subscription to modify (upgrade/downgrade)
 *   trial_days      number?  – for new subscription only: add a free trial (e.g. 7 for 7-day trial)
 *
 * The frontend can distinguish the two responses by checking for the
 * presence of `url` vs `subscription` in the JSON.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { price_id: bodyPriceId, subscription_id, trial_days } = body as {
      price_id?: string;
      subscription_id?: string;
      trial_days?: number;
    };

    // price_id is optional — fall back to the configured Pro price so mobile
    // clients don't need to know the Stripe price ID.
    const price_id = bodyPriceId ?? process.env.STRIPE_PRICE_ID_PRO;

    if (!price_id) {
      return NextResponse.json(
        { error: 'price_id is required and STRIPE_PRICE_ID_PRO is not configured' },
        { status: 400 }
      );
    }

    // Ensure the price belongs to the Rejuuv product — prevents the frontend
    // from being used to purchase OdysseyOS or other products via this route.
    const rejuuvProductId = process.env.REJUUV_PRODUCT_ID;
    if (rejuuvProductId) {
      const price = await stripe.prices.retrieve(price_id, {
        expand: ['product'],
      });
      const productId = (price.product as Stripe.Product).id;
      if (productId !== rejuuvProductId) {
        return NextResponse.json(
          { error: 'price_id does not belong to the Rejuuv product' },
          { status: 400 }
        );
      }
    }

    // -----------------------------------------------------------------------
    // Path A: upgrade / downgrade an existing subscription
    // -----------------------------------------------------------------------
    if (subscription_id) {
      // Fetch the subscription and verify it belongs to this user.
      const { customerId } = await resolveStripeCustomer(userId);

      const existingSub = await stripe.subscriptions.retrieve(subscription_id, {
        expand: ['items.data.price.product'],
      });

      const subCustomerId =
        typeof existingSub.customer === 'string'
          ? existingSub.customer
          : existingSub.customer.id;

      if (subCustomerId !== customerId) {
        return NextResponse.json(
          { error: 'Subscription does not belong to this user' },
          { status: 403 }
        );
      }

      // Verify the subscription is a Rejuuv subscription.
      if (rejuuvProductId) {
        const isRejuuv = existingSub.items.data.some(
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

      // Find the subscription item to update (the Rejuuv item).
      const itemToUpdate = existingSub.items.data.find(
        (item) =>
          !rejuuvProductId ||
          (item.price.product as Stripe.Product).id === rejuuvProductId
      );

      if (!itemToUpdate) {
        return NextResponse.json(
          { error: 'No Rejuuv item found on subscription' },
          { status: 400 }
        );
      }

      // Perform the plan change. Stripe prorates by default.
      const updatedSub = await stripe.subscriptions.update(subscription_id, {
        items: [{ id: itemToUpdate.id, price: price_id }],
        proration_behavior: 'create_prorations',
      });

      return NextResponse.json({
        subscription: {
          id: updatedSub.id,
          status: updatedSub.status,
          cancel_at_period_end: updatedSub.cancel_at_period_end,
          current_period_end: new Date(
            updatedSub.current_period_end * 1000
          ).toISOString(),
        },
      });
    }

    // -----------------------------------------------------------------------
    // Path B: new subscription — create a Stripe Checkout Session
    // -----------------------------------------------------------------------
    const { customerId } = await resolveStripeCustomer(userId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const successUrl =
      process.env.STRIPE_SUCCESS_URL ??
      `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL ?? `${appUrl}/subscription/cancel`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: userId },
    };
    if (trial_days != null && trial_days > 0 && !subscription_id) {
      sessionParams.subscription_data = { trial_period_days: Math.min(30, Math.round(trial_days)) };
    }
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error in subscriptions/checkout:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Checkout failed',
      },
      { status: 500 }
    );
  }
}
