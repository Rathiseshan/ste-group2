# Category 3: Productivity Features - Product Requirement Prompt

## Overview

This PRP consolidates three productivity-enhancing features:
1. **Search & Filtering** - Real-time search with multi-criteria filtering
2. **Export & Import** - JSON-based backup and restore with data validation
3. **Calendar View** - Monthly calendar with todos and Singapore public holidays

These features improve user efficiency, data portability, and task visualization.

---

## Feature 8: Search & Filtering

### Feature Overview
Real-time text search across todo titles and tag names, with multi-criteria filtering by priority, tags, and status, optimized for client-side performance.

### User Stories
- **As a user with many todos**, I need to quickly find specific tasks by searching.
- **As an organized person**, I want to filter by priority and tags to focus on relevant work.
- **As someone managing multiple projects**, I need combined filters to drill down precisely.

### Technical Requirements

#### UI Components

**Search & Filter Bar**
```tsx
const [searchQuery, setSearchQuery] = useState('');
const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
const [tagFilter, setTagFilter] = useState<number | null>(null);
const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

// Debounced search
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 300);

  return () => clearTimeout(timer);
}, [searchQuery]);

<div className="mb-4 space-y-2">
  {/* Search Input */}
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search todos..."
    className="w-full border rounded px-3 py-2"
  />

  {/* Filters */}
  <div className="flex gap-2 flex-wrap">
    {/* Priority Filter */}
    <select 
      value={priorityFilter} 
      onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
      className="border rounded px-3 py-1"
    >
      <option value="all">All Priorities</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>

    {/* Tag Filter */}
    <select 
      value={tagFilter || ''} 
      onChange={(e) => setTagFilter(e.target.value ? Number(e.target.value) : null)}
      className="border rounded px-3 py-1"
    >
      <option value="">All Tags</option>
      {tags.map(tag => (
        <option key={tag.id} value={tag.id}>{tag.name}</option>
      ))}
    </select>

    {/* Status Filter */}
    <select 
      value={statusFilter} 
      onChange={(e) => setStatusFilter(e.target.value as any)}
      className="border rounded px-3 py-1"
    >
      <option value="all">All Statuses</option>
      <option value="active">Active</option>
      <option value="completed">Completed</option>
    </select>

    {/* Clear Filters */}
    {(searchQuery || priorityFilter !== 'all' || tagFilter || statusFilter !== 'all') && (
      <button 
        onClick={() => {
          setSearchQuery('');
          setPriorityFilter('all');
          setTagFilter(null);
          setStatusFilter('all');
        }}
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
      >
        Clear Filters
      </button>
    )}
  </div>

  {/* Active Filters Indicator */}
  {(debouncedSearch || priorityFilter !== 'all' || tagFilter || statusFilter !== 'all') && (
    <div className="text-sm text-gray-600">
      Showing filtered results
      {debouncedSearch && ` matching "${debouncedSearch}"`}
      {priorityFilter !== 'all' && ` with priority: ${priorityFilter}`}
      {tagFilter && ` with tag: ${tags.find(t => t.id === tagFilter)?.name}`}
      {statusFilter !== 'all' && ` status: ${statusFilter}`}
    </div>
  )}
</div>
```

#### Filter Logic
```typescript
const filteredTodos = useMemo(() => {
  return todos.filter(todo => {
    // Text search (case-insensitive, searches title and tag names)
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      const titleMatch = todo.title.toLowerCase().includes(query);
      const tagMatch = todo.tags.some(tag => tag.name.toLowerCase().includes(query));
      const descriptionMatch = todo.description?.toLowerCase().includes(query);
      
      if (!titleMatch && !tagMatch && !descriptionMatch) {
        return false;
      }
    }

    // Priority filter
    if (priorityFilter !== 'all' && todo.priority !== priorityFilter) {
      return false;
    }

    // Tag filter
    if (tagFilter && !todo.tags.some(tag => tag.id === tagFilter)) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && todo.status !== statusFilter) {
      return false;
    }

    return true;
  });
}, [todos, debouncedSearch, priorityFilter, tagFilter, statusFilter]);

// Display filtered results
const activeFiltered = filteredTodos.filter(t => t.status === 'active');
const completedFiltered = filteredTodos.filter(t => t.status === 'completed');
```

