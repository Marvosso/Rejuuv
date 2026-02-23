import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';
import { stripe } from '../../../lib/stripe';

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

export interface BillingInfo {
  /** Stripe price ID. */
  price_id: string;
  /** Price in the currency's smallest unit (e.g. cents for USD). */
  unit_amount: number | null;
  /** ISO 4217 currency code, lowercase (e.g. "usd"). */
  currency: string;
  /** Billing interval: "day" | "week" | "month" | "year" */
  interval: string | null;
  /** Number of intervals between billings (usually 1). */
  interval_count: number | null;
  /** Human-readable price string, e.g. "$19.00 / month". */
  display: string;
}

export interface RejuuvSubscription {
  /** Stripe subscription ID. */
  id: string;
  /** Product name for display, e.g. "Rejuuv Pro". */
  planName: string;
  /** Stripe subscription status. */
  status: Stripe.Subscription.Status;
  /** True when the subscription will not renew at period end. */
  cancel_at_period_end: boolean;
  /** ISO 8601 start of the current billing period. */
  current_period_start: string;
  /** ISO 8601 end of the current billing period (also the access expiry date). */
  current_period_end: string;
  /** ISO 8601 timestamp when the subscription was actually canceled, or null. */
  canceled_at: string | null;
  /**
   * Pricing details for the Rejuuv plan item.
   * Null only when the subscription has no recognisable Rejuuv price item.
   */
  billing_info: BillingInfo | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a human-readable price string from Stripe price fields.
 * Examples: "$19.00 / month", "£99.00 / year", "€0.00"
 */
function formatBillingDisplay(
  unitAmount: number | null,
  currency: string,
  interval: string | null,
  intervalCount: number | null
): string {
  if (unitAmount == null) return '';

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);

  if (!interval) return formatted;

  const every =
    intervalCount && intervalCount > 1 ? `every ${intervalCount} ` : '';
  return `${formatted} / ${every}${interval}`;
}

// ---------------------------------------------------------------------------

/**
 * GET /api/subscriptions
 *
 * Returns all Rejuuv subscriptions (any status) for the authenticated user.
 *
 * Filtering:
 *   - Only subscriptions that contain at least one item whose product matches
 *     `process.env.REJUUV_PRODUCT_ID` are returned.
 *   - Within each subscription only the Rejuuv line items are surfaced.
 *   - OdysseyOS and any other product data is never present in the response.
 *
 * Auth: Bearer token (Supabase JWT) in the Authorization header.
 *
 * Response: { subscriptions: RejuuvSubscription[] }
 */
export async function GET(request: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Config guard ────────────────────────────────────────────────────────
    const rejuuvProductId = process.env.REJUUV_PRODUCT_ID;
    if (!rejuuvProductId) {
      console.error('REJUUV_PRODUCT_ID is not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration: REJUUV_PRODUCT_ID is not set' },
        { status: 500 }
      );
    }

    // ── Resolve Stripe customer ──────────────────────────────────────────────
    // Look up the user's Stripe customer ID from the public users table.
    // If they have never started a checkout they won't have one — return
    // an empty list rather than throwing.
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json({ subscriptions: [] });
    }

    // ── Fetch from Stripe ───────────────────────────────────────────────────
    // Expand items → price → product so we can filter and shape in one pass
    // without additional round-trips.
    const stripeList = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'all',
      expand: ['data.items.data.price.product'],
      limit: 100,
    });

    // ── Shape & filter ──────────────────────────────────────────────────────
    const subscriptions: RejuuvSubscription[] = stripeList.data
      // Drop subscriptions that contain no Rejuuv items (e.g. OdysseyOS-only).
      .filter((sub) =>
        sub.items.data.some(
          (item) =>
            (item.price.product as Stripe.Product).id === rejuuvProductId
        )
      )
      .map((sub) => {
        // Isolate the first Rejuuv item for planName and billing_info.
        const rejuuvItem = sub.items.data.find(
          (item) =>
            (item.price.product as Stripe.Product).id === rejuuvProductId
        );

        const product = rejuuvItem
          ? (rejuuvItem.price.product as Stripe.Product)
          : null;

        const billingInfo: BillingInfo | null = rejuuvItem
          ? {
              price_id: rejuuvItem.price.id,
              unit_amount: rejuuvItem.price.unit_amount,
              currency: rejuuvItem.price.currency,
              interval: rejuuvItem.price.recurring?.interval ?? null,
              interval_count:
                rejuuvItem.price.recurring?.interval_count ?? null,
              display: formatBillingDisplay(
                rejuuvItem.price.unit_amount,
                rejuuvItem.price.currency,
                rejuuvItem.price.recurring?.interval ?? null,
                rejuuvItem.price.recurring?.interval_count ?? null
              ),
            }
          : null;

        return {
          id: sub.id,
          planName: product?.name ?? 'Rejuuv Pro',
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_start: new Date(
            sub.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            sub.current_period_end * 1000
          ).toISOString(),
          canceled_at: sub.canceled_at
            ? new Date(sub.canceled_at * 1000).toISOString()
            : null,
          billing_info: billingInfo,
        };
      });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching Rejuuv subscriptions:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch subscriptions',
      },
      { status: 500 }
    );
  }
}
