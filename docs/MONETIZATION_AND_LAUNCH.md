# Rejuuv monetization & launch checklist

## Monetization logic (present and wired)

### Backend

| Piece | Location | Purpose |
|-------|----------|--------|
| **Stripe Checkout (new sub + trial)** | `POST /api/subscriptions/checkout` | Creates Stripe Checkout Session; supports `trial_days` (e.g. 7-day trial). Returns `{ url }` to redirect user. |
| **Stripe Checkout (legacy)** | `POST /api/stripe/checkout` | Alternate checkout route (no trial_days); prefers using `/api/subscriptions/checkout`. |
| **Subscription list** | `GET /api/subscriptions` | Returns user’s Rejuuv subscriptions (active, trialing, past_due, canceled). |
| **Cancel at period end** | `POST /api/subscriptions/cancel` | Schedules subscription to cancel at period end. |
| **Invoices** | `GET /api/subscriptions/invoices` | Billing history for the user. |
| **Stripe webhook** | `POST /api/stripe/webhook` | Handles `checkout.session.completed`, `customer.subscription.created/updated/deleted`. Upserts `subscriptions` and syncs `users.subscription_tier` (`paid` / `free`). |
| **Pro gating** | `lib/subscription.ts` + `POST /api/recovery-plans` | `getUserSubscriptionStatus()` / `getUserPlanCount()`. Free users get one AI-generated plan; second plan returns static starter plan with `upgrade_required: true`. |

### Mobile app

| Piece | Location | Purpose |
|-------|----------|--------|
| **Subscription API client** | `lib/api-client.ts` → `subscriptionApi` | `list()`, `checkout(subscriptionId?, trialDays?)`, `cancel()`, `invoices()`. |
| **Subscription management screen** | `app/subscription/index.tsx` | View plan, status (active/trialing/past_due/canceled), start checkout, cancel, view invoices. |
| **7-day trial CTA** | `app/analysis/plan.tsx` → `handleStartTrial` | “Try Pro free — 7-day trial” calls `subscriptionApi.checkout(undefined, 7)` and opens Stripe Checkout URL. |
| **Types** | `lib/types.ts` | `Subscription`, `Invoice`; status includes `trialing`, `active`, etc. |

### Required environment (backend)

- `STRIPE_SECRET_KEY` – Stripe secret key.
- `STRIPE_WEBHOOK_SECRET` – For webhook signature verification.
- `STRIPE_PRICE_ID_PRO` – Pro price ID (required for checkout; 400 if missing).
- `REJUUV_PRODUCT_ID` – Optional; if set, checkout and list only allow this product.
- `NEXT_PUBLIC_APP_URL` – Used for success/cancel redirect URLs.
- Optional: `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` – Override redirect URLs.

### Stripe Dashboard

1. Create a Product (e.g. “Rejuuv Pro”) and a recurring Price; set `STRIPE_PRICE_ID_PRO` and `REJUUV_PRODUCT_ID`.
2. Webhooks: add endpoint `https://your-api/api/stripe/webhook`, subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`; set `STRIPE_WEBHOOK_SECRET`.

---

## Launch checklist

- [ ] **Stripe**: Product + Price created; `STRIPE_PRICE_ID_PRO` and `REJUUV_PRODUCT_ID` set in production env.
- [ ] **Stripe**: Webhook endpoint configured and secret set (`STRIPE_WEBHOOK_SECRET`).
- [ ] **Backend**: All Stripe env vars set (no 400 “STRIPE_PRICE_ID_PRO is not configured”).
- [ ] **Mobile**: `EXPO_PUBLIC_API_URL` points to production API.
- [ ] **Flows**: Start 7-day trial from plan screen → redirects to Stripe Checkout → after payment, webhook updates DB; subscription screen shows active/trialing.
- [ ] **Free-tier**: Creating a second recovery plan returns starter plan (no hard block); user can upgrade from plan screen or subscription screen.
- [ ] **Optional**: Handle `upgrade_required` in assessment/results flow to show an upgrade CTA when user receives the static starter plan.

---

## Summary

Monetization is implemented end-to-end: trial and paid checkout, webhook sync, subscription list/cancel/invoices, and Pro gating (one free AI plan, then starter plan + upgrade path). Launch readiness depends on configuring Stripe (product, price, webhook) and env vars in production.
