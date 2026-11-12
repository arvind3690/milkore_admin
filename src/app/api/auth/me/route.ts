import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/server-api';

export async function GET() {
  const { status, body } = await adminFetch('admin/auth/me');
  return NextResponse.json(body, { status });
}
