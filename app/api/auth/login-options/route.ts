import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';

const RP_ID = process.env.RP_ID || 'localhost';

/**
 * POST /api/auth/login-options
 * Generate WebAuthn authentication options for login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Find user
    const user = userDB.findByUsername(username.trim());
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's authenticators
    const authenticators = authenticatorDB.findByUserId(user.id);
    if (authenticators.length === 0) {
      return NextResponse.json({ error: 'No authenticators found for user' }, { status: 404 });
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: authenticators.map((auth) => ({
        id: auth.credential_id, // Already a base64url string in v10+
        type: 'public-key',
      })),
      userVerification: 'preferred',
    });

    // Store challenge in cookie for verification
    const response = NextResponse.json({ options });
    response.cookies.set('authChallenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/',
    });
    response.cookies.set('authUserId', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 });
  }
}
