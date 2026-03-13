-- Migration 005: Daily tips feed for free and Pro users
CREATE TABLE IF NOT EXISTS daily_tips (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  body_area   VARCHAR,                    -- null = general tip
  tip_text    TEXT NOT NULL,
  day_index   INTEGER NOT NULL DEFAULT 0, -- 0-based cycle for "today's tip"
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_tips_day_index ON daily_tips(day_index);
CREATE INDEX idx_daily_tips_body_area ON daily_tips(body_area);

-- Seed generic tips (day_index 0..6 for 7-day rotation)
INSERT INTO daily_tips (body_area, tip_text, day_index) VALUES
  (NULL, 'Take a short walk every 30–60 minutes if you sit for work. Movement helps reduce stiffness.', 0),
  (NULL, 'Gentle movement often feels better than complete rest. Try 5 minutes of light stretching.', 1),
  (NULL, 'Stay hydrated. Dehydration can make muscles and joints feel stiffer.', 2),
  (NULL, 'Prioritize sleep. Recovery happens when you rest well.', 3),
  (NULL, 'Break up long sitting with standing or walking. Set a timer as a reminder.', 4),
  (NULL, 'Warm up before activity. A few minutes of light movement can reduce discomfort.', 5),
  (NULL, 'Notice what makes you feel better or worse. Small adjustments add up over time.', 6);
