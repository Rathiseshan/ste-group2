import { NextRequest, NextResponse } from 'next/server';
import { todoDB, tagDB, subtaskDB, Priority, RecurrencePattern } from '@/lib/db';
import { getTestUser } from '@/lib/test-user';

interface ExportData {
  version: string;
  exportedAt: string;
  todos: Array<{
    title: string;
    description?: string;
    priority: string;
    status: string;
    due_at?: string;
    completed_at?: string;
    reminder_minutes?: number;
    recurrence_pattern?: string;
    recurrence_options?: string;
    tags: string[];
    subtasks: Array<{
      title: string;
      completed: boolean;
      position: number;
    }>;
  }>;
  tags: Array<{
    name: string;
    color: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const testUser = getTestUser();
    
    let data: ExportData;
    try {
      data = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
    }

    // Validate format
    if (!data.version || !data.todos || !Array.isArray(data.todos)) {
      return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
    }

    // Tag name to ID mapping (reuse existing tags by name, create new ones)
    const tagMap = new Map<string, number>();
    for (const tagData of data.tags || []) {
      let tag = tagDB.getByUserId(testUser.id).find(t => t.name === tagData.name);
      
      if (!tag) {
        tag = tagDB.create(testUser.id, tagData.name, tagData.color || '#3b82f6');
      }
      
      tagMap.set(tagData.name, tag.id);
    }

    // Import todos
    let importedCount = 0;
    const errors: string[] = [];

    for (const todoData of data.todos) {
      // Validate required fields
      if (!todoData.title || typeof todoData.title !== 'string') {
        errors.push('Todo missing title, skipped');
        continue;
      }

      // Validate priority
      const validPriorities = ['high', 'medium', 'low'];
      let priority: Priority = 'medium';
      if (todoData.priority && validPriorities.includes(todoData.priority)) {
        priority = todoData.priority as Priority;
      } else if (todoData.priority) {
        errors.push(`Invalid priority for "${todoData.title}", defaulting to medium`);
      }

      // Parse recurrence options if present
      let recurrenceOptions;
      if (todoData.recurrence_options) {
        try {
          recurrenceOptions = JSON.parse(todoData.recurrence_options);
        } catch {
          errors.push(`Invalid recurrence options for "${todoData.title}", skipped recurrence`);
        }
      }

      // Create todo
      const todo = todoDB.create(testUser.id, todoData.title, {
        description: todoData.description,
        priority,
        dueAt: todoData.due_at,
        reminderMinutes: todoData.reminder_minutes,
        recurrencePattern: todoData.recurrence_pattern as RecurrencePattern,
        recurrenceOptions,
      });

      // Set completed status if needed
      if (todoData.status === 'completed' && todoData.completed_at) {
        todoDB.update(todo.id, { 
          status: 'completed', 
          completed_at: todoData.completed_at 
        });
      }

      // Add tags
      if (todoData.tags && Array.isArray(todoData.tags)) {
        for (const tagName of todoData.tags) {
          const tagId = tagMap.get(tagName);
          if (tagId) {
            tagDB.addTagToTodo(todo.id, tagId);
          }
        }
      }

      // Add subtasks
      if (todoData.subtasks && Array.isArray(todoData.subtasks)) {
        for (const subtaskData of todoData.subtasks) {
          if (subtaskData.title) {
            const subtask = subtaskDB.create(todo.id, subtaskData.title, subtaskData.position || 0);
            if (subtaskData.completed) {
              subtaskDB.update(subtask.id, { completed: true });
            }
          }
        }
      }

      importedCount++;
    }

    if (errors.length > 0) {
      console.warn('Import warnings:', errors);
    }

    return NextResponse.json({ 
      success: true, 
      imported: importedCount,
      warnings: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedCount} todo(s)${errors.length > 0 ? ` with ${errors.length} warning(s)` : ''}`
    });
  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json({ error: 'Failed to import todos' }, { status: 500 });
  }
}
