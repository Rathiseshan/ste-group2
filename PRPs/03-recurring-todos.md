# 03 · Recurring Todos PRP

## Feature Overview
- Enable users to set recurring schedules on todos with automatic generation of the next instance after completion.
- Support daily, weekly, monthly, and yearly recurrence patterns with configurable anchors.
- Ensure recurring metadata propagates to future features (priority, tags, reminders) while preserving history of completed instances.

## User Stories
- **As a user managing routine tasks**, I can mark a todo as recurring so I do not need to recreate it manually.
- **As a planner**, I can specify recurrence patterns (e.g., every Monday) to align with my schedule.
- **As someone tracking progress**, I can view completed occurrences while the next instance automatically appears.

## User Flow
1. User creates or edits a todo and enables the "Recurring" toggle.
2. User selects pattern: Daily, Weekly (choose day of week), Monthly (day-of-month), or Yearly (month & day).
3. Upon marking current todo complete, backend creates a new todo instance with updated `due_at` and shared metadata.
4. UI replaces completed recurring todo with newly generated instance in correct list position.
5. User can suspend recurrence by turning off toggle (future occurrences stop generating).

## Technical Requirements
### Database Schema Updates
- Add `recurrence_pattern` (`TEXT NULL`) to `todos` table with enum values: `daily`, `weekly`, `monthly`, `yearly`.
- Add `recurrence_options` (`TEXT NULL`) storing JSON payload for pattern-specific data:
  - Daily: `{ interval: number }` (default 1).
  - Weekly: `{ interval: number, weekdays: number[] }` (`0`=Sunday) – default single weekday matching current due date.
  - Monthly: `{ interval: number, day: number }` (1–28/29/30/31 with guard rails).
  - Yearly: `{ interval: number, month: number, day: number }`.
- Add `parent_todo_id` (`INTEGER NULL REFERENCES todos(id)`) to link generated occurrences to series origin (null for root template).
- Add index `idx_todos_parent_series` on `parent_todo_id` for quick lookup.

### Type Definitions (`lib/db.ts`)
- `export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';`
- Define interfaces for `DailyRecurrenceOptions`, etc., plus union `RecurrenceOptions`.
- Extend `Todo` interface with `recurrencePattern`, `recurrenceOptions`, `parentTodoId`.
- Provide helper `calculateNextDueDate(todo: Todo): Date` using timezone helpers.

### API Changes
- `POST /api/todos`: accept optional `recurrence` object containing pattern and options; validate and store.
- `PUT /api/todos/[id]`: allow updating recurrence settings, including toggling off (set fields to null).
- `PATCH /api/todos/[id]/complete`:
  1. Set existing todo to completed (`status = 'completed'`, `completed_at = now`).
  2. If todo has recurrence pattern, calculate next due date.
  3. Clone todo fields (`title`, `description`, `priority`, `reminder_minutes`, tags) into new row with new `due_at`.
  4. Set `parent_todo_id` to original `parentTodoId` or current `id` if root.
  5. Return payload containing both completed todo and new instance for client update.
- Ensure idempotence: repeated completion call on already completed recurring todo should not create duplicates.

### Recurrence Calculations
- Always base calculations on Singapore time (`getSingaporeNow`, `toSingaporeZonedDateTime`).
- Daily: add `interval` days.
- Weekly: find next weekday in configured list after current due date; if none, wrap to first with interval weeks added.
- Monthly: maintain day-of-month using helper that clamps to last valid day for the target month.
- Yearly: maintain month/day; adjust for leap years (Feb 29 rolls to Feb 28 unless option `preserveLeap=true`).

### Client Behavior
- Update todo form with "Recurring" section showing pattern dropdown, interval input, and pattern-specific controls.
- Display recurrence summary chip on todo item (e.g., `Repeats every Mon`).
- When completion response contains `nextTodo`, insert into UI list, preserving optimistic experience.
- Allow editing recurrence; unsaved changes preview new summary text.

## UI Components
- **RecurrenceEditor**: rendered within create/edit modal; includes validation feedback.
- **RecurrenceSummary**: small text/badge summarizing schedule, reused in list and detail view.
- **NextOccurrencePreview**: optional inline hint showing next due date before saving.

## Edge Cases
- Completing recurring todo when API fails to create next instance → revert completion, show error.
- Editing due date for recurring todo should realign future calculations from updated base date.
- Monthly recurrence on day 31 for months without 31 days → clamp to last day and persist decision in options.
- Weekly pattern with multiple weekdays should schedule next date correctly even if due_at was manually shifted.
- Disabling recurrence should leave historical occurrences untouched.

## Acceptance Criteria
- Recurrence metadata stored in DB and returned via API for all new/updated todos.
- Completing recurring todo generates exactly one next instance with copied metadata (priority, tags, reminders).
- UI shows recurrence badges and allows editing/removing patterns.
- API prevents invalid combinations (e.g., negative intervals, empty weekdays array).
- Re-enabling recurrence on completed todo continues series using most recent due date as anchor.

## Testing Requirements
- **Unit**: `calculateNextDueDate` covering edge cases (month-end, leap year, multi-weekday).
- **API Integration**: completion endpoint tested for series creation, idempotence, and metadata cloning.
- **E2E (Playwright)**:
  - Create daily recurring todo; complete twice; ensure new instance appears with updated due date.
  - Weekly recurrence selecting Monday & Thursday; verify next occurrence cycles correctly.
  - Disable recurrence and confirm no further instances generate.

## Out of Scope
- Custom cron expressions or business-day schedules.
- Pausing single occurrence while keeping series active (future skip logic).
- Editing past occurrences retroactively.

## Success Metrics
- Automated tests cover ≥90% of recurrence calculation branches.
- Support cases for duplicate recurring todos drop to <1% after launch.
- Average time to generate next occurrence <10ms in profiling with 10k todos.
