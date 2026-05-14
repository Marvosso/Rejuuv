import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserIdFromRequest } from './auth';
import { supabase } from './db';
import { jsonError } from './api-errors';

export type RequireUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Resolves the authenticated user from the Bearer JWT (Supabase).
 * Never trust a client-supplied user id in the request body or query string.
 */
export async function requireUser(request: Request): Promise<RequireUserResult> {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return { ok: false, response: jsonError('Unauthorized', 401) };
  }
  return { ok: true, userId };
}

/** True if this recovery plan row exists and belongs to the user. */
export async function assertPlanOwnership(planId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('recovery_plans')
    .select('id')
    .eq('id', planId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

/** True if this assessment row exists and belongs to the user. */
export async function assertAssessmentOwnership(
  assessmentId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('assessments')
    .select('id')
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

/**
 * Shared server Supabase client (service role). RLS is bypassed for this key,
 * so every query on user-owned tables must include explicit ownership filters
 * (e.g. `.eq('user_id', userId)`) or be preceded by {@link assertPlanOwnership} /
 * {@link assertAssessmentOwnership} when using only resource ids from the client.
 */
export function getScopedSupabaseClient(): SupabaseClient {
  return supabase;
}
