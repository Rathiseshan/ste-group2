# Rama's Implementation Guide - Category-Based PRPs

## Overview

This directory contains consolidated Product Requirement Prompts organized into 3 broad categories for systematic implementation of the Todo App. These files complement the individual feature PRPs (01-11) by providing a holistic view of each category.

---

## 📁 Category Files

### 🎯 Category 1: Core Features
**File**: `rama_category1_core_features.md`

**Features Included**:
1. Todo CRUD Operations
2. Priority System  
3. Recurring Todos

**Why Start Here**: These form the essential foundation. Without these, the app doesn't function.

**Estimated Time**: 2-3 days
**Complexity**: ⭐⭐⭐ Medium
**Dependencies**: None (foundation)

**Key Deliverables**:
- ✅ Full todo lifecycle (create, read, update, delete)
- ✅ Three-level priority with color badges
- ✅ Four recurrence patterns (daily/weekly/monthly/yearly)
- ✅ Singapore timezone handling
- ✅ Complete validation suite

---

### 🚀 Category 2: Advanced Features
**File**: `rama_category2_advanced_features.md`

**Features Included**:
4. Reminders & Notifications
5. Subtasks & Progress Tracking
6. Tag System
7. Template System

**Why Second**: These build upon core todos to add power-user capabilities.

**Estimated Time**: 3-4 days
**Complexity**: ⭐⭐⭐⭐ Medium-High
**Dependencies**: Category 1 complete

**Key Deliverables**:
- ✅ Browser notifications with 7 timing options
- ✅ Hierarchical subtasks with progress bars
- ✅ Color-coded tags with many-to-many relationships
- ✅ Reusable todo templates

---

### 📊 Category 3: Productivity Features
**File**: `rama_category3_productivity_features.md`

**Features Included**:
8. Search & Filtering
9. Export & Import
10. Calendar View

**Why Third**: These enhance UX and data portability after core functionality is solid.

**Estimated Time**: 2-3 days
**Complexity**: ⭐⭐⭐ Medium
**Dependencies**: Categories 1 & 2 complete

**Key Deliverables**:
- ✅ Real-time search with multi-criteria filtering
- ✅ JSON backup/restore with validation
- ✅ Monthly calendar with Singapore holidays

---

## 🎯 Implementation Strategy

### Recommended Order

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: Foundation (Category 1)                       │
│  ├─ Week 1: Todo CRUD + Priority                        │
│  ├─ Week 1: Recurring Todos                             │
│  └─ Deliverable: Working todo app with basics           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: Power Features (Category 2)                   │
│  ├─ Week 2: Subtasks + Tags                             │
│  ├─ Week 2: Reminders + Notifications                   │
│  ├─ Week 3: Template System                             │
│  └─ Deliverable: Feature-rich todo app                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: Productivity (Category 3)                     │
│  ├─ Week 3: Search & Filtering                          │
│  ├─ Week 4: Export/Import + Calendar                    │
│  └─ Deliverable: Production-ready app                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: Infrastructure (Optional/Parallel)            │
│  ├─ WebAuthn Authentication (PRP 11)                    │
│  ├─ E2E Tests (Playwright)                              │
│  ├─ Deployment (Railway/Vercel)                         │
│  └─ Deliverable: Secure, tested, deployed app           │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Workflow

### For Each Category:

1. **Read the PRP**
   ```bash
   # Open the category PRP file
   code PRPs/rama_category1_core_features.md
   ```

2. **Review Current State**
   - Check `EVALUATION.md` for what's already implemented
   - Review existing code in `lib/db.ts`, `app/api/`, `app/page.tsx`

3. **Plan Implementation**
   - Review "Implementation Checklist" section
   - Create todo list using `manage_todo_list` tool
   - Estimate time for each sub-feature

4. **Implement Features**
   - Start with database schema (if new tables needed)
   - Build API endpoints with validation
   - Create/update UI components
   - Test manually as you go

5. **Validate**
   - Check against "Acceptance Criteria"
   - Run `npm run build` to ensure no TypeScript errors
   - Test all user flows manually
   - Update `EVALUATION.md` checkboxes

6. **Write Tests** (if time permits)
   - Unit tests for complex logic
   - E2E tests for critical user flows
   - Run `npx playwright test`

---

## 🔧 Technical Patterns

### Database (lib/db.ts)
- ✅ **Synchronous** SQLite operations (no async/await)
- ✅ Use prepared statements for all queries
- ✅ Export `db` object + feature-specific CRUD objects (`todoDB`, `tagDB`, etc.)
- ✅ Types defined as interfaces at top of file

### API Routes (app/api/**/route.ts)
- ✅ **Async** handlers (Next.js requirement)
- ✅ Use `await params` for dynamic routes in Next.js 16
- ✅ Test user helper: `const testUser = getTestUser()` (temporary)
- ✅ Validation before DB operations
- ✅ Return JSON with proper HTTP status codes

