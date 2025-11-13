import { NextRequest, NextResponse } from 'next/server';
import { templateDB } from '@/lib/db';
import { getTestUser } from '@/lib/test-user';

// GET /api/templates - List all templates for the user
export async function GET() {
  try {
    const testUser = getTestUser();
    const templates = templateDB.getByUserId(testUser.id);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const testUser = getTestUser();
    const body = await request.json();
    const { name, description, category, priority, is_recurring, recurrence_pattern, recurrence_options, reminder_minutes, due_days_offset, subtasks } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Template name must be 100 characters or less' }, { status: 400 });
    }

    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description must be 500 characters or less' }, { status: 400 });
    }

    if (category && category.length > 50) {
      return NextResponse.json({ error: 'Category must be 50 characters or less' }, { status: 400 });
    }

    // Check for duplicate name
    const existingTemplates = templateDB.getByUserId(testUser.id);
    if (existingTemplates.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 400 });
    }

    // Serialize subtasks to JSON if provided
    const subtasksJson = subtasks && subtasks.length > 0 ? JSON.stringify(subtasks) : undefined;

    // Create template with correct signature
    const template = templateDB.create(testUser.id, name.trim(), {
      description: description?.trim(),
      category: category?.trim(),
      priority: priority || 'medium',
      reminderMinutes: reminder_minutes || undefined,
      recurrencePattern: recurrence_pattern || undefined,
      recurrenceOptions: recurrence_options || undefined,
      subtasksJson,
      dueDaysOffset: due_days_offset || 0,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

