# Category 2: Advanced Features - Product Requirement Prompt

## Overview

This PRP consolidates four advanced features that enhance todo functionality:
1. **Reminders & Notifications** - Browser notifications before due dates
2. **Subtasks & Progress Tracking** - Checklist functionality with visual progress
3. **Tag System** - Color-coded labels for organization
4. **Template System** - Save and reuse todo patterns

These features build upon the core todo system to provide powerful organization and automation capabilities.

---

## Feature 4: Reminders & Notifications

### Feature Overview
Browser-based notification system that alerts users at configurable intervals before todo due dates, with duplicate prevention and Singapore timezone handling.

### User Stories
- **As a forgetful user**, I want notifications before my todos are due so I don't miss deadlines.
- **As someone juggling multiple tasks**, I need flexible reminder timing (15 minutes to 1 week before).
- **As a user**, I want to enable/disable notifications without losing reminder settings.

### Technical Requirements

#### Database Fields
Already in todos table:
```sql
reminder_minutes INTEGER,  -- offset in minutes before due time
last_notification_sent TEXT  -- prevents duplicate notifications
```

#### Reminder Options
```typescript
const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
];
```

#### API Endpoint: Check for Notifications

**GET /api/notifications/check**
```typescript
export async function GET(request: NextRequest) {
  const testUser = getTestUser(); // or session
  
  const todos = todoDB.getTodosNeedingNotification(testUser.id);
  
  // Mark as notified
  const now = getSingaporeNow().toISOString();
  for (const todo of todos) {
    todoDB.update(todo.id, { last_notification_sent: now });
  }
  
  return NextResponse.json({ todos });
}
```

#### Database Helper
```typescript
// In lib/db.ts
getTodosNeedingNotification: (userId: number): Todo[] => {
  const now = getSingaporeNow().toISOString();
  const stmt = db.prepare(`
    SELECT * FROM todos
    WHERE user_id = ?
      AND status = 'active'
      AND due_at IS NOT NULL
      AND reminder_minutes IS NOT NULL
      AND (last_notification_sent IS NULL OR last_notification_sent < datetime(due_at, '-' || reminder_minutes || ' minutes'))
      AND datetime('now') >= datetime(due_at, '-' || reminder_minutes || ' minutes')
      AND datetime('now') < due_at
  `);
  return stmt.all(userId) as Todo[];
}
```

#### Custom Hook: useNotifications

Create `lib/hooks/useNotifications.ts`:
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      setEnabled(true);
      return true;
    }
    return false;
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if (permission === 'granted' && enabled) {
      new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: 'todo-reminder',
        requireInteraction: true,
      });
    }
  }, [permission, enabled]);

  const checkNotifications = useCallback(async () => {
    if (!enabled || permission !== 'granted') return;

    try {
      const response = await fetch('/api/notifications/check');
      const data = await response.json();
      
      if (data.todos && data.todos.length > 0) {
        for (const todo of data.todos) {
          const reminderText = getReminderText(todo.reminder_minutes);
          showNotification(
            `Todo Due Soon: ${todo.title}`,
            `Due ${new Date(todo.due_at).toLocaleString()} (${reminderText})`
          );
        }
      }
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  }, [enabled, permission, showNotification]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkNotifications, 30000);
    checkNotifications(); // Initial check

    return () => clearInterval(interval);
  }, [enabled, checkNotifications]);

  return {
    permission,
    enabled,
    setEnabled,
    requestPermission,
    checkNotifications,
  };
}

