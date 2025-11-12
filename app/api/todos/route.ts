import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB, subtaskDB, calculateNextDueDate, Priority, RecurrencePattern, RecurrenceOptions } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';
import { getTestUser } from '@/lib/test-user';

export async function GET(request: NextRequest) {
  // TEMPORARY: Use test user for development
  const testUser = getTestUser();
  const userId = testUser.id;

  const todos = todoDB.getByUserId(userId);
  
  // Attach tags to each todo
  const todosWithTags = todos.map(todo => ({
    ...todo,
    tags: tagDB.getTagsForTodo(todo.id),
    subtasks: subtaskDB.getByTodoId(todo.id),
  }));

  return NextResponse.json({ todos: todosWithTags });
}

export async function POST(request: NextRequest) {
  // TEMPORARY: Use test user for development
  const testUser = getTestUser();
  const userId = testUser.id;

  const body = await request.json();
  const { title, description, priority, dueAt, reminderMinutes, recurrencePattern, recurrenceOptions, tagIds } = body;

  // Validation
  if (!title || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Validate recurring todos must have due date
  if (recurrencePattern && !dueAt) {
    return NextResponse.json({ error: 'Recurring todos must have a due date' }, { status: 400 });
  }

  // Validate due date is in the future
  if (dueAt) {
    const dueDate = new Date(dueAt);
    const now = getSingaporeNow();
    if (dueDate <= now) {
      return NextResponse.json({ error: 'Due date must be in the future' }, { status: 400 });
    }
  }

  // Create todo
  const todo = todoDB.create(userId, title.trim(), {
    description: description?.trim(),
    priority: priority as Priority || 'medium',
    dueAt: dueAt || undefined,
    reminderMinutes: reminderMinutes || undefined,
    recurrencePattern: recurrencePattern as RecurrencePattern || undefined,
    recurrenceOptions: recurrenceOptions as RecurrenceOptions || undefined,
  });

  // Add tags
  if (tagIds && Array.isArray(tagIds)) {
    for (const tagId of tagIds) {
      tagDB.addTagToTodo(todo.id, tagId);
    }
  }

  // Fetch with tags
  const tags = tagDB.getTagsForTodo(todo.id);
  const subtasks = subtaskDB.getByTodoId(todo.id);

  return NextResponse.json({ 
    todo: { ...todo, tags, subtasks } 
  }, { status: 201 });
}
