import 'server-only';
import { cookies } from 'next/headers';

/**
 * Server-side bridge to the Milkore API. Admin tokens never reach browser JavaScript:
 * they live in httpOnly cookies set by our route handlers.
 */
export const API_URL = (process.env.MILKORE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

export const ACCESS_COOKIE = 'mk_admin_access';
export const REFRESH_COOKIE = 'mk_admin_refresh';

const secure = process.env.NODE_ENV === 'production';

export interface Envelope<T = unknown> {
  statusCode: number;
  message: string;
  data: T | null;
  errors?: Record<string, string[]>;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function setSessionCookies(tokens: TokenData): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.max(60, tokens.expiresIn - 30),
  });
  jar.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 3600,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

async function callApi(path: string, init: RequestInit, token?: string): Promise<{ status: number; body: Envelope }> {
  const res = await fetch(`${API_URL}/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  let body: Envelope;
  try {
    body = (await res.json()) as Envelope;
  } catch {
    body = { statusCode: res.status, message: res.statusText || 'Unexpected response', data: null };
  }
  return { status: res.status, body };
}

/** Rotates the refresh token once. Returns the new access token, or null when the session is over. */
async function refresh(): Promise<string | null> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const { status, body } = await callApi('admin/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (status !== 200 || !body.data) {
    await clearSessionCookies();
    return null;
  }
  const tokens = body.data as TokenData;
  await setSessionCookies(tokens);
  return tokens.accessToken;
}

/** Authenticated call with one transparent refresh on 401. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<{ status: number; body: Envelope }> {
  const jar = await cookies();
  let token = jar.get(ACCESS_COOKIE)?.value ?? (await refresh()) ?? undefined;
  if (!token) return { status: 401, body: { statusCode: 401, message: 'Please log in.', data: null } };
  let result = await callApi(path, init, token);
  if (result.status === 401) {
    token = (await refresh()) ?? undefined;
    if (!token) return result;
    result = await callApi(path, init, token);
  }
  return result;
}

export async function publicFetch(path: string, init: RequestInit = {}) {
  return callApi(path, init);
}
