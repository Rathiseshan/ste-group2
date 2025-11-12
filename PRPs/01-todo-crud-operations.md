# 01 · Todo CRUD Operations PRP

## Feature Overview
- Implement the foundational todo management experience covering creation, reading, updating, and deletion.
- Ensure all date/time data flows use Singapore timezone (`Asia/Singapore`) helpers from `lib/timezone.ts`.
- Provide optimistic UI updates on client actions with graceful fallback when API calls fail.
- Establish validation rules that protect against invalid payloads, prevent duplicate titles within the same day, and enforce due date rules.

## User Stories
- **As a signed-in user**, I can create a todo with a title, description, due date, and optional reminder so I can track upcoming tasks.
- **As a busy professional**, I can edit existing todos to adjust details when priorities change.
- **As an organized person**, I can mark todos complete or delete them to keep my list tidy.
- **As a user on multiple devices**, I can rely on consistent data and timezone handling across sessions.

## User Flow
1. User authenticates via WebAuthn and lands on `/`.
2. Page loads todos by calling `GET /api/todos`.
3. User creates a todo through the input form; client performs optimistic add while posting to `POST /api/todos`.
4. User edits fields inline; client sends `PUT /api/todos/:id` and updates state.
5. Completion toggles immediately update UI; API call confirms and, on failure, reverts state.
6. Deletion removes the todo from the list, with undo snackbar allowing revert for 5 seconds.

## Technical Requirements
### Database Schema (`todos` table)
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
- `title` TEXT NOT NULL
- `description` TEXT DEFAULT ''
- `due_at` TEXT NOT NULL (ISO string generated via `formatSingaporeDate`)
- `status` TEXT NOT NULL DEFAULT 'pending' (`'pending' | 'completed'`)
- `completed_at` TEXT NULL
- `reminder_minutes` INTEGER NULL (offset in minutes before due time)
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### Data Access (`lib/db.ts`)
- Add CRUD helpers `todoDB.create`, `todoDB.listByUser`, `todoDB.update`, `todoDB.delete`, `todoDB.markComplete`.
- Use prepared statements with synchronous calls; ensure all timestamps rely on timezone helpers.

### API Endpoints
- `GET /api/todos` – returns authenticated user's todos sorted by `due_at` ascending, then `created_at`.
- `POST /api/todos` – body: `{ title, description?, dueAtISO, reminderMinutes? }`.
- `PUT /api/todos/[id]` – body: `{ title?, description?, dueAtISO?, reminderMinutes?, status? }`.
- `PATCH /api/todos/[id]/complete` – toggles completion, sets `completed_at` to now or null.
- `DELETE /api/todos/[id]` – hard delete with cascade removing subtasks (future features rely on cascade).
- All endpoints require active session via `getSession()`.

### Validation Rules
- Title required, 3–120 chars, trim whitespace.
- Description max 1000 chars.
- `dueAtISO` must parse via `parseSingaporeDate` and be >= current Singapore time.
- Prevent duplicate title + due date combo for same user.
- `reminderMinutes` allowed values: `null` or from `{15,30,60,120,1440}`.
- Reject payloads containing unknown fields.

## UI Components
- **TodoForm**: inline form at top with inputs for title, description, datetime (timezone-aware), reminder dropdown.
- **TodoList**: renders grouped sections (`Today`, `Upcoming`, `Past Due`).
- **TodoItem**: interactive row with checkbox, editable fields, overflow menu (`Edit`, `Copy Link`, `Delete`).
- **UndoToast**: global toast shown on delete offering undo within 5 seconds.
- Components live within `app/page.tsx` client component.

## Edge Cases
- Creating with due date in the past → validation error with specific message.
- Rapid double submission → disable submit button while request in flight.
- Optimistic update fails (NETWORK/500) → revert state and show inline error.
- Deleting todo with associated subtasks/tags (future features) → ensure cascade works; show warning.
- Completing already completed todo via stale client state → idempotent API response.

## Acceptance Criteria
- Users can create todos with valid payload; data appears immediately and persists on reload.
- Editing any field updates DB and UI without page refresh.
- Completion toggle works across refreshes and sets `completed_at` timestamp.
- Deletion removes todo and subtasks; undo reinstates within 5 seconds.
- All date/times stored and displayed using Singapore timezone utilities.
- API returns proper 400 errors with descriptive messages for validation failures.

## Testing Requirements
- **Unit**: Validator tests for payload rules; DB helper tests using in-memory SQLite.
- **API Integration**: Next.js route handler tests verifying auth required, CRUD operations succeed.
- **E2E (Playwright)**:
  - Create todo flow with optimistic UI and validation error.
  - Edit title and due date, confirm persistence after reload.
  - Complete todo, ensure completed section shows correct timestamp.
  - Delete todo, verify undo restores item.

## Out of Scope
- Priority badges, recurring logic, subtasks, tags (covered in subsequent PRPs).
- Calendar visualization or export/import.
- Multi-user sharing or collaboration features.

## Success Metrics
- CRUD operations complete in <300ms median on local dev.
- Zero validation-related 4xx errors in production logs after launch week.
- 95% of users can complete create/edit/delete actions without encountering failure prompts in usability study.
