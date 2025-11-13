import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, Priority, RecurrencePattern, isValidPriority } from '@/lib/db';
import { getSingaporeNow, isFutureSingapore } from '@/lib/timezone';

/**
 * GET /api/todos
 * Fetch all todos for the authenticated user
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const todos = todoDB.findByUserId(session.userId);
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

/**
 * POST /api/todos
 * Create a new todo for the authenticated user
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, due_at, priority, is_recurring, recurrence_pattern, reminder_minutes } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate priority
    if (priority && !isValidPriority(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be: high, medium, or low' },
        { status: 400 }
      );
    }

    // Validate recurrence pattern if recurring
    if (is_recurring && recurrence_pattern) {
      const validPatterns: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];
      if (!validPatterns.includes(recurrence_pattern)) {
        return NextResponse.json(
          { error: 'Invalid recurrence pattern. Must be: daily, weekly, monthly, or yearly' },
          { status: 400 }
        );
      }
    }

    // Validate due date is in future (Singapore time)
    if (due_at) {
      if (!isFutureSingapore(new Date(due_at))) {
        return NextResponse.json(
          { error: 'Due date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Create todo
    const todo = todoDB.create(
      session.userId,
      title.trim(),
      {
        priority: priority as Priority || 'medium',
        dueAt: due_at || null,
        isRecurring: is_recurring || false,
        recurrencePattern: (is_recurring ? recurrence_pattern as RecurrencePattern : null) || null,
        reminderMinutes: reminder_minutes || null,
      }
    );

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
