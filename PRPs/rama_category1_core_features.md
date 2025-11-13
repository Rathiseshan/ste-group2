# Category 1: Core Features - Product Requirement Prompt

## Overview

This PRP consolidates three foundational features that form the backbone of the Todo App:
1. **Todo CRUD Operations** - Create, read, update, delete todos with validation
2. **Priority System** - Three-level priority with color-coded badges and sorting
3. **Recurring Todos** - Automatic next instance creation with pattern-based date calculations

These features work together to provide the essential todo management experience with Singapore timezone handling throughout.

---

## Feature 1: Todo CRUD Operations

### Feature Overview
Implement the foundational todo management experience covering creation, reading, updating, and deletion with robust validation, Singapore timezone handling, and optimistic UI updates.

### User Stories
- **As a signed-in user**, I can create a todo with a title, description, due date, and optional reminder so I can track upcoming tasks.
- **As a busy professional**, I can edit existing todos to adjust details when priorities change.
- **As an organized person**, I can mark todos complete or delete them to keep my list tidy.
- **As a user on multiple devices**, I can rely on consistent data and timezone handling across sessions.

### Technical Requirements

#### Database Schema (`todos` table)
```sql
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  parent_todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### API Endpoints

**GET /api/todos**
- Returns authenticated user's todos sorted by `due_at` ascending, then `created_at`
- Response: `{ todos: Todo[] }` with tags and subtasks attached

**GET /api/todos/[id]**
- Fetches single todo by id with tags and subtasks
- Returns 404 if not found, 403 if not owned by user

**POST /api/todos**
- Body: `{ title, description?, dueAt?, reminderMinutes?, priority?, recurrencePattern?, recurrenceOptions?, tagIds? }`
- Validation:
  - Title required, 3-120 chars, trimmed
  - Description max 1000 chars
  - dueAt must be ≥ now + 1 minute (Singapore time)
  - reminderMinutes: null or {15, 30, 60, 120, 1440}
  - Recurring requires due date
  - Prevent duplicate title + due date (same day) for same user
  - Reject unknown fields
- Response: `{ todo: Todo }` with tags and subtasks

**PUT /api/todos/[id]**
- Update any todo fields
- Validation same as POST
- Response: `{ todo: Todo }`

**PATCH /api/todos/[id]/complete**
- Toggle completion status (idempotent)
- Sets `completed_at` timestamp
- If recurring: creates next instance via `calculateNextDueDate()`
- Response: `{ todo: Todo, nextTodo?: Todo }`

**DELETE /api/todos/[id]**
- Hard delete with cascade to subtasks/tags
- Response: `{ success: true }`

#### Validation Rules
```typescript
// Title
if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
  return { error: 'Title is required (3-120 chars)' };
}

// Description
if (description && description.length > 1000) {
  return { error: 'Description must be <= 1000 characters' };
}

// Due date
import { parseSingaporeDate, getSingaporeNow } from '@/lib/timezone';
const dueDateParsed = parseSingaporeDate(dueAt);
if (!dueDateParsed) return { error: 'Invalid dueAt' };
const now = getSingaporeNow();
const minAllowed = new Date(now.getTime() + 60 * 1000); // +1 minute
if (dueDateParsed <= minAllowed) {
  return { error: 'Due date must be at least 1 minute in the future' };
}

// Prevent duplicates
const dup = db.prepare('SELECT COUNT(1) as c FROM todos WHERE user_id = ? AND title = ? AND date(due_at) = date(?)').get(userId, title.trim(), dueAt);
if (dup && dup.c > 0) {
  return { error: 'A todo with the same title and due date already exists' };
}

