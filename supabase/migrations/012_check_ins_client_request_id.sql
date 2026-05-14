-- Client-generated idempotency key for check-in POST retries (offline / flaky network).
-- UNIQUE (user_id, client_request_id) prevents duplicate rows when the same request is replayed.

ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS check_ins_user_client_request_uidx
  ON check_ins (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

COMMENT ON COLUMN check_ins.client_request_id IS 'Optional stable id from the client; same value replays as the original check-in.';
