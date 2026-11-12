import { NextResponse, type NextRequest } from 'next/server';
import { adminFetch } from '@/lib/server-api';

/**
 * Browser → /api/proxy/<path> → Milkore API /admin/<path>, with the admin token
 * from the httpOnly cookie. Only /admin/* is reachable through here.
 */
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!path.length || path.some((p) => p === '..' || p.includes('\\'))) {
    return NextResponse.json({ statusCode: 400, message: 'Bad path', data: null }, { status: 400 });
  }
  const target = `admin/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  const { status, body: json } = await adminFetch(target, { method: request.method, body: body || undefined });
  return NextResponse.json(json, { status });
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
