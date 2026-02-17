import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tmkjfkiapsbhvmuqjiit.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRta2pma2lhcHNiaHZtdXFqaWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTk5NzIsImV4cCI6MjA4NTUzNTk3Mn0.2gpYh0umiUl3B0s-hxsJ3ejkTcIgZBwhbNPmwupwJr0';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
  });
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

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
