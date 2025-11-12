import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const tags = tagDB.getByUserId(session.userId);

  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const tag = tagDB.create(session.userId, name.trim(), color || '#3b82f6');
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 });
    }
    throw error;
  }
}
