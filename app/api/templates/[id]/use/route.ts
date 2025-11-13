import { NextRequest, NextResponse } from 'next/server';
import { templateDB, todoDB, subtaskDB, tagDB, Priority, RecurrencePattern } from '@/lib/db';
import { getTestUser } from '@/lib/test-user';
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';
import { addDays } from 'date-fns';

// POST /api/templates/[id]/use - Create a todo from template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const testUser = getTestUser();
    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    // Get template
    const template = templateDB.getById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.user_id !== testUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get custom title and tag IDs from request body
    const body = await request.json();
    const { title, tag_ids } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Todo title is required' }, { status: 400 });
    }

    // Calculate due date based on offset
    let dueAt: string | undefined;
    if (template.due_days_offset !== null && template.due_days_offset !== undefined) {
      const now = getSingaporeNow();
      const targetDate = addDays(now, template.due_days_offset);
      dueAt = formatSingaporeDate(targetDate);
    }

    // Create todo from template
    const todo = todoDB.create(testUser.id, title.trim(), {
      description: template.description || undefined,
      priority: (template.priority as Priority) || 'medium',
      dueAt,
      reminderMinutes: template.reminder_minutes || undefined,
      recurrencePattern: (template.recurrence_pattern as RecurrencePattern) || undefined,
    });

    // Add tags if provided
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        tagDB.addTagToTodo(todo.id, tagId);
      }
    }

    // Parse and create subtasks if present
    if (template.subtasks_json) {
      try {
        const subtasks = JSON.parse(template.subtasks_json) as Array<{ title: string; position: number }>;
        for (const subtask of subtasks) {
          subtaskDB.create(todo.id, subtask.title, subtask.position);
        }
      } catch (error) {
        console.error('Error parsing subtasks JSON:', error);
        // Continue without subtasks rather than failing
      }
    }

    // Fetch complete todo with tags and subtasks
    const completeTodo = todoDB.getById(todo.id);

    return NextResponse.json({ todo: completeTodo }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo from template:', error);
    return NextResponse.json({ error: 'Failed to create todo from template' }, { status: 500 });
  }
}

