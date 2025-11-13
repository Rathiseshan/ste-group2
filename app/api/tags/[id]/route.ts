import { NextRequest, NextResponse } from 'next/server';
import { getTestUser } from '@/lib/test-user';
import { tagDB } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const testUser = getTestUser();
  const { id } = await params;
  const tagId = parseInt(id);

  try {
    const body = await request.json();
    const { name, color } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: 'Tag name must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Check if tag exists and belongs to user
    const existingTag = tagDB.getById(tagId);
    if (!existingTag || existingTag.user_id !== testUser.id) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name (excluding current tag)
    const userTags = tagDB.getByUserId(testUser.id);
    const duplicate = userTags.find(t => t.name.toLowerCase() === name.trim().toLowerCase() && t.id !== tagId);
    if (duplicate) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 400 }
      );
    }

    const tag = tagDB.update(tagId, { 
      name: name.trim(), 
      color: color || existingTag.color 
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Failed to update tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const testUser = getTestUser();
  const { id } = await params;
  const tagId = parseInt(id);

  try {
    // Check if tag exists and belongs to user
    const tag = tagDB.getById(tagId);
    if (!tag || tag.user_id !== testUser.id) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    tagDB.delete(tagId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
