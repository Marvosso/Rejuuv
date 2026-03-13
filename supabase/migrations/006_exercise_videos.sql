-- Migration 006: Exercise form-check videos
-- Maps exercise keys (and optionally body_area) to short form-check video URLs.

CREATE TABLE IF NOT EXISTS exercise_videos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_key VARCHAR NOT NULL,
  body_area    VARCHAR,
  video_url    TEXT NOT NULL,
  duration_sec INTEGER DEFAULT 15,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exercise_videos_key ON exercise_videos(exercise_key);
CREATE INDEX idx_exercise_videos_body_area ON exercise_videos(body_area);
