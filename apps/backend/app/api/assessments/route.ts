import { NextResponse } from 'next/server';
import { getSafetyPrompt } from '../../../prompts/safety-prompt';
import { getAnalysisPrompt } from '../../../prompts/analysis-prompt';
import { callClaudeForTask } from '../../../lib/claude';
import { parseClaudeJsonWithRepairAndValidate } from '../../../lib/ai-response';
import { analysisResultSchema, safetyScreeningSchema } from '../../../lib/ai-schemas';
import { ANALYSIS_FALLBACK, SAFETY_SCREENING_FALLBACK } from '../../../lib/ai-fallbacks';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';
import { TELEMETRY_EVENTS, trackTelemetry } from '../../../lib/telemetry';
import { enforceRateLimit } from '../../../lib/rate-limit';
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

export async function POST(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'POST /assessments');
    if (!limited.ok) {
      return limited.response;
    }

    const rawIntake = await request.json();
    const oversized = rejectOversizedLlmPayload(rawIntake);
    if (oversized) {
      return oversized;
    }
    if (!isPlainObjectBody(rawIntake)) {
      return apiFailure(
        API_ERROR_CODES.VALIDATION_ERROR,
        'Intake must be a JSON object',
        400,
        true
      );
    }
    const intakeData = deepNormalizeUserStrings(rawIntake);
    const injSignals = collectSuspiciousSignals(intakeData);
    logSuspiciousIntakeSignals('POST /assessments', user_id, injSignals, JSON.stringify(intakeData).length);

    const safetyPrompt = getSafetyPrompt(intakeData);
    const safetyResponse = await callClaudeForTask(
      'safety_screening',
      safetyPrompt.system,
      safetyPrompt.user
    );
    const safetyPipeline = await parseClaudeJsonWithRepairAndValidate({
      response: safetyResponse,
      schema: safetyScreeningSchema,
      fallback: SAFETY_SCREENING_FALLBACK,
      log: { route: 'POST /assessments', kind: 'safety_screening' },
    });
    const safetyResult = safetyPipeline.value;

    const isRefer = safetyResult?.status === 'REFER';
    const userMessage =
      safetyResult?.user_message?.trim() ||
      "Based on the symptoms you've described, it's important that you consult a healthcare professional (such as a doctor or physical therapist) for a formal evaluation before starting any movement routine. Your safety is our priority.";
    const recommendedAction =
      'Consult a healthcare professional for a formal evaluation before starting any movement routine.';

    const payloadForClient = {
      red_flag_detected: isRefer,
      message: isRefer ? userMessage : '',
      recommended_action: isRefer ? recommendedAction : '',
      reasoning_internal: safetyResult?.reasoning_internal,
      blocked: isRefer,
    };

    if (isRefer) {
      const { data: blockedRow, error: dbError } = await supabase
        .from('assessments')
        .insert({
          user_id,
          body_area: intakeData.body_area,
          intake_data: JSON.stringify(intakeData),
          analysis_result: JSON.stringify({ ...payloadForClient, blocked: true }),
          safety_flagged: true,
        })
        .select('id')
        .single();

      if (dbError || !blockedRow) {
        logApiRouteFailure('POST /assessments', new Error(dbError?.message ?? 'no row'), {
          step: 'save_blocked_assessment',
          supabase_code: dbError?.code,
        });
        return apiFailure(
          API_ERROR_CODES.INTERNAL_ERROR,
          'Failed to record safety review. Please try again.',
          500,
          true
        );
      }

      trackTelemetry(user_id, TELEMETRY_EVENTS.ASSESSMENT_SAFETY_OUTCOME, {
        outcome: 'REFER',
        body_area: typeof intakeData.body_area === 'string' ? intakeData.body_area : null,
        parser_source: safetyPipeline.source,
        parser_repair_used: safetyPipeline.usedRepair,
        parser_valid: safetyPipeline.validationOk,
      });
      trackTelemetry(user_id, TELEMETRY_EVENTS.ASSESSMENT_SAVED, {
        assessment_id: blockedRow.id,
        safety_blocked: true,
        parser_source: safetyPipeline.source,
        parser_repair_used: safetyPipeline.usedRepair,
        parser_valid: safetyPipeline.validationOk,
      });

      return NextResponse.json(
        { ...payloadForClient, assessment_id: blockedRow.id },
        { status: 200 }
      );
    }

    const analysisPrompt = getAnalysisPrompt(intakeData);
    const analysisResponse = await callClaudeForTask(
      'assessment_analysis',
      analysisPrompt.system,
      analysisPrompt.user
    );
    const analysisPipeline = await parseClaudeJsonWithRepairAndValidate({
      response: analysisResponse,
      schema: analysisResultSchema,
      fallback: ANALYSIS_FALLBACK,
      log: { route: 'POST /assessments', kind: 'assessment_analysis' },
    });
    const analysisResult = analysisPipeline.value;

    const { data: saved, error: dbError } = await supabase
      .from('assessments')
      .insert({
        user_id,
        body_area: intakeData.body_area,
        intake_data: JSON.stringify(intakeData),
        analysis_result: JSON.stringify({ ...analysisResult, blocked: false }),
        safety_flagged: false,
      })
      .select('id')
      .single();

    if (dbError || !saved) {
      logApiRouteFailure('POST /assessments', new Error(dbError?.message ?? 'no row'), {
        step: 'save_assessment',
        supabase_code: dbError?.code,
      });
      return apiFailure(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        'Your analysis was generated but could not be saved. Please try submitting again.',
        503,
        true
      );
    }

    trackTelemetry(user_id, TELEMETRY_EVENTS.ASSESSMENT_SAFETY_OUTCOME, {
      outcome: 'CLEAR',
      body_area: typeof intakeData.body_area === 'string' ? intakeData.body_area : null,
      parser_source: safetyPipeline.source,
      parser_repair_used: safetyPipeline.usedRepair,
      parser_valid: safetyPipeline.validationOk,
    });
    trackTelemetry(user_id, TELEMETRY_EVENTS.ASSESSMENT_SAVED, {
      assessment_id: saved.id,
      safety_blocked: false,
      analysis_parser_source: analysisPipeline.source,
      analysis_parser_repair_used: analysisPipeline.usedRepair,
      analysis_parser_valid: analysisPipeline.validationOk,
    });

    return NextResponse.json(
      { ...analysisResult, blocked: false, assessment_id: saved.id },
      { status: 200 }
    );
  } catch (error) {
    return apiFailureFromException('POST /assessments', error);
  }
}
