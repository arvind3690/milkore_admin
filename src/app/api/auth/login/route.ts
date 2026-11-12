import { NextResponse } from 'next/server';
import { publicFetch, setSessionCookies, type TokenData } from '@/lib/server-api';

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as { email?: string; password?: string; totp?: string };
  const { status, body } = await publicFetch('admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: input.email, password: input.password, ...(input.totp ? { totp: input.totp } : {}) }),
  });
  if (status !== 200 || !body.data) {
    return NextResponse.json(body, { status });
  }
  const data = body.data as TokenData & { admin: unknown };
  await setSessionCookies(data);
  // Tokens stay server-side; the browser only learns who is logged in.
  return NextResponse.json({ statusCode: 200, message: 'Logged in', data: { admin: data.admin } });
}
