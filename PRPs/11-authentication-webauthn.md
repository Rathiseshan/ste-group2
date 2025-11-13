# Feature 11: WebAuthn/Passkeys Authentication

## Feature Overview

Implement passwordless authentication using WebAuthn (Passkeys) for secure, modern user authentication. Users can register and login using biometrics (fingerprint, face ID) or security keys instead of traditional passwords. This feature can be enabled/disabled via environment variable for testing and development purposes.

## User Stories

**As a new user, I want to:**
- Register an account using my device's biometric authentication (no password required)
- See clear feedback during the registration process
- Be automatically logged in after successful registration
- Have my session persist for 7 days without re-authenticating

**As a returning user, I want to:**
- Login using my saved passkey (biometric or security key)
- See my username remembered on the login page
- Stay logged in for 7 days
- Logout manually when using a shared device

**As a developer/tester, I want to:**
- Toggle authentication on/off using an environment variable
- Bypass authentication during development (use test user)
- Test authentication flows using Playwright's virtual authenticators

## User Flow

### Registration Flow (New User)

1. User visits `/` or `/calendar` (protected route) → **redirected to `/login`**
2. On login page, user clicks **"Register"** tab
3. User enters **username** (unique identifier)
4. User clicks **"Register with Passkey"** button
5. System prompts for biometric authentication (browser WebAuthn API)
6. User authenticates using fingerprint/face/security key
7. System creates user account and session
8. User redirected to **`/`** (main todo page)

### Login Flow (Returning User)

1. User visits `/` or `/calendar` → **redirected to `/login`**
2. User enters **username**
3. User clicks **"Login with Passkey"** button
4. System prompts for passkey authentication
5. User authenticates with saved passkey
6. Session created (JWT cookie, 7-day expiry)
7. User redirected to **`/`**

### Logout Flow

1. User clicks **"Logout"** button (in app header)
2. API route clears session cookie
3. User redirected to **`/login`**

### Auth Disabled Flow (Development)

1. Environment variable `NEXT_PUBLIC_AUTH_ENABLED=false`
2. Middleware allows all route access without authentication
3. All API routes use test user (ID: 1) from `lib/test-user.ts`
4. Login page accessible but shows "Auth Disabled" message

## Technical Requirements

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_AUTH_ENABLED=true  # Set to false to disable authentication
RP_ID=localhost  # Relying Party ID (your domain)
RP_NAME=Todo App  # Relying Party Name
RP_ORIGIN=http://localhost:3000  # Relying Party Origin
JWT_SECRET=your-secret-key-change-in-production  # For JWT signing
```

### Database Schema (Already Implemented)

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Authenticators table (WebAuthn credentials)
CREATE TABLE authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,  -- Base64URL encoded
  public_key TEXT NOT NULL,  -- Base64URL encoded public key
  counter INTEGER NOT NULL DEFAULT 0,  -- Sign count for replay protection
  transports TEXT,  -- JSON array of transport methods
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_authenticators_user_id ON authenticators(user_id);
CREATE INDEX idx_authenticators_credential_id ON authenticators(credential_id);
```

### TypeScript Interfaces (Already in lib/db.ts)

```typescript
export interface User {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;  // Base64URL
  public_key: string;  // Base64URL
  counter: number;
  transports?: string;  // JSON stringified array
  created_at: string;
}
```

### API Endpoints

#### 1. `POST /api/auth/register-options`

**Purpose:** Generate registration options (challenge) for WebAuthn

**Request Body:**
```json
{
  "username": "john_doe"
}
```

**Response:**
```json
{
  "options": {
    "challenge": "base64url_string",
    "rp": {
      "name": "Todo App",
      "id": "localhost"
    },
    "user": {
      "id": "base64url_user_id",
      "name": "john_doe",
      "displayName": "john_doe"
    },
    "pubKeyCredParams": [...],
    "timeout": 60000,
    "attestation": "none",
    "authenticatorSelection": {
      "residentKey": "preferred",
      "userVerification": "preferred"
    }
  }
}
```