// Unknown fields
const allowed = new Set(['title','description','priority','dueAt','reminderMinutes','recurrencePattern','recurrenceOptions','tagIds']);
for (const key of Object.keys(body || {})) {
  if (!allowed.has(key)) {
    return { error: `Unknown field: ${key}` };
  }
}
```

### UI Components

**TodoForm** - Create/Edit Form
```tsx
const [formTitle, setFormTitle] = useState('');
const [formDescription, setFormDescription] = useState('');
const [formPriority, setFormPriority] = useState<Priority>('medium');
const [formDueAt, setFormDueAt] = useState('');
const [formReminderMinutes, setFormReminderMinutes] = useState<number | null>(null);

<form onSubmit={handleCreateTodo}>
  <input 
    type="text" 
    value={formTitle} 
    onChange={(e) => setFormTitle(e.target.value)}
    placeholder="Todo title"
    required
    minLength={3}
    maxLength={120}
  />
  <textarea 
    value={formDescription}
    onChange={(e) => setFormDescription(e.target.value)}
    maxLength={1000}
  />
  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as Priority)}>
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
  </select>
  <input 
    type="datetime-local" 
    value={formDueAt}
    onChange={(e) => setFormDueAt(e.target.value)}
  />
  <button type="submit">Create Todo</button>
</form>
```

**TodoList** - Display with Sections
```tsx
const activeTodos = todos.filter(t => t.status === 'active');
const completedTodos = todos.filter(t => t.status === 'completed');

<section>
  <h2>Active Todos</h2>
  {activeTodos.map(todo => (
    <TodoItem key={todo.id} todo={todo} onToggle={handleToggleComplete} onDelete={handleDelete} />
  ))}
</section>

<section>
  <h2>Completed Todos</h2>
  {completedTodos.map(todo => (
    <TodoItem key={todo.id} todo={todo} />
  ))}
</section>
```

### Acceptance Criteria
- ✅ Can create todo with title only (minimal payload)
- ✅ Can create todo with all metadata (priority, reminder, recurrence)
- ✅ Editing any field updates DB and UI without page refresh
- ✅ Completion toggle works across refreshes
- ✅ Deletion removes todo and subtasks via cascade
- ✅ All date/times use Singapore timezone utilities
- ✅ API returns 400 with descriptive messages for validation failures
- ✅ Todos sorted by due_at ascending (nulls last), then created_at

---

## Feature 2: Priority System

### Feature Overview
Three-level priority system (High/Medium/Low) with color-coded badges, automatic sorting, and filtering capabilities.

### User Stories
- **As a user**, I can assign priority levels to todos so urgent tasks stand out.
- **As a visual person**, I can quickly identify priority by color (red/yellow/blue).
- **As someone with many tasks**, I need high-priority todos automatically sorted to the top.

### Technical Requirements

#### Database
Already included in todos table:
```sql
priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low'))
```

#### Types
```typescript
export type Priority = 'high' | 'medium' | 'low';
```

#### Priority Badge Component
```tsx
const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};

<span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(todo.priority)}`}>
  {todo.priority.toUpperCase()}
</span>
```

#### Sorting Logic
```typescript
// In todoDB.getByUserId():
ORDER BY
  CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,  // nulls last
  due_at ASC,
  created_at ASC
```

### Acceptance Criteria
- ✅ Three priority levels work (high/medium/low)
- ✅ Color-coded badges visible on todos
- ✅ Default priority is 'medium'
- ✅ Priority dropdown in create/edit forms
- ✅ Priority metadata persists across sessions

---

## Feature 3: Recurring Todos

### Feature Overview
Automatically create next instances of todos based on daily, weekly, monthly, or yearly patterns with precise date calculations and metadata inheritance.

### User Stories
- **As someone with regular tasks**, I can set todos to recur so I don't manually recreate them.
- **As a user**, I want recurring todos to appear automatically after I complete one.
- **As a detail-oriented person**, I need recurring patterns to handle edge cases like month-end and leap years.

### Technical Requirements

#### Database Fields
Already in todos table:
```sql
recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
recurrence_options TEXT,  -- JSON string
parent_todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL
```

#### Types
```typescript
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
```

