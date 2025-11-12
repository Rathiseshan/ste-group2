import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const subtask = subtaskDB.getById(Number(id));

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  // Verify user owns the parent todo
  const todo = todoDB.getById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { title, completed, position } = body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (completed !== undefined) updates.completed = completed;
  if (position !== undefined) updates.position = position;

  const updatedSubtask = subtaskDB.update(Number(id), updates);

  return NextResponse.json({ subtask: updatedSubtask });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const subtask = subtaskDB.getById(Number(id));

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  // Verify user owns the parent todo
  const todo = todoDB.getById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  subtaskDB.delete(Number(id));

  return NextResponse.json({ success: true });
}
