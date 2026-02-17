import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';

export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: plans, error } = await supabase
      .from('recovery_plans')
      .select('id, body_area, phase, status, created_at, plan_data')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch recovery plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recovery plans' },
        { status: 500 }
      );
    }

    return NextResponse.json({ plans: plans ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/plans:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
