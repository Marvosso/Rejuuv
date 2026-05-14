import { NextResponse } from 'next/server';
import { getCheckInPrompt } from '../../../prompts/checkin-prompt';
import { callClaudeForTask } from '../../../lib/claude';
import { parseClaudeJsonWithRepairAndValidate } from '../../../lib/ai-response';
import { checkInAdjustmentsSchema } from '../../../lib/ai-schemas';
import { CHECK_IN_ADJUSTMENTS_FALLBACK } from '../../../lib/ai-fallbacks';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';
import { assertPlanOwnership } from '../../../lib/auth-scope';
import { runAdaptiveEngineAfterCheckIn } from '../../../lib/adaptive-engine';
import { TELEMETRY_EVENTS, trackTelemetry } from '../../../lib/telemetry';
import { enforceRateLimit } from '../../../lib/rate-limit';
import {
  capClinicalNotesField,
  collectSuspiciousSignals,
  deepNormalizeUserStrings,
  isPlainObjectBody,
  logSuspiciousIntakeSignals,
  rejectOversizedLlmPayload,
} from '../../../lib/prompt-injection-guard';
import {
  apiFailure,
  API_ERROR_CODES,
  apiFailureFromException,
  logApiRouteFailure,
} from '../../../lib/api-errors';

type CheckInPostBody = {
  quick?: boolean;
  recovery_plan_id?: string;
  pain_change?: string;
  pain_level?: number;
  difficulty?: string;
  completed_activities?: unknown;
  notes?: string;
  current_plan?: unknown;
  /** Stable client id for retries / offline sync; same value returns the original check-in. */
  client_request_id?: string;
};

type CheckInRowForReplay = {
  id: string;
  recovery_plan_id: string;
  pain_level: number | null;
  pain_change: string | null;
  difficulty: string | null;
  completed_activities: string | null;
  notes: string | null;
  adjustments: string | null;
};

function normalizeClientRequestId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s.length < 8 || s.length > 128) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) return null;
  return s;
}

