-- Per-IP (hashed) API rate limiting for unauthenticated public routes.

CREATE TABLE IF NOT EXISTS api_rate_limit_ip_counters (
  ip_hash       TEXT NOT NULL,
  route         TEXT NOT NULL,
  minute_bucket TIMESTAMPTZ NOT NULL,
  hit_count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, route, minute_bucket)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limit_ip_bucket ON api_rate_limit_ip_counters(minute_bucket);

ALTER TABLE api_rate_limit_ip_counters ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE api_rate_limit_ip_counters IS 'Backend-only IP-hash rate limit counters; service role bypasses RLS.';

CREATE OR REPLACE FUNCTION public.increment_rate_limit_ip(
  p_ip_hash TEXT,
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
  INSERT INTO api_rate_limit_ip_counters (ip_hash, route, minute_bucket, hit_count)
  VALUES (p_ip_hash, p_route, bucket, 1)
  ON CONFLICT (ip_hash, route, minute_bucket)
  DO UPDATE SET hit_count = api_rate_limit_ip_counters.hit_count + 1
  RETURNING hit_count INTO new_count;

  RETURN jsonb_build_object(
    'allowed', (new_count <= p_max_per_window),
    'count', new_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit_ip(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit_ip(TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.increment_rate_limit_ip IS 'Atomically increments per-minute counter per hashed IP; returns {allowed, count}.';
