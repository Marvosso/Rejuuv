import { NextResponse } from 'next/server';
import { getCheckInPrompt } from '../../../prompts/checkin-prompt';
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
    const {
      recovery_plan_id,
      pain_change,
      pain_level,
      difficulty,
      completed_activities,
      notes,
      current_plan,
    } = await request.json();

    // Validate required fields
    if (!recovery_plan_id || !pain_change || !pain_level || !difficulty || !current_plan) {
      return NextResponse.json(
        {
          error: 'Missing required fields: recovery_plan_id, pain_change, pain_level, difficulty, and current_plan are required',
        },
        { status: 400 }
      );
    }

    // Prepare check-in data
    const checkInData = {
      recovery_plan_id,
      pain_change,
      pain_level,
      difficulty,
      completed_activities: completed_activities || [],
      notes: notes || '',
    };

    // Generate check-in prompt
    const checkInPrompt = getCheckInPrompt(checkInData, current_plan);
    const checkInResponse = await callClaude(
      checkInPrompt.system,
      checkInPrompt.user,
      'claude-sonnet-4-5-20250929'
    );
    const checkInResult = extractJSON(checkInResponse);

    // Save check-in to Supabase
    let checkInId: string | null = null;

    const { data: insertedCheckIn, error: dbError } = await supabase
      .from('check_ins')
      .insert({
        user_id,
        recovery_plan_id,
        pain_level,
        pain_change,
        exercise_difficulty: difficulty,
        completed_activities: JSON.stringify(completed_activities || []),
        notes: notes || '',
        adjustments: JSON.stringify(checkInResult),
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Failed to save check-in to database:', dbError);
    } else {
      checkInId = insertedCheckIn.id;
    }

    // Return response with extracted data plus original check-in data
    return NextResponse.json(
      {
        ...checkInResult,
        check_in_data: checkInData,
        id: checkInId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in check-ins route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
