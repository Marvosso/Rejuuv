import supabase, { isSupabaseConfigured } from './auth';

export type AuthDeepLinkResult = {
  /** True if this URL looked like a Supabase auth redirect (hash/code). */
  handled: boolean;
  /** Session applied successfully. */
  ok: boolean;
  /** User-facing explanation when ok is false. */
  errorMessage?: string;
};

let lastProcessedUrl: string | null = null;

function isLikelySupabaseAuthUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (!u.startsWith('rejuuv:')) return false;
  if (u.includes('/subscription') || u.includes('subscription?')) return false;
  return (
    u.includes('access_token=') ||
    u.includes('refresh_token=') ||
    u.includes('code=') ||
    u.includes('type=recovery') ||
    u.includes('type=signup') ||
    u.includes('type=magiclink')
  );
}

/**
 * Applies tokens or PKCE code from a Rejuuv deep link into the Supabase client.
 * Safe to call multiple times (deduped by full URL string).
 * Does not use Claude or the Rejuuv API.
 */
export async function handleAuthDeepLink(url: string | null | undefined): Promise<AuthDeepLinkResult> {
  if (!isSupabaseConfigured) {
    return { handled: false, ok: false };
  }
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { handled: false, ok: false };
  }
  const trimmed = url.trim();
  if (!isLikelySupabaseAuthUrl(trimmed)) {
    return { handled: false, ok: false };
  }
  if (lastProcessedUrl === trimmed) {
    return { handled: true, ok: true };
  }

  try {
    if (trimmed.includes('code=')) {
      const { error } = await supabase.auth.exchangeCodeForSession(trimmed);
      if (error) {
        return {
          handled: true,
          ok: false,
          errorMessage:
            error.message ||
            'This sign-in link is no longer valid. Request a new email from the login screen.',
        };
      }
      lastProcessedUrl = trimmed;
      return { handled: true, ok: true };
    }

    const hashIdx = trimmed.indexOf('#');
    if (hashIdx >= 0) {
      const fragment = trimmed.slice(hashIdx + 1);
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          return {
            handled: true,
            ok: false,
            errorMessage:
              error.message ||
              'This link may have expired. Sign in with your password or request a new reset email.',
          };
        }
        lastProcessedUrl = trimmed;
        return { handled: true, ok: true };
      }
    }

    return {
      handled: true,
      ok: false,
      errorMessage: 'This link does not contain a usable sign-in token. Open the link from your email again.',
    };
  } catch (e) {
    return {
      handled: true,
      ok: false,
      errorMessage: e instanceof Error ? e.message : 'Could not complete sign-in from this link.',
    };
  }
}