#### Core Logic: Calculate Next Due Date
```typescript
export function calculateNextDueDate(todo: Todo): Date | null {
  if (!todo.recurrence_pattern || !todo.due_at) return null;

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
      
      const currentDay = currentDue.getDay();
      const sortedWeekdays = [...weekdays].sort((a, b) => a - b);
      
      let nextWeekday = sortedWeekdays.find(day => day > currentDay);
      
      if (nextWeekday !== undefined) {
        return getNextWeekday(currentDue, nextWeekday);
      } else {
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
          let yearToCheck = nextYear.getFullYear() + 1;
          while (!isLeapYear(yearToCheck)) {
            yearToCheck++;
          }
          nextYear.setFullYear(yearToCheck);
          nextYear.setDate(29);
        } else {
          const validDay = getValidDayOfMonth(nextYear.getFullYear(), targetMonth, targetDay);
          nextYear.setDate(validDay);
        }
      } else {
        const validDay = getValidDayOfMonth(nextYear.getFullYear(), targetMonth, targetDay);
        nextYear.setDate(validDay);
      }
      
      return toSingaporeZonedDateTime(nextYear);
    }

    default:
      return null;
  }
}
```

#### Completion Handler (creates next instance)
```typescript
// In PATCH /api/todos/[id]/complete or PUT with completed=true
if (todo.recurrence_pattern && todo.due_at) {
  const nextDueDate = calculateNextDueDate(todo);
  
  if (nextDueDate) {
    nextTodo = todoDB.create(userId, todo.title, {
      description: todo.description || undefined,
      priority: todo.priority,
      dueAt: nextDueDate.toISOString(),
      reminderMinutes: todo.reminder_minutes || undefined,
      recurrencePattern: todo.recurrence_pattern,
      recurrenceOptions: todo.recurrence_options ? JSON.parse(todo.recurrence_options) : undefined,
      parentTodoId: todo.parent_todo_id || todo.id,
    });

    // Copy tags
    const currentTags = tagDB.getTagsForTodo(todo.id);
    for (const tag of currentTags) {
      tagDB.addTagToTodo(nextTodo.id, tag.id);
    }
  }
}
```

#### UI: Recurrence Form
```tsx
const [formIsRecurring, setFormIsRecurring] = useState(false);
const [formRecurrencePattern, setFormRecurrencePattern] = useState<RecurrencePattern>('daily');
const [formRecurrenceInterval, setFormRecurrenceInterval] = useState(1);
const [formRecurrenceWeekdays, setFormRecurrenceWeekdays] = useState<number[]>([1]);
const [formRecurrenceDay, setFormRecurrenceDay] = useState(1);
const [formRecurrenceMonth, setFormRecurrenceMonth] = useState(0);

<label>
  <input 
    type="checkbox" 
    checked={formIsRecurring}
    onChange={(e) => setFormIsRecurring(e.target.checked)}
  />
  Recurring
</label>

{formIsRecurring && (
  <div>
    <select value={formRecurrencePattern} onChange={(e) => setFormRecurrencePattern(e.target.value as RecurrencePattern)}>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </select>
    
    <input 
      type="number" 
      min="1" 
      value={formRecurrenceInterval}
      onChange={(e) => setFormRecurrenceInterval(parseInt(e.target.value) || 1)}
      placeholder="Repeat every"
    />
    
    {formRecurrencePattern === 'weekly' && (
      <div>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <label key={day}>
            <input
              type="checkbox"
              checked={formRecurrenceWeekdays.includes(index)}
              onChange={(e) => {
                if (e.target.checked) {
                  setFormRecurrenceWeekdays([...formRecurrenceWeekdays, index]);
                } else {
                  setFormRecurrenceWeekdays(formRecurrenceWeekdays.filter(d => d !== index));
                }
              }}
            />
            {day}
          </label>
        ))}
      </div>
    )}
    
    {(formRecurrencePattern === 'monthly' || formRecurrencePattern === 'yearly') && (
      <input 
        type="number" 
        min="1" 
        max="31"
        value={formRecurrenceDay}
        onChange={(e) => setFormRecurrenceDay(parseInt(e.target.value) || 1)}
        placeholder="Day of month"
      />
    )}
    
    {formRecurrencePattern === 'yearly' && (
      <select value={formRecurrenceMonth} onChange={(e) => setFormRecurrenceMonth(parseInt(e.target.value))}>
        {['January', 'February', 'March', 'April', 'May', 'June', 
          'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
          <option key={month} value={index}>{month}</option>
        ))}
      </select>
    )}
  </div>
)}
```