function getReminderText(minutes: number): string {
  if (minutes < 60) return `${minutes}m before`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h before`;
  return `${Math.floor(minutes / 1440)}d before`;
}
```

#### UI Integration

In `app/page.tsx`:
```tsx
import { useNotifications } from '@/lib/hooks/useNotifications';

const { permission, enabled, setEnabled, requestPermission } = useNotifications();

// Enable notifications button
{permission !== 'granted' && (
  <button onClick={requestPermission} className="bg-blue-500 text-white px-4 py-2 rounded">
    Enable Notifications
  </button>
)}

{permission === 'granted' && (
  <label>
    <input 
      type="checkbox" 
      checked={enabled}
      onChange={(e) => setEnabled(e.target.checked)}
    />
    Notifications {enabled ? 'On' : 'Off'}
  </label>
)}

// Reminder dropdown in todo form
<select 
  value={formReminderMinutes || ''} 
  onChange={(e) => setFormReminderMinutes(e.target.value ? parseInt(e.target.value) : null)}
  disabled={!formDueAt}
>
  <option value="">No reminder</option>
  <option value="15">15 minutes before</option>
  <option value="30">30 minutes before</option>
  <option value="60">1 hour before</option>
  <option value="120">2 hours before</option>
  <option value="1440">1 day before</option>
  <option value="2880">2 days before</option>
  <option value="10080">1 week before</option>
</select>

// Reminder badge
{todo.reminder_minutes && (
  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
    🔔 {getReminderText(todo.reminder_minutes)}
  </span>
)}
```

### Edge Cases
- Browser doesn't support notifications → disable feature gracefully
- User denies permission → show message, allow re-request
- Notification sent while tab closed → fires when tab reopens
- Reminder time already passed → notification fires immediately on next check
- Multiple todos due at same time → show separate notifications
- Duplicate notifications → prevented by `last_notification_sent`

### Acceptance Criteria
- ✅ Permission request works
- ✅ All 7 timing options available
- ✅ Notifications fire at correct time (± 30 seconds polling interval)
- ✅ Only one notification per reminder
- ✅ Works in Singapore timezone
- ✅ Reminder dropdown disabled without due date

---

## Feature 5: Subtasks & Progress Tracking

### Feature Overview
Hierarchical checklist functionality allowing users to break down todos into smaller tasks with visual progress tracking.

### Technical Requirements

#### Database Schema
```sql
CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
```

#### Types
```typescript
export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}
```

#### Database Operations
```typescript
// In lib/db.ts
export const subtaskDB = {
  create: (todoId: number, title: string, position: number = 0): Subtask => {
    const stmt = db.prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)');
    const result = stmt.run(todoId, title, position);
    return subtaskDB.getById(Number(result.lastInsertRowid))!;
  },

  getById: (id: number): Subtask | undefined => {
    const stmt = db.prepare('SELECT * FROM subtasks WHERE id = ?');
    return stmt.get(id) as Subtask | undefined;
  },

  getByTodoId: (todoId: number): Subtask[] => {
    const stmt = db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position');
    return stmt.all(todoId) as Subtask[];
  },

  update: (id: number, updates: Partial<Subtask>): Subtask => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.position !== undefined) {
      fields.push('position = ?');
      values.push(updates.position);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return subtaskDB.getById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM subtasks WHERE id = ?');
    stmt.run(id);
  },
};
```

#### API Endpoints

**POST /api/todos/[id]/subtasks**
```typescript
export async function POST(request: NextRequest, { params }: RouteParams) {
  const testUser = getTestUser();
  const { id } = await params;
  const todo = todoDB.getById(Number(id));

  if (!todo || todo.user_id !== testUser.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { title } = body;

  if (!title || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const subtasks = subtaskDB.getByTodoId(Number(id));
  const position = subtasks.length;

  const subtask = subtaskDB.create(Number(id), title.trim(), position);
  return NextResponse.json({ subtask }, { status: 201 });
}
```

**PUT /api/subtasks/[id]**
```typescript
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const subtask = subtaskDB.getById(Number(id));

  if (!subtask) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { title, completed } = body;

  const updates: any = {};
  if (title !== undefined) updates.title = title.trim();
  if (completed !== undefined) updates.completed = completed;

  const updated = subtaskDB.update(Number(id), updates);
  return NextResponse.json({ subtask: updated });
}
```

**DELETE /api/subtasks/[id]**
```typescript
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const subtask = subtaskDB.getById(Number(id));

  if (!subtask) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  subtaskDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
```

#### UI Components

**SubtasksList Component**
```tsx
interface SubtasksListProps {
  todoId: number;
  subtasks: Subtask[];
  onUpdate: () => void;
}

function SubtasksList({ todoId, subtasks, onUpdate }: SubtasksListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    const response = await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSubtaskTitle }),
    });

    if (response.ok) {
      setNewSubtaskTitle('');
      onUpdate();
    }
  };

  const handleToggleSubtask = async (subtaskId: number, completed: boolean) => {
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    });
    onUpdate();
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    onUpdate();
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="mt-2">
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-blue-600">
        {expanded ? '▼' : '▶'} Subtasks ({completedCount}/{subtasks.length})
      </button>

      {subtasks.length > 0 && (
        <div className="mt-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
        </div>
      )}

      {expanded && (
        <div className="mt-2 ml-4 space-y-2">
          {subtasks.map(subtask => (
            <div key={subtask.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={() => handleToggleSubtask(subtask.id, subtask.completed)}
              />
              <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                {subtask.title}
              </span>
              <button 
                onClick={() => handleDeleteSubtask(subtask.id)}
                className="text-red-600 text-sm"
              >
                ×
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add subtask..."
              className="border rounded px-2 py-1 text-sm flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
            />
            <button onClick={handleAddSubtask} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Acceptance Criteria
- ✅ Can add unlimited subtasks
- ✅ Can toggle subtask completion
- ✅ Progress updates in real-time
- ✅ Visual progress bar accurate
- ✅ Deleting todo cascades to subtasks
- ✅ Subtasks ordered by position
- ✅ Progress bar green at 100%, blue otherwise

---

## Feature 6: Tag System

### Feature Overview
Organize todos with color-coded labels supporting many-to-many relationships, tag management, and filtering.

### Technical Requirements

#### Database Schema
```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
```

#### Types
```typescript
export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}
```

#### Database Operations
```typescript
// In lib/db.ts
export const tagDB = {
  create: (userId: number, name: string, color: string = '#3b82f6'): Tag => {
    const stmt = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)');
    const result = stmt.run(userId, name, color);
    return tagDB.getById(Number(result.lastInsertRowid))!;
  },

  getById: (id: number): Tag | undefined => {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id) as Tag | undefined;
  },

  getByUserId: (userId: number): Tag[] => {
    const stmt = db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name');
    return stmt.all(userId) as Tag[];
  },

  update: (id: number, updates: { name?: string; color?: string }): Tag => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return tagDB.getById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    stmt.run(id);
  },

  getTagsForTodo: (todoId: number): Tag[] => {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
    `);
    return stmt.all(todoId) as Tag[];
  },

  addTagToTodo: (todoId: number, tagId: number): void => {
    const stmt = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
    stmt.run(todoId, tagId);
  },

  removeTagFromTodo: (todoId: number, tagId: number): void => {
    const stmt = db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?');
    stmt.run(todoId, tagId);
  },

  clearTodoTags: (todoId: number): void => {
    const stmt = db.prepare('DELETE FROM todo_tags WHERE todo_id = ?');
    stmt.run(todoId);
  },
};
```

#### API Endpoints

**GET /api/tags**
```typescript
export async function GET(request: NextRequest) {
  const testUser = getTestUser();
  const tags = tagDB.getByUserId(testUser.id);
  return NextResponse.json({ tags });
}
```

**POST /api/tags**
```typescript
export async function POST(request: NextRequest) {
  const testUser = getTestUser();
  const body = await request.json();
  const { name, color } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const tag = tagDB.create(testUser.id, name.trim(), color || '#3b82f6');
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 });
    }
    throw error;
  }
}
```

**PUT /api/tags/[id]**
```typescript
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const tag = tagDB.getById(Number(id));

  if (!tag) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, color } = body;

  const updates: any = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color;

  const updated = tagDB.update(Number(id), updates);
  return NextResponse.json({ tag: updated });
}
```

**DELETE /api/tags/[id]**
```typescript
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  tagDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
```

#### UI Components

**Tag Management Modal**
```tsx
function TagManagementModal({ onClose }: { onClose: () => void }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const response = await fetch('/api/tags');
    const data = await response.json();
    setTags(data.tags);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName, color: newTagColor }),
    });

    if (response.ok) {
      setNewTagName('');
      setNewTagColor('#3b82f6');
      fetchTags();
    } else {
      const error = await response.json();
      alert(error.error);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm('Delete this tag? It will be removed from all todos.')) return;
    
    await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    fetchTags();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Manage Tags</h2>

        <div className="space-y-2 mb-4">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1">{tag.name}</span>
              <button onClick={() => handleDeleteTag(tag.id)} className="text-red-600">
                Delete
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="border rounded px-2 py-1 flex-1"
          />
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-12"
          />
          <button onClick={handleCreateTag} className="bg-blue-500 text-white px-4 py-1 rounded">
            Add
          </button>
        </div>

        <button onClick={onClose} className="w-full bg-gray-200 py-2 rounded">
          Close
        </button>
      </div>
    </div>
  );
}
```

**Tag Selection in Todo Form**
```tsx
// In todo form
const [formSelectedTags, setFormSelectedTags] = useState<number[]>([]);

<div>
  <label>Tags</label>
  <div className="flex flex-wrap gap-2">
    {tags.map(tag => (
      <label key={tag.id} className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={formSelectedTags.includes(tag.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setFormSelectedTags([...formSelectedTags, tag.id]);
            } else {
              setFormSelectedTags(formSelectedTags.filter(id => id !== tag.id));
            }
          }}
        />
        <span style={{ color: tag.color }}>{tag.name}</span>
      </label>
    ))}
  </div>
</div>
```

**Tag Badges on Todos**
```tsx
{todo.tags.map(tag => (
  <span
    key={tag.id}
    className="text-xs px-2 py-1 rounded cursor-pointer"
    style={{ 
      backgroundColor: tag.color + '20', 
      color: tag.color,
      border: `1px solid ${tag.color}`
    }}
    onClick={() => handleFilterByTag(tag.id)}
  >
    {tag.name}
  </span>
))}
```

### Acceptance Criteria
- ✅ Tags unique per user
- ✅ Custom colors work
- ✅ Editing tag updates all todos
- ✅ Deleting tag removes from todos (cascade)
- ✅ Can assign multiple tags to one todo
- ✅ Tag badges clickable for filtering

---

## Feature 7: Template System

### Feature Overview
Save todo configurations as reusable templates including subtasks, priority, recurrence, and reminder settings.

### Technical Requirements

#### Database Schema
```sql
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  reminder_minutes INTEGER,
  recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_options TEXT,
  subtasks_json TEXT,  -- JSON array: [{ title: string, position: number }]
  due_days_offset INTEGER DEFAULT 0,  -- days from now when using template
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### Types
```typescript
export interface Template {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  category?: string;
  priority: Priority;
  reminder_minutes?: number;
  recurrence_pattern?: RecurrencePattern;
  recurrence_options?: string;
  subtasks_json?: string;
  due_days_offset?: number;
  created_at: string;
}
```

#### API Endpoints

**GET /api/templates**
```typescript
export async function GET(request: NextRequest) {
  const testUser = getTestUser();
  const templates = templateDB.getByUserId(testUser.id);
  return NextResponse.json({ templates });
}
```

**POST /api/templates** (Save as Template)
```typescript
export async function POST(request: NextRequest) {
  const testUser = getTestUser();
  const body = await request.json();
  const { todoId, name, description, category } = body;

  const todo = todoDB.getById(todoId);
  if (!todo || todo.user_id !== testUser.id) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const subtasks = subtaskDB.getByTodoId(todoId);
  const subtasksJson = JSON.stringify(
    subtasks.map(s => ({ title: s.title, position: s.position }))
  );

  const template = templateDB.create(testUser.id, name, {
    description,
    category,
    priority: todo.priority,
    reminderMinutes: todo.reminder_minutes || undefined,
    recurrencePattern: todo.recurrence_pattern || undefined,
    recurrenceOptions: todo.recurrence_options ? JSON.parse(todo.recurrence_options) : undefined,
    subtasksJson,
    dueDaysOffset: 7, // default 1 week from now
  });

  return NextResponse.json({ template }, { status: 201 });
}
```

**POST /api/templates/[id]/use** (Create Todo from Template)
```typescript
export async function POST(request: NextRequest, { params }: RouteParams) {
  const testUser = getTestUser();
  const { id } = await params;
  const template = templateDB.getById(Number(id));

  if (!template || template.user_id !== testUser.id) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const body = await request.json();
  const { title } = body;

  // Calculate due date
  const dueAt = template.due_days_offset
    ? addDays(getSingaporeNow(), template.due_days_offset).toISOString()
    : undefined;

  // Create todo
  const todo = todoDB.create(testUser.id, title || template.name, {
    description: template.description || undefined,
    priority: template.priority,
    dueAt,
    reminderMinutes: template.reminder_minutes || undefined,
    recurrencePattern: template.recurrence_pattern || undefined,
    recurrenceOptions: template.recurrence_options ? JSON.parse(template.recurrence_options) : undefined,
  });

  // Create subtasks
  if (template.subtasks_json) {
    const subtasks = JSON.parse(template.subtasks_json);
    for (const subtask of subtasks) {
      subtaskDB.create(todo.id, subtask.title, subtask.position);
    }
  }

  return NextResponse.json({ todo }, { status: 201 });
}
```

**DELETE /api/templates/[id]**
```typescript
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  templateDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
```

### UI Components

**Save as Template Button**
```tsx
<button onClick={() => handleSaveAsTemplate(todo.id)}>
  Save as Template
</button>

const handleSaveAsTemplate = async (todoId: number) => {
  const name = prompt('Template name:');
  if (!name) return;

  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ todoId, name }),
  });

  if (response.ok) {
    alert('Template saved!');
  }
};
```

**Use Template Modal**
```tsx
function TemplateSelectionModal({ onSelect, onClose }: { onSelect: (templateId: number) => void, onClose: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => setTemplates(data.templates));
  }, []);

  const handleUseTemplate = async (templateId: number) => {
    const title = prompt('Todo title (leave blank to use template name):');
    
    const response = await fetch(`/api/templates/${templateId}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (response.ok) {
      const data = await response.json();
      onSelect(data.todo.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Use Template</h2>
        
        <div className="space-y-2">
          {templates.map(template => (
            <div key={template.id} className="border p-3 rounded">
              <h3 className="font-semibold">{template.name}</h3>
              {template.description && <p className="text-sm text-gray-600">{template.description}</p>}
              <button 
                onClick={() => handleUseTemplate(template.id)}
                className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                Use
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 w-full bg-gray-200 py-2 rounded">
          Close
        </button>
      </div>
    </div>
  );
}
```

### Acceptance Criteria
- ✅ Can save current todo as template
- ✅ Templates include all metadata
- ✅ Using template creates new todo
- ✅ Subtasks recreated from JSON
- ✅ Due date calculated from offset
- ✅ Can delete templates

---

## Implementation Checklist

### Feature 4: Reminders & Notifications
- [ ] Database fields: reminder_minutes, last_notification_sent
- [ ] API endpoint: GET /api/notifications/check
- [ ] todoDB.getTodosNeedingNotification()
- [ ] lib/hooks/useNotifications.ts
- [ ] UI: Enable Notifications button
- [ ] UI: Reminder dropdown (7 options)
- [ ] UI: Reminder badge display
- [ ] Polling system (30 second interval)

### Feature 5: Subtasks & Progress
- [ ] Database: subtasks table
- [ ] subtaskDB CRUD operations
- [ ] API: POST /api/todos/[id]/subtasks
- [ ] API: PUT /api/subtasks/[id]
- [ ] API: DELETE /api/subtasks/[id]
- [ ] UI: SubtasksList component
- [ ] UI: Add subtask input
- [ ] UI: Progress bar component
- [ ] UI: Expandable section

### Feature 6: Tag System
- [ ] Database: tags, todo_tags tables
- [ ] tagDB CRUD operations
- [ ] API: GET/POST /api/tags
- [ ] API: PUT/DELETE /api/tags/[id]
- [ ] UI: Tag management modal
- [ ] UI: Tag selection checkboxes
- [ ] UI: Tag badges on todos
- [ ] UI: Click badge to filter

### Feature 7: Template System
- [ ] Database: templates table
- [ ] templateDB operations
- [ ] API: GET /api/templates
- [ ] API: POST /api/templates (save)
- [ ] API: POST /api/templates/[id]/use
- [ ] API: DELETE /api/templates/[id]
- [ ] UI: Save as Template button
- [ ] UI: Use Template modal
- [ ] Subtasks JSON serialization

---

**Category Completion Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Last Updated**: November 12, 2025