async function findCheckInByClientRequest(
  userId: string,
  clientRequestId: string
): Promise<CheckInRowForReplay | null> {
  const { data, error } = await supabase
    .from('check_ins')
    .select(
      'id, recovery_plan_id, pain_level, pain_change, difficulty, completed_activities, notes, adjustments'
    )
    .eq('user_id', userId)
    .eq('client_request_id', clientRequestId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CheckInRowForReplay;
}

function jsonResponseQuickReplay(row: CheckInRowForReplay) {
  return NextResponse.json(
    {
      adjustment_summary: 'Quick check-in recorded.',
      updated_recommendations: [] as string[],
      next_check_in: 'Keep logging daily for best results.',
      safety_reminder: '',
      id: row.id,
      quick: true,
      replayed: true,
      adaptive: {
        outcome: 'replay',
        reasons: [] as string[],
        signals: {},
        applied_regress: false,
      },
    },
    { status: 200 }
  );
}

function jsonResponseFullReplay(row: CheckInRowForReplay) {
  let adjustments: unknown = null;
  try {
    adjustments = row.adjustments ? JSON.parse(row.adjustments) : null;
  } catch {
    adjustments = null;
  }
  const parsed = checkInAdjustmentsSchema.safeParse(adjustments);
  const base = parsed.success ? parsed.data : CHECK_IN_ADJUSTMENTS_FALLBACK;

  let completed: unknown = [];
  try {
    completed = row.completed_activities ? JSON.parse(row.completed_activities) : [];
  } catch {
    completed = [];
  }

  return NextResponse.json(
    {
      ...base,
      check_in_data: {
        recovery_plan_id: row.recovery_plan_id,
        pain_change: row.pain_change,
        pain_level: row.pain_level,
        difficulty: row.difficulty,
        completed_activities: Array.isArray(completed) ? completed : [],
        notes: row.notes ?? '',
      },
      id: row.id,
      replayed: true,
    },
    { status: 200 }
  );
}

function recordCheckInTelemetry(opts: {
  userId: string;
  planId: string;
  quick: boolean;
  painLevel: number;
  painChange: string;
  difficulty: string;
  adaptiveOutcome?: string | null;
  parserSource?: string;
  parserRepairUsed?: boolean;
  parserValid?: boolean;
}) {
  const {
    userId,
    planId,
    quick,
    painLevel,
    painChange,
    difficulty,
    adaptiveOutcome,
    parserSource,
    parserRepairUsed,
    parserValid,
  } = opts;
  const pain_band =
    painLevel <= 3 ? 'low' : painLevel <= 6 ? 'mid' : 'high';
  trackTelemetry(userId, TELEMETRY_EVENTS.CHECK_IN_RECORDED, {
    quick,
    pain_change: painChange,
    difficulty,
    adaptive_outcome: adaptiveOutcome ?? null,
    plan_id: planId,
    pain_band,
    ...(parserSource != null ? { parser_source: parserSource } : {}),
    ...(parserRepairUsed != null ? { parser_repair_used: parserRepairUsed } : {}),
    ...(parserValid != null ? { parser_valid: parserValid } : {}),
  });
  const flareHint =
    painChange === 'Worse' || painLevel >= 8;
  if (flareHint) {
    trackTelemetry(userId, TELEMETRY_EVENTS.FLARE_SIGNAL_LOGGED, {
      quick,
      pain_change: painChange,
      high_pain: painLevel >= 8,
    });
  }
}

export async function POST(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'POST /check-ins');
    if (!limited.ok) {
      return limited.response;
    }

    // Parse the request body
    const rawBody = await request.json();
    const oversized = rejectOversizedLlmPayload(rawBody);
    if (oversized) {
      return oversized;
    }
    if (!isPlainObjectBody(rawBody)) {
      return apiFailure(API_ERROR_CODES.BAD_REQUEST, 'Invalid request body', 400, true);
    }
    const body = deepNormalizeUserStrings(rawBody) as CheckInPostBody;
    const injSignals = collectSuspiciousSignals(body);
    logSuspiciousIntakeSignals('POST /check-ins', user_id, injSignals, JSON.stringify(body).length);

    const {
      quick,
      recovery_plan_id,
      pain_change,
      pain_level,
      difficulty,
      completed_activities,
      notes,
      current_plan,
      client_request_id: rawClientRequestId,
    } = body;
    const idempotencyKey = normalizeClientRequestId(rawClientRequestId);

    const isQuick = quick === true;

    // Quick check-in: only pain_level required; pain_change optional; recovery_plan_id required
    if (isQuick) {
      if (pain_level == null || pain_level < 1 || pain_level > 10) {
        return apiFailure(
          API_ERROR_CODES.VALIDATION_ERROR,
          'Quick check-in requires pain_level (1-10)',
          400,
          true
        );
      }
      if (!recovery_plan_id) {
        return apiFailure(
          API_ERROR_CODES.VALIDATION_ERROR,
          'Quick check-in requires recovery_plan_id',
          400,
          true
        );
      }

      const planOk = await assertPlanOwnership(recovery_plan_id, user_id);
      if (!planOk) {
        return apiFailure(API_ERROR_CODES.NOT_FOUND, 'Recovery plan not found', 404, true);
      }

      if (idempotencyKey) {
        const existingQuick = await findCheckInByClientRequest(user_id, idempotencyKey);
        if (existingQuick) {
          return jsonResponseQuickReplay(existingQuick);
        }
      }

      const { data: insertedCheckIn, error: dbError } = await supabase
        .from('check_ins')
        .insert({
          user_id,
          recovery_plan_id,
          pain_level,
          pain_change: pain_change || 'Same',
          difficulty: 'Manageable',
          completed_activities: JSON.stringify([]),
          notes: capClinicalNotesField(notes),
          adjustments: JSON.stringify({ quick: true }),
          ...(idempotencyKey ? { client_request_id: idempotencyKey } : {}),
        })
        .select('id')
        .single();

      if (dbError) {
        if (dbError.code === '23505' && idempotencyKey) {
          const replayRow = await findCheckInByClientRequest(user_id, idempotencyKey);
          if (replayRow) {
            return jsonResponseQuickReplay(replayRow);
          }
        }
        logApiRouteFailure('POST /check-ins', new Error(dbError.message), {
          step: 'quick_insert',
          supabase_code: dbError.code,
        });
        return apiFailure(
          API_ERROR_CODES.INTERNAL_ERROR,
          'Failed to save check-in. Please try again.',
          500,
          true
        );
      }

      const adaptive = await runAdaptiveEngineAfterCheckIn(supabase, {
        userId: user_id,
        planId: recovery_plan_id,
        checkInId: insertedCheckIn.id,
        legacyPhaseProgressed: false,
      });

      recordCheckInTelemetry({
        userId: user_id,
        planId: recovery_plan_id,
        quick: true,
        painLevel: pain_level,
        painChange: pain_change || 'Same',
        difficulty: 'Manageable',
        adaptiveOutcome: adaptive.outcome,
      });

      return NextResponse.json(
        {
          adjustment_summary: 'Quick check-in recorded.',
          updated_recommendations: [],
          next_check_in: 'Keep logging daily for best results.',
          safety_reminder: '',
          id: insertedCheckIn.id,
          quick: true,
          adaptive: {
            outcome: adaptive.outcome,
            reasons: adaptive.reasons,
            signals: adaptive.signals,
            applied_regress: adaptive.applied_regress,
          },
        },
        { status: 200 }
      );
    }

    // Full check-in: validate required fields and plan ownership before AI
    if (!recovery_plan_id || typeof recovery_plan_id !== 'string') {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'recovery_plan_id is required',
        400,
        true
      );
    }

    const planOwned = await assertPlanOwnership(recovery_plan_id, user_id);
    if (!planOwned) {
      return apiFailure(API_ERROR_CODES.NOT_FOUND, 'Recovery plan not found', 404, true);
    }

    if (!pain_change || !pain_level || !difficulty || !current_plan) {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'Missing required fields: pain_change, pain_level, difficulty, and current_plan are required',
        400,
        true
      );
    }

    if (idempotencyKey) {
      const existingFull = await findCheckInByClientRequest(user_id, idempotencyKey);
      if (existingFull) {
        return jsonResponseFullReplay(existingFull);
      }
    }

    // Prepare check-in data
    const checkInData = {
      recovery_plan_id,
      pain_change,
      pain_level,
      difficulty,
      completed_activities: completed_activities || [],
      notes: capClinicalNotesField(notes),
    };

    // Generate check-in prompt
    const checkInPrompt = getCheckInPrompt(checkInData, current_plan);
    const checkInResponse = await callClaudeForTask(
      'check_in',
      checkInPrompt.system,
      checkInPrompt.user
    );
    const checkInPipeline = await parseClaudeJsonWithRepairAndValidate({
      response: checkInResponse,
      schema: checkInAdjustmentsSchema,
      fallback: CHECK_IN_ADJUSTMENTS_FALLBACK,
      log: { route: 'POST /check-ins', kind: 'check_in_adjustments' },
    });
    const checkInResult = checkInPipeline.value;

    // Save check-in to Supabase
    let checkInId: string | null = null;

    const { data: insertedCheckIn, error: dbError } = await supabase
      .from('check_ins')
      .insert({
        user_id,
        recovery_plan_id,
        pain_level,
        pain_change,
        difficulty,
        completed_activities: JSON.stringify(completed_activities || []),
        notes: capClinicalNotesField(notes),
        adjustments: JSON.stringify(checkInResult),
        ...(idempotencyKey ? { client_request_id: idempotencyKey } : {}),
      })
      .select('id')
      .single();

    if (dbError || !insertedCheckIn) {
      if (dbError?.code === '23505' && idempotencyKey) {
        const replayRow = await findCheckInByClientRequest(user_id, idempotencyKey);
        if (replayRow) {
          return jsonResponseFullReplay(replayRow);
        }
      }
      logApiRouteFailure('POST /check-ins', new Error(dbError?.message ?? 'no row'), {
        step: 'full_insert',
        supabase_code: dbError?.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to save check-in. Please try again.',
        500,
        true
      );
    }

    checkInId = insertedCheckIn.id;

    // Auto-adjust phase if pain dropped >30%: fetch recent check-ins for this plan
    let suggestedPhase: number | null = null;
    let maintenanceUnlocked = false;
    let fromPhaseForEvent: number | null = null;
    if (recovery_plan_id && checkInId) {
      const { data: recentCheckIns } = await supabase
        .from('check_ins')
        .select('pain_level, created_at')
        .eq('recovery_plan_id', recovery_plan_id)
        .eq('user_id', user_id)
        .order('created_at', { ascending: true });
      const withLevel = (recentCheckIns ?? []).filter((r) => r.pain_level != null);
      if (withLevel.length >= 4) {
        const mid = Math.floor(withLevel.length / 2);
        const firstHalf = withLevel.slice(0, mid);
        const secondHalf = withLevel.slice(mid);
        const baseline =
          firstHalf.reduce((s, r) => s + (r.pain_level ?? 0), 0) / firstHalf.length;
        const current =
          secondHalf.reduce((s, r) => s + (r.pain_level ?? 0), 0) / secondHalf.length;
        if (baseline > 0 && current <= 0.7 * baseline) {
          const { data: planRow } = await supabase
            .from('recovery_plans')
            .select('phase, status')
            .eq('id', recovery_plan_id)
            .eq('user_id', user_id)
            .single();
          const currentPhase = planRow?.phase ?? 1;
          if (currentPhase < 3) {
            const nextPhase = currentPhase + 1;
            fromPhaseForEvent = currentPhase;
            await supabase
              .from('recovery_plans')
              .update({ phase: nextPhase, updated_at: new Date().toISOString() })
              .eq('id', recovery_plan_id)
              .eq('user_id', user_id);
            suggestedPhase = nextPhase;
          }
        }
      }
      // Phase 3 completion: if plan is in phase 3 and has 7+ check-ins, mark completed and unlock maintenance
      const { data: planRow } = await supabase
        .from('recovery_plans')
        .select('phase, status')
        .eq('id', recovery_plan_id)
        .eq('user_id', user_id)
        .single();
      if (planRow?.phase === 3 && planRow?.status !== 'completed') {
        const { count } = await supabase
          .from('check_ins')
          .select('id', { count: 'exact', head: true })
          .eq('recovery_plan_id', recovery_plan_id)
          .eq('user_id', user_id);
        if ((count ?? 0) >= 7) {
          await supabase
            .from('recovery_plans')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', recovery_plan_id)
            .eq('user_id', user_id);
          maintenanceUnlocked = true;
        }
      }

      // Continuity: record adaptation events (non-blocking for response)
      if (suggestedPhase != null && fromPhaseForEvent != null) {
        const { error: aeErr } = await supabase.from('adaptation_events').insert({
          user_id,
          recovery_plan_id,
          check_in_id: checkInId,
          event_type: 'phase_progressed',
          detail: JSON.stringify({
            from_phase: fromPhaseForEvent,
            to_phase: suggestedPhase,
          }),
        });
        if (aeErr) console.error('adaptation_events phase_progressed:', aeErr);
      }
      if (maintenanceUnlocked) {
        const { error: meErr } = await supabase.from('adaptation_events').insert({
          user_id,
          recovery_plan_id,
          check_in_id: checkInId,
          event_type: 'maintenance_unlocked',
          detail: 'Plan status set to completed after sustained phase 3 logging.',
        });
        if (meErr) console.error('adaptation_events maintenance_unlocked:', meErr);
      }
    }

    let adaptive: Awaited<ReturnType<typeof runAdaptiveEngineAfterCheckIn>> | null = null;
    if (recovery_plan_id && checkInId) {
      adaptive = await runAdaptiveEngineAfterCheckIn(supabase, {
        userId: user_id,
        planId: recovery_plan_id,
        checkInId,
        legacyPhaseProgressed: suggestedPhase != null,
      });
    }

    recordCheckInTelemetry({
        userId: user_id,
        planId: recovery_plan_id,
        quick: false,
        painLevel: pain_level,
        painChange: pain_change,
        difficulty,
        adaptiveOutcome: adaptive?.outcome ?? null,
        parserSource: checkInPipeline.source,
        parserRepairUsed: checkInPipeline.usedRepair,
        parserValid: checkInPipeline.validationOk,
      });

    // Return response with extracted data plus original check-in data
    return NextResponse.json(
      {
        ...checkInResult,
        check_in_data: checkInData,
        id: checkInId,
        ...(suggestedPhase != null ? { suggested_phase: suggestedPhase } : {}),
        ...(maintenanceUnlocked ? { maintenance_unlocked: true } : {}),
        ...(adaptive ? { adaptive } : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    return apiFailureFromException('POST /check-ins', error);
  }
}
