import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';

export async function GET() {
  try {
    // Try to fetch from database first
    const { data, error } = await supabase
      .from('body_area_configs')
      .select('body_area, display_name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback to hardcoded list if database fails or is empty
      return NextResponse.json([
        { id: 'neck', label: 'Neck' },
        { id: 'lower_back', label: 'Lower Back' },
        { id: 'knee', label: 'Knee' },
        { id: 'shoulder', label: 'Shoulder' },
      ]);
    }

    // Transform database data to match expected format
    const bodyAreas = data.map((item) => ({
      id: item.body_area,
      label: item.display_name || item.body_area,
    }));

    return NextResponse.json(bodyAreas);
  } catch (error) {
    console.error('Error fetching body areas:', error);
    // Fallback to hardcoded list on error
    return NextResponse.json([
      { id: 'neck', label: 'Neck' },
      { id: 'lower_back', label: 'Lower Back' },
      { id: 'knee', label: 'Knee' },
      { id: 'shoulder', label: 'Shoulder' },
    ]);
  }
}
