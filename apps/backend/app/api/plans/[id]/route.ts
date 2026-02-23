import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the recovery plan by ID, scoped to the authenticated user
    const { data: plan, error: planError } = await supabase
      .from('recovery_plans')
      .select('id, plan_data, created_at, phase, status, body_area, user_id')
      .eq('id', id)
      .eq('user_id', user_id)
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
        'id, pain_level, pain_change, difficulty, completed_activities, notes, adjustments, created_at'
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('recovery_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Failed to delete recovery plan:', error);
      return NextResponse.json(
        { error: 'Failed to delete recovery plan', detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/plans/[id]:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
