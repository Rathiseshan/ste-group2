import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB, subtaskDB, calculateNextDueDate, Priority, RecurrencePattern, RecurrenceOptions } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';
import { getTestUser } from '@/lib/test-user';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // TEMPORARY: Use test user for development
  const testUser = getTestUser();

  const { id } = await params;
  const todo = todoDB.getById(Number(id));

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  if (todo.user_id !== testUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tags = tagDB.getTagsForTodo(todo.id);
  const subtasks = subtaskDB.getByTodoId(todo.id);

  return NextResponse.json({ todo: { ...todo, tags, subtasks } });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  // TEMPORARY: Use test user for development
  const testUser = getTestUser();

  const { id } = await params;
  const todo = todoDB.getById(Number(id));

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  if (todo.user_id !== testUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { 
    title, 
    description, 
    priority, 
    status, 
    dueAt, 
    reminderMinutes, 
    recurrencePattern, 
    recurrenceOptions, 
    tagIds,
    completed 
  } = body;

  // Handle completion with recurring logic
  if (completed === true || status === 'completed') {
    // Mark current todo as completed
    const now = getSingaporeNow().toISOString();
    const updatedTodo = todoDB.update(Number(id), {
      status: 'completed',
      completed_at: now,
    });

    let nextTodo = null;

    // If todo has recurrence pattern, create next instance
    if (todo.recurrence_pattern && todo.due_at) {
      const nextDueDate = calculateNextDueDate(todo);
      
      if (nextDueDate) {
        // Clone the todo with new due date
        nextTodo = todoDB.create(testUser.id, todo.title, {
          description: todo.description || undefined,
          priority: todo.priority,
          dueAt: nextDueDate.toISOString(),
          reminderMinutes: todo.reminder_minutes || undefined,
          recurrencePattern: todo.recurrence_pattern,
          recurrenceOptions: todo.recurrence_options ? JSON.parse(todo.recurrence_options) : undefined,
          parentTodoId: todo.parent_todo_id || todo.id,
        });

        // Copy tags to new todo
        const currentTags = tagDB.getTagsForTodo(todo.id);
        for (const tag of currentTags) {
          tagDB.addTagToTodo(nextTodo.id, tag.id);
        }

        // Fetch tags and subtasks for new todo
        const nextTodoTags = tagDB.getTagsForTodo(nextTodo.id);
        const nextTodoSubtasks = subtaskDB.getByTodoId(nextTodo.id);
        nextTodo = { ...nextTodo, tags: nextTodoTags, subtasks: nextTodoSubtasks };
      }
    }

    const tags = tagDB.getTagsForTodo(updatedTodo.id);
    const subtasks = subtaskDB.getByTodoId(updatedTodo.id);

    return NextResponse.json({ 
      todo: { ...updatedTodo, tags, subtasks },
      nextTodo 
    });
  }

  // Regular update
  const updates: any = {};
  
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim();
  if (priority !== undefined) updates.priority = priority as Priority;
  if (status !== undefined) updates.status = status;
  if (dueAt !== undefined) updates.due_at = dueAt;
  if (reminderMinutes !== undefined) updates.reminder_minutes = reminderMinutes;
  if (recurrencePattern !== undefined) updates.recurrence_pattern = recurrencePattern as RecurrencePattern || null;
  if (recurrenceOptions !== undefined) {
    updates.recurrence_options = recurrenceOptions ? JSON.stringify(recurrenceOptions) : null;
  }

  const updatedTodo = todoDB.update(Number(id), updates);

  // Update tags if provided
  if (tagIds !== undefined && Array.isArray(tagIds)) {
    tagDB.clearTodoTags(Number(id));
    for (const tagId of tagIds) {
      tagDB.addTagToTodo(Number(id), tagId);
    }
  }

  const tags = tagDB.getTagsForTodo(updatedTodo.id);
  const subtasks = subtaskDB.getByTodoId(updatedTodo.id);

  return NextResponse.json({ todo: { ...updatedTodo, tags, subtasks } });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // TEMPORARY: Use test user for development
  const testUser = getTestUser();

  const { id } = await params;
  const todo = todoDB.getById(Number(id));

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  if (todo.user_id !== testUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  todoDB.delete(Number(id));

  return NextResponse.json({ success: true });
}
