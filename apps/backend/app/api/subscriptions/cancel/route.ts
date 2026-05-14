import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { stripe } from '../../../../lib/stripe';
import {
  apiFailure,
  API_ERROR_CODES,
  logApiRouteFailure,
} from '../../../../lib/api-errors';

/**
 * POST /api/subscriptions/cancel
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const body = await request.json().catch(() => ({}));
    const { subscription_id } = body as { subscription_id?: string };

    if (!subscription_id) {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'subscription_id is required',
        400,
        true
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return apiFailure(
        API_ERROR_CODES.NOT_FOUND,
        'No subscription found for this user',
        404,
        true
      );
    }

    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(subscription_id, {
        expand: ['items.data.price.product'],
      });
    } catch {
      return apiFailure(API_ERROR_CODES.NOT_FOUND, 'Subscription not found', 404, true);
    }

    const subCustomerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    if (subCustomerId !== user.stripe_customer_id) {
      return apiFailure(
        API_ERROR_CODES.FORBIDDEN,
        'Subscription does not belong to this user',
        403,
        false
      );
    }

    const rejuuvProductId = process.env.REJUUV_PRODUCT_ID;
    if (rejuuvProductId) {
      const isRejuuv = sub.items.data.some(
        (item) => (item.price.product as Stripe.Product).id === rejuuvProductId
      );
      if (!isRejuuv) {
        return apiFailure(
          API_ERROR_CODES.FORBIDDEN,
          'Subscription is not a Rejuuv subscription',
          403,
          false
        );
      }
    }

    if (sub.status === 'canceled') {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'Subscription is already canceled',
        400,
        true
      );
    }

    if (sub.cancel_at_period_end) {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'Subscription is already scheduled for cancellation',
        400,
        true
      );
    }

    const updated = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });

    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('stripe_subscription_id', subscription_id)
      .eq('user_id', userId);

    return NextResponse.json({
      subscription: {
        id: updated.id,
        status: updated.status,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        canceled_at: updated.canceled_at
          ? new Date(updated.canceled_at * 1000).toISOString()
          : null,
      },
    });
  } catch (error) {
    logApiRouteFailure('POST /api/subscriptions/cancel', error);
    return apiFailure(
      API_ERROR_CODES.STRIPE_ERROR,
      'Could not cancel subscription. Please try again.',
      500,
      true
    );
  }
}
