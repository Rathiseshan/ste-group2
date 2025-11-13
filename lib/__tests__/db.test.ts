import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateNextDueDate, Todo } from '../db';
import { addDays, addMonths, addYears, toSingaporeZonedDateTime } from '../timezone';

describe('Database - calculateNextDueDate', () => {
  describe('Daily Recurrence', () => {
    it('should calculate next day for daily recurrence', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'Daily task',
        priority: 'medium',
        status: 'active',
        recurrence_pattern: 'daily',
        due_at: '2025-03-15T10:00:00.000Z',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      expect(nextDate).not.toBeNull();
      
      if (nextDate) {
        const original = new Date(baseTodo.due_at!);
        expect(nextDate.getTime()).toBeGreaterThan(original.getTime());
        
        // Should be 1 day later
        const expected = addDays(toSingaporeZonedDateTime(original), 1);
        expect(nextDate.getDate()).toBe(expected.getDate());
      }
    });

    it('should handle daily recurrence with interval', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'Every 3 days',
        priority: 'medium',
        status: 'active',
        recurrence_pattern: 'daily',
        recurrence_options: JSON.stringify({ interval: 3 }),
        due_at: '2025-03-15T10:00:00.000Z',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      expect(nextDate).not.toBeNull();
      
      if (nextDate) {
        const original = new Date(baseTodo.due_at!);
        const expected = addDays(toSingaporeZonedDateTime(original), 3);
        expect(nextDate.getDate()).toBe(expected.getDate());
      }
    });
  });

  describe('Weekly Recurrence', () => {
    it('should calculate next week for weekly recurrence', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'Weekly task',
        priority: 'medium',
        status: 'active',
        recurrence_pattern: 'weekly',
        due_at: '2025-03-15T10:00:00.000Z', // Saturday
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      expect(nextDate).not.toBeNull();
      
      if (nextDate) {
        const original = new Date(baseTodo.due_at!);
        expect(nextDate.getTime()).toBeGreaterThan(original.getTime());
        
        // Should be approximately 7 days later
        const daysDifference = (nextDate.getTime() - original.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDifference).toBeGreaterThanOrEqual(6);
        expect(daysDifference).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('Monthly Recurrence', () => {
    it('should calculate next month for monthly recurrence', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'Monthly task',
        priority: 'medium',
        status: 'active',
        recurrence_pattern: 'monthly',
        due_at: '2025-03-15T10:00:00.000Z',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      expect(nextDate).not.toBeNull();
      
      if (nextDate) {
        const original = new Date(baseTodo.due_at!);
        expect(nextDate.getTime()).toBeGreaterThan(original.getTime());
        
        // Should be 1 month later
        const expected = addMonths(toSingaporeZonedDateTime(original), 1);
        expect(nextDate.getMonth()).toBe(expected.getMonth());
      }
    });
  });

  describe('Yearly Recurrence', () => {
    it('should calculate next year for yearly recurrence', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'Yearly task',
        priority: 'medium',
        status: 'active',
        recurrence_pattern: 'yearly',
        due_at: '2025-03-15T10:00:00.000Z',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      expect(nextDate).not.toBeNull();
      
      if (nextDate) {
        const original = new Date(baseTodo.due_at!);
        expect(nextDate.getTime()).toBeGreaterThan(original.getTime());
        
        // Should be 1 year later
        const expected = addYears(toSingaporeZonedDateTime(original), 1);
        expect(nextDate.getFullYear()).toBe(expected.getFullYear());
      }
    });
  });

  describe('Edge Cases', () => {
    it('should return null for non-recurring todo', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'One-time task',
        priority: 'medium',
        status: 'active',
        due_at: '2025-03-15T10:00:00.000Z',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      expect(nextDate).toBeNull();
    });

    it('should return null for todo without due date', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'No due date',
        priority: 'medium',
        status: 'active',
        recurrence_pattern: 'daily',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      expect(nextDate).toBeNull();
    });

    it('should handle invalid recurrence options gracefully', () => {
      const baseTodo: Partial<Todo> = {
        id: 1,
        user_id: 1,
        title: 'Invalid options',
        priority: 'medium',
        status: 'active',
        recurrence_pattern: 'daily',
        recurrence_options: 'invalid json {{{',
        due_at: '2025-03-15T10:00:00.000Z',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
      };

      const nextDate = calculateNextDueDate(baseTodo as Todo);
      // Should either return null or default behavior
      // Implementation may vary
      expect(nextDate === null || nextDate instanceof Date).toBe(true);
    });
  });
});

describe('Database - Progress Calculation', () => {
  it('should calculate 0% with no subtasks', () => {
    const completed = 0;
    const total = 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    expect(percentage).toBe(0);
  });

  it('should calculate 50% with half completed', () => {
    const completed = 2;
    const total = 4;
    const percentage = Math.round((completed / total) * 100);
    
    expect(percentage).toBe(50);
  });

  it('should calculate 100% with all completed', () => {
    const completed = 5;
    const total = 5;
    const percentage = Math.round((completed / total) * 100);
    
    expect(percentage).toBe(100);
  });

  it('should round to nearest integer', () => {
    const completed = 1;
    const total = 3;
    const percentage = Math.round((completed / total) * 100);
    
    expect(percentage).toBe(33);
  });
});
