import { NextResponse } from 'next/server';
import { todoDB, tagDB, subtaskDB } from '@/lib/db';
import { getTestUser } from '@/lib/test-user';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET() {
  try {
    const testUser = getTestUser();
    
    const todos = todoDB.getByUserId(testUser.id);
    const tags = tagDB.getByUserId(testUser.id);

    const exportData = {
      version: '1.0',
      exportedAt: getSingaporeNow().toISOString(),
      todos: todos.map(todo => {
        const todoTags = tagDB.getTagsForTodo(todo.id);
        const subtasks = subtaskDB.getByTodoId(todo.id);

        return {
          title: todo.title,
          description: todo.description || undefined,
          priority: todo.priority,
          status: todo.status,
          due_at: todo.due_at || undefined,
          completed_at: todo.completed_at || undefined,
          reminder_minutes: todo.reminder_minutes || undefined,
          recurrence_pattern: todo.recurrence_pattern || undefined,
          recurrence_options: todo.recurrence_options || undefined,
          tags: todoTags.map(t => t.name),
          subtasks: subtasks.map(s => ({
            title: s.title,
            completed: s.completed,
            position: s.position,
          })),
        };
      }),
      tags: tags.map(tag => ({
        name: tag.name,
        color: tag.color,
      })),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Failed to export todos' }, { status: 500 });
  }
}
