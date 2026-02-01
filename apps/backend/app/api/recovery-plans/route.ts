import { NextResponse } from 'next/server';
import { getRecoveryPlanPrompt } from '@/prompts/recovery-plan-prompt';
import { callClaude, extractJSON } from '@/lib/claude';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { intakeData, analysis } = await request.json();

    if (!intakeData || !analysis) {
      return NextResponse.json(
        {
          error: 'Missing required data: intakeData and analysis are required',
        },
        { status: 400 }
      );
    }

    // Generate recovery plan prompt
    const recoveryPlanPrompt = getRecoveryPlanPrompt(intakeData, analysis);
    const recoveryPlanResponse = await callClaude(
      recoveryPlanPrompt.system,
      recoveryPlanPrompt.user,
      'claude-sonnet-4-5-20250929'
    );
    const recoveryPlan = extractJSON(recoveryPlanResponse);

    return NextResponse.json(recoveryPlan, { status: 200 });
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
