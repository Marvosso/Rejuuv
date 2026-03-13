-- Migration 004: Push tokens for Expo push notifications
-- Stores Expo push tokens per user for sending daily reminders / personalized notifications.

CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own push tokens"
  ON push_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push token"
  ON push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push token"
  ON push_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push token"
  ON push_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_push_tokens_updated_at();