#### Click Tag to Filter
```tsx
const handleFilterByTag = (tagId: number) => {
  setTagFilter(tagId);
  // Optional: scroll to filter bar
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// In tag badge rendering
<span
  className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80"
  style={{ backgroundColor: tag.color + '20', color: tag.color }}
  onClick={() => handleFilterByTag(tag.id)}
  title="Click to filter by this tag"
>
  {tag.name}
</span>
```

#### Empty State
```tsx
{filteredTodos.length === 0 && (
  <div className="text-center py-8 text-gray-500">
    <p className="text-lg">No todos found</p>
    {(searchQuery || priorityFilter !== 'all' || tagFilter) && (
      <button 
        onClick={() => {
          setSearchQuery('');
          setPriorityFilter('all');
          setTagFilter(null);
        }}
        className="mt-2 text-blue-600 hover:underline"
      >
        Clear filters to see all todos
      </button>
    )}
  </div>
)}
```

### Performance Optimization
```typescript
// Use useMemo to prevent unnecessary recalculations
const filteredTodos = useMemo(() => {
  // ... filtering logic
}, [todos, debouncedSearch, priorityFilter, tagFilter, statusFilter]);

// Debounce search input
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 300); // 300ms delay

  return () => clearTimeout(timer);
}, [searchQuery]);
```

### Acceptance Criteria
- ✅ Search is case-insensitive
- ✅ Search matches todo titles, descriptions, and tag names
- ✅ Filters combine with AND logic
- ✅ Real-time updates (debounced 300ms)
- ✅ Clear message for empty results
- ✅ Clear filters button visible when filters active
- ✅ Click tag badge to filter
- ✅ Filter performance < 100ms for 1000 todos

---

## Feature 9: Export & Import

### Feature Overview
JSON-based backup and restore functionality with ID remapping, relationship preservation, and comprehensive data validation.

### User Stories
- **As a cautious user**, I want to export my todos as a backup before major changes.
- **As someone switching devices**, I need to export and import all my data seamlessly.
- **As a developer**, I want JSON export for debugging and data migration.

### Technical Requirements

#### JSON Format
```typescript
interface ExportData {
  version: string;  // e.g., "1.0"
  exportedAt: string;  // ISO timestamp
  todos: Array<{
    title: string;
    description?: string;
    priority: Priority;
    status: 'active' | 'completed';
    due_at?: string;
    completed_at?: string;
    reminder_minutes?: number;
    recurrence_pattern?: RecurrencePattern;
    recurrence_options?: string;
    tags: string[];  // tag names
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
```

#### API Endpoints

**GET /api/todos/export**
```typescript
export async function GET(request: NextRequest) {
  const testUser = getTestUser();
  
  const todos = todoDB.getByUserId(testUser.id);
  const tags = tagDB.getByUserId(testUser.id);

  const exportData: ExportData = {
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
}
```

**POST /api/todos/import**
```typescript
export async function POST(request: NextRequest) {
  const testUser = getTestUser();
  
  let data: ExportData;
  try {
    data = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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
  for (const todoData of data.todos) {
    // Validate required fields
    if (!todoData.title || typeof todoData.title !== 'string') {
      continue; // Skip invalid todos
    }

    // Create todo
    const todo = todoDB.create(testUser.id, todoData.title, {
      description: todoData.description,
      priority: todoData.priority || 'medium',
      dueAt: todoData.due_at,
      reminderMinutes: todoData.reminder_minutes,
      recurrencePattern: todoData.recurrence_pattern,
      recurrenceOptions: todoData.recurrence_options ? JSON.parse(todoData.recurrence_options) : undefined,
    });

    // Set completed status if needed
    if (todoData.status === 'completed' && todoData.completed_at) {
      todoDB.update(todo.id, { 
        status: 'completed', 
        completed_at: todoData.completed_at 
      });
    }

    // Add tags
    if (todoData.tags) {
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
        const subtask = subtaskDB.create(todo.id, subtaskData.title, subtaskData.position || 0);
        if (subtaskData.completed) {
          subtaskDB.update(subtask.id, { completed: true });
        }
      }
    }

    importedCount++;
  }

  return NextResponse.json({ 
    success: true, 
    imported: importedCount,
    message: `Successfully imported ${importedCount} todo(s)`
  });
}
```

#### UI Components

**Export Button**
```tsx
const handleExport = async () => {
  try {
    const response = await fetch('/api/todos/export');
    const data = await response.json();

    // Create downloadable file
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Export successful!');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
  }
};

<button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded">
  Export Todos
</button>
```

