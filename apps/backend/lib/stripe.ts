import Stripe from 'stripe';

/**
 * Shared Stripe client singleton.
 * Import this instead of calling `new Stripe(...)` in every route file.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
