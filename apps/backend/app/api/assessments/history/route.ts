import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';

export async function GET(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the most recent assessment per body area, plus the last 10 overall
    const { data: assessments, error } = await supabase
      .from('assessments')
      .select('id, body_area, intake_data, analysis_result, safety_flagged, created_at')
      .eq('user_id', user_id)
      .eq('safety_flagged', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch assessment history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment history' },
        { status: 500 }
      );
    }

    // Parse intake_data JSON and group by body_area, keeping the most recent per area
    const byArea: Record<string, {
      body_area: string;
      latest_pain_level: number | null;
      latest_date: string;
      history: Array<{ id: string; pain_level: number | null; date: string }>;
    }> = {};

    for (const row of assessments ?? []) {
      let painLevel: number | null = null;
      try {
        const intake = JSON.parse(row.intake_data);
        painLevel = typeof intake.pain_level === 'number' ? intake.pain_level : null;
      } catch {
        // ignore parse errors
      }

      const area = row.body_area;
      if (!byArea[area]) {
        byArea[area] = {
          body_area: area,
          latest_pain_level: painLevel,
          latest_date: row.created_at,
          history: [],
        };
      }

      byArea[area].history.push({
        id: row.id,
        pain_level: painLevel,
        date: row.created_at,
      });
    }

    return NextResponse.json({ areas: Object.values(byArea) }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/assessments/history:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
