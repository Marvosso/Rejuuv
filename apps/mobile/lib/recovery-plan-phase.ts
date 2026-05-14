/**
 * Normalize recovery phase data from API (structured exercises) or legacy string activities.
 */

import type { RecoveryPlanExerciseRow } from './types';

export type { RecoveryPlanExerciseRow };

export type RecoveryPhaseLike = {
  goal?: string;
  activities?: unknown;
  exercises?: unknown;
  avoid?: unknown;
};

function normalizeTips(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

export function normalizePhaseExercises(phase: RecoveryPhaseLike | null | undefined): RecoveryPlanExerciseRow[] {
  if (!phase || typeof phase !== 'object') return [];

  const rawEx = phase.exercises;
  if (Array.isArray(rawEx) && rawEx.length > 0) {
    return rawEx.map((e) => {
      const o = e as Record<string, unknown>;
      const tips = o.form_tips ?? o.formTips;
      return {
        name: String(o.name ?? 'Exercise').trim() || 'Exercise',
        sets_reps: String(o.sets_reps ?? o.setsReps ?? 'As in your plan').trim() || 'As in your plan',
        why_this_helps: String(o.why_this_helps ?? o.whyThisHelps ?? '').trim(),
        form_tips: normalizeTips(tips),
      };
    });
  }

  const acts = phase.activities;
  if (Array.isArray(acts) && acts.length > 0) {
    return acts.map((a) => ({
      name: String(a).trim() || 'Exercise',
      sets_reps: 'As in your plan',
      why_this_helps: '',
      form_tips: [] as string[],
    }));
  }

  return [];
}

export function phaseExerciseCount(phase: RecoveryPhaseLike | null | undefined): number {
  return normalizePhaseExercises(phase).length;
}
