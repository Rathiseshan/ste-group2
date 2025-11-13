'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authEnabled, setAuthEnabled] = useState(true);
  const [authMode, setAuthMode] = useState<'password' | 'passkey'>('password');
  const [webAuthnSupported, setWebAuthnSupported] = useState(true);

  useEffect(() => {
    // Check if authentication is enabled
    const enabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false';
    setAuthEnabled(enabled);

    // Check authentication mode
    const mode = (process.env.NEXT_PUBLIC_AUTH_MODE || 'password') as 'password' | 'passkey';
    setAuthMode(mode);

    // Check if WebAuthn is supported (only needed for passkey mode)
    if (mode === 'passkey' && typeof window !== 'undefined' && !window.PublicKeyCredential) {
      setWebAuthnSupported(false);
    }
  }, []);

  // Password-based registration
  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!username.trim()) {
      setError('Email ID is required');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/password-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const { error: errorMsg } = await response.json();
        throw new Error(errorMsg || 'Registration failed');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password-based login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!username.trim()) {
      setError('Email ID is required');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const { error: errorMsg } = await response.json();
        throw new Error(errorMsg || 'Login failed');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    try {
      // 1. Get registration options from server
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        const { error: errorMsg } = await optionsRes.json();
        throw new Error(errorMsg || 'Failed to get registration options');
      }

      const { options } = await optionsRes.json();

      // 2. Start WebAuthn registration (browser prompt)
      const credential = await startRegistration(options);

      // 3. Verify registration with server
      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, credential }),
      });

      if (!verifyRes.ok) {
        const { error: errorMsg } = await verifyRes.json();
        throw new Error(errorMsg || 'Registration verification failed');
      }

      // 4. Redirect to main page
      router.push('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // User-friendly error messages
      if (err.name === 'NotAllowedError') {
        setError('Registration cancelled. Please try again.');
      } else if (err.message?.includes('already taken')) {
        setError('Username already taken. Please choose another.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    try {
      // 1. Get login options from server
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        const { error: errorMsg } = await optionsRes.json();
        throw new Error(errorMsg || 'Failed to get login options');
      }

      const { options } = await optionsRes.json();

      // 2. Start WebAuthn authentication (browser prompt)
      const credential = await startAuthentication(options);

      // 3. Verify authentication with server
      const verifyRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, credential }),
      });

      if (!verifyRes.ok) {
        const { error: errorMsg } = await verifyRes.json();
        throw new Error(errorMsg || 'Login verification failed');
      }

      // 4. Redirect to main page
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // User-friendly error messages
      if (err.name === 'NotAllowedError') {
        setError('Login cancelled. Please try again.');
      } else if (err.message?.includes('not found')) {
        setError('User not found. Please register first.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Orange/Pink Gradient with WELCOME */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-400 via-orange-500 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          {/* Decorative circles */}
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-300 rounded-full opacity-60 blur-3xl transform -translate-x-1/4 translate-y-1/4"></div>
          <div className="absolute top-1/3 right-0 w-80 h-80 bg-yellow-200 rounded-full opacity-40 blur-3xl transform translate-x-1/4"></div>
          
          {/* WELCOME Text */}
          <div className="relative z-10 text-white">
            <h1 className="text-7xl font-bold tracking-wider mb-4">
              WEL<br/>COME
            </h1>
            <div className="w-16 h-1 bg-white mb-8"></div>
            <p className="text-white/90 text-lg">Hi! Let&apos;s get started</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Auth Disabled Banner */}
          {!authEnabled && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Authentication Disabled</h3>
                  <p className="text-xs text-yellow-700 mt-1">Development mode active</p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Login</h2>
            <p className="text-gray-600">Hi! Let&apos;s get started</p>
          </div>

          {/* Form */}
          <form onSubmit={authMode === 'password' ? (mode === 'register' ? handlePasswordRegister : handlePasswordLogin) : (mode === 'register' ? handleRegister : handleLogin)} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Email ID
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Enter your email"
                  autoComplete="username"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {authMode === 'password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Enter your password"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                {mode === 'login' && (
                  <div className="mt-2 text-right">
                    <button type="button" className="text-sm text-gray-600 hover:text-gray-900">
                      Forget password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (authMode === 'passkey' && !webAuthnSupported)}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium rounded-full hover:from-orange-500 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {authMode === 'password' ? 'Sign In →' : (mode === 'register' ? 'Register with Passkey' : 'Login with Passkey')}
                </span>
              )}
            </button>

            {authMode === 'password' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-sm text-gray-600"
                >
                  {mode === 'login' ? (
                    <>Don&apos;t have an account? <span className="text-pink-500 font-medium">Register</span></>
                  ) : (
                    <>Already have an account? <span className="text-pink-500 font-medium">Login</span></>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