### Timezone (lib/timezone.ts)
- ✅ **ALWAYS** use `getSingaporeNow()` instead of `new Date()`
- ✅ Parse dates with `parseSingaporeDate(isoString)`
- ✅ Use `toSingaporeZonedDateTime()` for conversions
- ✅ Never do raw date math without timezone helpers

### UI (app/page.tsx)
- ✅ Client component (`'use client'`)
- ✅ All state in this monolithic file (no separate components yet)
- ✅ Fetch from API routes, never import `lib/db.ts` directly
- ✅ Use Tailwind CSS 4 for styling

---

## 📊 Progress Tracking

### Category 1: Core Features
**Status**: ✅ Complete (90%+)
- [x] Todo CRUD Operations - 90%
- [x] Priority System - 75%
- [x] Recurring Todos - 95%

**Remaining**:
- [ ] Edit modal UI
- [ ] Overdue section
- [ ] Optimistic UI updates
- [ ] E2E tests

---

### Category 2: Advanced Features
**Status**: ⚠️ Partial (30%)
- [ ] Reminders & Notifications - 20%
- [ ] Subtasks & Progress - 40%
- [x] Tag System - 60%
- [ ] Template System - 10%

**Next Steps**:
1. Implement subtask UI (backend ready)
2. Build notification system (hook + API + UI)
3. Complete tag management UI
4. Add template API endpoints

---

### Category 3: Productivity Features
**Status**: ❌ Not Started (0%)
- [ ] Search & Filtering - 0%
- [ ] Export & Import - 0%
- [ ] Calendar View - 5%

**Next Steps**:
1. Add search/filter UI to main page
2. Create export/import API endpoints
3. Build calendar page with holidays

---

## 🎓 Learning Resources

### Singapore Timezone Handling
- Uses `date-fns-tz` library
- Timezone ID: `'Asia/Singapore'` (UTC+8, no DST)
- All helpers in `lib/timezone.ts`

### WebAuthn (Future)
- Uses `@simplewebauthn/server` and `@simplewebauthn/browser`
- Passwordless authentication with biometrics
- See PRP 11 when ready to implement

### Playwright Testing
- Config: `playwright.config.ts`
- Timezone set to `'Asia/Singapore'`
- Virtual authenticators for WebAuthn tests
- Test files: `tests/*.spec.ts`

---

## 🚨 Common Pitfalls to Avoid

1. **Timezone Errors**
   ❌ `new Date()` - uses system timezone
   ✅ `getSingaporeNow()` - Singapore timezone

2. **Async/Sync Confusion**
   ❌ `await todoDB.create()` - DB is synchronous
   ✅ `todoDB.create()` - no await needed

3. **Next.js 16 Params**
   ❌ `const { id } = params` - params is a Promise
   ✅ `const { id } = await params` - must await

4. **Buffer Encoding (WebAuthn)**
   ❌ `credential_id.toString()` - loses binary data
   ✅ Use `isoBase64URL` helpers from `@simplewebauthn/server/helpers`

5. **Unknown Fields in API**
   ❌ Accept any fields in request body
   ✅ Reject unknown fields explicitly for security

---

## 📞 Getting Help

### When Stuck:
1. Check `.github/copilot-instructions.md` for project patterns
2. Review `USER_GUIDE.md` for user-facing behavior
3. Check individual PRP files (01-11) for deep details
4. Look at existing code in similar features

### AI Assistant Prompts:
```
"I'm implementing [Category X] from rama_categoryX_*.md.
I'm stuck on [specific feature/issue].
Here's my current code: [paste code]
What's the best way to [specific question]?"
```

---

## ✅ Definition of Done (Per Category)

A category is "complete" when:

- [ ] All features in the category implemented
- [ ] Database schema complete with indexes
- [ ] API endpoints with full validation
- [ ] UI components functional and styled
- [ ] Manual testing passes all flows
- [ ] `npm run build` succeeds with no errors
- [ ] EVALUATION.md checkboxes marked
- [ ] Code committed to git
- [ ] (Optional) E2E tests written and passing

---

## 🎯 Success Metrics

### Category 1 (Core)
- Can create, edit, complete, delete todos ✅
- Priority badges visible and functional ✅
- Recurring todos create next instance ✅
- Singapore timezone working ✅

### Category 2 (Advanced)
- Browser notifications fire on time
- Subtasks show progress bar
- Tags organize todos effectively
- Templates save time on repetitive todos

### Category 3 (Productivity)
- Search finds todos instantly
- Export/import preserves all data
- Calendar shows month at a glance

---

## 📝 Notes

- **Authentication**: Skipped for now (using test user helper)
- **Deployment**: Consider after Category 3 complete
- **Testing**: Write tests as you go or batch at end
- **Refactoring**: Keep monolithic until features stable

---

**Created**: November 12, 2025
**Last Updated**: November 12, 2025
**Author**: AI Assistant (GitHub Copilot)
**Purpose**: Systematic implementation guide for ste-group2 Todo App
