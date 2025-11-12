import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { todoDB, tagDB, subtaskDB, calculateNextDueDate, Priority, RecurrencePattern, RecurrenceOptions } from '@/lib/db';
import { getSingaporeNow, parseSingaporeDate } from '@/lib/timezone';
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

  // Reject unknown fields
  const allowed = new Set(['title','description','priority','dueAt','reminderMinutes','recurrencePattern','recurrenceOptions','tagIds']);
  for (const key of Object.keys(body || {})) {
    if (!allowed.has(key)) {
      return NextResponse.json({ error: `Unknown field: ${key}` }, { status: 400 });
    }
  }

  // Validation: title
  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
    return NextResponse.json({ error: 'Title is required (3-120 chars)' }, { status: 400 });
  }

  // Description length
  if (description && description.length > 1000) {
    return NextResponse.json({ error: 'Description must be <= 1000 characters' }, { status: 400 });
  }

  // Validate allowed reminder values
  const allowedReminders = new Set([15,30,60,120,1440]);
  if (reminderMinutes !== undefined && reminderMinutes !== null) {
    if (!allowedReminders.has(reminderMinutes)) {
      return NextResponse.json({ error: 'Invalid reminderMinutes' }, { status: 400 });
    }
  }

  // Validate recurring todos must have due date
  if (recurrencePattern && !dueAt) {
    return NextResponse.json({ error: 'Recurring todos must have a due date' }, { status: 400 });
  }

  // Validate due date via timezone helper and ensure at least +1 minute in future
  let dueDateParsed: Date | null = null;
  if (dueAt) {
    dueDateParsed = parseSingaporeDate(dueAt as string);
    if (!dueDateParsed) return NextResponse.json({ error: 'Invalid dueAt' }, { status: 400 });
    const now = getSingaporeNow();
    const minAllowed = new Date(now.getTime() + 60 * 1000);
    if (dueDateParsed <= minAllowed) {
      return NextResponse.json({ error: 'Due date must be at least 1 minute in the future' }, { status: 400 });
    }
  }

  // Prevent duplicate title + due date combo for same user (same due date day)
  if (title && dueDateParsed) {
    const stmt = todoDB as any;
    // Use SQL to check for same title and same date(due_at)
    const dup: any = db.prepare('SELECT COUNT(1) as c FROM todos WHERE user_id = ? AND title = ? AND date(due_at) = date(?)').get(userId, title.trim(), dueAt);
    if (dup && dup.c > 0) {
      return NextResponse.json({ error: 'A todo with the same title and due date already exists' }, { status: 400 });
    }
  }

  // Create todo
  const todo = todoDB.create(userId, title.trim(), {
    description: description?.trim(),
    priority: (priority as Priority) || 'medium',
    dueAt: dueAt || undefined,
    reminderMinutes: reminderMinutes || undefined,
    recurrencePattern: (recurrencePattern as RecurrencePattern) || undefined,
    recurrenceOptions: (recurrenceOptions as RecurrenceOptions) || undefined,
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
