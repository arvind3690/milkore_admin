import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminFetch, clearSessionCookies, REFRESH_COOKIE } from '@/lib/server-api';

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  await adminFetch('admin/auth/logout', {
    method: 'POST',
    body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
  }).catch(() => undefined);
  await clearSessionCookies();
  return NextResponse.json({ statusCode: 200, message: 'Logged out', data: null });
}
