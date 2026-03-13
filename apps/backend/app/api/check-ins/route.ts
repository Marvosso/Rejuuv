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
    const body = await request.json();
    const {
      quick,
      recovery_plan_id,
      pain_change,
      pain_level,
      difficulty,
      completed_activities,
      notes,
      current_plan,
    } = body;

    const isQuick = quick === true;

    // Quick check-in: only pain_level required; pain_change optional; recovery_plan_id required
    if (isQuick) {
      if (pain_level == null || pain_level < 1 || pain_level > 10) {
        return NextResponse.json(
          { error: 'Quick check-in requires pain_level (1-10)' },
          { status: 400 }
        );
      }
      if (!recovery_plan_id) {
        return NextResponse.json(
          { error: 'Quick check-in requires recovery_plan_id' },
          { status: 400 }
        );
      }
      const { data: insertedCheckIn, error: dbError } = await supabase
        .from('check_ins')
        .insert({
          user_id,
          recovery_plan_id,
          pain_level,
          pain_change: pain_change || 'Same',
          difficulty: 'Manageable',
          completed_activities: JSON.stringify([]),
          notes: notes || '',
          adjustments: JSON.stringify({ quick: true }),
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Failed to save quick check-in:', dbError);
        return NextResponse.json(
          { error: 'Failed to save check-in' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          adjustment_summary: 'Quick check-in recorded.',
          updated_recommendations: [],
          next_check_in: 'Keep logging daily for best results.',
          safety_reminder: '',
          id: insertedCheckIn.id,
          quick: true,
        },
        { status: 200 }
      );
    }

    // Full check-in: validate required fields
    if (!pain_change || !pain_level || !difficulty || !current_plan) {
      return NextResponse.json(
        {
          error: 'Missing required fields: pain_change, pain_level, difficulty, and current_plan are required',
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
        difficulty,
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

    // Auto-adjust phase if pain dropped >30%: fetch recent check-ins for this plan
    let suggestedPhase: number | null = null;
    let maintenanceUnlocked = false;
    if (recovery_plan_id && checkInId) {
      const { data: recentCheckIns } = await supabase
        .from('check_ins')
        .select('pain_level, created_at')
        .eq('recovery_plan_id', recovery_plan_id)
        .order('created_at', { ascending: true });
      const withLevel = (recentCheckIns ?? []).filter((r) => r.pain_level != null);
      if (withLevel.length >= 4) {
        const mid = Math.floor(withLevel.length / 2);
        const firstHalf = withLevel.slice(0, mid);
        const secondHalf = withLevel.slice(mid);
        const baseline =
          firstHalf.reduce((s, r) => s + (r.pain_level ?? 0), 0) / firstHalf.length;
        const current =
          secondHalf.reduce((s, r) => s + (r.pain_level ?? 0), 0) / secondHalf.length;
        if (baseline > 0 && current <= 0.7 * baseline) {
          const { data: planRow } = await supabase
            .from('recovery_plans')
            .select('phase, status')
            .eq('id', recovery_plan_id)
            .single();
          const currentPhase = planRow?.phase ?? 1;
          if (currentPhase < 3) {
            const nextPhase = currentPhase + 1;
            await supabase
              .from('recovery_plans')
              .update({ phase: nextPhase, updated_at: new Date().toISOString() })
              .eq('id', recovery_plan_id);
            suggestedPhase = nextPhase;
          }
        }
      }
      // Phase 3 completion: if plan is in phase 3 and has 7+ check-ins, mark completed and unlock maintenance
      const { data: planRow } = await supabase
        .from('recovery_plans')
        .select('phase, status')
        .eq('id', recovery_plan_id)
        .single();
      if (planRow?.phase === 3 && planRow?.status !== 'completed') {
        const { count } = await supabase
          .from('check_ins')
          .select('id', { count: 'exact', head: true })
          .eq('recovery_plan_id', recovery_plan_id);
        if ((count ?? 0) >= 7) {
          await supabase
            .from('recovery_plans')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', recovery_plan_id);
          maintenanceUnlocked = true;
        }
      }
    }

    // Return response with extracted data plus original check-in data
    return NextResponse.json(
      {
        ...checkInResult,
        check_in_data: checkInData,
        id: checkInId,
        ...(suggestedPhase != null ? { suggested_phase: suggestedPhase } : {}),
        ...(maintenanceUnlocked ? { maintenance_unlocked: true } : {}),
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
