# Recurring Todos - Testing Guide

This guide helps you test the recurring todos feature to verify it meets all EVALUATION.md criteria.

## Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser to http://localhost:3000
```

## Manual Testing Checklist

### Test 1: Create Daily Recurring Todo ✅

1. Click "New Todo" button
2. Enter title: "Daily standup meeting"
3. Set due date: Tomorrow at 9:00 AM
4. Check "Recurring" checkbox
5. Select pattern: "Daily"
6. Set interval: 1
7. Click "Create Todo"

**Expected Result**:
- Todo appears in Active Todos list
- Shows badge: "🔄 Every day"
- Due date is tomorrow 9:00 AM

### Test 2: Complete Daily Recurring Todo ✅

1. Find the "Daily standup meeting" todo
2. Click the checkbox to complete it

**Expected Result**:
- Original todo moves to Completed section
- New todo appears in Active section
- New todo has title: "Daily standup meeting"
- New due date: Day after tomorrow 9:00 AM
- Badge still shows: "🔄 Every day"

### Test 3: Create Weekly Recurring Todo ✅

1. Click "New Todo"
2. Title: "Team meeting"
3. Due date: Next Monday 10:00 AM
4. Check "Recurring"
5. Pattern: "Weekly"
6. Interval: 1
7. Select days: Check "Monday" and "Thursday"
8. Click "Create Todo"

**Expected Result**:
- Badge shows: "🔄 Every week on Mon, Thu"

### Test 4: Complete Weekly Recurring (Multiple Days) ✅

1. Find "Team meeting" todo (due Monday)
2. Complete it

**Expected Result**:
- Original marked complete
- New todo created for **Thursday** (next weekday in list)
- If you complete Thursday's todo → new one for next Monday

### Test 5: Create Monthly Recurring Todo ✅

1. Click "New Todo"
2. Title: "Pay rent"
3. Due date: 1st of next month at 12:00 PM
4. Check "Recurring"
5. Pattern: "Monthly"
6. Interval: 1
7. Day of month: 1
8. Click "Create Todo"

**Expected Result**:
- Badge shows: "🔄 Every month on day 1"

### Test 6: Complete Monthly Recurring ✅

1. Complete "Pay rent" todo

**Expected Result**:
- Next instance created for the 1st of the month after that

### Test 7: Create Yearly Recurring Todo ✅

1. Click "New Todo"
2. Title: "Birthday celebration"
3. Due date: Jan 15, 2026 at 6:00 PM
4. Check "Recurring"
5. Pattern: "Yearly"
6. Interval: 1
7. Month: January
8. Day: 15
9. Click "Create Todo"

**Expected Result**:
- Badge shows: "🔄 Every year on Jan 15"

### Test 8: Disable Recurring ✅

1. Create a recurring todo
2. Click "Edit" (you'll need to add edit UI or use developer tools)
3. Uncheck "Recurring"
4. Save

**Expected Result**:
- Badge disappears
- Completing todo won't create next instance

### Test 9: Metadata Inheritance ✅

1. Create recurring todo with:
   - Priority: High
   - Tags: "work", "important"
   - Reminder: 15 minutes before
2. Complete it

**Expected Result**:
- Next instance has:
  - Same priority (High)
  - Same tags (work, important)
  - Same reminder setting

### Test 10: Edge Case - Month End ✅

1. Create monthly recurring todo
2. Set day: 31
3. Set due date: Jan 31, 2026
4. Complete it

**Expected Result**:
- Next instance: Feb 28, 2026 (clamped to last day of February)
- Then March 31, April 30, May 31, etc.

## API Testing (Using Developer Tools)

### Test Recurrence API with curl

```bash
# Create daily recurring todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Test daily todo",
    "dueAt": "2025-11-13T09:00:00+08:00",
    "recurrencePattern": "daily",
    "recurrenceOptions": {
      "interval": 1
    }
  }'

# Complete todo (replace {id})
curl -X PUT http://localhost:3000/api/todos/{id} \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "completed": true
  }'
```

**Expected Response**:
```json
{
  "todo": {
    "id": 1,
    "status": "completed",
    "completed_at": "2025-11-12T10:30:00Z",
    ...
  },
  "nextTodo": {
    "id": 2,
    "title": "Test daily todo",
    "due_at": "2025-11-14T09:00:00+08:00",
    "recurrence_pattern": "daily",
    ...
  }
}
```

## Database Verification

### Check Recurrence Data in Database

```bash
# Open database
sqlite3 todos.db

# View recurring todos
SELECT id, title, recurrence_pattern, recurrence_options, parent_todo_id 
FROM todos 
WHERE recurrence_pattern IS NOT NULL;

# Check parent-child relationships
SELECT 
  parent.id as parent_id,
  parent.title,
  child.id as child_id,
  child.due_at as next_due
