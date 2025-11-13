import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { rpID } from '@/lib/auth';
import { loginChallenges } from '@/lib/challenges';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = userDB.getByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's authenticators
    const authenticators = authenticatorDB.getByUserId(user.id);
    if (authenticators.length === 0) {
      return NextResponse.json(
        { error: 'No passkey found for this user. Please register again.' },
        { status: 400 }
      );
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      // Allow credentials from user's authenticators
      allowCredentials: authenticators.map(auth => {
        const transports = auth.transports ? JSON.parse(auth.transports) : [];
        return {
          id: auth.credential_id, // Already base64url string
          transports: transports.length > 0 ? transports : ['internal', 'hybrid'],
        };
      }),
      userVerification: 'preferred',
    });

    // Store challenge for later verification
    loginChallenges.set(username, {
      challenge: options.challenge,
      timestamp: Date.now(),
    });

    return NextResponse.json({ options });
  } catch (error: any) {
    console.error('Login options error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate login options' },
      { status: 500 }
    );
  }
}
