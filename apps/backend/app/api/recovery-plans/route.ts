import { NextResponse } from 'next/server';
import { getRecoveryPlanPrompt } from '../../../prompts/recovery-plan-prompt';
import { callClaude, extractJSON } from '../../../lib/claude';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';
import {
  getUserSubscriptionStatus,
  getUserPlanCount,
} from '../../../lib/subscription';

export async function POST(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ----------------------------------------------------------------
    // Free-tier gating
    // Free users may generate exactly ONE recovery plan.
    // Creating a second plan (including regeneration) requires Pro.
    // ----------------------------------------------------------------
    const [{ isActive }, planCount] = await Promise.all([
      getUserSubscriptionStatus(user_id),
      getUserPlanCount(user_id),
    ]);

    if (!isActive && planCount >= 1) {
      return NextResponse.json(
        {
          error: 'Free plan limit reached',
          message:
            'You have already generated a recovery plan on the free tier. ' +
            'Upgrade to Pro ($19/month) for unlimited plan generation.',
          upgrade_required: true,
        },
        { status: 403 }
      );
    }
    // ----------------------------------------------------------------

    // Parse the request body
    const { assessment, intake_data } = await request.json();

    if (!assessment || !intake_data) {
      return NextResponse.json(
        {
          error: 'Missing required data: assessment and intake_data are required',
        },
        { status: 400 }
      );
    }

    // Generate recovery plan prompt
    const recoveryPlanPrompt = getRecoveryPlanPrompt(intake_data, assessment);
    const recoveryPlanResponse = await callClaude(
      recoveryPlanPrompt.system,
      recoveryPlanPrompt.user,
      'claude-sonnet-4-5-20250929'
    );
    const recoveryPlan = extractJSON(recoveryPlanResponse);

    // Save plan to Supabase
    let planId: string | null = null;

    const { data: insertedPlan, error: dbError } = await supabase
      .from('recovery_plans')
      .insert({
        user_id,
        body_area: intake_data.body_area,
        assessment_data: JSON.stringify({ intake_data, assessment }),
        plan_data: JSON.stringify(recoveryPlan),
        phase: 1,
        status: 'active',
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Failed to save recovery plan to database:', dbError);
    } else {
      planId = insertedPlan.id;
    }

    return NextResponse.json({ ...recoveryPlan, id: planId }, { status: 200 });
  } catch (error) {
    console.error('Error in recovery plans route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