**Validation:**
- Username required (non-empty string)
- Username must not already exist
- Challenge stored temporarily (in-memory or session)

---

#### 2. `POST /api/auth/register-verify`

**Purpose:** Verify WebAuthn registration response and create user

**Request Body:**
```json
{
  "username": "john_doe",
  "credential": {
    "id": "credential_id",
    "rawId": "base64url",
    "response": {
      "clientDataJSON": "base64url",
      "attestationObject": "base64url"
    },
    "type": "public-key"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "display_name": "john_doe"
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid credential"
}
```

**Logic:**
1. Verify credential using `@simplewebauthn/server`
2. Create user in database (`userDB.create()`)
3. Store authenticator (`authenticatorDB.create()`)
4. Create session (`createSession()`)
5. Return success

---

#### 3. `POST /api/auth/login-options`

**Purpose:** Generate login options (challenge) for WebAuthn

**Request Body:**
```json
{
  "username": "john_doe"
}
```

**Response:**
```json
{
  "options": {
    "challenge": "base64url_string",
    "timeout": 60000,
    "rpId": "localhost",
    "allowCredentials": [
      {
        "id": "base64url_credential_id",
        "type": "public-key",
        "transports": ["internal", "hybrid"]
      }
    ],
    "userVerification": "preferred"
  }
}
```

**Validation:**
- Username required
- User must exist in database
- Fetch user's authenticators (`authenticatorDB.getByUserId()`)

---

#### 4. `POST /api/auth/login-verify`

**Purpose:** Verify WebAuthn login response and create session

**Request Body:**
```json
{
  "username": "john_doe",
  "credential": {
    "id": "credential_id",
    "rawId": "base64url",
    "response": {
      "clientDataJSON": "base64url",
      "authenticatorData": "base64url",
      "signature": "base64url",
      "userHandle": "base64url"
    },
    "type": "public-key"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe"
  }
}
```

**Logic:**
1. Find user by username
2. Find authenticator by credential ID
3. Verify authentication using `@simplewebauthn/server`
4. Update authenticator counter (prevent replay attacks)
5. Create session (`createSession()`)
6. Return success

---

#### 5. `POST /api/auth/logout`

**Purpose:** Clear session cookie

**Response:**
```json
{
  "success": true
}
```

**Logic:**
1. Call `deleteSession()` to clear cookie
2. Return success

---

#### 6. `GET /api/auth/me`

**Purpose:** Get current authenticated user

**Response (Authenticated):**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "error": "Not authenticated"
}
```

**Logic:**
1. Call `getSession()` to retrieve session data
2. Return user info if session exists

---

### Auth Utilities (lib/auth.ts - Already Implemented)

```typescript
// Session management
export async function createSession(userId: number, username: string): Promise<string>
export async function getSession(): Promise<SessionData | null>
export async function deleteSession(): Promise<void>
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null>

