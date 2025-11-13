import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:3000';

/**
 * POST /api/auth/login-verify
 * Verify WebAuthn authentication response and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 });
    }

    // Get challenge and user ID from cookies
    const challenge = request.cookies.get('authChallenge')?.value;
    const userIdStr = request.cookies.get('authUserId')?.value;

    if (!challenge || !userIdStr) {
      return NextResponse.json({ error: 'Authentication session expired' }, { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    const user = userDB.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find authenticator by credential ID (already base64url string in v10+)
    const credentialId = credential.rawId as string;
    const authenticator = authenticatorDB.findByCredentialId(credentialId);

    if (!authenticator || authenticator.user_id !== userId) {
      return NextResponse.json({ error: 'Authenticator not found' }, { status: 404 });
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: authenticator.credential_id, // Already base64url string
        credentialPublicKey: authenticator.public_key, // Already base64url string
        counter: authenticator.counter ?? 0,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Authentication verification failed' }, { status: 400 });
    }

    // Update authenticator counter
    if (verification.authenticationInfo) {
      authenticatorDB.updateCounter(authenticator.id, verification.authenticationInfo.newCounter ?? 0);
    }

    // Create session
    const token = await createSession(user.id, user.username);
    await setSessionCookie(token);

    // Clear authentication cookies
    const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
    response.cookies.delete('authChallenge');
    response.cookies.delete('authUserId');

    return response;
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return NextResponse.json({ error: 'Failed to verify authentication' }, { status: 500 });
  }
}
