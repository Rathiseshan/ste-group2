import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { rpID, rpOrigin, createSession } from '@/lib/auth';
import { registrationChallenges } from '@/lib/challenges';

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
    const challengeData = registrationChallenges.get(username);
    if (!challengeData) {
      return NextResponse.json(
        { error: 'Challenge not found or expired. Please try again.' },
        { status: 400 }
      );
    }

    // Verify registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Invalid credential' },
        { status: 400 }
      );
    }

    // Clean up used challenge
    registrationChallenges.delete(username);

    // Create user
    const user = userDB.create(username, username);

    // Store authenticator
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    
    // credentialID is already base64url string from the library
    authenticatorDB.create(
      user.id,
      credentialID,
      isoBase64URL.fromBuffer(credentialPublicKey),
      counter ?? 0,
      JSON.stringify(credential.response.transports || [])
    );

    // Create session
    await createSession(user.id, user.username);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
      },
    });
  } catch (error: any) {
    console.error('Registration verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
