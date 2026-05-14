import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import {
  apiFailure,
  API_ERROR_CODES,
  logApiRouteFailure,
} from '../../../../lib/api-errors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(userId, 'POST /stripe/checkout');
    if (!limited.ok) {
      return limited.response;
    }

    // Fetch user email + existing Stripe customer ID from the public users table.
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      // Fall back to the auth system if the public row doesn't exist yet.
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      if (!authData.user) {
        return apiFailure(API_ERROR_CODES.NOT_FOUND, 'User not found', 404, true);
      }
    }

    const email = user?.email;
    let customerId = user?.stripe_customer_id ?? null;

    // Create a Stripe Customer on first checkout.
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Persist the customer ID so future checkouts reuse it.
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    const priceId = process.env.STRIPE_PRICE_ID_PRO;
    if (!priceId) {
      logApiRouteFailure('POST /api/stripe/checkout', new Error('STRIPE_PRICE_ID_PRO missing'));
      return apiFailure(
        API_ERROR_CODES.CONFIG_ERROR,
        'Billing is temporarily unavailable.',
        500,
        true
      );
    }

    // For mobile apps, SUCCESS_URL / CANCEL_URL can be deep-link URIs.
    // Override STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL in .env if needed.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const successUrl =
      process.env.STRIPE_SUCCESS_URL ??
      `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL ?? `${appUrl}/subscription/cancel`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { supabase_user_id: userId },
      // Allow promo codes in the checkout UI.
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logApiRouteFailure('POST /api/stripe/checkout', error);
    return apiFailure(
      API_ERROR_CODES.STRIPE_ERROR,
      'Checkout could not be completed. Please try again.',
      500,
      true
    );
  }
}
