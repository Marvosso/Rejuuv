import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

/**
 * False when URL/key were not inlined at build time (e.g. missing EAS env).
 * Never throw at module load — that crashes release/TestFlight before any UI.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[rejuuv] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add to apps/mobile .env locally, or EAS project secrets + eas.json `env` for production builds.'
  );
}

/** Placeholder only so createClient never receives invalid URL shape; requests fail until real env is set. */
const RESOLVED_URL =
  supabaseUrl || 'https://missing-env-placeholder.supabase.co';
/** Well-formed JWT shape (Supabase demo anon); wrong project URL so no real data is touched. */
const RESOLVED_KEY =
  supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase: SupabaseClient = createClient(RESOLVED_URL, RESOLVED_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;

export async function signUp(email: string, password: string) {
  const emailRedirectTo = Linking.createURL('/auth/callback');
  return await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

/** Password reset email — user must tap link; `redirectTo` must be in Supabase Redirect URLs allow list. */
export async function sendPasswordResetEmail(email: string) {
  const redirectTo = Linking.createURL('/auth/callback');
  return await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Refresh access token this many ms before expiry (reduces edge 401s). */
const REFRESH_MARGIN_MS = 120_000;

/**
 * Returns a usable access token for backend calls. Proactively refreshes when near expiry.
 * Prefer this over raw `getSession()` for API Authorization headers.
 */
export async function getAccessTokenForApi(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.access_token) return null;

  const expMs = session.expires_at ? session.expires_at * 1000 : 0;
  const nearOrExpired = !expMs || expMs < Date.now() + REFRESH_MARGIN_MS;

  if (nearOrExpired && session.refresh_token) {
    const { data: refreshed, error: rErr } = await supabase.auth.refreshSession();
    if (!rErr && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
  }

  return session.access_token;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
