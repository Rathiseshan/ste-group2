import Database from 'better-sqlite3';
import path from 'path';
import { getSingaporeNow, addDays, addMonths, addYears, getNextWeekday, toSingaporeZonedDateTime, getValidDayOfMonth } from './timezone';

// Initialize database
const dbPath = path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Type definitions
export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DailyRecurrenceOptions {
  interval: number; // every N days
}

export interface WeeklyRecurrenceOptions {
  interval: number; // every N weeks
  weekdays: number[]; // 0=Sunday, 1=Monday, etc.
}

export interface MonthlyRecurrenceOptions {
  interval: number; // every N months
  day: number; // day of month (1-31, clamped to valid range)
}

export interface YearlyRecurrenceOptions {
  interval: number; // every N years
  month: number; // 0-11 (January=0)
  day: number; // day of month
  preserveLeap?: boolean; // if true, Feb 29 stays Feb 29 in leap years
}

export type RecurrenceOptions = 
  | DailyRecurrenceOptions 
  | WeeklyRecurrenceOptions 
  | MonthlyRecurrenceOptions 
  | YearlyRecurrenceOptions;

export interface User {
  id: number;
  username: string;
  display_name: string;
  password_hash?: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  transports?: string;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  priority: Priority;
  status: 'active' | 'completed';
  due_at?: string;
  completed_at?: string;
  reminder_minutes?: number;
  last_notification_sent?: string;
  recurrence_pattern?: RecurrencePattern;
  recurrence_options?: string; // JSON string
  parent_todo_id?: number;
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

export interface Holiday {
  id: number;
  date: string;
  name: string;
  country: string;
}

// Database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    due_at TEXT,
    completed_at TEXT,
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
    recurrence_options TEXT,
    parent_todo_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_todo_id) REFERENCES todos(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (todo_id, tag_id),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    reminder_minutes INTEGER,
    recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
    recurrence_options TEXT,
    subtasks_json TEXT,
    due_days_offset INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    country TEXT DEFAULT 'SG'
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_at ON todos(due_at);
  CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
  CREATE INDEX IF NOT EXISTS idx_todos_parent_series ON todos(parent_todo_id);
  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
  CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
  CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
`);

// Helper function to calculate next due date for recurring todos
export function calculateNextDueDate(todo: Todo): Date | null {
  if (!todo.recurrence_pattern || !todo.due_at) {
    return null;
  }

  const currentDue = toSingaporeZonedDateTime(todo.due_at);
  let options: RecurrenceOptions;

  try {
    options = todo.recurrence_options ? JSON.parse(todo.recurrence_options) : {};
  } catch {
    return null;
  }

  switch (todo.recurrence_pattern) {
    case 'daily': {
      const opts = options as DailyRecurrenceOptions;
      const interval = opts.interval || 1;
      return addDays(currentDue, interval);
    }

    case 'weekly': {
      const opts = options as WeeklyRecurrenceOptions;
      const interval = opts.interval || 1;
      const weekdays = opts.weekdays || [currentDue.getDay()];
      
      // Find next weekday in the list
      const currentDay = currentDue.getDay();
      const sortedWeekdays = [...weekdays].sort((a, b) => a - b);
      
      // Find next weekday after current
      let nextWeekday = sortedWeekdays.find(day => day > currentDay);
      
      if (nextWeekday !== undefined) {
        // Next weekday is in the same week
        return getNextWeekday(currentDue, nextWeekday);
      } else {
        // Wrap to first weekday and add interval weeks
        const firstWeekday = sortedWeekdays[0];
        const nextDate = getNextWeekday(currentDue, firstWeekday);
        return addDays(nextDate, (interval - 1) * 7);
      }
    }

    case 'monthly': {
      const opts = options as MonthlyRecurrenceOptions;
      const interval = opts.interval || 1;
      const targetDay = opts.day || currentDue.getDate();
      
      const nextMonth = addMonths(currentDue, interval);
      const validDay = getValidDayOfMonth(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        targetDay
      );
      
      nextMonth.setDate(validDay);
      return toSingaporeZonedDateTime(nextMonth);
    }

    case 'yearly': {
      const opts = options as YearlyRecurrenceOptions;
      const interval = opts.interval || 1;
      const targetMonth = opts.month ?? currentDue.getMonth();
      const targetDay = opts.day || currentDue.getDate();
      
      const nextYear = addYears(currentDue, interval);
      nextYear.setMonth(targetMonth);
      
      // Handle leap year for Feb 29
      if (targetMonth === 1 && targetDay === 29) {
        const isLeapYear = (year: number) => 
          (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        
        if (opts.preserveLeap && !isLeapYear(nextYear.getFullYear())) {
          // Skip to next leap year
          let yearToCheck = nextYear.getFullYear() + 1;
          while (!isLeapYear(yearToCheck)) {
            yearToCheck++;
          }
          nextYear.setFullYear(yearToCheck);
          nextYear.setDate(29);
        } else {
          const validDay = getValidDayOfMonth(
            nextYear.getFullYear(),
            targetMonth,
            targetDay
          );
          nextYear.setDate(validDay);
        }
      } else {
        const validDay = getValidDayOfMonth(
          nextYear.getFullYear(),
          targetMonth,
          targetDay
        );
        nextYear.setDate(validDay);
      }
      
      return toSingaporeZonedDateTime(nextYear);
    }

    default:
      return null;
  }
}

// User CRUD operations
export const userDB = {
  create: (username: string, displayName: string, passwordHash?: string): User => {
    const stmt = db.prepare(
      'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'
    );
    const result = stmt.run(username, displayName, passwordHash || null);
    return userDB.getById(Number(result.lastInsertRowid))!;
  },

  getById: (id: number): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  },

  getByUsername: (username: string): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | undefined;
  },
};

// Authenticator CRUD operations
export const authenticatorDB = {
  create: (
    userId: number,
    credentialId: string,
    publicKey: string,
    counter: number,
    transports?: string
  ): Authenticator => {
    const stmt = db.prepare(
      'INSERT INTO authenticators (user_id, credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(userId, credentialId, publicKey, counter, transports);
    return authenticatorDB.getById(Number(result.lastInsertRowid))!;
  },

  getById: (id: number): Authenticator | undefined => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE id = ?');
    return stmt.get(id) as Authenticator | undefined;
  },

  getByCredentialId: (credentialId: string): Authenticator | undefined => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE credential_id = ?');
    return stmt.get(credentialId) as Authenticator | undefined;
  },

  getByUserId: (userId: number): Authenticator[] => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE user_id = ?');
    return stmt.all(userId) as Authenticator[];
  },

  updateCounter: (id: number, counter: number): void => {
    const stmt = db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?');
    stmt.run(counter, id);
  },
};

// Todo CRUD operations
export const todoDB = {
  create: (
    userId: number,
    title: string,
    options?: {
      description?: string;
      priority?: Priority;
      dueAt?: string;
      reminderMinutes?: number;
      recurrencePattern?: RecurrencePattern;
      recurrenceOptions?: RecurrenceOptions;
      parentTodoId?: number;
    }
  ): Todo => {
    const stmt = db.prepare(`
      INSERT INTO todos (
        user_id, title, description, priority, due_at, 
        reminder_minutes, recurrence_pattern, recurrence_options, parent_todo_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const recurrenceOptionsJson = options?.recurrenceOptions 
      ? JSON.stringify(options.recurrenceOptions) 
      : null;
    
    const result = stmt.run(
      userId,
      title,
      options?.description || null,
      options?.priority || 'medium',
      options?.dueAt || null,
      options?.reminderMinutes || null,
      options?.recurrencePattern || null,
      recurrenceOptionsJson,
      options?.parentTodoId || null
    );
    
    return todoDB.getById(Number(result.lastInsertRowid))!;
  },

  getById: (id: number): Todo | undefined => {
    const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
    return stmt.get(id) as Todo | undefined;
  },

  getByUserId: (userId: number): Todo[] => {
    // Order primarily by due date ascending (nulls last), then by created_at
    const stmt = db.prepare(`
      SELECT * FROM todos
      WHERE user_id = ?
      ORDER BY
        CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
        due_at ASC,
        created_at ASC
    `);
    return stmt.all(userId) as Todo[];
  },

  update: (id: number, updates: Partial<Todo>): Todo => {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.due_at !== undefined) {
      fields.push('due_at = ?');
      values.push(updates.due_at);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.reminder_minutes !== undefined) {
      fields.push('reminder_minutes = ?');
      values.push(updates.reminder_minutes);
    }
    if (updates.last_notification_sent !== undefined) {
      fields.push('last_notification_sent = ?');
      values.push(updates.last_notification_sent);
    }
    if (updates.recurrence_pattern !== undefined) {
      fields.push('recurrence_pattern = ?');
      values.push(updates.recurrence_pattern);
    }
    if (updates.recurrence_options !== undefined) {
      fields.push('recurrence_options = ?');
      values.push(updates.recurrence_options);
    }

    // Always update the updated_at timestamp
    fields.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = db.prepare(`
      UPDATE todos SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return todoDB.getById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
    stmt.run(id);
  },

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
  },
};

// Subtask CRUD operations
export const subtaskDB = {
  create: (todoId: number, title: string, position: number = 0): Subtask => {
    const stmt = db.prepare(`
      INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)
    `);
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

    const stmt = db.prepare(`
      UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return subtaskDB.getById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM subtasks WHERE id = ?');
    stmt.run(id);
  },
};

