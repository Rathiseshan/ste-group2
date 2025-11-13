// In-memory challenge storage for WebAuthn flows
// For production, consider using a database or Redis for distributed systems

export const registrationChallenges = new Map<string, { challenge: string, timestamp: number }>();
export const loginChallenges = new Map<string, { challenge: string, timestamp: number }>();

// Clean up old challenges (> 2 minutes)
const cleanupInterval = 60 * 1000; // 1 minute
const challengeExpiry = 2 * 60 * 1000; // 2 minutes

setInterval(() => {
  const expiryTime = Date.now() - challengeExpiry;
  
  // Clean registration challenges
  for (const [username, data] of registrationChallenges.entries()) {
    if (data.timestamp < expiryTime) {
      registrationChallenges.delete(username);
    }
  }
  
  // Clean login challenges
  for (const [username, data] of loginChallenges.entries()) {
    if (data.timestamp < expiryTime) {
      loginChallenges.delete(username);
    }
  }
}, cleanupInterval);
