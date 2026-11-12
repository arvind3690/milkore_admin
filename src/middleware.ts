import { NextResponse, type NextRequest } from 'next/server';

/** Every page except /login needs an admin session cookie (the API still verifies every call). */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has('mk_admin_refresh') || request.cookies.has('mk_admin_access');
  const { pathname } = request.nextUrl;
  if (pathname === '/login') {
    return hasSession ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }
  if (!hasSession) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
