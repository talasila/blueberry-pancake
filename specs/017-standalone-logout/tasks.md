# Tasks: Standalone Page Logout Icon

**Input**: Design documents from `/specs/017-standalone-logout/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: E2E tests included — the spec defines testable acceptance scenarios and the plan identifies `my-events.spec.js` as the test file.

**Organization**: US1 and US2 share identical implementation (same `isStandalonePage` boolean and conditional logic). US3 and US4 are regression guardrails verified by tests. Tasks are organized to reflect this shared structure.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Implementation (US1 + US2 — Standalone Logout Icon)

**Goal**: Replace the hamburger menu on `/my-events` and `/create-event` with a standalone logout icon that redirects to `/`

**Independent Test**: Authenticate via OTP, navigate to `/my-events` or `/create-event`, verify a logout icon (not a hamburger menu) appears, click it, confirm redirection to `/` with session cleared

- [X] T001 [US1] Add `isStandalonePage` boolean derived from `location.pathname` matching `['/my-events', '/create-event']` in `frontend/src/components/Header.jsx`
- [X] T002 [US1] Extend the system-route logout icon block to also render when `isStandalonePage` is true, using a conditional click handler: `isSystemRoute` → `handleRootLogout`, `isStandalonePage` → `handleLogout` — in `frontend/src/components/Header.jsx`
- [X] T003 [US1] Suppress the hamburger dropdown menu on standalone pages by adding `&& !isStandalonePage` to the `DropdownMenu` render condition in `frontend/src/components/Header.jsx`

**Checkpoint**: `/my-events` and `/create-event` now show a logout icon instead of a hamburger menu. Clicking it clears the session and redirects to `/`.

---

## Phase 2: E2E Tests (US1 + US2 + US3 + US4)

**Goal**: Verify standalone logout icon behavior and ensure zero regressions on event pages and system routes

- [X] T004 [US1] Add E2E test: on `/my-events`, verify logout icon is visible and hamburger menu is absent, then click logout icon and verify redirect to `/` with session cleared — in `frontend/tests/e2e/specs/my-events.spec.js`
- [X] T005 [US2] Add E2E test: on `/create-event`, verify logout icon is visible and hamburger menu is absent, then click logout icon and verify redirect to `/` with session cleared — in `frontend/tests/e2e/specs/my-events.spec.js`
- [X] T006 [US3] Add E2E test: on an event page (`/event/:eventId`), verify hamburger menu still renders with standard items — in `frontend/tests/e2e/specs/my-events.spec.js`
- [X] T007 [US4] Add E2E test: on a system route, verify standalone logout icon renders and redirects to `/system/login` — in `frontend/tests/e2e/specs/my-events.spec.js`

**Checkpoint**: All 4 user stories verified by E2E tests — standalone pages, event pages, and system routes all behave correctly.

---

## Phase 3: Polish & Validation

**Purpose**: Final verification and cleanup

- [X] T008 Run `quickstart.md` manual validation steps to confirm end-to-end behavior
- [X] T009 Verify no dead code introduced — confirm `handleMyEventsClick` and `List` import are still reachable from event-page menu paths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Implementation)**: No prerequisites — can start immediately
- **Phase 2 (E2E Tests)**: Depends on Phase 1 completion (tests verify the new behavior)
- **Phase 3 (Polish)**: Depends on Phase 2 completion

### User Story Dependencies

- **US1** (My Events logout icon) and **US2** (Create Event logout icon): Share implementation — T001 and T002 cover the core logic, T003 suppresses the menu. All three tasks modify the same file sequentially.
- **US3** (Event pages unaffected) and **US4** (System routes unaffected): Regression guardrails — verified by tests only, no implementation tasks needed.

### Parallel Opportunities

- T001, T002, T003 are sequential (same file, each depends on the previous)
- T004, T005, T006, T007 are independent test blocks but target the same file (`my-events.spec.js`), so they are sequential

---

## Implementation Strategy

### Single-Pass Delivery

This feature is small enough to deliver in a single pass:

1. Complete Phase 1 (T001–T003) — all in `Header.jsx`
2. Complete Phase 2 (T004–T007) — E2E test coverage
3. Complete Phase 3 (T008–T009) — validation
4. **Done** — commit and verify

No MVP/incremental strategy needed — the entire feature is 3 implementation tasks in 1 file plus 4 test tasks.

---

## Notes

- T001–T003 all modify the same file (`Header.jsx`) and must be sequential
- T004–T007 can be written in parallel as independent test blocks
- Total scope: ~10 lines of production code changed, ~40 lines of test code added
