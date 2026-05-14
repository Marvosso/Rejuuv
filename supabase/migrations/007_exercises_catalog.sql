-- Exercise catalog: metadata + public Storage URLs for in-app demos.
-- Populate rows after uploading MP4s to bucket `exercise-videos` (public URL in video_url).

CREATE TABLE IF NOT EXISTS exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_key    VARCHAR NOT NULL UNIQUE,
  name            VARCHAR NOT NULL,
  phase           INTEGER NOT NULL CHECK (phase IN (1, 2, 3)),
  body_area       VARCHAR,
  video_url       TEXT NOT NULL,
  sets_reps       VARCHAR NOT NULL DEFAULT '—',
  why_this_helps  TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_body_area ON exercises(body_area);
CREATE INDEX IF NOT EXISTS idx_exercises_phase ON exercises(phase);
CREATE INDEX IF NOT EXISTS idx_exercises_body_phase ON exercises(body_area, phase);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Authenticated app users can read the catalog (videos are public URLs; metadata is not secret).
CREATE POLICY "Authenticated users can read exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE exercises IS 'Exercise demos: match plan activity text via exercise_key or name; video_url is typically a public Supabase Storage URL.';

GRANT SELECT ON exercises TO authenticated;
