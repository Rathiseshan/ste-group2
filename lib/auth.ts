import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-key-change-in-production'
);

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  userId: number;
  username: string;
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: number, username: string): Promise<string> {
  const token = await new SignJWT({ userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });

  return token;
}

/**
 * Get the current session data
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as SessionData;
  } catch (error) {
    return null;
  }
}

/**
 * Delete the current session
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Get session from a request (for middleware)
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as SessionData;
  } catch (error) {
    return null;
  }
}

/**
 * WebAuthn configuration
 */
export const rpID = process.env.RP_ID || 'localhost';
export const rpName = process.env.RP_NAME || 'Todo App';
export const rpOrigin = process.env.RP_ORIGIN || 'http://localhost:3000';

/**
 * Generate a challenge for WebAuthn
 */
export function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}