**Import Button with File Picker**
```tsx
const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const response = await fetch('/api/todos/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      alert(result.message);
      // Refresh todos
      fetchTodos();
    } else {
      const error = await response.json();
      alert(`Import failed: ${error.error}`);
    }
  } catch (error) {
    console.error('Import failed:', error);
    alert('Invalid file format. Please select a valid export file.');
  }

  // Reset file input
  event.target.value = '';
};

<input
  type="file"
  accept=".json"
  onChange={handleImport}
  className="hidden"
  id="import-file"
/>
<label htmlFor="import-file" className="bg-purple-600 text-white px-4 py-2 rounded cursor-pointer">
  Import Todos
</label>
```

### Validation & Error Handling

```typescript
// Validation in import handler
const errors: string[] = [];

for (const todoData of data.todos) {
  // Required fields
  if (!todoData.title) {
    errors.push(`Todo missing title, skipped`);
    continue;
  }

  // Type validation
  if (todoData.priority && !['high', 'medium', 'low'].includes(todoData.priority)) {
    errors.push(`Invalid priority for "${todoData.title}", defaulting to medium`);
    todoData.priority = 'medium';
  }

  // Date validation
  if (todoData.due_at) {
    try {
      new Date(todoData.due_at);
    } catch {
      errors.push(`Invalid due date for "${todoData.title}", skipped due date`);
      todoData.due_at = undefined;
    }
  }
}

if (errors.length > 0) {
  console.warn('Import warnings:', errors);
}
```

