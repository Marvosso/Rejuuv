import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';

/**
 * POST /api/users/push-token
 * Register or update the Expo push token for the authenticated user.
 * Body: { token: string }
 */
export async function POST(request: Request) {
  try {
    const user_id = await getUserIdFromRequest(request);
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const token = body?.token;
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid token in body' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('push_tokens').upsert(
      { user_id, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Failed to upsert push token:', error);
      return NextResponse.json(
        { error: 'Failed to save push token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/users/push-token:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
