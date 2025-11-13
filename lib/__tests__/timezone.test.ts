import { describe, it, expect } from 'vitest';
import {
  getSingaporeNow,
  formatSingaporeDate,
  toSingaporeZonedDateTime,
  isPastDue,
  addDays,
  addMonths,
  addYears,
  formatDisplayDate,
  formatForInput,
  getDayOfWeek,
  getNextWeekday,
} from '../timezone';

describe('Timezone Utilities', () => {
  describe('getSingaporeNow', () => {
    it('should return a Date object', () => {
      const now = getSingaporeNow();
      expect(now).toBeInstanceOf(Date);
    });

    it('should return current time in Singapore timezone', () => {
      const now = getSingaporeNow();
      const nowTimestamp = now.getTime();
      const systemNow = Date.now();
      
      // Should be within 100ms of system time
      expect(Math.abs(nowTimestamp - systemNow)).toBeLessThan(100);
    });
  });

  describe('formatSingaporeDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2025-03-15T10:30:00Z');
      const formatted = formatSingaporeDate(date);
      
      // Default format is 'yyyy-MM-dd HH:mm:ss'
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format date with custom format', () => {
      const date = new Date('2025-03-15T10:30:00Z');
      const formatted = formatSingaporeDate(date, 'yyyy-MM-dd');
      
      // Should be in YYYY-MM-DD format
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle string input', () => {
      const isoString = '2025-01-01T00:00:00Z';
      const formatted = formatSingaporeDate(isoString, 'yyyy-MM-dd');
      expect(formatted).toContain('2025');
      expect(formatted).toContain('01');
    });
  });

  describe('toSingaporeZonedDateTime', () => {
    it('should convert ISO string to Singapore Date', () => {
      const isoString = '2025-03-15T10:30:00.000Z';
      const singaporeDate = toSingaporeZonedDateTime(isoString);
      
      expect(singaporeDate).toBeInstanceOf(Date);
    });

    it('should handle Date object input', () => {
      const date = new Date('2025-03-15T10:30:00Z');
      const singaporeDate = toSingaporeZonedDateTime(date);
      
      expect(singaporeDate).toBeInstanceOf(Date);
    });
  });

  describe('isPastDue', () => {
    it('should return false for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const isPast = isPastDue(tomorrow);
      expect(isPast).toBe(false);
    });

    it('should return true for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isPast = isPastDue(yesterday);
      expect(isPast).toBe(true);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date('2025-03-15T10:00:00Z');
      const result = addDays(date, 5);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getDate()).toBeGreaterThan(date.getDate());
    });

    it('should handle negative days', () => {
      const date = new Date('2025-03-15T10:00:00Z');
      const result = addDays(date, -5);
      
      expect(result.getDate()).toBeLessThan(date.getDate());
    });
  });

  describe('addMonths', () => {
    it('should add months correctly', () => {
      const date = new Date('2025-03-15T10:00:00Z');
      const result = addMonths(date, 2);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getMonth()).toBeGreaterThan(date.getMonth());
    });
  });

  describe('addYears', () => {
    it('should add years correctly', () => {
      const date = new Date('2025-03-15T10:00:00Z');
      const result = addYears(date, 1);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2026);
    });
  });

  describe('formatDisplayDate', () => {
    it('should format for display', () => {
      const date = new Date('2025-03-15T10:30:00Z');
      const formatted = formatDisplayDate(date);
      
      // Should contain month, day, year, time
      expect(formatted).toMatch(/\w{3} \d{2}, \d{4} \d{1,2}:\d{2} [AP]M/);
    });
  });

  describe('formatForInput', () => {
    it('should format for datetime-local input', () => {
      const date = new Date('2025-03-15T10:30:00Z');
      const formatted = formatForInput(date);
      
      // Should be in format YYYY-MM-DDTHH:mm
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('getDayOfWeek', () => {
    it('should return day of week as number', () => {
      const date = new Date('2025-03-15T10:00:00Z'); // This is a Saturday (6)
      const day = getDayOfWeek(date);
      
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    });
  });

  describe('getNextWeekday', () => {
    it('should return next occurrence of weekday', () => {
      const monday = new Date('2025-03-17T10:00:00Z'); // Monday
      const nextFriday = getNextWeekday(monday, 5); // Friday
      
      expect(nextFriday).toBeInstanceOf(Date);
      expect(nextFriday.getDay()).toBe(5);
      expect(nextFriday.getTime()).toBeGreaterThan(monday.getTime());
    });
  });
});