#### UI: Recurrence Badge Display
```tsx
const getRecurrenceSummary = (todo: TodoWithRelations) => {
  if (!todo.recurrence_pattern) return null;

  const options = todo.recurrence_options ? JSON.parse(todo.recurrence_options) : {};
  const interval = options.interval || 1;

  switch (todo.recurrence_pattern) {
    case 'daily':
      return `Every ${interval === 1 ? '' : interval + ' '}day${interval > 1 ? 's' : ''}`;
    case 'weekly': {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekdays = (options.weekdays || [1]).map((d: number) => days[d]).join(', ');
      return `Every ${interval === 1 ? '' : interval + ' '}week${interval > 1 ? 's' : ''} on ${weekdays}`;
    }
    case 'monthly':
      return `Every ${interval === 1 ? '' : interval + ' '}month${interval > 1 ? 's' : ''} on day ${options.day || 1}`;
    case 'yearly': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `Every ${interval === 1 ? '' : interval + ' '}year${interval > 1 ? 's' : ''} on ${months[options.month || 0]} ${options.day || 1}`;
    }
  }
};

{todo.recurrence_pattern && (
  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 border border-purple-300">
    🔄 {getRecurrenceSummary(todo)}
  </span>
)}
```

### Validation
```typescript
// Recurring todos require due date
if (recurrencePattern && !dueAt) {
  return { error: 'Recurring todos must have a due date' };
}
```

### Acceptance Criteria
- ✅ All four recurrence patterns work (daily/weekly/monthly/yearly)
- ✅ Next instance created automatically on completion
- ✅ Next instance inherits: priority, tags, reminder offset, recurrence pattern
- ✅ Date calculations accurate in Singapore timezone
- ✅ Handles edge cases: month-end (Jan 31 → Feb 28/29), leap years
- ✅ Can disable recurring on existing todo
- ✅ Recurrence badge displays human-readable summary

---

## Edge Cases & Error Handling

### Todo CRUD
- Creating with past due date → 400 error
- Rapid double submission → disable button during request
- Network failure during create → show error, don't add to list
- Deleting todo with subtasks → cascade works via DB schema
- Completing already-completed todo → idempotent (no error)

### Priority System
- Invalid priority value → validation rejects
- Missing priority → defaults to 'medium'

### Recurring Todos
- Monthly on day 31 in February → clamps to 28/29
- Yearly Feb 29 in non-leap year → clamps to Feb 28 (unless preserveLeap=true)
- Weekly with no weekdays selected → uses current day of week
- Daily with interval 0 → defaults to 1
- Completing recurring todo without due date → no next instance created
- JSON parse error in recurrence_options → returns null (no next instance)

---

## Testing Requirements

### Unit Tests
- `calculateNextDueDate()` for all patterns
- Date edge cases (month-end, leap year)
- Validation functions
- `todoDB.create/update/delete/getByUserId`

