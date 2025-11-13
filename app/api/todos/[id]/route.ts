import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB, Priority, RecurrencePattern, isValidPriority } from '@/lib/db';
import { getSingaporeNow, isFutureSingapore } from '@/lib/timezone';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/todos/[id]
 * Fetch a single todo by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id, 10);

  if (isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  }

  try {
    const todo = todoDB.findById(todoId);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Check ownership
    if (todo.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error fetching todo:', error);
    return NextResponse.json({ error: 'Failed to fetch todo' }, { status: 500 });
  }
}

/**
 * PUT /api/todos/[id]
 * Update a todo (includes recurring logic when completing)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id, 10);

  if (isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  }

  try {
    const existingTodo = todoDB.findById(todoId);

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Check ownership
    if (existingTodo.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, due_at, priority, is_recurring, recurrence_pattern, reminder_minutes, completed } = body;

    // Validate priority if provided
    if (priority && !isValidPriority(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be: high, medium, or low' },
        { status: 400 }
      );
    }

    // Validate recurrence pattern if provided
    if (is_recurring && recurrence_pattern) {
      const validPatterns: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];
      if (!validPatterns.includes(recurrence_pattern)) {
        return NextResponse.json(
          { error: 'Invalid recurrence pattern. Must be: daily, weekly, monthly, or yearly' },
          { status: 400 }
        );
      }
    }

    // Validate due date if provided
    if (due_at && !isFutureSingapore(new Date(due_at))) {
      return NextResponse.json(
        { error: 'Due date must be in the future' },
        { status: 400 }
      );
    }

    // Handle recurring todo completion (Feature 03)
    if (completed && !existingTodo.completed && existingTodo.is_recurring && existingTodo.recurrence_pattern) {
      // Mark current todo as complete
      todoDB.update(todoId, { completed: true });

      // Calculate next due date based on recurrence pattern
      const currentDueDate = existingTodo.due_at ? new Date(existingTodo.due_at) : getSingaporeNow();
      let nextDueDate = new Date(currentDueDate);

      switch (existingTodo.recurrence_pattern) {
        case 'daily':
          nextDueDate.setDate(nextDueDate.getDate() + 1);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }

      // Create next instance with same properties
      const nextTodo = todoDB.create(
        session.userId,
        existingTodo.title,
        {
          priority: existingTodo.priority as Priority,
          dueAt: nextDueDate.toISOString(),
          isRecurring: true,
          recurrencePattern: existingTodo.recurrence_pattern,
          reminderMinutes: existingTodo.reminder_minutes,
        }
      );

      // Copy tags to next instance
      const tags = tagDB.findByTodoId(todoId);
      tags.forEach((tag) => {
        tagDB.addToTodo(nextTodo.id, tag.id);
      });

      // Copy subtasks to next instance
      const subtasks = subtaskDB.findByTodoId(todoId);
      subtasks.forEach((subtask) => {
        subtaskDB.create(
          nextTodo.id,
          subtask.title,
          subtask.position
        );
      });

      const updatedTodo = todoDB.findById(todoId);
      return NextResponse.json({ todo: updatedTodo, nextTodo });
    }

    // Regular update
    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (due_at !== undefined) updates.dueAt = due_at || null;
    if (priority !== undefined) updates.priority = priority;
    if (is_recurring !== undefined) updates.isRecurring = is_recurring;
    if (recurrence_pattern !== undefined) updates.recurrencePattern = is_recurring ? recurrence_pattern : null;
    if (reminder_minutes !== undefined) updates.reminderMinutes = reminder_minutes;
    if (completed !== undefined) updates.completed = completed;

    todoDB.update(todoId, updates);
    const updatedTodo = todoDB.findById(todoId);

    return NextResponse.json({ todo: updatedTodo });
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

/**
 * DELETE /api/todos/[id]
 * Delete a todo (CASCADE deletes subtasks and tag associations)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseInt(id, 10);

  if (isNaN(todoId)) {
    return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  }

  try {
    const todo = todoDB.findById(todoId);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Check ownership
    if (todo.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    todoDB.delete(todoId);
    return NextResponse.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
