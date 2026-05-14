import { NextResponse } from 'next/server';
import { getRecoveryPlanPrompt } from '../../../prompts/recovery-plan-prompt';
import { callClaudeForTask } from '../../../lib/claude';
import { parseClaudeJsonWithRepairAndValidate } from '../../../lib/ai-response';
import { recoveryPlanOutputSchema } from '../../../lib/ai-schemas';
import { recoveryPlanSchemaFallback } from '../../../lib/ai-fallbacks';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';
import { assertAssessmentOwnership } from '../../../lib/auth-scope';
import {
  getUserSubscriptionStatus,
  getUserPlanCount,
} from '../../../lib/subscription';
import { STARTER_PLAN } from '../../../lib/starter-plan';
import { TELEMETRY_EVENTS, trackTelemetry } from '../../../lib/telemetry';
import {
  enforceRateLimit,
  enforceRecoveryPlanGenerationDedupe,
} from '../../../lib/rate-limit';
import {
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

async function resolveAssessmentIdForPlan(
  userId: string,
  intakeBodyArea: string | undefined,
  requestedAssessmentId: unknown
): Promise<string | null> {
  if (typeof requestedAssessmentId === 'string' && requestedAssessmentId.length > 0) {
    const ok = await assertAssessmentOwnership(requestedAssessmentId, userId);
    return ok ? requestedAssessmentId : null;
  }

  if (!intakeBodyArea || typeof intakeBodyArea !== 'string') return null;

  const { data: latest } = await supabase
    .from('assessments')
    .select('id')
    .eq('user_id', userId)
    .eq('body_area', intakeBodyArea)
    .eq('safety_flagged', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'POST /recovery-plans');
    if (!limited.ok) {
      return limited.response;
    }

    const [{ isActive }, planCount] = await Promise.all([
      getUserSubscriptionStatus(user_id),
      getUserPlanCount(user_id),
    ]);

    if (!isActive && planCount >= 1) {
      trackTelemetry(user_id, TELEMETRY_EVENTS.PLAN_GENERATION_RESULT, {
        starter_fallback: true,
        plan_count: planCount,
      });
      return NextResponse.json(
        { ...STARTER_PLAN, starter: true, upgrade_required: true },
        { status: 200 }
      );
    }

    const rawBody = await request.json();
    const oversized = rejectOversizedLlmPayload(rawBody);
    if (oversized) {
      return oversized;
    }
    if (!isPlainObjectBody(rawBody)) {
      return apiFailure(
        API_ERROR_CODES.BAD_REQUEST,
        'Request body must be a JSON object',
        400,
        true
      );
    }
    const body = deepNormalizeUserStrings(rawBody) as Record<string, unknown>;
    const injSignals = collectSuspiciousSignals(body);
    logSuspiciousIntakeSignals('POST /recovery-plans', user_id, injSignals, JSON.stringify(body).length);

    const assessment = body.assessment;
    const intake_data = body.intake_data;
    const requestedAssessmentId = body.assessment_id;

    if (
      !assessment ||
      typeof assessment !== 'object' ||
      Array.isArray(assessment) ||
      !intake_data ||
      typeof intake_data !== 'object' ||
      Array.isArray(intake_data)
    ) {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'Missing required data: assessment and intake_data must be objects',
        400,
        true
      );
    }

    const intakeObj = intake_data as { body_area?: string };
    const resolvedAssessmentId = await resolveAssessmentIdForPlan(
      user_id,
      intakeObj.body_area,
      requestedAssessmentId
    );

    if (typeof requestedAssessmentId === 'string' && requestedAssessmentId.length > 0) {
      if (!resolvedAssessmentId) {
        return apiFailure(
          API_ERROR_CODES.VALIDATION_ERROR,
          'Invalid or unauthorized assessment_id',
          400,
          true
        );
      }
    }

    const dedupeBlock = await enforceRecoveryPlanGenerationDedupe({
      userId: user_id,
      assessmentId: resolvedAssessmentId,
      bodyArea: typeof intakeObj.body_area === 'string' ? intakeObj.body_area : undefined,
    });
    if (dedupeBlock) {
      return dedupeBlock;
    }

    const recoveryPlanPrompt = getRecoveryPlanPrompt(intake_data as Record<string, unknown>, assessment);
    const recoveryPlanResponse = await callClaudeForTask(
      'recovery_plan',
      recoveryPlanPrompt.system,
      recoveryPlanPrompt.user
    );
    const planPipeline = await parseClaudeJsonWithRepairAndValidate({
      response: recoveryPlanResponse,
      schema: recoveryPlanOutputSchema,
      fallback: recoveryPlanSchemaFallback(),
      log: { route: 'POST /recovery-plans', kind: 'recovery_plan' },
    });
    const recoveryPlan = planPipeline.value;

    const { data: insertedPlan, error: dbError } = await supabase
      .from('recovery_plans')
      .insert({
        user_id,
        body_area: intakeObj.body_area as string,
        assessment_id: resolvedAssessmentId,
        assessment_data: JSON.stringify({ intake_data, assessment }),
        plan_data: JSON.stringify(recoveryPlan),
        phase: 1,
        status: 'active',
      })
      .select('id')
      .single();

    if (dbError) {
      logApiRouteFailure('POST /recovery-plans', new Error(dbError.message), {
        supabase_code: dbError.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Failed to save recovery plan. Please try again.',
        500,
        true
      );
    }

    const planId = insertedPlan!.id;

    trackTelemetry(user_id, TELEMETRY_EVENTS.PLAN_GENERATION_RESULT, {
      starter_fallback: false,
      plan_id: planId,
      assessment_id: resolvedAssessmentId,
      body_area:
        typeof intakeObj.body_area === 'string' ? intakeObj.body_area : null,
      parser_source: planPipeline.source,
      parser_repair_used: planPipeline.usedRepair,
      parser_valid: planPipeline.validationOk,
    });

    return NextResponse.json({ ...recoveryPlan, id: planId }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('POST /recovery-plans', error);
  }
}
