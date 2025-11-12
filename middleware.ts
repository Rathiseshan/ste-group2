import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './lib/auth';

export async function middleware(request: NextRequest) {
  // TEMPORARY: Disable authentication for testing
  // TODO: Re-enable after WebAuthn implementation is complete
  return NextResponse.next();

  /*
  const session = await getSessionFromRequest(request);

  // Protect routes that require authentication
  const protectedPaths = ['/', '/calendar'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
  */
}

export const config = {
  matcher: ['/', '/calendar', '/login'],
};
