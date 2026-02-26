# Tasks: Admin Event List Enhancements

**Input**: Design documents from `/specs/018-admin-event-list/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/system-events-api.md, quickstart.md

**Organization**: Tasks are grouped into a foundational backend phase (blocking), then one phase per user story (P1–P4), then E2E tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Foundational — Backend API + Frontend API Client

**Purpose**: Backend changes that all four user stories depend on. Must complete before any frontend story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Add `pin: config.pin || null` to the return object in both `getEventSummary()` and `getEventDetailsForAdmin()` in `backend/src/services/SystemService.js`
- [X] T002 Add `search` parameter to `listAllEventsForAdmin()` method signature and implement OR-filter: when `search` is provided (trimmed, non-empty), match case-insensitively against `eventId`, `name`, or `ownerEmail` using `String.includes()`; when `search` is present, skip the existing separate `name` and `owner` filters in `backend/src/services/SystemService.js`
- [X] T003 Extract `search` from `req.query` and pass it to `systemService.listAllEventsForAdmin()` in `backend/src/api/system.js`
- [X] T004 [P] Add `search` parameter to `listEvents()` — when set, append `search` to the query string in `frontend/src/services/systemApi.js`
- [X] T005 [P] Add unit tests for `listAllEventsForAdmin()` search OR-filter in `backend/tests/unit/SystemService.test.js`: test OR-matching across eventId, name, and ownerEmail; case-insensitivity; whitespace-only search treated as empty; `search` taking precedence over `name`/`owner`; interaction with `state` filter; and `pin` field present in returned summaries

**Checkpoint**: Backend returns `pin` in event summaries and details; `GET /api/system/events?search=term` performs OR matching across eventId, name, and ownerEmail. Frontend API client can send `search` param. Unit tests pass.

---

## Phase 2: User Story 1 — Full-Text Search Across All Events (Priority: P1) 🎯 MVP

**Goal**: Admin can search all events in the database by event ID, event name, or owner email using a single search box. Results are capped at 100.

**Independent Test**: Type an event ID, partial name, or owner email into the search box and verify results appear from the full database, not just the displayed subset.

### Implementation for User Story 1

- [X] T006 [US1] Update the filter-building logic: when `debouncedSearch` is non-empty, send `{ search: debouncedSearch, limit: 100 }` instead of `{ name: debouncedSearch, limit: 25 }` to `systemApi.listEvents()` in `frontend/src/components/system/EventList.jsx` (note: the existing `useDebounce` hook is retained unchanged — FR-012 is satisfied by reuse)
- [X] T007 [US1] Add a results-capped info message: when searching and `pagination.total > 100`, display "Showing first 100 of {total} results" below the search box in `frontend/src/components/system/EventList.jsx`

**Checkpoint**: Searching by event ID, name, or owner email returns matching results from the full database. Results exceeding 100 show a capped message.

---

## Phase 3: User Story 2 — Default View Shows 25 Most Recent Events (Priority: P2)

**Goal**: Default (non-search) view shows exactly 25 events sorted newest first, with an informational label. Pagination controls removed.

**Independent Test**: Navigate to /system with 25+ events and verify exactly 25 cards appear with a "Showing 25 most recent events" label.

### Implementation for User Story 2

- [X] T008 [US2] Change default pagination `limit` from `50` to `25` and remove the Previous/Next pagination controls (the `<div>` block rendering the pagination buttons at lines 272–294) in `frontend/src/components/system/EventList.jsx`
- [X] T009 [US2] Add an informational label: when not searching and `pagination.total > 25`, display "Showing 25 most recent events" (e.g., as a `<p>` below the search box or above the event list) in `frontend/src/components/system/EventList.jsx`

**Checkpoint**: Default view shows 25 events with label. No pagination buttons. Searching still works per US1.

---

## Phase 4: User Story 3 — Event Card Displays Event ID and PIN (Priority: P3)

**Goal**: Each event card shows the event ID and PIN at a glance, without opening the drawer.

**Independent Test**: View the event list and verify each card displays its event ID and PIN (or "No PIN" for legacy events).

### Implementation for User Story 3

- [X] T010 [US3] Add event ID and PIN to the card layout: below the owner email line, display the event ID (e.g., with `Hash` icon) and PIN (e.g., with `Key` icon from lucide-react, or text label "PIN:"); show "No PIN" when `event.pin` is null or undefined in `frontend/src/components/system/EventList.jsx`

**Checkpoint**: Each card shows event ID, PIN (or "No PIN"). Existing card information (name, state, owner, stats) remains unchanged.

---

## Phase 5: User Story 4 — Event Details Drawer Shows PIN (Priority: P4)

**Goal**: The event details side drawer includes the event PIN alongside existing detail rows.

**Independent Test**: Click an event card and verify the PIN appears in the drawer details section.

### Implementation for User Story 4

- [X] T011 [P] [US4] Add a `DetailRow` for PIN after the Event ID row in the details section: use `KeyRound` icon (import from lucide-react), label "Event PIN", value `details.pin || 'No PIN'` in `frontend/src/components/system/EventDrawer.jsx`

**Checkpoint**: Drawer shows PIN for all events. "No PIN" for legacy events. All existing detail rows unchanged.

---

## Phase 6: E2E Tests

**Purpose**: Update and add Playwright E2E tests to cover all new behavior.

- [X] T012 Update the existing `US4: Search Events` name-search test: change the expected API response URL match from `name=Apple` to `search=Apple` (and the unfiltered check from `!resp.url().includes('name=')` to `!resp.url().includes('search=')`) in `frontend/tests/e2e/specs/system.spec.js`
- [X] T013 Add E2E test `should filter events by event ID search`: create a test event, search by its event ID, verify the event appears in `frontend/tests/e2e/specs/system.spec.js`
- [X] T014 Add E2E test `should treat whitespace-only search as empty`: type spaces into the search box, verify the default 25-event view is shown (no search API call with `search=` param) in `frontend/tests/e2e/specs/system.spec.js`
- [X] T015 Add E2E test `should show event ID and PIN on event card`: create a test event with a known PIN, verify the card displays both the event ID and PIN in `frontend/tests/e2e/specs/system.spec.js`
- [X] T016 Add E2E test `should display PIN in event details drawer`: click an event card, verify the drawer shows the PIN value in `frontend/tests/e2e/specs/system.spec.js`
- [X] T017 Add E2E test `should show most recent events label`: verify the "Showing 25 most recent events" label is visible when total events exceed 25 (or verify it does NOT appear when fewer events exist) in `frontend/tests/e2e/specs/system.spec.js`

**Checkpoint**: All E2E tests pass. Run with `cd frontend && npx playwright test tests/e2e/specs/system.spec.js`.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T018 Remove the `STATE_COLORS` duplicate: the same constant is defined in both `EventList.jsx` and `EventDrawer.jsx` — extracted to `frontend/src/components/system/constants.js`
- [X] T019 Run quickstart.md manual verification checklist (7 items) and confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately
- **Phases 2–5 (User Stories)**: All depend on Phase 1 completion
  - US1 (search) and US2 (default 25) modify the same file (`EventList.jsx`) — execute sequentially
  - US3 (card layout) also modifies `EventList.jsx` — execute after US1/US2
  - US4 (drawer PIN) modifies `EventDrawer.jsx` — **can run in parallel** with US1–US3
- **Phase 6 (E2E Tests)**: Depends on all user stories (Phases 2–5) being complete
- **Phase 7 (Polish)**: Depends on Phase 6 completion

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 only. No dependency on other stories.
- **US2 (P2)**: Depends on Phase 1. Shares `EventList.jsx` with US1 — execute after US1.
- **US3 (P3)**: Depends on Phase 1. Shares `EventList.jsx` — execute after US2.
- **US4 (P4)**: Depends on Phase 1 only. Different file (`EventDrawer.jsx`) — **parallelizable with US1–US3**.

### Parallel Opportunities

- T003 and T004 can run in parallel (backend route vs frontend API client — different files)
- T005 (unit tests) can run in parallel with T004 (frontend API client — different files)
- T011 (US4, EventDrawer.jsx) can run in parallel with T006–T010 (US1–US3, EventList.jsx)
- All E2E test tasks (T012–T017) are in the same file and must be sequential

---

## Parallel Example

```text
# After Phase 1 completes, launch in parallel:

