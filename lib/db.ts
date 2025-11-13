/**
 * Database Layer - Single Source of Truth
 * All database operations and type definitions
 */

import Database from 'better-sqlite3';
import path from 'path';
import { getSingaporeNow } from './timezone';

// ============================================================================
// Type Definitions
// ============================================================================

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  due_at: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface TodoTag {
  todo_id: number;
  tag_id: number;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_days: number | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  country: string;
}

// ============================================================================
// Database Initialization
// ============================================================================

const dbPath = path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Authenticators table (WebAuthn)
  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Todos table
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_at TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Subtasks table
  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
  );

  -- Tags table
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  -- Todo-Tags junction table
  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (todo_id, tag_id),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  -- Templates table
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring BOOLEAN NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    due_date_offset_days INTEGER,
    subtasks_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Holidays table
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'SG'
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_at ON todos(due_at);
  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
  CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
  CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
`);

// Migration: Add priority column if it doesn't exist
try {
  db.exec(`ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'`);
} catch (error) {
  // Column already exists, ignore error
}

// ============================================================================
// Priority Validation
// ============================================================================

const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export function isValidPriority(priority: string): priority is Priority {
  return VALID_PRIORITIES.includes(priority as Priority);
}

export function validatePriority(priority: string): Priority {
  if (!isValidPriority(priority)) {
    throw new Error(`Invalid priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }
  return priority;
}

// ============================================================================
// User Operations
// ============================================================================

export const userDB = {
  create: (username: string): User => {
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?)');
    const result = stmt.run(username);
    return userDB.findById(result.lastInsertRowid as number)!;
  },

  findById: (id: number): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  },

  findByUsername: (username: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | null;
  },
};

// ============================================================================
// Authenticator Operations
// ============================================================================

export const authenticatorDB = {
  create: (userId: number, credentialId: string, publicKey: string, counter: number): Authenticator => {
    const stmt = db.prepare(
      'INSERT INTO authenticators (user_id, credential_id, public_key, counter) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(userId, credentialId, publicKey, counter);
    return authenticatorDB.findById(result.lastInsertRowid as number)!;
  },

  findByCredentialId: (credentialId: string): Authenticator | null => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE credential_id = ?');
    return stmt.get(credentialId) as Authenticator | null;
  },

  findById: (id: number): Authenticator | null => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE id = ?');
    return stmt.get(id) as Authenticator | null;
  },

  findByUserId: (userId: number): Authenticator[] => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE user_id = ?');
    return stmt.all(userId) as Authenticator[];
  },

  updateCounter: (id: number, counter: number): void => {
    const stmt = db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?');
    stmt.run(counter, id);
  },
};

// ============================================================================
// Todo Operations
// ============================================================================

export const todoDB = {
  create: (
    userId: number,
    title: string,
    options: {
      priority?: Priority;
      dueAt?: string | null;
      isRecurring?: boolean;
      recurrencePattern?: RecurrencePattern | null;
      reminderMinutes?: number | null;
    } = {}
  ): Todo => {
    const priority = options.priority ? validatePriority(options.priority) : 'medium';
    const stmt = db.prepare(`
      INSERT INTO todos (user_id, title, priority, due_at, is_recurring, recurrence_pattern, reminder_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      title.trim(),
      priority,
      options.dueAt || null,
      options.isRecurring ? 1 : 0,
      options.recurrencePattern || null,
      options.reminderMinutes || null
    );
    return todoDB.findById(result.lastInsertRowid as number)!;
  },

  findById: (id: number): Todo | null => {
    const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
    return stmt.get(id) as Todo | null;
  },

  findByUserId: (userId: number): Todo[] => {
    const stmt = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Todo[];
  },

  update: (
    id: number,
    updates: {
      title?: string;
      completed?: boolean;
      priority?: Priority;
      dueAt?: string | null;
      isRecurring?: boolean;
      recurrencePattern?: RecurrencePattern | null;
      reminderMinutes?: number | null;
      lastNotificationSent?: string | null;
    }
  ): Todo => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title.trim());
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(validatePriority(updates.priority));
    }
    if (updates.dueAt !== undefined) {
      fields.push('due_at = ?');
      values.push(updates.dueAt);
    }
    if (updates.isRecurring !== undefined) {
      fields.push('is_recurring = ?');
      values.push(updates.isRecurring ? 1 : 0);
    }
    if (updates.recurrencePattern !== undefined) {
      fields.push('recurrence_pattern = ?');
      values.push(updates.recurrencePattern);
    }
    if (updates.reminderMinutes !== undefined) {
      fields.push('reminder_minutes = ?');
      values.push(updates.reminderMinutes);
    }
    if (updates.lastNotificationSent !== undefined) {
      fields.push('last_notification_sent = ?');
      values.push(updates.lastNotificationSent);
    }

    fields.push('updated_at = datetime("now")');
    values.push(id);

    const stmt = db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return todoDB.findById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
    stmt.run(id);
  },

  findDueForNotification: (userId: number): Todo[] => {
    const now = getSingaporeNow().toISOString();
    const stmt = db.prepare(`
      SELECT * FROM todos
      WHERE user_id = ?
        AND completed = 0
        AND due_at IS NOT NULL
        AND reminder_minutes IS NOT NULL
        AND (last_notification_sent IS NULL OR last_notification_sent < datetime(due_at, '-' || reminder_minutes || ' minutes'))
        AND datetime('now') >= datetime(due_at, '-' || reminder_minutes || ' minutes')
        AND datetime('now') < due_at
    `);
    return stmt.all(userId) as Todo[];
  },
};

// ============================================================================
// Subtask Operations
// ============================================================================