// WebAuthn configuration
export const rpID: string  // Relying Party ID
export const rpName: string  // Relying Party Name
export const rpOrigin: string  // Relying Party Origin
export function generateChallenge(): Uint8Array
```

---

### Middleware (middleware.ts)

**Purpose:** Protect routes from unauthenticated access

**Logic:**
```typescript
export async function middleware(request: NextRequest) {
  // Check if auth is enabled
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false';
  
  if (!authEnabled) {
    return NextResponse.next();  // Allow all requests
  }

  const session = await getSessionFromRequest(request);

  // Protected paths
  const protectedPaths = ['/', '/calendar'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  // Redirect to login if not authenticated
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to home if already authenticated
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}
```

**Config:**
```typescript
export const config = {
  matcher: ['/', '/calendar', '/login'],
};
```

---

### UI Components

#### Login/Register Page (`app/login/page.tsx`)

**Features:**
- Tab switching (Login / Register)
- Username input field
- "Login with Passkey" button
- "Register with Passkey" button
- Error message display
- Loading states
- Auth disabled banner (when `NEXT_PUBLIC_AUTH_ENABLED=false`)

**Component Structure:**
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Get registration options from server
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        const { error } = await optionsRes.json();
        throw new Error(error);
      }

      const { options } = await optionsRes.json();

      // 2. Start WebAuthn registration
      const credential = await startRegistration(options);

      // 3. Verify registration
      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, credential }),
      });

      if (!verifyRes.ok) {
        const { error } = await verifyRes.json();
        throw new Error(error);
      }

      // 4. Redirect to main page
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Get login options
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        const { error } = await optionsRes.json();
        throw new Error(error);
      }

      const { options } = await optionsRes.json();

      // 2. Start WebAuthn authentication
      const credential = await startAuthentication(options);

      // 3. Verify authentication
      const verifyRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, credential }),
      });

      if (!verifyRes.ok) {
        const { error } = await verifyRes.json();
        throw new Error(error);
      }

      // 4. Redirect to main page
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Login/Register UI */}
    </div>
  );
}
```

#### Logout Button (in `app/page.tsx` header)

```tsx
const handleLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  router.push('/login');
};

// In header section:
{authEnabled && (
  <button onClick={handleLogout} className="...">
    Logout
  </button>
)}
```

---

## Edge Cases & Error Handling

### Registration Edge Cases

1. **Username already exists**
   - Response: `400 Bad Request` with `{ error: "Username already taken" }`
   - UI: Show error message, allow retry

2. **WebAuthn not supported**
   - Client-side check: `if (!window.PublicKeyCredential)`
   - UI: Show fallback message with browser compatibility info

3. **User cancels biometric prompt**
   - Catch error from `startRegistration()`
   - UI: Show "Registration cancelled" message

4. **Invalid credential format**
   - Server validation fails
   - Response: `400 Bad Request` with `{ error: "Invalid credential" }`

### Login Edge Cases

1. **User not found**
   - Response: `404 Not Found` with `{ error: "User not found" }`
   - UI: Suggest registration

2. **No authenticators for user**
   - Response: `400 Bad Request` with `{ error: "No passkey found for this user" }`
   - UI: Suggest re-registration

3. **Authentication failed (wrong user)**
   - Verification fails
   - Response: `401 Unauthorized` with `{ error: "Authentication failed" }`

4. **Counter mismatch (replay attack)**
   - Authenticator counter decreased
   - Response: `401 Unauthorized` with `{ error: "Invalid authenticator" }`

### Session Edge Cases

1. **Expired JWT**
   - `jwtVerify()` throws error
   - Middleware redirects to `/login`

2. **Tampered JWT**
   - Verification fails
   - Middleware redirects to `/login`

3. **Cookie deleted manually**
   - No session cookie
   - Middleware redirects to `/login`

### Auth Disabled Mode

1. **`NEXT_PUBLIC_AUTH_ENABLED=false`**
   - Middleware allows all routes
   - API routes use test user (ID: 1)
   - Login page shows banner: "Authentication is disabled for development"

---

## Acceptance Criteria

### Registration

- [ ] User can register with unique username
- [ ] Biometric prompt appears on registration
- [ ] User account created in database
- [ ] Authenticator stored with credential details
- [ ] Session created automatically after registration
- [ ] User redirected to `/` after successful registration
- [ ] Error shown for duplicate username
- [ ] Error shown for cancelled registration

### Login

- [ ] User can login with existing username
- [ ] Passkey prompt appears on login
- [ ] Correct passkey authenticates successfully
- [ ] Session created with 7-day expiry
- [ ] User redirected to `/` after login
- [ ] Error shown for non-existent username
- [ ] Error shown for failed authentication

### Logout

- [ ] Logout button visible when authenticated
- [ ] Logout clears session cookie
- [ ] User redirected to `/login` after logout
- [ ] Cannot access protected routes after logout

### Middleware Protection

- [ ] Unauthenticated users redirected to `/login` from `/`
- [ ] Unauthenticated users redirected to `/login` from `/calendar`
- [ ] Authenticated users redirected to `/` from `/login`
- [ ] API routes require authentication (when enabled)

### Auth Toggle

- [ ] Setting `NEXT_PUBLIC_AUTH_ENABLED=false` disables auth
- [ ] All routes accessible without login when disabled
- [ ] API routes use test user when auth disabled
- [ ] Login page shows "Auth Disabled" banner

### Session Persistence

- [ ] Session persists across browser refreshes
- [ ] Session expires after 7 days
- [ ] JWT contains userId and username
- [ ] Cookie is HTTP-only and secure (production)

---

## Testing Requirements

### E2E Tests (Playwright)

**Test 1: Registration Flow**
```typescript
test('should register new user with passkey', async ({ page, context }) => {
  // Setup virtual authenticator
  const cdpSession = await context.newCDPSession(page);
  await cdpSession.send('WebAuthn.enable');
  await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });

  await page.goto('/login');
  await page.click('text=Register');
  await page.fill('input[name="username"]', 'test_user_' + Date.now());
  await page.click('button:has-text("Register with Passkey")');
  
  await page.waitForURL('/');
  expect(page.url()).toContain('/');
});
```

**Test 2: Login Flow**
```typescript
test('should login existing user with passkey', async ({ page, context }) => {
  // Setup virtual authenticator and pre-register user
  // ... (similar setup)

  await page.goto('/login');
  await page.fill('input[name="username"]', 'existing_user');
  await page.click('button:has-text("Login with Passkey")');
  
  await page.waitForURL('/');
  expect(page.url()).toContain('/');
});
```

**Test 3: Logout Flow**
```typescript
test('should logout and clear session', async ({ page }) => {
  // Login first
  await loginUser(page, 'test_user');

  await page.click('button:has-text("Logout")');
  await page.waitForURL('/login');
  
  // Try accessing protected route
  await page.goto('/');
  await page.waitForURL('/login');
  expect(page.url()).toContain('/login');
});
```

**Test 4: Protected Routes**
```typescript
test('should redirect unauthenticated user to login', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('/login');
  expect(page.url()).toContain('/login');

  await page.goto('/calendar');
  await page.waitForURL('/login');
  expect(page.url()).toContain('/login');
});
```

**Test 5: Auth Disabled Mode**
```typescript
test('should allow access when auth disabled', async ({ page }) => {
  // Set environment variable NEXT_PUBLIC_AUTH_ENABLED=false
  
  await page.goto('/');
  expect(page.url()).toContain('/');  // No redirect to login
  
  // Should see todos page
  await expect(page.locator('h1')).toContainText('Todo');
});
```

### Unit Tests

**Test: JWT Creation & Verification**
```typescript
import { createSession, getSession } from '@/lib/auth';

test('should create and verify JWT session', async () => {
  const token = await createSession(1, 'test_user');
  expect(token).toBeTruthy();
  
  // Mock cookies().get()
  const session = await getSession();
  expect(session?.userId).toBe(1);
  expect(session?.username).toBe('test_user');
});
```

**Test: Challenge Generation**
```typescript
import { generateChallenge } from '@/lib/auth';

test('should generate 32-byte challenge', () => {
  const challenge = generateChallenge();
  expect(challenge).toBeInstanceOf(Uint8Array);
  expect(challenge.length).toBe(32);
});
```

---

## Dependencies

### NPM Packages (Already Installed)

```json
{
  "@simplewebauthn/browser": "^10.0.0",
  "@simplewebauthn/server": "^10.0.0",
  "jose": "^5.0.0"  // For JWT
}
```

### Browser Support

- Chrome/Edge 67+ (Windows Hello, Touch ID)
- Safari 14+ (Face ID, Touch ID on macOS/iOS)
- Firefox 60+ (FIDO2 tokens)

**Fallback for unsupported browsers:**
- Show error message: "Your browser doesn't support passkeys"
- Suggest upgrading browser or using compatible device

---

## Out of Scope

### Not Included in This Feature

1. **Password-based authentication** - WebAuthn only (passwordless)
2. **Email verification** - No email sending
3. **Password reset** - No passwords to reset
4. **Two-factor authentication (2FA)** - WebAuthn is already strong auth
5. **Social login (OAuth)** - Google/GitHub/etc. not included
6. **Account deletion** - User can register but not delete account
7. **Profile editing** - Username/display name cannot be changed
8. **Multiple devices** - One passkey per user (can be extended later)
9. **Device management** - No UI to view/remove authenticators

---

## Success Metrics

### Functional Metrics

- [ ] 100% of registration attempts complete successfully (virtual authenticator)
- [ ] 100% of login attempts succeed with valid passkey
- [ ] 0% false positives (wrong user can't authenticate)
- [ ] Session persists exactly 7 days
- [ ] Auth toggle works in both modes (enabled/disabled)

### Performance Metrics

- [ ] Registration completes in < 5 seconds
- [ ] Login completes in < 3 seconds
- [ ] Middleware check adds < 10ms to request time
- [ ] JWT verification completes in < 5ms

### Security Metrics

- [ ] HTTP-only cookies prevent XSS attacks
- [ ] JWT signature prevents tampering
- [ ] Counter increment prevents replay attacks
- [ ] Challenge uniqueness prevents phishing

---

## Implementation Notes

### Challenge Storage

**Problem:** WebAuthn requires challenge verification, but challenges are ephemeral

**Solution Options:**

1. **In-Memory Map** (Simple, for MVP)
   ```typescript
   const challenges = new Map<string, { challenge: string, timestamp: number }>();
   // Clean up old challenges after 2 minutes
   ```

2. **Database Storage** (Production-ready)
   ```sql
   CREATE TABLE challenges (
     username TEXT PRIMARY KEY,
     challenge TEXT NOT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Session/Cookie Storage** (Alternative)
   - Store challenge in temporary cookie
   - Clear after verification

**Recommendation:** Use in-memory Map for MVP, migrate to database if needed.

---

### Buffer Encoding for Credentials

WebAuthn uses ArrayBuffer/Uint8Array, but database stores strings.

**Encoding:**
- Use `base64url` encoding (URL-safe base64)
- Library: `@simplewebauthn/server/helpers` provides `isoBase64URL`

**Example:**
```typescript
import { isoBase64URL } from '@simplewebauthn/server/helpers';

// Store
const credentialIdBase64 = isoBase64URL.fromBuffer(credential.rawId);
authenticatorDB.create(userId, credentialIdBase64, publicKeyBase64, 0);

// Retrieve
const credentialIdBuffer = isoBase64URL.toBuffer(authenticator.credential_id);
```

---

### Test User (Development Mode)

**File:** `lib/test-user.ts`

```typescript
export const TEST_USER_ID = 1;
export const TEST_USERNAME = 'test_user';

// Ensure test user exists in database
import { userDB } from './db';

if (!userDB.getById(TEST_USER_ID)) {
  userDB.create(TEST_USERNAME, 'Test User');
}
```

**Usage in API routes when auth disabled:**
```typescript
const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false';
const session = authEnabled ? await getSession() : { userId: TEST_USER_ID, username: TEST_USERNAME };
```

---

## References

- [WebAuthn Guide](https://webauthn.guide/) - Interactive tutorial
- [SimpleWebAuthn Docs](https://simplewebauthn.dev/) - Library documentation
- [WebAuthn Spec](https://www.w3.org/TR/webauthn-2/) - W3C specification
- [Passkeys.dev](https://passkeys.dev/) - Industry resources

---

**Last Updated:** November 13, 2025  
**Status:** Implementation in Progress  
**Related Files:**
- `lib/auth.ts` - Session management ✅
- `lib/db.ts` - User/Authenticator CRUD ✅
- `middleware.ts` - Route protection (needs update)
- `app/login/page.tsx` - Login UI (needs implementation)
- `app/api/auth/**` - Auth endpoints (needs creation)
