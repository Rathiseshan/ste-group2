import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB } from '@/lib/db';
import { rpID, rpName } from '@/lib/auth';
import { registrationChallenges } from '@/lib/challenges';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = userDB.getByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: username,
      userDisplayName: username,
      // Don't require attestation for better UX
      attestationType: 'none',
      // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      // Support multiple credential types
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });

    // Store challenge for later verification
    registrationChallenges.set(username, {
      challenge: options.challenge,
      timestamp: Date.now(),
    });

    return NextResponse.json({ options });
  } catch (error: any) {
    console.error('Registration options error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