### Acceptance Criteria
- ✅ Export creates valid JSON
- ✅ Import validates format
- ✅ All relationships preserved (tags, subtasks)
- ✅ No duplicate tags created (reuses by name)
- ✅ Error messages clear and specific
- ✅ Exported file named with date
- ✅ Import appends (doesn't replace existing)
- ✅ Invalid todos skipped with warning

---

## Feature 10: Calendar View

### Feature Overview
Monthly calendar visualization displaying todos by due date with Singapore public holidays, month navigation, and day-detail modal.

### User Stories
- **As a visual planner**, I want to see my todos on a calendar to understand my schedule at a glance.
- **As someone planning ahead**, I need to see Singapore public holidays to avoid scheduling tasks on holidays.
- **As a user**, I want to navigate months and click days to see detailed todo lists.

### Technical Requirements

#### Database Schema
```sql
CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,  -- YYYY-MM-DD format
  name TEXT NOT NULL,
  country TEXT DEFAULT 'SG'
);
```

#### Seed Singapore Holidays

Create `scripts/seed-holidays.ts`:
```typescript
import db, { holidayDB } from '../lib/db';

const singaporeHolidays2025 = [
  { date: '2025-01-01', name: 'New Year\'s Day' },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-06', name: 'Hari Raya Puasa' },
  { date: '2025-08-09', name: 'National Day' },
  { date: '2025-08-13', name: 'Hari Raya Haji' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' },
];

for (const holiday of singaporeHolidays2025) {
  try {
    holidayDB.create(holiday.date, holiday.name, 'SG');
  } catch (error) {
    console.log(`Holiday ${holiday.date} already exists, skipping`);
  }
}

console.log('Singapore holidays seeded successfully!');
```

Run: `npx tsx scripts/seed-holidays.ts`

#### API Endpoint

**GET /api/holidays**
```typescript
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get('start');
  const endDate = url.searchParams.get('end');

  let holidays;
  if (startDate && endDate) {
    holidays = holidayDB.getByDateRange(startDate, endDate);
  } else {
    holidays = holidayDB.getAll();
  }

  return NextResponse.json({ holidays });
}
```

#### Calendar Page

Create `app/calendar/page.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { getSingaporeNow } from '@/lib/timezone';

interface Holiday {
  id: number;
  date: string;
  name: string;
  country: string;
}

interface TodoWithRelations {
  id: number;
  title: string;
  priority: string;
  due_at?: string;
  status: string;
  tags: any[];
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(getSingaporeNow());
  const [todos, setTodos] = useState<TodoWithRelations[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    fetchTodos();
    fetchHolidays();
  }, []);

  const fetchTodos = async () => {
    const response = await fetch('/api/todos');
    const data = await response.json();
    setTodos(data.todos);
  };

  const fetchHolidays = async () => {
    const response = await fetch('/api/holidays');
    const data = await response.json();
    setHolidays(data.holidays);
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday
    
    const weeks: Date[][] = [];
    let week: Date[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      week.push(new Date(d));
      
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    return weeks;
  };

  const getTodosForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return todos.filter(todo => 
      todo.due_at && todo.due_at.startsWith(dateStr)
    );
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.find(h => h.date === dateStr);
  };

  const isToday = (date: Date) => {
    const now = getSingaporeNow();
    return date.toDateString() === now.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const weeks = generateCalendar();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <a href="/" className="text-blue-600 hover:underline">
            Back to Todos
          </a>
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => {
              const prev = new Date(currentMonth);
              prev.setMonth(prev.getMonth() - 1);
              setCurrentMonth(prev);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            ← Previous
          </button>

          <h2 className="text-2xl font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>

          <button 
            onClick={() => {
              const next = new Date(currentMonth);
              next.setMonth(next.getMonth() + 1);
              setCurrentMonth(next);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Next →
          </button>
        </div>

        <button 
          onClick={() => setCurrentMonth(getSingaporeNow())}
          className="mb-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Today
        </button>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-semibold border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-t">
              {week.map((date, dayIdx) => {
                const dayTodos = getTodosForDate(date);
                const holiday = getHolidayForDate(date);

                return (
                  <div
                    key={dayIdx}
                    className={`
                      min-h-[120px] p-2 border-r last:border-r-0 cursor-pointer hover:bg-gray-50
                      ${!isCurrentMonth(date) ? 'bg-gray-50 text-gray-400' : ''}
                      ${isToday(date) ? 'bg-blue-50 border-2 border-blue-500' : ''}
                      ${isWeekend(date) ? 'bg-red-50' : ''}
                    `}
                    onClick={() => setSelectedDay(date)}
                  >
                    <div className="font-semibold mb-1">{date.getDate()}</div>

                    {holiday && (
                      <div className="text-xs bg-red-200 text-red-800 px-1 py-0.5 rounded mb-1">
                        {holiday.name}
                      </div>
                    )}

                    {dayTodos.length > 0 && (
                      <div className="space-y-1">
                        {dayTodos.slice(0, 2).map(todo => (
                          <div 
                            key={todo.id}
                            className={`
                              text-xs p-1 rounded truncate
                              ${todo.priority === 'high' ? 'bg-red-100' : ''}
                              ${todo.priority === 'medium' ? 'bg-yellow-100' : ''}
                              ${todo.priority === 'low' ? 'bg-blue-100' : ''}
                            `}
                          >
                            {todo.title}
                          </div>
                        ))}
                        {dayTodos.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayTodos.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Day Detail Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">
                {selectedDay.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>

              {getHolidayForDate(selectedDay) && (
                <div className="mb-4 p-2 bg-red-100 rounded">
                  🎉 {getHolidayForDate(selectedDay)!.name}
                </div>
              )}

              <div className="space-y-2 mb-4">
                {getTodosForDate(selectedDay).map(todo => (
                  <div key={todo.id} className="border p-2 rounded">
                    <div className="font-semibold">{todo.title}</div>
                    <div className="text-sm text-gray-600">
                      Priority: {todo.priority} | Status: {todo.status}
                    </div>
                  </div>
                ))}

                {getTodosForDate(selectedDay).length === 0 && (
                  <p className="text-gray-500">No todos for this day</p>
                )}
              </div>

              <button 
                onClick={() => setSelectedDay(null)}
                className="w-full bg-gray-200 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### URL State Management (Optional Enhancement)
```tsx
// Store current month in URL query params
const router = useRouter();
const searchParams = useSearchParams();

useEffect(() => {
  const monthParam = searchParams.get('month');
  if (monthParam) {
    const [year, month] = monthParam.split('-').map(Number);
    setCurrentMonth(new Date(year, month - 1, 1));
  }
}, [searchParams]);

const navigateToMonth = (date: Date) => {
  const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  router.push(`/calendar?month=${monthStr}`);
  setCurrentMonth(date);
};
```

### Acceptance Criteria
- ✅ Calendar displays current month correctly
- ✅ Holidays shown on correct dates
- ✅ Todos appear on due dates
- ✅ Navigate prev/next/today buttons work
- ✅ Click day opens modal with todos
- ✅ Weekend styling different from weekdays
- ✅ Current day highlighted
- ✅ Days outside current month grayed out
- ✅ Todo count badge on days with >2 todos

---

## Edge Cases & Error Handling

### Search & Filtering
- Empty search + no filters → show all todos
- Search with no results → clear empty state message
- Filter by deleted tag → filter clears automatically
- Multiple rapid filter changes → debounced, no performance issues

### Export & Import
- Export empty todo list → valid JSON with empty arrays
- Import file with missing fields → skip invalid, import valid
- Import duplicate tag names → reuse existing tags
- Import with future due dates → accepted
- Import with past due dates → accepted (historical data)
- Import malformed JSON → clear error message
- Import non-JSON file → validation error

### Calendar View
- Month with no todos → empty calendar, no errors
- Month with no holidays → calendar works normally
- Navigate to far future/past → generates correctly
- Todo spans multiple days → shows only on due date
- Click empty day → shows "no todos" message
- Timezone edge cases → all dates in Singapore time

---

## Testing Requirements

### Unit Tests
- Filter logic with various combinations
- Date range calculation for calendar
- Export data serialization
- Import ID remapping logic

### E2E Tests
```typescript
test('search filters todos by title', async ({ page }) => {
  await page.fill('[data-testid="search-input"]', 'important');
  await expect(page.locator('text=Important Task')).toBeVisible();
  await expect(page.locator('text=Regular Task')).not.toBeVisible();
});

test('combined filters work', async ({ page }) => {
  await page.fill('[data-testid="search-input"]', 'task');
  await page.selectOption('[data-testid="priority-filter"]', 'high');
  await page.selectOption('[data-testid="tag-filter"]', '1');
  
  // Should only show high-priority todos with tag #1 matching "task"
  await expect(page.locator('[data-testid="todo-item"]')).toHaveCount(1);
});

test('export and import todos', async ({ page }) => {
  // Export
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Export Todos'),
  ]);
  const path = await download.path();
  
  // Verify JSON format
  const content = await fs.readFile(path, 'utf-8');
  const data = JSON.parse(content);
  expect(data.version).toBe('1.0');
  expect(data.todos).toBeInstanceOf(Array);
  
  // Import
  await page.setInputFiles('[data-testid="import-input"]', path);
  await expect(page.locator('text=Successfully imported')).toBeVisible();
});

