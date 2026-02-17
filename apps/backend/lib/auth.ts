import { supabase } from './db';

/**
 * Extracts and verifies the Bearer token from an incoming request,
 * then returns the authenticated user's ID.
 *
 * Returns null if the header is missing or the token is invalid.
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}
