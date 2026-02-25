# Tasks: Redirect to Admin Page After Event Creation

**Input**: Design documents from `/specs/011-create-event-redirect/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: E2E test updates are included because existing tests assert the old modal behavior and will fail without updating.

**Organization**: US1 (redirect) and US2 (remove modal) are both P1 and tightly coupled — they are combined in Phase 3 since they modify the same file in the same logical change. US3 (error handling preserved) is verified through E2E test assertions.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 3: User Story 1 + User Story 2 — Redirect & Remove Modal (Priority: P1) 🎯 MVP

**Goal**: After successful event creation, redirect the user to the event admin page with an enhanced toast notification. Remove the success modal entirely.

**Independent Test**: Create an event through the form → verify URL changes to `/event/{eventId}/admin`, toast is visible with next-step hint, no modal overlay appears, admin page controls are functional.

### Implementation

- [x] T001 [P] [US1] [US2] Replace success modal with redirect after event creation in `frontend/src/pages/CreateEventPage.jsx`

  Changes:
  - Add `import { useNavigate } from 'react-router-dom'`
  - Add `const navigate = useNavigate()` hook
  - In `handleSubmit` success block: replace `setSuccessEvent(event)` and form reset lines with `navigate(\`/event/${event.eventId}/admin\`, { replace: true, state: { eventCreated: true } })`
  - Remove `successEvent` state (`useState(null)`)
  - Remove `handleCloseSuccess` function
  - Remove entire success modal JSX block (`{successEvent && (...)}`)
  - Update component JSDoc to reflect new behavior

- [x] T002 [P] [US1] Add toast notification triggered by creation redirect in `frontend/src/pages/EventAdminPage.jsx`

  Changes:
  - Add `useLocation` to the existing `react-router-dom` import (line 1: already imports `useParams, useNavigate`)
  - Add `const location = useLocation()` hook near other hooks at top of component
  - Add `useEffect` after the existing auth-check effect (~line 203) that reads `location.state?.eventCreated`, calls `toast.success('Event created! Share the PIN with participants to get started')`, and clears the state with `window.history.replaceState({}, document.title)`

**Checkpoint**: At this point, the redirect flow works end-to-end. Manual smoke test: create event → verify redirect to admin page with toast.

---

## Phase 4: E2E Test Updates

**Goal**: Update existing E2E tests to assert the new redirect behavior instead of the removed modal. Verify error handling tests still pass.

- [x] T003 [US1] Update E2E test `'newly created event has "created" state'` to assert redirect to admin page and toast in `frontend/tests/e2e/specs/create-event.spec.js`

  Changes:
  - Replace success popup assertion (`page.getByText(/event created successfully/i)`) with `page.waitForURL(/\/event\/[A-Za-z0-9]{8}\/admin/, { timeout: 10000 })`
  - Add toast assertion: `await expect(page.getByText(/event created/i)).toBeVisible({ timeout: 5000 })`
  - Remove popup-based event ID extraction (`.font-mono.font-bold` selector); use API response `createdEventId` instead
  - Add back-button assertion: `await page.goBack()` → `await expect(page).not.toHaveURL(/\/create-event/)` to verify FR-004 (history replacement skips the create form)
  - Keep existing API state verification and cleanup logic

- [x] T004 [US1] Update E2E test `'prevents duplicate event creation on rapid clicks'` to assert single redirect in `frontend/tests/e2e/specs/create-event.spec.js`

  Changes:
  - Replace success popup assertion with `page.waitForURL(/\/event\/[A-Za-z0-9]{8}\/admin/, { timeout: 10000 })`
  - Keep existing rapid-click pattern and single-event verification
  - Keep cleanup logic

- [x] T005 [US2] [US3] Update E2E test `'handles special characters in event name'` to assert no redirect on validation error in `frontend/tests/e2e/specs/create-event.spec.js`

  Changes:
  - Replace `await expect(successPopup).not.toBeVisible()` with `await expect(page).toHaveURL(/\/create-event/)` to verify no redirect occurred
  - Keep existing validation error assertions and allowed-character tests

- [x] T006 [US3] Verify E2E tests `'shows validation error when name is missing'` and `'create event form has required fields'` still pass unchanged in `frontend/tests/e2e/specs/create-event.spec.js`

  Changes:
  - Review these tests for any references to the removed modal
  - No changes expected (these tests don't reference the success popup)
  - Confirm by running: `npx playwright test create-event.spec.js`

**Checkpoint**: All E2E tests pass. Run full suite: `npx playwright test create-event.spec.js`

---

## Phase 5: Polish & Validation

**Purpose**: Final verification across all stories

- [x] T007 Run quickstart.md manual smoke test to validate full flow end-to-end
- [x] T008 Run full E2E test suite to confirm no regressions: `npm run test:e2e`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US1+US2)**: No dependencies — can start immediately (no setup or foundational work needed)
- **Phase 4 (E2E Tests)**: Depends on Phase 3 completion (tests assert new behavior)
- **Phase 5 (Polish)**: Depends on Phase 4 completion

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — core redirect change
- **User Story 2 (P1)**: Implemented atomically with US1 (same file, same edit — removing modal IS part of adding redirect)
- **User Story 3 (P2)**: Verified through E2E tests — existing error behavior is preserved by default (no code changes needed)

### Within Phase 3

- T001 and T002 are in **different files** and can run in **parallel**
- No sequencing constraint between them

### Within Phase 4

- T003, T004, T005 all edit the **same file** — must run **sequentially**
- T006 is a verification-only task (run tests, no code changes)

### Parallel Opportunities

```text
# Phase 3: Launch both in parallel (different files):
Task T001: "Replace success modal with redirect in CreateEventPage.jsx"
Task T002: "Add toast notification in EventAdminPage.jsx"

# Phase 4: Sequential (same file):
Task T003 → T004 → T005 → T006
```

---

## Implementation Strategy

### MVP First (Phase 3 Only)

1. Complete T001 + T002 (in parallel)
2. **STOP and VALIDATE**: Manual smoke test per quickstart.md
3. If working, proceed to E2E test updates

### Full Delivery

1. Phase 3: T001 ∥ T002 → Manual smoke test
2. Phase 4: T003 → T004 → T005 → T006 → Run E2E suite
3. Phase 5: T007 → T008 → Full regression check

---

## Notes

- Total: **8 tasks** (2 implementation, 4 test updates, 2 validation)
- No new files created, no new dependencies added
- T001 removes ~40 lines, adds ~5 lines (net reduction)
- T002 adds ~10 lines (import change + hook + effect)
- All test changes are updating existing assertions, not writing new tests
