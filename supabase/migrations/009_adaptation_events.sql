-- Adaptation events: auditable continuity markers (phase changes, maintenance, future rules).
-- Written by backend on check-in when plan logic advances; read by recovery timeline API.

CREATE TABLE IF NOT EXISTS adaptation_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recovery_plan_id UUID NOT NULL REFERENCES recovery_plans(id) ON DELETE CASCADE,
  check_in_id     UUID REFERENCES check_ins(id) ON DELETE SET NULL,
  event_type      VARCHAR NOT NULL,
  detail          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adaptation_events_user_created
  ON adaptation_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adaptation_events_plan
  ON adaptation_events(recovery_plan_id);

ALTER TABLE adaptation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own adaptation events"
  ON adaptation_events FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE adaptation_events IS 'Recovery continuity: phase progress, maintenance unlock, future adaptation signals.';