### E2E Tests (Playwright)
```typescript
test('create todo with title only', async ({ page }) => {
  await page.fill('[data-testid="todo-title"]', 'Test Todo');
  await page.click('[data-testid="create-todo"]');
  await expect(page.locator('text=Test Todo')).toBeVisible();
});

test('create todo with all metadata', async ({ page }) => {
  await page.fill('[data-testid="todo-title"]', 'Important Task');
  await page.fill('[data-testid="todo-description"]', 'Details here');
  await page.selectOption('[data-testid="priority"]', 'high');
  await page.fill('[data-testid="due-date"]', '2025-12-31T10:00');
  await page.check('[data-testid="recurring"]');
  await page.selectOption('[data-testid="recurrence-pattern"]', 'weekly');
  await page.click('[data-testid="create-todo"]');
  
  await page.reload();
  await expect(page.locator('text=Important Task')).toBeVisible();
  await expect(page.locator('text=HIGH')).toBeVisible();
  await expect(page.locator('text=🔄')).toBeVisible();
});

test('complete recurring todo creates next instance', async ({ page }) => {
  // Create recurring todo
  await page.fill('[data-testid="todo-title"]', 'Daily Task');
  await page.fill('[data-testid="due-date"]', '2025-11-15T10:00');
  await page.check('[data-testid="recurring"]');
  await page.selectOption('[data-testid="recurrence-pattern"]', 'daily');
  await page.click('[data-testid="create-todo"]');
  
  // Complete it
  await page.click('[data-testid="todo-checkbox-1"]');
  
  // Verify next instance created
  await expect(page.locator('text=Daily Task').nth(1)).toBeVisible();
  // Due date should be Nov 16
});

test('validation: past due date rejected', async ({ page }) => {
  await page.fill('[data-testid="todo-title"]', 'Past Todo');
  await page.fill('[data-testid="due-date"]', '2020-01-01T10:00');
  await page.click('[data-testid="create-todo"]');
  await expect(page.locator('text=must be at least 1 minute in the future')).toBeVisible();
});
```

---

## Success Metrics

- ✅ CRUD operations complete in <300ms median
- ✅ Zero validation-related 4xx errors after launch week
- ✅ 95% of users complete create/edit/delete without errors
- ✅ Recurring todos calculate next date accurately 100% of the time
- ✅ Build succeeds with no TypeScript errors

---

## Implementation Checklist

### Database & Types (lib/db.ts)
- [ ] `todos` table with all fields
- [ ] Type definitions for Priority, RecurrencePattern, RecurrenceOptions
- [ ] `todoDB.create/getById/getByUserId/update/delete`
- [ ] `calculateNextDueDate()` function
- [ ] Indexes on user_id, due_at, status

### Timezone Utilities (lib/timezone.ts)
- [ ] `parseSingaporeDate()`
- [ ] `getSingaporeNow()`
- [ ] `toSingaporeZonedDateTime()`
- [ ] `addDays/addMonths/addYears()`
- [ ] `getNextWeekday()`
- [ ] `getValidDayOfMonth()`

### API Routes
- [ ] GET /api/todos
- [ ] GET /api/todos/[id]
- [ ] POST /api/todos (with full validation)
- [ ] PUT /api/todos/[id]
- [ ] PATCH /api/todos/[id]/complete
- [ ] DELETE /api/todos/[id]

### UI Components (app/page.tsx)
- [ ] TodoForm with all fields
- [ ] Recurrence editor (pattern, interval, weekdays, etc.)
- [ ] Priority dropdown
- [ ] TodoList with Active/Completed sections
- [ ] TodoItem with checkbox and delete button
- [ ] Priority badge with colors
- [ ] Recurrence badge with summary
- [ ] handleCreateTodo with API call
- [ ] handleToggleComplete with nextTodo handling
- [ ] handleDeleteTodo with confirmation

### Testing
- [ ] Unit tests for calculateNextDueDate
- [ ] E2E test: create minimal todo
- [ ] E2E test: create full-featured todo
- [ ] E2E test: edit todo
- [ ] E2E test: complete todo
- [ ] E2E test: delete todo
- [ ] E2E test: recurring creates next instance
- [ ] E2E test: validation errors

---

**Category Completion Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Last Updated**: November 12, 2025
