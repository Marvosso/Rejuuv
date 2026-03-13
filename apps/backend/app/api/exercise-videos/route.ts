import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';
import { getUserIdFromRequest } from '../../../lib/auth';

/**
 * GET /api/exercise-videos
 * Returns exercise form-check videos. Optional query: body_area to filter.
 */
export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const body_area = searchParams.get('body_area') || null;

    let query = supabase
      .from('exercise_videos')
      .select('id, exercise_key, body_area, video_url, duration_sec');

    if (body_area) {
      query = query.or(`body_area.eq.${body_area},body_area.is.null`);
    }

    const { data: rows, error } = await query.order('exercise_key');

    if (error) {
      console.error('Failed to fetch exercise videos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch exercise videos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ videos: rows ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/exercise-videos:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