test('calendar shows todos on correct dates', async ({ page }) => {
  await page.goto('/calendar');
  
  // Create todo with specific due date
  await page.goto('/');
  await page.fill('[data-testid="todo-title"]', 'Test Event');
  await page.fill('[data-testid="due-date"]', '2025-11-20T10:00');
  await page.click('[data-testid="create-todo"]');
  
  // Check calendar
  await page.goto('/calendar');
  await page.click('text=November 2025');
  await expect(page.locator('[data-date="2025-11-20"] >> text=Test Event')).toBeVisible();
});
```

---

## Implementation Checklist

### Feature 8: Search & Filtering
- [ ] UI: Search input with debounce (300ms)
- [ ] UI: Priority filter dropdown
- [ ] UI: Tag filter dropdown
- [ ] UI: Status filter dropdown
- [ ] UI: Clear filters button
- [ ] UI: Active filters indicator
- [ ] Filter logic with useMemo
- [ ] Empty state for no results
- [ ] Click tag badge to filter

### Feature 9: Export & Import
- [ ] API: GET /api/todos/export
- [ ] API: POST /api/todos/import
- [ ] Export JSON format with version
- [ ] Import validation
- [ ] ID remapping logic
- [ ] Tag conflict resolution
- [ ] UI: Export button with download
- [ ] UI: Import file picker
- [ ] Error handling and messages

### Feature 10: Calendar View
- [ ] Database: holidays table
- [ ] Seed script: Singapore holidays
- [ ] API: GET /api/holidays
- [ ] Page: /app/calendar/page.tsx
- [ ] Calendar generation logic
- [ ] Month navigation (prev/next/today)
- [ ] Day click modal
- [ ] Holiday display
- [ ] Todo display on dates
- [ ] Weekend/today styling
- [ ] URL state management (optional)

---

## Success Metrics

- ✅ Search responds < 100ms for 1000 todos
- ✅ Export file size reasonable (< 10MB for 10k todos)
- ✅ Import success rate > 95% for valid files
- ✅ Calendar renders < 500ms
- ✅ All date calculations accurate (Singapore timezone)
- ✅ Zero data loss in export/import cycle

---

**Category Completion Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Last Updated**: November 12, 2025
