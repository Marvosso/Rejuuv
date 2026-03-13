import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';

/**
 * GET /api/tips/daily
 * Returns one "today's tip" for the authenticated user.
 * Optional query: body_area to get a tip for a specific area.
 */
export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const body_area = searchParams.get('body_area') || null;

    // Rotate by day of year so the same tip is shown all day
    const dayIndex = Math.floor((Date.now() / 86400000) % 7);

    let query = supabase
      .from('daily_tips')
      .select('id, tip_text, body_area, day_index')
      .eq('day_index', dayIndex);

    if (body_area) {
      query = query.or(`body_area.eq.${body_area},body_area.is.null`);
    } else {
      query = query.is('body_area', null);
    }

    const { data: rows, error } = await query.order('body_area', { ascending: false }).limit(1);

    if (error) {
      console.error('Failed to fetch daily tip:', error);
      return NextResponse.json(
        { error: 'Failed to fetch daily tip' },
        { status: 500 }
      );
    }

    const tip = rows?.[0] ?? null;
    return NextResponse.json({ tip: tip?.tip_text ?? null, id: tip?.id ?? null }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/tips/daily:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
