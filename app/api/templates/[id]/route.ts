import { NextRequest, NextResponse } from 'next/server';
import { templateDB } from '@/lib/db';
import { getTestUser } from '@/lib/test-user';

// PUT /api/templates/[id] - Update template
export async function PUT(
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

    // Check template exists and belongs to user
    const template = templateDB.getById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.user_id !== testUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, priority, reminder_minutes, recurrence_pattern, recurrence_options, due_days_offset, subtasks } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Template name cannot be empty' }, { status: 400 });
      }

      if (name.length > 100) {
        return NextResponse.json({ error: 'Template name must be 100 characters or less' }, { status: 400 });
      }

      // Check for duplicate name (excluding current template)
      const existingTemplates = templateDB.getByUserId(testUser.id);
      if (existingTemplates.some(t => t.id !== templateId && t.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ error: 'Template with this name already exists' }, { status: 400 });
      }
    }

    // Serialize subtasks if provided
    const subtasksJson = subtasks !== undefined 
      ? (subtasks && subtasks.length > 0 ? JSON.stringify(subtasks) : null)
      : undefined;

    // Update template
    const updated = templateDB.update(templateId, {
      name: name?.trim(),
      description: description?.trim(),
      category: category?.trim(),
      priority,
      reminderMinutes: reminder_minutes,
      recurrencePattern: recurrence_pattern,
      recurrenceOptions: recurrence_options,
      subtasksJson,
      dueDaysOffset: due_days_offset,
    });

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
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

    // Check template exists and belongs to user
    const template = templateDB.getById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.user_id !== testUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete template
    templateDB.delete(templateId);

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
