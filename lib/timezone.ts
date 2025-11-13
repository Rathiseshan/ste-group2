/**
 * Singapore Timezone Utilities
 * All date/time operations in the app must use Singapore timezone (Asia/Singapore)
 */

const SINGAPORE_TZ = 'Asia/Singapore';

/**
 * Get current date/time in Singapore timezone
 */
export function getSingaporeNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SINGAPORE_TZ }));
}

/**
 * Format date in Singapore timezone
 */
export function formatSingaporeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { timeZone: SINGAPORE_TZ });
}

/**
 * Convert date to Singapore timezone ISO string
 */
export function toSingaporeISO(date: Date): string {
  return new Date(date.toLocaleString('en-US', { timeZone: SINGAPORE_TZ })).toISOString();
}

/**
 * Check if date is in the future (Singapore timezone)
 */
export function isFutureSingapore(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = getSingaporeNow();
  return d.getTime() > now.getTime();
}
