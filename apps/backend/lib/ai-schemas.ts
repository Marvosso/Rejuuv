import { z } from 'zod';

const exerciseRowSchema = z.object({
  name: z.string().min(1),
  sets_reps: z.string().min(1),
  why_this_helps: z.string().min(1),
  form_tips: z.array(z.string()).min(1),
});

const recoveryPhaseSchema = z.object({
  goal: z.string().min(1),
  exercises: z.array(exerciseRowSchema).min(1),
  avoid: z.array(z.string()),
  activities: z.array(z.string()).optional(),
});

export const recoveryPlanOutputSchema = z.object({
  focus_areas: z.array(z.string()).min(1),
  recovery_plan: z.object({
    phase_1_days_1_to_7: recoveryPhaseSchema,
    phase_2_days_8_to_21: recoveryPhaseSchema,
    phase_3_week_4_and_beyond: recoveryPhaseSchema,
  }),
  daily_habits: z.array(z.string()),
  red_flags: z.array(z.string()),
});

export type RecoveryPlanValidated = z.infer<typeof recoveryPlanOutputSchema>;

export const analysisResultSchema = z.object({
  summary: z.string().min(1),
  possible_contributors: z.array(z.string()),
  education: z.string().min(1),
  safety_note: z.string().min(1),
});

export type AnalysisValidated = z.infer<typeof analysisResultSchema>;

export const safetyScreeningSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const o = { ...(raw as Record<string, unknown>) };
    if (typeof o.status === 'string') {
      const u = o.status.trim().toUpperCase();
      if (u === 'REFER' || u === 'SAFE') o.status = u;
    }
    return o;
  },
  z.object({
    status: z.enum(['REFER', 'SAFE']),
    reasoning_internal: z.string().optional(),
    user_message: z.union([z.string(), z.null()]).optional(),
  })
);

export type SafetyScreeningValidated = z.infer<typeof safetyScreeningSchema>;

export const checkInAdjustmentsSchema = z.object({
  adjustment_summary: z.string().min(1),
  updated_recommendations: z.array(z.string()),
  next_check_in: z.string().min(1),
  safety_reminder: z.string(),
});

export type CheckInAdjustmentsValidated = z.infer<typeof checkInAdjustmentsSchema>;
