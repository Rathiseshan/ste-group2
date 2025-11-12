# 02 · Priority System PRP

## Feature Overview
- Introduce a three-level priority model (`High`, `Medium`, `Low`) for todos with visual cues and automatic sorting.
- Allow users to filter todos by priority without impacting other filters (tags, status, due date segments).
- Ensure priority integrates seamlessly with CRUD flows and future features like recurring todos and templates.

## User Stories
- **As a planner**, I can assign priority levels to todos to highlight urgent work.
- **As a busy user**, I want high-priority items to rise to the top of lists automatically.
- **As a focused user**, I can filter my todos to show only `High` or `Medium` priorities for time-blocking.

## User Flow
1. User views todo list; items display colored badges denoting priority.
2. Creating or editing a todo allows choosing priority; default is `Medium`.
3. List sections order todos first by priority (High → Medium → Low) then by due date.
4. User selects a priority filter chip (`All`, `High`, `Medium`, `Low`); list updates without refetching data.
5. Completed todos retain their priority badge for historical reference.

## Technical Requirements
### Database Schema
- Add `priority` column to `todos` table (`TEXT NOT NULL DEFAULT 'medium'`).
- Migration strategy: `ALTER TABLE` wrapped in try/catch with default applied to existing rows.

### Type Definitions (`lib/db.ts`)
- Define `export type Priority = 'high' | 'medium' | 'low';`.
- Update `Todo` interface to include `priority: Priority`.
- Ensure DB helpers accept and validate priority values when creating/updating todos.

### API Contract Changes
- `POST /api/todos`: accept optional `priority`; default to `'medium'` if missing.
- `PUT /api/todos/[id]`: allow updating `priority`.
- All responses include `priority` field.
- Validation: reject priority not in allowed set.

### Client Behavior
- Update creation form with segmented control (`High`, `Medium`, `Low`).
- Render priority badges using Tailwind classes: e.g., High → red, Medium → amber, Low → teal.
- Sorting logic: `todos.sort` by priority weight (`high:0`, `medium:1`, `low:2`) then `due_at`, leverage memoized selector hooks.
- Filtering: maintain `selectedPriority` state (`'all' | Priority`), applied client-side before rendering sections with chip UI on desktop and dropdown fallback on mobile.
- Respect user theme (light/dark) by deriving badge colors from semantic Tailwind tokens that satisfy contrast requirements in both modes.

## UI Components
- **PrioritySelector**: reusable component for todo form and inline edit.
- **PriorityBadge**: small pill with accessible color contrast, dark-mode friendly palette, and tooltip/ARIA label such as `High priority`.
- **PriorityFilterChips**: row of chips toggling priority filter; persists selection via local storage key `todo.priorityFilter` and provides keyboard-accessible dropdown alternative.

## Edge Cases
- Editing priority while offline/optimistic update fails → revert with toast message.
- Filtering on priority while no todos match → show empty state `No High priority todos yet`.
- Completed todo filter should respect priority filter (High completed still visible when filtering High).
- Ensure migrating legacy data without priority sets default to `medium`.

## Acceptance Criteria
- Todos store priority in DB and return correct value from API.
- New todo defaults to `Medium` unless user chooses otherwise.
- List ordering respects priority weight, then due date, then created date.
- Priority filter works alongside text search/tag filters without conflict.
- Color badges meet WCAG AA contrast and include ARIA labels for screen readers.
- Theme-aware palette keeps badges legible in both light and dark modes.

## Testing Requirements
- **Unit**: sorting helper ensures proper ordering; validator rejects invalid priority values.
- **API Integration**: ensure priority persists across create/update; migration script test ensures default applied.
- **E2E (Playwright)**:
  - Create todos with each priority; verify badge color and order.
  - Change priority via inline edit; confirm reorder and persisted value after refresh.
  - Use priority filter chips, ensure only matching items display.
  - Capture visual snapshots in light and dark themes to guard contrast regressions.

## Out of Scope
- Custom user-defined priority levels.
- Priority-based notifications or auto-reminders beyond ordering/filtering.
- Reporting or analytics by priority.

## Success Metrics
- 100% of todos created post-launch have explicit priority values stored.
- Sorting performance: priority reordering completes within 16ms frame on list of 200 todos.
- Usability testing shows ≥80% of participants correctly interpret badge meaning without explanation.