// Tag CRUD operations
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

// Template CRUD operations
export const templateDB = {
  create: (
    userId: number,
    name: string,
    options: {
      description?: string;
      category?: string;
      priority?: Priority;
      reminderMinutes?: number;
      recurrencePattern?: RecurrencePattern;
      recurrenceOptions?: RecurrenceOptions;
      subtasksJson?: string;
      dueDaysOffset?: number;
    }
  ): Template => {
    const stmt = db.prepare(`
      INSERT INTO templates (
        user_id, name, description, category, priority, 
        reminder_minutes, recurrence_pattern, recurrence_options, 
        subtasks_json, due_days_offset
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const recurrenceOptionsJson = options.recurrenceOptions 
      ? JSON.stringify(options.recurrenceOptions) 
      : null;

    const result = stmt.run(
      userId,
      name,
      options.description || null,
      options.category || null,
      options.priority || 'medium',
      options.reminderMinutes || null,
      options.recurrencePattern || null,
      recurrenceOptionsJson,
      options.subtasksJson || null,
      options.dueDaysOffset || 0
    );

    return templateDB.getById(Number(result.lastInsertRowid))!;
  },

  getById: (id: number): Template | undefined => {
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    return stmt.get(id) as Template | undefined;
  },

  getByUserId: (userId: number): Template[] => {
    const stmt = db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY name');
    return stmt.all(userId) as Template[];
  },

  update: (
    id: number,
    options: {
      name?: string;
      description?: string;
      category?: string;
      priority?: Priority;
      reminderMinutes?: number;
      recurrencePattern?: RecurrencePattern;
      recurrenceOptions?: RecurrenceOptions;
      subtasksJson?: string | null;
      dueDaysOffset?: number;
    }
  ): Template => {
    const fields: string[] = [];
    const values: any[] = [];

    if (options.name !== undefined) {
      fields.push('name = ?');
      values.push(options.name);
    }
    if (options.description !== undefined) {
      fields.push('description = ?');
      values.push(options.description || null);
    }
    if (options.category !== undefined) {
      fields.push('category = ?');
      values.push(options.category || null);
    }
    if (options.priority !== undefined) {
      fields.push('priority = ?');
      values.push(options.priority);
    }
    if (options.reminderMinutes !== undefined) {
      fields.push('reminder_minutes = ?');
      values.push(options.reminderMinutes || null);
    }
    if (options.recurrencePattern !== undefined) {
      fields.push('recurrence_pattern = ?');
      values.push(options.recurrencePattern || null);
    }
    if (options.recurrenceOptions !== undefined) {
      fields.push('recurrence_options = ?');
      values.push(options.recurrenceOptions ? JSON.stringify(options.recurrenceOptions) : null);
    }
    if (options.subtasksJson !== undefined) {
      fields.push('subtasks_json = ?');
      values.push(options.subtasksJson);
    }
    if (options.dueDaysOffset !== undefined) {
      fields.push('due_days_offset = ?');
      values.push(options.dueDaysOffset);
    }

    if (fields.length === 0) {
      // No fields to update, return existing template
      return templateDB.getById(id)!;
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return templateDB.getById(id)!;
  },

  delete: (id: number): void => {
    const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
    stmt.run(id);
  },
};

// Holiday CRUD operations
export const holidayDB = {
  create: (date: string, name: string, country: string = 'SG'): Holiday => {
    const stmt = db.prepare('INSERT INTO holidays (date, name, country) VALUES (?, ?, ?)');
    const result = stmt.run(date, name, country);
    return holidayDB.getById(Number(result.lastInsertRowid))!;
  },

  getById: (id: number): Holiday | undefined => {
    const stmt = db.prepare('SELECT * FROM holidays WHERE id = ?');
    return stmt.get(id) as Holiday | undefined;
  },

  getByDateRange: (startDate: string, endDate: string): Holiday[] => {
    const stmt = db.prepare('SELECT * FROM holidays WHERE date >= ? AND date <= ? ORDER BY date');
    return stmt.all(startDate, endDate) as Holiday[];
  },

  getAll: (): Holiday[] => {
    const stmt = db.prepare('SELECT * FROM holidays ORDER BY date');
    return stmt.all() as Holiday[];
  },
};

export default db;
