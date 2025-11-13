import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './lib/auth';

export async function middleware(request: NextRequest) {
  // Check if authentication is enabled via environment variable
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false';

  // If auth is disabled, allow all requests (development mode)
  if (!authEnabled) {
    return NextResponse.next();
  }

  // Get session from request
  const session = await getSessionFromRequest(request);

  // Protect routes that require authentication
  const protectedPaths = ['/', '/calendar'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  // Redirect unauthenticated users to login page
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/calendar', '/login'],
};
