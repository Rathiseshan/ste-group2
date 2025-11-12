import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todo = todoDB.getById(Number(id));

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  if (todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { title, position } = body;

  if (!title || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const subtask = subtaskDB.create(Number(id), title.trim(), position || 0);

  return NextResponse.json({ subtask }, { status: 201 });
}
