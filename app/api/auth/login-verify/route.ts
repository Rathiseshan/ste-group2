import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { rpID, rpOrigin, createSession } from '@/lib/auth';
import { loginChallenges } from '@/lib/challenges';

export async function POST(request: NextRequest) {
  try {
    const { username, credential } = await request.json();

    if (!username || !credential) {
      return NextResponse.json(
        { error: 'Username and credential are required' },
        { status: 400 }
      );
    }

    // Retrieve stored challenge
    const challengeData = loginChallenges.get(username);
    if (!challengeData) {
      return NextResponse.json(
        { error: 'Challenge not found or expired. Please try again.' },
        { status: 400 }
      );
    }

    // Find user
    const user = userDB.getByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find authenticator by credential ID
    const credentialId = credential.id || credential.rawId;
    const authenticator = authenticatorDB.getByCredentialId(credentialId);
    
    if (!authenticator || authenticator.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Authenticator not found or does not belong to this user' },
        { status: 401 }
      );
    }

    // Verify authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: authenticator.credential_id,
        credentialPublicKey: isoBase64URL.toBuffer(authenticator.public_key),
        counter: authenticator.counter ?? 0,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Clean up used challenge
    loginChallenges.delete(username);

    // Update authenticator counter (prevent replay attacks)
    const { authenticationInfo } = verification;
    if (authenticationInfo) {
      authenticatorDB.updateCounter(authenticator.id, authenticationInfo.newCounter);
    }

    // Create session
    await createSession(user.id, user.username);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error('Login verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
