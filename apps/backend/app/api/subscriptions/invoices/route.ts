import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { stripe } from '../../../../lib/stripe';

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

export interface RejuuvInvoiceLine {
  id: string;
  description: string | null;
  /** Line amount in the currency's smallest unit (e.g. cents). */
  amount: number;
  currency: string;
  price_id: string | null;
  period_start: string;
  period_end: string;
}

export interface RejuuvInvoice {
  /** Stripe invoice ID. */
  id: string;
  /** Human-readable invoice number, e.g. "INV-0001". */
  invoice_number: string | null;
  /** Stripe invoice status: draft | open | paid | uncollectible | void */
  status: Stripe.Invoice.Status | null;
  /**
   * Amount relevant for display purposes.
   * For paid invoices this is the amount paid; otherwise the amount due.
   * Always in the currency's smallest unit (e.g. cents for USD).
   */
  amount: number;
  /** Raw amount due (may differ from `amount` when partially paid). */
  amount_due: number;
  /** Raw amount paid. */
  amount_paid: number;
  /** Outstanding balance remaining. */
  amount_remaining: number;
  /** ISO 4217 currency code, lowercase. */
  currency: string;
  /** ISO 8601 invoice creation timestamp. */
  created: string;
  /** ISO 8601 start of the billing period this invoice covers. */
  period_start: string;
  /** ISO 8601 end of the billing period this invoice covers. */
  period_end: string;
  /** Stripe-hosted URL where the customer can view/pay the invoice. */
  hosted_invoice_url: string | null;
  /** Direct URL to the invoice PDF. Prefer this for "Download PDF" actions. */
  invoice_pdf: string | null;
  /**
   * Convenience alias — the best available PDF or view URL.
   * Use this for a single "View Invoice" / "Download PDF" action in the UI.
   * Prefers `invoice_pdf`; falls back to `hosted_invoice_url`.
   */
  pdf_link: string | null;
  /** Stripe subscription ID this invoice belongs to (null for one-off invoices). */
  subscription_id: string | null;
  /** Only Rejuuv product lines — all OdysseyOS lines are stripped. */
  lines: RejuuvInvoiceLine[];
}

// ---------------------------------------------------------------------------

/**
 * GET /api/subscriptions/invoices
 *
 * Returns all Stripe invoices for the authenticated user that contain at
 * least one line item whose product matches `process.env.REJUUV_PRODUCT_ID`.
 *
 * OdysseyOS and any other product line items are stripped from every invoice
 * before returning, so the mobile app never receives unrelated billing data.
 *
 * Auth: Bearer token (Supabase JWT) in the Authorization header.
 *
 * Query params:
 *   limit          number  (1–100, default 24) – page size
 *   starting_after string  – Stripe invoice ID cursor for forward pagination
 *
 * Response:
 *   {
 *     invoices:    RejuuvInvoice[],
 *     has_more:    boolean,
 *     total_count: number    // count of Rejuuv invoices in this page
 *   }
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
    // No Stripe customer → no invoices. Return an empty response rather than
    // throwing so the mobile app can render an empty billing history gracefully.
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json({
        invoices: [],
        has_more: false,
        total_count: 0,
      });
    }

    // ── Pagination params ───────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') ?? '24', 10);
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const startingAfter = searchParams.get('starting_after') ?? undefined;

    // ── Fetch from Stripe ───────────────────────────────────────────────────
    // Over-fetch (×2) so that after filtering out non-Rejuuv invoices we can
    // still return a full page in most cases. The `has_more` flag is taken
    // directly from Stripe and reflects the unfiltered list.
    const stripeInvoices = await stripe.invoices.list({
      customer: user.stripe_customer_id,
      expand: ['data.lines.data.price.product'],
      limit: Math.min(limit * 2, 100),
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    // ── Shape & filter ──────────────────────────────────────────────────────
    const rejuuvInvoices: RejuuvInvoice[] = stripeInvoices.data
      // Keep only invoices that have at least one Rejuuv line item.
      .filter((invoice) =>
        invoice.lines.data.some(
          (line) =>
            line.price &&
            (line.price.product as Stripe.Product).id === rejuuvProductId
        )
      )
      .slice(0, limit)
      .map((invoice) => {
        // Strip all non-Rejuuv lines — OdysseyOS data must never be returned.
        const rejuuvLines: RejuuvInvoiceLine[] = invoice.lines.data
          .filter(
            (line) =>
              line.price &&
              (line.price.product as Stripe.Product).id === rejuuvProductId
          )
          .map((line) => ({
            id: line.id,
            description: line.description ?? null,
            amount: line.amount,
            currency: line.currency,
            price_id: line.price?.id ?? null,
            period_start: new Date(line.period.start * 1000).toISOString(),
            period_end: new Date(line.period.end * 1000).toISOString(),
          }));

        const pdfLink =
          invoice.invoice_pdf ?? invoice.hosted_invoice_url ?? null;

        return {
          id: invoice.id,
          // invoice_number is the human-readable identifier (e.g. "INV-0001").
          invoice_number: invoice.number ?? null,
          status: invoice.status ?? null,
          // `amount` is the display amount: paid amount when settled,
          // amount due otherwise (e.g. for open invoices).
          amount:
            invoice.amount_paid > 0
              ? invoice.amount_paid
              : invoice.amount_due,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          amount_remaining: invoice.amount_remaining,
          currency: invoice.currency,
          created: new Date(invoice.created * 1000).toISOString(),
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString(),
          hosted_invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf: invoice.invoice_pdf ?? null,
          // pdf_link is the single best URL for a "View Invoice" action.
          pdf_link: pdfLink,
          subscription_id:
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : (invoice.subscription?.id ?? null),
          lines: rejuuvLines,
        };
      });

    return NextResponse.json({
      invoices: rejuuvInvoices,
      has_more: stripeInvoices.has_more,
      total_count: rejuuvInvoices.length,
    });
  } catch (error) {
    console.error('Error fetching Rejuuv invoices:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch invoices',
      },
      { status: 500 }
    );
  }
}
