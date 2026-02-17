import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the recovery plan by ID
    const { data: plan, error: planError } = await supabase
      .from('recovery_plans')
      .select('id, plan_data, created_at, phase, status, body_area, user_id')
      .eq('id', id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Recovery plan not found' },
        { status: 404 }
      );
    }

    // Fetch all check-ins for this plan, newest first
    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select(
        'id, pain_level, pain_change, exercise_difficulty, completed_activities, notes, adjustments, created_at'
      )
      .eq('recovery_plan_id', id)
      .order('created_at', { ascending: false });

    if (checkInsError) {
      console.error('Failed to fetch check-ins:', checkInsError);
    }

    return NextResponse.json(
      {
        plan,
        checkIns: checkIns ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/plans/[id]:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