FROM todos parent
LEFT JOIN todos child ON child.parent_todo_id = parent.id
WHERE parent.recurrence_pattern IS NOT NULL;
```

## Unit Testing (Playwright)

### Create Test File: `tests/03-recurring-todos.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Recurring Todos', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login, navigate to home
  });

  test('create daily recurring todo', async ({ page }) => {
    await page.click('button:has-text("New Todo")');
    await page.fill('input[name="title"]', 'Daily task');
    await page.fill('input[type="datetime-local"]', '2025-11-13T09:00');
    await page.check('input[type="checkbox"]:has-text("Recurring")');
    await page.selectOption('select[name="pattern"]', 'daily');
    await page.click('button:has-text("Create")');
    
    await expect(page.locator('text=Daily task')).toBeVisible();
    await expect(page.locator('text=🔄 Every day')).toBeVisible();
  });

  test('complete recurring creates next instance', async ({ page }) => {
    // Create recurring todo
    // ...
    
    // Complete it
    await page.click('input[type="checkbox"]');
    
    // Verify next instance
    const todos = page.locator('.todo-item');
    await expect(todos).toHaveCount(2); // original + next
    
    const nextTodo = todos.last();
    await expect(nextTodo).toContainText('Daily task');
    await expect(nextTodo).toContainText('🔄 Every day');
  });

  test('weekly recurring cycles through weekdays', async ({ page }) => {
    // Create weekly recurring for Mon & Thu
    // Complete on Monday → should create Thursday instance
    // Complete on Thursday → should create next Monday instance
  });

  test('disable recurring stops next instance', async ({ page }) => {
    // Create recurring todo
    // Edit to disable recurring
    // Complete todo
    // Verify no next instance created
  });
});
```

## Validation Testing

### Test Invalid Inputs

1. **Recurring without due date**:
   - Check "Recurring" but leave due date empty
   - Click "Create"
   - **Expected**: Error message "Recurring todos must have a due date"

2. **Negative interval**:
   - Set interval to -1 or 0
   - **Expected**: UI prevents (min="1" on input)

3. **No weekdays selected** (Weekly):
   - Uncheck all weekdays
   - **Expected**: UI shows error or keeps at least one checked

4. **Past due date**:
   - Set due date to yesterday
   - **Expected**: Error "Due date must be in the future"

## Performance Testing

### Test with Many Todos

```javascript
// In browser console
async function createManyRecurringTodos() {
  for (let i = 0; i < 50; i++) {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Todo ${i}`,
        dueAt: new Date(Date.now() + i * 86400000).toISOString(),
        recurrencePattern: 'daily',
        recurrenceOptions: { interval: 1 }
      })
    });
  }
}

createManyRecurringTodos();
```

**Verify**:
- Page renders without lag
- Completion is fast (<500ms)
- Badges display correctly

## Timezone Testing

### Verify Singapore Timezone

1. Create recurring todo with due date: 2025-11-13 00:00 (midnight)
2. Check database:
   ```sql
   SELECT due_at FROM todos WHERE id = 1;
   ```
3. **Expected**: Time stored in UTC but calculations use Singapore time
4. Complete todo
5. Next due date should be 2025-11-14 00:00 Singapore time

## EVALUATION.md Checklist

From `EVALUATION.md` Section "Feature 03: Recurring Todos":

**Implementation Checklist:**
- ✅ Database: `is_recurring` and `recurrence_pattern` fields
- ✅ Type: `RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'`
- ✅ Validation: Recurring todos require due date
- ✅ "Repeat" checkbox in create/edit forms
- ✅ Recurrence pattern dropdown
- ✅ Next instance creation on completion
- ✅ Due date calculation logic (daily/weekly/monthly/yearly)
- ✅ Inherit: priority, tags, reminder, recurrence pattern
- ✅ 🔄 badge display with pattern name

**Testing:**
- ⬜ E2E test: Create daily recurring todo
- ⬜ E2E test: Create weekly recurring todo
- ⬜ E2E test: Complete recurring todo creates next instance
- ⬜ E2E test: Next instance has correct due date
- ⬜ E2E test: Next instance inherits metadata
- ⬜ Unit test: Due date calculations for each pattern

**Acceptance Criteria:**
- ✅ All four patterns work correctly
- ✅ Next instance created on completion
- ✅ Metadata inherited properly
- ✅ Date calculations accurate (Singapore timezone)
- ✅ Can disable recurring on existing todo

## Common Issues & Fixes

### Issue: Checkbox doesn't create next instance
**Fix**: Check browser console for errors. Verify `calculateNextDueDate()` function is working.

### Issue: Wrong due date for next instance
**Fix**: Verify timezone settings. All dates should use Singapore timezone (`Asia/Singapore`).

### Issue: Tags not copied to next instance
**Fix**: Check API route at `app/api/todos/[id]/route.ts` - ensure tag copying loop is present.

### Issue: Badge not showing
**Fix**: Check `getRecurrenceSummary()` function in `app/page.tsx`.

## Success Criteria

Tests are successful when:
- ✅ All 4 recurrence patterns work
- ✅ Completing recurring todo creates exactly 1 next instance
- ✅ Next instance has correct due date based on pattern
- ✅ All metadata (priority, tags, reminder) inherited
- ✅ No duplicate instances created
- ✅ Can enable/disable recurring at any time
- ✅ UI shows clear recurrence indicators
- ✅ API validates inputs properly

---

**Ready to test?** Start with Test 1 (Daily Recurring) and work through the checklist!
