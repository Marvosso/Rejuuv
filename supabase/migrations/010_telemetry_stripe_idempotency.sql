-- First-party telemetry (privacy-conscious properties; no raw clinical notes).
-- Written by the backend service role and optional authenticated client POST /api/telemetry.

CREATE TABLE IF NOT EXISTS telemetry_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name   VARCHAR(128) NOT NULL,
  properties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  source       VARCHAR(32) NOT NULL DEFAULT 'server',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user_created
  ON telemetry_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_created
  ON telemetry_events(event_name, created_at DESC);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own telemetry"
  ON telemetry_events FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE telemetry_events IS 'Product analytics and continuity signals; inserts via service role from API.';

-- Stripe webhook idempotency (at-least-once delivery).
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  stripe_event_id VARCHAR(255) PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE processed_stripe_events IS 'Dedup Stripe webhook deliveries; rows added after successful handling.';
