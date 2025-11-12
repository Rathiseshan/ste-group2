import { NextRequest, NextResponse } from 'next/server';
import db, { todoDB, tagDB, subtaskDB, calculateNextDueDate } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';
import { getTestUser } from '@/lib/test-user';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // TEMPORARY: test user
  const testUser = getTestUser();

  const { id } = await params;
  const todo = todoDB.getById(Number(id));

  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  if (todo.user_id !== testUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // If already completed, return idempotent response
  if (todo.status === 'completed') {
    const tags = tagDB.getTagsForTodo(todo.id);
    const subtasks = subtaskDB.getByTodoId(todo.id);
    return NextResponse.json({ todo: { ...todo, tags, subtasks } });
  }

  const now = getSingaporeNow().toISOString();
  const updatedTodo = todoDB.update(Number(id), { status: 'completed', completed_at: now });

  let nextTodo = null;
  if (updatedTodo.recurrence_pattern && updatedTodo.due_at) {
    const nextDueDate = calculateNextDueDate(updatedTodo);
    if (nextDueDate) {
      nextTodo = todoDB.create(testUser.id, updatedTodo.title, {
        description: updatedTodo.description || undefined,
        priority: (updatedTodo.priority as any) || 'medium',
        dueAt: nextDueDate.toISOString(),
        reminderMinutes: updatedTodo.reminder_minutes || undefined,
        recurrencePattern: updatedTodo.recurrence_pattern || undefined,
        recurrenceOptions: updatedTodo.recurrence_options ? JSON.parse(updatedTodo.recurrence_options) : undefined,
        parentTodoId: updatedTodo.parent_todo_id || updatedTodo.id,
      });

      // copy tags
      const currentTags = tagDB.getTagsForTodo(updatedTodo.id);
      for (const tag of currentTags) {
        tagDB.addTagToTodo(nextTodo.id, tag.id);
      }

      const nextTodoTags = tagDB.getTagsForTodo(nextTodo.id);
      const nextTodoSubtasks = subtaskDB.getByTodoId(nextTodo.id);
      nextTodo = { ...nextTodo, tags: nextTodoTags, subtasks: nextTodoSubtasks };
    }
  }

  const tags = tagDB.getTagsForTodo(updatedTodo.id);
  const subtasks = subtaskDB.getByTodoId(updatedTodo.id);

  return NextResponse.json({ todo: { ...updatedTodo, tags, subtasks }, nextTodo });
}