Stream A (EventList.jsx — US1, US2, US3):
  T006 → T007 → T008 → T009 → T010

Stream B (EventDrawer.jsx — US4):
  T011

# Both streams complete → Phase 6 (E2E tests)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational backend + API client changes
2. Complete Phase 2: US1 — Search works across all events
3. **STOP and VALIDATE**: Search by ID, name, and email works end-to-end

### Incremental Delivery

1. Phase 1 → Backend ready
2. Phase 2 (US1) → Search works → Validate
3. Phase 3 (US2) → Default 25 limit with label → Validate
4. Phase 4 (US3) → Cards show ID + PIN → Validate
5. Phase 5 (US4) → Drawer shows PIN → Validate (can parallel with 2–4)
6. Phase 6 → E2E tests pass
7. Phase 7 → Polish and cleanup

---

## Notes

- Backend changes (T001–T003) are in 2 files; T005 adds a unit test file; frontend story changes (T006–T010) are in 1 file (`EventList.jsx`)
- T011 is the only task in a separate frontend file (`EventDrawer.jsx`) and is the main parallelization opportunity
- One new file created: `backend/tests/services/SystemService.test.js` (unit tests); all other changes are modifications to existing code
- Commit after each task or logical group (e.g., T001+T002 together as one backend commit)
