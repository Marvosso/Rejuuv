-- Defense in depth for PostgREST: catalog tables previously had no RLS.
-- Backend continues to use the service role (bypasses RLS); JWT clients get explicit read rules.

-- ---------------------------------------------------------------------------
-- daily_tips: curated content; read-only for authenticated users
-- ---------------------------------------------------------------------------
ALTER TABLE daily_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read daily tips" ON daily_tips;
CREATE POLICY "Authenticated users can read daily tips"
  ON daily_tips FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON daily_tips TO authenticated;

-- ---------------------------------------------------------------------------
-- exercise_videos: catalog URLs; read-only for authenticated users
-- ---------------------------------------------------------------------------
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read exercise videos" ON exercise_videos;
CREATE POLICY "Authenticated users can read exercise videos"
  ON exercise_videos FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON exercise_videos TO authenticated;

-- ---------------------------------------------------------------------------
-- body_area_configs: active rows only; read-only for authenticated users
-- ---------------------------------------------------------------------------
ALTER TABLE body_area_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active body area configs" ON body_area_configs;
CREATE POLICY "Authenticated users can read active body area configs"
  ON body_area_configs FOR SELECT TO authenticated
  USING (is_active = true);

GRANT SELECT ON body_area_configs TO authenticated;

-- ---------------------------------------------------------------------------
-- processed_stripe_events: server-only dedupe table — deny default for JWT roles
-- ---------------------------------------------------------------------------
ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE processed_stripe_events IS 'Stripe webhook idempotency; no client policies (service role bypasses RLS).';
