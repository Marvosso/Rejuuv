-- Phase 1: Auth ↔ public.users continuity, plan ↔ assessment linkage, backfill.

-- ---------------------------------------------------------------------------
-- 1) Link recovery plans to the assessment that informed them (nullable for
--    existing rows; new inserts populate via API).
-- ---------------------------------------------------------------------------
ALTER TABLE recovery_plans
  ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recovery_plans_assessment_id
  ON recovery_plans(assessment_id);

COMMENT ON COLUMN recovery_plans.assessment_id IS 'Assessment row this plan was generated from; continuity anchor.';

-- ---------------------------------------------------------------------------
-- 2) Keep public.users in sync with auth.users (FK target for assessments,
--    plans, check_ins). Backfill any auth users missing a public row.
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, email, full_name)
SELECT
  au.id,
  COALESCE(NULLIF(trim(au.email), ''), au.id::text || '@users.rejuuv.internal'),
  COALESCE(au.raw_user_meta_data->>'full_name', NULL)
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.email), ''), NEW.id::text || '@users.rejuuv.internal'),
    NULLIF(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