export const subtaskDB = {
  create: (todoId: number, title: string, position: number = 0): Subtask => {
    const stmt = db.prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)');
    const result = stmt.run(todoId, title.trim(), position);
    return subtaskDB.findById(result.lastInsertRowid as number)!;
  },

  findById: (id: number): Subtask | null => {
    const stmt = db.prepare('SELECT * FROM subtasks WHERE id = ?');
    return stmt.get(id) as Subtask | null;
  },

  findByTodoId: (todoId: number): Subtask[] => {
    const stmt = db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC');
    return stmt.all(todoId) as Subtask[];
  },

  update: (id: number, updates: { title?: string; completed?: boolean; position?: number }): Subtask => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title.trim());
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
    return subtaskDB.findById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM subtasks WHERE id = ?');
    stmt.run(id);
  },
};

// ============================================================================
// Tag Operations
// ============================================================================

export const tagDB = {
  create: (userId: number, name: string, color: string = '#3b82f6'): Tag => {
    const stmt = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)');
    const result = stmt.run(userId, name.trim(), color);
    return tagDB.findById(result.lastInsertRowid as number)!;
  },

  findById: (id: number): Tag | null => {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id) as Tag | null;
  },

  findByUserId: (userId: number): Tag[] => {
    const stmt = db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC');
    return stmt.all(userId) as Tag[];
  },

  update: (id: number, updates: { name?: string; color?: string }): Tag => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name.trim());
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return tagDB.findById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    stmt.run(id);
  },

  addToTodo: (todoId: number, tagId: number): void => {
    const stmt = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
    stmt.run(todoId, tagId);
  },

  removeFromTodo: (todoId: number, tagId: number): void => {
    const stmt = db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?');
    stmt.run(todoId, tagId);
  },

  findByTodoId: (todoId: number): Tag[] => {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
      ORDER BY t.name ASC
    `);
    return stmt.all(todoId) as Tag[];
  },
};

// ============================================================================
// Template Operations
// ============================================================================

export const templateDB = {
  create: (
    userId: number,
    name: string,
    options: {
      description?: string | null;
      category?: string | null;
      priority?: Priority;
      isRecurring?: boolean;
      recurrencePattern?: RecurrencePattern | null;
      reminderMinutes?: number | null;
      dueDateOffsetDays?: number | null;
      subtasksJson?: string | null;
    } = {}
  ): Template => {
    const priority = options.priority ? validatePriority(options.priority) : 'medium';
    const stmt = db.prepare(`
      INSERT INTO templates (user_id, name, description, category, priority, is_recurring, recurrence_pattern, reminder_minutes, due_date_offset_days, subtasks_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      name.trim(),
      options.description || null,
      options.category || null,
      priority,
      options.isRecurring ? 1 : 0,
      options.recurrencePattern || null,
      options.reminderMinutes || null,
      options.dueDateOffsetDays || null,
      options.subtasksJson || null
    );
    return templateDB.findById(result.lastInsertRowid as number)!;
  },

  findById: (id: number): Template | null => {
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    return stmt.get(id) as Template | null;
  },

  findByUserId: (userId: number, category?: string): Template[] => {
    if (category) {
      const stmt = db.prepare('SELECT * FROM templates WHERE user_id = ? AND category = ? ORDER BY name ASC');
      return stmt.all(userId, category) as Template[];
    }
    const stmt = db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY name ASC');
    return stmt.all(userId) as Template[];
  },

  update: (
    id: number,
    updates: {
      name?: string;
      description?: string | null;
      category?: string | null;
      priority?: Priority;
      isRecurring?: boolean;
      recurrencePattern?: RecurrencePattern | null;
      reminderMinutes?: number | null;
      dueDateOffsetDays?: number | null;
      subtasksJson?: string | null;
    }
  ): Template => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name.trim());
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(validatePriority(updates.priority));
    }
    if (updates.isRecurring !== undefined) {
      fields.push('is_recurring = ?');
      values.push(updates.isRecurring ? 1 : 0);
    }
    if (updates.recurrencePattern !== undefined) {
      fields.push('recurrence_pattern = ?');
      values.push(updates.recurrencePattern);
    }
    if (updates.reminderMinutes !== undefined) {
      fields.push('reminder_minutes = ?');
      values.push(updates.reminderMinutes);
    }
    if (updates.dueDateOffsetDays !== undefined) {
      fields.push('due_date_offset_days = ?');
      values.push(updates.dueDateOffsetDays);
    }
    if (updates.subtasksJson !== undefined) {
      fields.push('subtasks_json = ?');
      values.push(updates.subtasksJson);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return templateDB.findById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
    stmt.run(id);
  },
};

// ============================================================================
// Holiday Operations
// ============================================================================

export const holidayDB = {
  create: (date: string, name: string, country: string = 'SG'): Holiday => {
    const stmt = db.prepare('INSERT INTO holidays (date, name, country) VALUES (?, ?, ?)');
    const result = stmt.run(date, name, country);
    return holidayDB.findById(result.lastInsertRowid as number)!;
  },

  findById: (id: number): Holiday | null => {
    const stmt = db.prepare('SELECT * FROM holidays WHERE id = ?');
    return stmt.get(id) as Holiday | null;
  },

  findByDateRange: (startDate: string, endDate: string, country: string = 'SG'): Holiday[] => {
    const stmt = db.prepare('SELECT * FROM holidays WHERE country = ? AND date >= ? AND date <= ? ORDER BY date ASC');
    return stmt.all(country, startDate, endDate) as Holiday[];
  },

  findAll: (country: string = 'SG'): Holiday[] => {
    const stmt = db.prepare('SELECT * FROM holidays WHERE country = ? ORDER BY date ASC');
    return stmt.all(country) as Holiday[];
  },
};

export default db;
