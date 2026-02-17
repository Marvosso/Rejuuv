-- Migration 002: Align schema to API contract
-- The original schema was normalized; the API layer uses a flat blob approach.
-- This migration drops and recreates the three core tables to match exactly
-- what the backend inserts/selects.

-- ============================================================
-- Drop old tables (cascade to remove dependent policies/triggers)
-- ============================================================
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS safety_alerts CASCADE;
DROP TABLE IF EXISTS recovery_plans CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;

-- ============================================================
-- assessments
-- Stores raw intake data + Claude analysis result as JSON blobs.
-- ============================================================
CREATE TABLE assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_area       VARCHAR NOT NULL,
  intake_data     TEXT NOT NULL,          -- JSON.stringify(intakeData)
  analysis_result TEXT NOT NULL,          -- JSON.stringify(analysisResult | safetyResult)
  safety_flagged  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assessments_user_id ON assessments(user_id);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own assessments"
  ON assessments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessments"
  ON assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- recovery_plans
-- One row per generated plan. plan_data holds the full Claude JSON.
-- assessment_data holds a snapshot of intake + analysis at plan time.
-- No FK to assessments — plans are created independently in the API.
-- ============================================================
CREATE TABLE recovery_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_area       VARCHAR NOT NULL,
  assessment_data TEXT,                   -- JSON.stringify({ intake_data, assessment })
  plan_data       TEXT NOT NULL,          -- JSON.stringify(recoveryPlan)
  phase           INTEGER NOT NULL DEFAULT 1,
  status          VARCHAR NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'paused')),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recovery_plans_user_id ON recovery_plans(user_id);

ALTER TABLE recovery_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own recovery plans"
  ON recovery_plans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery plans"
  ON recovery_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reattach the updated_at trigger
CREATE TRIGGER update_recovery_plans_updated_at
  BEFORE UPDATE ON recovery_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- check_ins
-- One row per daily check-in submission.
-- adjustments holds the full Claude JSON response.
-- ============================================================
CREATE TABLE check_ins (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recovery_plan_id    UUID NOT NULL REFERENCES recovery_plans(id) ON DELETE CASCADE,
  pain_level          INTEGER CHECK (pain_level >= 1 AND pain_level <= 10),
  pain_change         VARCHAR CHECK (pain_change IN ('Better', 'Same', 'Worse')),
  difficulty          VARCHAR CHECK (difficulty IN ('Easy', 'Manageable', 'Too Hard')),
  completed_activities TEXT,              -- JSON.stringify([...])
  notes               TEXT,
  adjustments         TEXT,              -- JSON.stringify(checkInResult)
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_check_ins_user_id      ON check_ins(user_id);
CREATE INDEX idx_check_ins_plan_id      ON check_ins(recovery_plan_id);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own check-ins"
  ON check_ins FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-ins"
  ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- safety_alerts (simplified — linked to user only, no assessment FK)
-- ============================================================
CREATE TABLE safety_alerts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_area           VARCHAR,
  message             TEXT,
  recommended_action  TEXT,
  user_acknowledged   BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_safety_alerts_user_id ON safety_alerts(user_id);

ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own safety alerts"
  ON safety_alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own safety alerts"
  ON safety_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
