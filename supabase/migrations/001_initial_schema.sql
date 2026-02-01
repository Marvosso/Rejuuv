-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  subscription_tier VARCHAR DEFAULT 'free' CHECK (subscription_tier IN ('free', 'paid')),
  stripe_customer_id VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assessments table
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_area VARCHAR NOT NULL,
  specific_location VARCHAR,
  pain_type JSONB,
  duration VARCHAR,
  trigger JSONB,
  pain_level INTEGER CHECK (pain_level >= 1 AND pain_level <= 10),
  movement_limitations JSONB,
  analysis_summary TEXT,
  possible_contributors JSONB,
  education TEXT,
  safety_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recovery plans table
CREATE TABLE recovery_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  focus_areas JSONB,
  recovery_plan_phases JSONB,
  daily_habits JSONB,
  red_flags JSONB,
  current_phase VARCHAR,
  status VARCHAR CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Check-ins table
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recovery_plan_id UUID NOT NULL REFERENCES recovery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pain_change VARCHAR CHECK (pain_change IN ('better', 'same', 'worse')),
  pain_level INTEGER CHECK (pain_level >= 1 AND pain_level <= 10),
  difficulty VARCHAR CHECK (difficulty IN ('easy', 'manageable', 'hard')),
  notes TEXT,
  completed_activities JSONB,
  adjustment_summary TEXT,
  updated_recommendations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Safety alerts table
CREATE TABLE safety_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  red_flag_detected BOOLEAN NOT NULL,
  symptoms JSONB,
  message TEXT,
  recommended_action TEXT,
  user_acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Body area configs table
CREATE TABLE body_area_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  body_area VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR,
  common_triggers JSONB,
  common_pain_types JSONB,
  common_limitations JSONB,
  special_considerations TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER
);

-- Create indexes on user_id columns
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_recovery_plans_user_id ON recovery_plans(user_id);
CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX idx_safety_alerts_user_id ON safety_alerts(user_id);

-- Enable Row Level Security
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessments
CREATE POLICY "Users can select their own assessments"
  ON assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessments"
  ON assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for recovery_plans
CREATE POLICY "Users can select their own recovery plans"
  ON recovery_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery plans"
  ON recovery_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for check_ins
CREATE POLICY "Users can select their own check-ins"
  ON check_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-ins"
  ON check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for safety_alerts
CREATE POLICY "Users can select their own safety alerts"
  ON safety_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own safety alerts"
  ON safety_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on recovery_plans
CREATE TRIGGER update_recovery_plans_updated_at
  BEFORE UPDATE ON recovery_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
