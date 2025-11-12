import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';

const SINGAPORE_TZ = 'Asia/Singapore';

/**
 * Get current date/time in Singapore timezone
 */
export function getSingaporeNow(): Date {
  return toZonedTime(new Date(), SINGAPORE_TZ);
}

/**
 * Convert a Date to Singapore timezone
 */
export function toSingaporeZonedDateTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, SINGAPORE_TZ);
}

/**
 * Format a date in Singapore timezone
 */
export function formatSingaporeDate(
  date: Date | string,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, SINGAPORE_TZ, formatStr);
}

/**
 * Format date for display (e.g., "Jan 15, 2025 10:30 AM")
 */
export function formatDisplayDate(date: Date | string): string {
  return formatSingaporeDate(date, 'MMM dd, yyyy h:mm a');
}

/**
 * Format date for input fields (ISO format)
 */
export function formatForInput(date: Date | string): string {
  return formatSingaporeDate(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Check if a date is in the past (Singapore time)
 */
export function isPastDue(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < getSingaporeNow();
}

/**
 * Add days to a date in Singapore timezone
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return toSingaporeZonedDateTime(result);
}

/**
 * Add months to a date in Singapore timezone
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return toSingaporeZonedDateTime(result);
}

/**
 * Add years to a date in Singapore timezone
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return toSingaporeZonedDateTime(result);
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return toSingaporeZonedDateTime(date).getDay();
}

/**
 * Get the next occurrence of a specific weekday
 */
export function getNextWeekday(date: Date, targetWeekday: number): Date {
  const current = toSingaporeZonedDateTime(date);
  const currentDay = current.getDay();
  let daysToAdd = targetWeekday - currentDay;
  
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  
  return addDays(current, daysToAdd);
}

/**
 * Clamp day of month to valid range for the given month/year
 */
export function getValidDayOfMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}
