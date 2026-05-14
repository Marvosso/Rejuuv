import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdaptiveDecision, CheckInSignalRow, PlanSnapshot } from './types';
import { evaluateAdaptiveRules } from './rules';

async function loadPlanContext(
  supabase: SupabaseClient,
  planId: string,
  userId: string
): Promise<{ rows: CheckInSignalRow[]; plan: PlanSnapshot }> {
  const [{ data: rows }, { data: planRow }] = await Promise.all([
    supabase
      .from('check_ins')
      .select('pain_level, pain_change, difficulty, created_at, adjustments')
      .eq('recovery_plan_id', planId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(48),
    supabase
      .from('recovery_plans')
      .select('phase, status')
      .eq('id', planId)
      .eq('user_id', userId)
      .single(),
  ]);

  return {
    rows: (rows ?? []) as CheckInSignalRow[],
    plan: {
      phase: planRow?.phase ?? 1,
      status: planRow?.status ?? 'active',
    },
  };
}

/**
 * Runs after a check-in is stored. Logs an explainable decision and may regress phase.
 * Does not use AI. Progression phase-up remains legacy heuristics elsewhere.
 */
export async function runAdaptiveEngineAfterCheckIn(
  supabase: SupabaseClient,
  params: {
    userId: string;
    planId: string;
    checkInId: string;
    legacyPhaseProgressed: boolean;
  }
): Promise<AdaptiveDecision & { applied_regress: boolean }> {
  const { rows, plan } = await loadPlanContext(supabase, params.planId, params.userId);
  const decision = evaluateAdaptiveRules(rows, plan, {
    legacyPhaseProgressed: params.legacyPhaseProgressed,
  });

  let applied_regress = false;
  if (decision.outcome === 'regress' && plan.phase > 1) {
    const newPhase = plan.phase - 1;
    const { error: upErr } = await supabase
      .from('recovery_plans')
      .update({ phase: newPhase, updated_at: new Date().toISOString() })
      .eq('id', params.planId)
      .eq('user_id', params.userId);
    if (!upErr) applied_regress = true;
    else console.error('adaptive regress phase update:', upErr);
  }

  const { error: logErr } = await supabase.from('adaptation_events').insert({
    user_id: params.userId,
    recovery_plan_id: params.planId,
    check_in_id: params.checkInId,
    event_type: 'engine_decision',
    detail: JSON.stringify({
      outcome: decision.outcome,
      reasons: decision.reasons,
      signals: decision.signals,
      applied_regress: applied_regress,
    }),
  });
  if (logErr) console.error('engine_decision adaptation_events:', logErr);

  return { ...decision, applied_regress };
}

export type { AdaptiveOutcome, AdaptiveDecision, AdaptiveSignals } from './types';
export { evaluateAdaptiveRules } from './rules';
export { buildAdaptiveSignals } from './context';
