import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import { apiFailure, API_ERROR_CODES, apiFailureFromException, logApiRouteFailure } from '../../../../lib/api-errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'GET /plans/detail');
    if (!limited.ok) {
      return limited.response;
    }

    const { id } = await params;

    const { data: plan, error: planError } = await supabase
      .from('recovery_plans')
      .select('id, plan_data, created_at, phase, status, body_area, user_id, assessment_id')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (planError || !plan) {
      return apiFailure(API_ERROR_CODES.NOT_FOUND, 'Recovery plan not found', 404, true);
    }

    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select(
        'id, pain_level, pain_change, difficulty, completed_activities, notes, adjustments, created_at'
      )
      .eq('recovery_plan_id', id)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (checkInsError) {
      logApiRouteFailure('GET /api/plans/[id]', new Error(checkInsError.message), {
        supabase_code: checkInsError.code,
      });
    }

    return NextResponse.json(
      {
        plan,
        checkIns: checkIns ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    return apiFailureFromException('GET /api/plans/[id]', error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return apiFailure(API_ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401, false);
    }

    const limited = await enforceRateLimit(user_id, 'DELETE /plans/detail');
    if (!limited.ok) {
      return limited.response;
    }

    const { id } = await params;

    const { error } = await supabase
      .from('recovery_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      logApiRouteFailure('DELETE /api/plans/[id]', new Error(error.message), {
        supabase_code: error.code,
      });
      return apiFailure(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Could not delete recovery plan. Please try again.',
        500,
        true
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return apiFailureFromException('DELETE /api/plans/[id]', error);
  }
}
