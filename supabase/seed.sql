-- Seed data for body_area_configs table

INSERT INTO body_area_configs (
  body_area,
  display_name,
  common_triggers,
  common_pain_types,
  common_limitations,
  special_considerations,
  is_active,
  sort_order
) VALUES
(
  'neck',
  'Neck',
  '["desk_work", "sleeping", "phone_use", "driving"]'::jsonb,
  '["stiff", "dull_ache", "sharp", "burning"]'::jsonb,
  '["turning_left", "turning_right", "looking_up"]'::jsonb,
  'Always assess for neurological symptoms',
  true,
  1
),
(
  'lower_back',
  'Lower Back',
  '["sitting", "bending", "lifting", "standing"]'::jsonb,
  '["dull_ache", "sharp", "shooting", "throbbing"]'::jsonb,
  '["bending_forward", "twisting", "standing_up"]'::jsonb,
  'Check for radiating leg pain',
  true,
  2
),
(
  'knee',
  'Knee',
  '["running", "stairs", "squatting", "walking"]'::jsonb,
  '["dull_ache", "sharp", "clicking", "swelling"]'::jsonb,
  '["bending", "straightening", "weight_bearing"]'::jsonb,
  'Assess for swelling and instability',
  true,
  3
),
(
  'shoulder',
  'Shoulder',
  '["overhead_reaching", "sleeping_on_side", "lifting"]'::jsonb,
  '["dull_ache", "sharp", "catching", "weakness"]'::jsonb,
  '["reaching_overhead", "behind_back", "lifting"]'::jsonb,
  'Evaluate rotator cuff involvement',
  true,
  4
);
