-- Per-user API rate limiting (server-side, service role). Survives serverless multi-instance vs in-memory.

CREATE TABLE IF NOT EXISTS api_rate_limit_counters (
  user_id       UUID NOT NULL,
  route         TEXT NOT NULL,
  minute_bucket TIMESTAMPTZ NOT NULL,
  hit_count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, route, minute_bucket)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limit_bucket ON api_rate_limit_counters(minute_bucket);

ALTER TABLE api_rate_limit_counters ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE api_rate_limit_counters IS 'Backend-only rate limit counters; no client policies (service role bypasses RLS).';

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id UUID,
  p_route TEXT,
  p_max_per_window INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket timestamptz := date_trunc('minute', (now() AT TIME ZONE 'utc'));
  new_count integer;
BEGIN
  INSERT INTO api_rate_limit_counters (user_id, route, minute_bucket, hit_count)
  VALUES (p_user_id, p_route, bucket, 1)
  ON CONFLICT (user_id, route, minute_bucket)
  DO UPDATE SET hit_count = api_rate_limit_counters.hit_count + 1
  RETURNING hit_count INTO new_count;

  RETURN jsonb_build_object(
    'allowed', (new_count <= p_max_per_window),
    'count', new_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(UUID, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.increment_rate_limit IS 'Atomically increments per-minute counter; returns {allowed, count}.';
