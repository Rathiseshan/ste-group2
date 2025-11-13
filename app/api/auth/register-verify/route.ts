import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:3000';

/**
 * POST /api/auth/register-verify
 * Verify WebAuthn registration response and create user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 });
    }

    // Get challenge and username from cookies
    const challenge = request.cookies.get('regChallenge')?.value;
    const username = request.cookies.get('regUsername')?.value;

    if (!challenge || !username) {
      return NextResponse.json({ error: 'Registration session expired' }, { status: 400 });
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Create user
    const user = userDB.create(username);

    // In @simplewebauthn v10+, credentialID and credentialPublicKey are already base64url strings
    const credentialIdString = credentialID as string;
    const publicKeyString = credentialPublicKey as string;

    // Store authenticator
    authenticatorDB.create(
      user.id,
      credentialIdString,
      publicKeyString,
      counter ?? 0
    );

    // Create session
    const token = await createSession(user.id, user.username);
    await setSessionCookie(token);

    // Clear registration cookies
    const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
    response.cookies.delete('regChallenge');
    response.cookies.delete('regUsername');

    return response;
  } catch (error) {
    console.error('Error verifying registration:', error);
    return NextResponse.json({ error: 'Failed to verify registration' }, { status: 500 });
  }
}
