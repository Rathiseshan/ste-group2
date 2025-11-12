import { userDB } from './db';

/**
 * Get or create a default test user for development
 * This is a temporary solution to test the recurring todos feature without WebAuthn
 * TODO: Remove this after WebAuthn implementation is complete
 */
export function getTestUser() {
  const testUsername = 'test-user';
  let user = userDB.getByUsername(testUsername);
  
  if (!user) {
    user = userDB.create(testUsername, 'Test User');
  }
  
  return user;
}
