import { NextResponse } from 'next/server';
import { getSafetyPrompt } from '../../../prompts/safety-prompt';
import { getAnalysisPrompt } from '../../../prompts/analysis-prompt';
import { callClaude, extractJSON } from '../../../lib/claude';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';

export async function POST(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const intakeData = await request.json();

    // Step 1: Safety check
    const safetyPrompt = getSafetyPrompt(intakeData);
    const safetyResponse = await callClaude(
      safetyPrompt.system,
      safetyPrompt.user,
      'claude-haiku-4-5-20251001'
    );
    const safetyResult = extractJSON(safetyResponse);

    // Step 2: Check for red flags
    if (safetyResult.red_flag_detected === true) {
      // Save blocked assessment to Supabase
      const { error: dbError } = await supabase.from('assessments').insert({
        user_id,
        body_area: intakeData.body_area,
        intake_data: JSON.stringify(intakeData),
        analysis_result: JSON.stringify({ ...safetyResult, blocked: true }),
        safety_flagged: true,
      });
      if (dbError) console.error('Failed to save blocked assessment:', dbError);

      return NextResponse.json(
        { ...safetyResult, blocked: true },
        { status: 200 }
      );
    }

    // Step 3: Run analysis if no red flags
    const analysisPrompt = getAnalysisPrompt(intakeData);
    const analysisResponse = await callClaude(
      analysisPrompt.system,
      analysisPrompt.user,
      'claude-sonnet-4-5-20250929'
    );
    const analysisResult = extractJSON(analysisResponse);

    // Step 4: Save assessment to Supabase
    const { error: dbError } = await supabase.from('assessments').insert({
      user_id,
      body_area: intakeData.body_area,
      intake_data: JSON.stringify(intakeData),
      analysis_result: JSON.stringify({ ...analysisResult, blocked: false }),
      safety_flagged: false,
    });
    if (dbError) console.error('Failed to save assessment:', dbError);

    // Step 5: Return analysis with blocked: false
    return NextResponse.json(
      { ...analysisResult, blocked: false },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in assessments route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
