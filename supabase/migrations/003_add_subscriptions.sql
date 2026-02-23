-- Migration 003: Add subscriptions table for Stripe integration
--
-- Pricing tiers:
--   Free  – 1 recovery plan only, no check-in AI analysis limit
--   Pro   – $19/month → unlimited plan generation + unlimited check-ins

-- ============================================================
-- subscriptions
-- One row per Stripe subscription. Updated by the webhook handler.
-- The service-role key is used for all writes, so no INSERT RLS
-- policy is needed; SELECT is scoped to the owning user.
-- ============================================================
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id      VARCHAR NOT NULL,
  stripe_subscription_id  VARCHAR UNIQUE,
  stripe_price_id         VARCHAR,
  -- Stripe statuses: active | trialing | past_due | canceled |
  --                  incomplete | incomplete_expired | unpaid | paused
  status                  VARCHAR NOT NULL DEFAULT 'inactive',
  current_period_start    TIMESTAMP,
  current_period_end      TIMESTAMP,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id
  ON subscriptions(user_id);

CREATE INDEX idx_subscriptions_stripe_customer_id
  ON subscriptions(stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users may read their own subscription row from the mobile app.
CREATE POLICY "Users can select their own subscription"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- All writes go through the service-role key (webhook handler).
-- No INSERT/UPDATE/DELETE RLS policies are needed for that path.

-- Reuse the existing update_updated_at_column() function from migration 001.
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
