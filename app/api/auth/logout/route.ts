import { NextResponse } from 'next/server';
import { deleteSessionCookie } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Clear session cookie and log out user
 */
export async function POST() {
  try {
    await deleteSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
