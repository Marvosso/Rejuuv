import supabase, { getAccessTokenForApi } from './auth';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function toUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export type ApiFetchInit = RequestInit & {
  /** Default 90s */
  timeoutMs?: number;
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  userSignal?: AbortSignal | null
): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const onUserAbort = () => ac.abort();
  if (userSignal) {
    if (userSignal.aborted) ac.abort();
    else userSignal.addEventListener('abort', onUserAbort);
  }
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
    userSignal?.removeEventListener('abort', onUserAbort);
  }
}

/**
 * Authenticated fetch to the Rejuuv API: attaches Bearer token, timeout, one 401→refresh→retry, then sign-out if still unauthorized.
 */
export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { timeoutMs = 90_000, signal: userSignal, headers: initHeaders, ...rest } = init;
  const url = toUrl(path);

  const buildHeaders = async (token: string | null) => {
    const h = new Headers(initHeaders);
    if (!h.has('Content-Type')) {
      h.set('Content-Type', 'application/json');
    }
    if (token) {
      h.set('Authorization', `Bearer ${token}`);
    } else {
      h.delete('Authorization');
    }
    return h;
  };

  const doOnce = async () => {
    const token = await getAccessTokenForApi();
    const headers = await buildHeaders(token);
    return fetchWithTimeout(url, { ...rest, headers }, timeoutMs, userSignal ?? null);
  };

  let res = await doOnce();
  if (res.status !== 401) {
    return res;
  }

  const { error: refErr } = await supabase.auth.refreshSession();
  if (refErr) {
    await supabase.auth.signOut();
    return res;
  }

  res = await doOnce();
  if (res.status === 401) {
    await supabase.auth.signOut();
  }
  return res;
}

export type ApiJsonOk<T> = { ok: true; status: number; data: T };
export type ApiJsonErr = {
  ok: false;
  status: number;
  code?: string;
  message: string;
  recoverable?: boolean;
  /** From API `error.retry_after_sec` when rate limited. */
  retry_after_sec?: number;
};
export type ApiJsonResult<T> = ApiJsonOk<T> | ApiJsonErr;

function readErrorFields(body: unknown): {
  message: string;
  code?: string;
  recoverable?: boolean;
  retry_after_sec?: number;
} {
  if (body && typeof body === 'object' && body !== null) {
    const o = body as Record<string, unknown>;
    const errObj = o.error;
    if (errObj && typeof errObj === 'object' && errObj !== null) {
      const e = errObj as Record<string, unknown>;
      const msg = typeof e.message === 'string' ? e.message : 'Request failed';
      const code = typeof e.code === 'string' ? e.code : undefined;
      const recoverable = typeof e.recoverable === 'boolean' ? e.recoverable : undefined;
      const retry_after_sec =
        typeof e.retry_after_sec === 'number' && Number.isFinite(e.retry_after_sec)
          ? e.retry_after_sec
          : undefined;
      return { message: msg, code, recoverable, retry_after_sec };
    }
    if (typeof o.error === 'string') {
      const code = typeof o.code === 'string' ? o.code : undefined;
      return { message: o.error, code };
    }
  }
  return { message: 'Request failed' };
}

/**
 * JSON helper on top of `apiFetch` — stable `{ ok, data | message, code }` without throwing on HTTP errors.
 */
export async function apiFetchJson<T>(path: string, init: ApiFetchInit = {}): Promise<ApiJsonResult<T>> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const { message, code, recoverable, retry_after_sec } = readErrorFields(body);
    return { ok: false, status: res.status, code, message, recoverable, retry_after_sec };
  }
  return { ok: true, status: res.status, data: body as T };
}
