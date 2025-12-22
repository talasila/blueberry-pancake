# Tasks: Root Admin Dashboard

**Input**: Design documents from `/specs/001-root-admin/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: E2E tests are REQUIRED per SC-006 in spec.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Paths use web app structure: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration and basic structure for root admin feature

- [x] T001 Add `rootAdmins` array to `config/default.json`
- [x] T002 [P] Add `isRootAdmin(email)` method to `backend/src/config/configLoader.js`
- [x] T003 [P] Create `requireRoot` middleware in `backend/src/middleware/requireRoot.js`
- [x] T004 Create API router skeleton in `backend/src/api/system.js`
- [x] T005 Mount `/api/system` router in `backend/src/api/index.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service and API client that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create `SystemService` class skeleton in `backend/src/services/SystemService.js`
- [x] T007 [P] Create `systemApi.js` client in `frontend/src/services/systemApi.js`
- [x] T008 [P] Create `SystemPage.jsx` skeleton with auth check in `frontend/src/pages/SystemPage.jsx`
- [x] T009 Add `/system` route to React Router in `frontend/src/App.jsx`
- [x] T010 Add root auth check redirect (403 for non-root) in `frontend/src/pages/SystemPage.jsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View All Events (Priority: P1) 🎯 MVP

**Goal**: Root admin can see a paginated list of all events with summary info

**Independent Test**: Login as root, navigate to `/system`, verify all events displayed

### E2E Test for User Story 1

- [x] T011 [US1] Create E2E test for event list display in `frontend/tests/e2e/specs/system.spec.js`

### Backend Implementation for User Story 1

- [x] T012 [US1] Implement `listAllEventsForAdmin()` in `backend/src/services/SystemService.js`
- [x] T013 [US1] Implement `GET /api/system/events` endpoint in `backend/src/api/system.js`
- [x] T014 [US1] Add pagination (limit/offset) to events endpoint in `backend/src/api/system.js`
- [x] T015 [US1] Add audit logging for VIEW_EVENTS action in `backend/src/api/system.js`

### Frontend Implementation for User Story 1

- [x] T016 [P] [US1] Create `EventList.jsx` component in `frontend/src/components/system/EventList.jsx`
- [x] T017 [US1] Integrate EventList into SystemPage in `frontend/src/pages/SystemPage.jsx`
- [x] T018 [US1] Add loading state and error handling to EventList in `frontend/src/components/system/EventList.jsx`
- [x] T019 [US1] Make EventList responsive (mobile/tablet/desktop) in `frontend/src/components/system/EventList.jsx`

**Checkpoint**: User Story 1 complete - root can view all events in a list

---

## Phase 4: User Story 2 - View Event Details (Priority: P1)

**Goal**: Root admin can click an event to see full details in a slide-out drawer

**Independent Test**: Click any event in list, verify drawer shows all event details

### E2E Test for User Story 2

- [x] T020 [US2] Add E2E test for event drawer in `frontend/tests/e2e/specs/system.spec.js`

### Backend Implementation for User Story 2

- [x] T021 [US2] Implement `getEventDetailsForAdmin()` in `backend/src/services/SystemService.js`
- [x] T022 [US2] Implement `GET /api/system/events/:eventId` endpoint in `backend/src/api/system.js`
- [x] T023 [US2] Add audit logging for VIEW_DETAILS action in `backend/src/api/system.js`

### Frontend Implementation for User Story 2

- [x] T024 [P] [US2] Create `EventDrawer.jsx` component in `frontend/src/components/system/EventDrawer.jsx`
- [x] T025 [US2] Add Radix UI Sheet dependency if not present (using existing SideDrawer)
- [x] T026 [US2] Integrate EventDrawer with EventList click handler in `frontend/src/pages/SystemPage.jsx`
- [x] T027 [US2] Display all event details in drawer (name, ID, owner, state, counts, date) in `frontend/src/components/system/EventDrawer.jsx`
- [x] T028 [US2] Make EventDrawer responsive (full-screen on mobile) in `frontend/src/components/system/EventDrawer.jsx`

**Checkpoint**: User Stories 1 AND 2 complete - root can view list and details

---

## Phase 5: User Story 3 - Delete Event (Priority: P2)

**Goal**: Root admin can delete any event with confirmation

**Independent Test**: Delete a test event, verify it's removed from list

### E2E Test for User Story 3

- [x] T029 [US3] Add E2E test for event deletion in `frontend/tests/e2e/specs/system.spec.js`

### Backend Implementation for User Story 3

- [x] T030 [US3] Implement `deleteEventAsAdmin()` in `backend/src/services/SystemService.js`
- [x] T031 [US3] Implement `DELETE /api/system/events/:eventId` endpoint in `backend/src/api/system.js`
- [x] T032 [US3] Add audit logging for DELETE_EVENT action in `backend/src/api/system.js`
- [x] T033 [US3] Return warning flag for active events (state: started) in `backend/src/api/system.js`

### Frontend Implementation for User Story 3

- [x] T034 [US3] Add delete button to EventDrawer in `frontend/src/components/system/EventDrawer.jsx`
- [x] T035 [US3] Create confirmation dialog with warning message in `frontend/src/components/system/EventDrawer.jsx`
- [x] T036 [US3] Add extra warning for active events in confirmation in `frontend/src/components/system/EventDrawer.jsx`
- [x] T037 [US3] Handle delete API call and refresh list in `frontend/src/pages/SystemPage.jsx`
- [x] T038 [US3] Show success/error toast after deletion in `frontend/src/pages/SystemPage.jsx`

**Checkpoint**: User Stories 1, 2, AND 3 complete - full view and delete functionality

---

## Phase 6: User Story 4 - Search and Filter Events (Priority: P2)

**Goal**: Root admin can search by name and filter by state/owner

**Independent Test**: Apply filters, verify only matching events shown

### E2E Test for User Story 4

- [x] T039 [US4] Add E2E test for search and filter in `frontend/tests/e2e/specs/system.spec.js`

### Backend Implementation for User Story 4

- [x] T040 [US4] Add filter parameters (state, owner, name) to `listAllEventsForAdmin()` in `backend/src/services/SystemService.js`
- [x] T041 [US4] Update `GET /api/system/events` to accept query params in `backend/src/api/system.js`

### Frontend Implementation for User Story 4

- [x] T042 [P] [US4] Create filter controls (search input, state dropdown, owner input) in `frontend/src/components/system/EventList.jsx`
- [x] T043 [US4] Connect filters to API query params in `frontend/src/components/system/EventList.jsx`
- [x] T044 [US4] Add debounce to search input in `frontend/src/components/system/EventList.jsx`
- [x] T045 [US4] Make filters responsive (collapsible on mobile) in `frontend/src/components/system/EventList.jsx`

**Checkpoint**: User Stories 1-4 complete - full list, details, delete, search/filter

---

## Phase 7: User Story 5 - View System Statistics (Priority: P3)

**Goal**: Root admin can see aggregate platform statistics

**Independent Test**: View stats panel, verify numbers match actual data

### E2E Test for User Story 5

- [x] T046 [US5] Add E2E test for statistics panel in `frontend/tests/e2e/specs/system.spec.js`

### Backend Implementation for User Story 5

- [x] T047 [US5] Implement `getSystemStats()` in `backend/src/services/SystemService.js`
- [x] T048 [US5] Implement `GET /api/system/stats` endpoint in `backend/src/api/system.js`

### Frontend Implementation for User Story 5

- [x] T049 [P] [US5] Create `SystemStats.jsx` component in `frontend/src/components/system/SystemStats.jsx`
- [x] T050 [US5] Display all stats (total events, by state, users, ratings, recent) in `frontend/src/components/system/SystemStats.jsx`
- [x] T051 [US5] Integrate SystemStats into SystemPage header in `frontend/src/pages/SystemPage.jsx`
- [x] T052 [US5] Make SystemStats responsive (grid reflow on mobile) in `frontend/src/components/system/SystemStats.jsx`

**Checkpoint**: All 5 user stories complete - full admin dashboard functionality

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final testing, documentation, and cleanup

- [ ] T053 [P] Run full E2E test suite and fix any failures in `frontend/tests/e2e/specs/system.spec.js`
- [ ] T054 [P] Add integration tests for system API in `backend/tests/integration/system.test.js`
- [ ] T055 [P] Add unit tests for SystemService in `backend/tests/unit/SystemService.test.js`
- [x] T056 Verify responsive design on all breakpoints (mobile, tablet, desktop) - implemented in components
- [ ] T057 Performance test: verify event list loads <2s with 100+ events
- [x] T058 Security test: verify non-root users get 403 on `/system` routes - covered in E2E tests
- [ ] T059 Update quickstart.md with actual implementation details in `specs/001-root-admin/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────┐
                      ▼
Phase 2 (Foundational) ────┬──────┬──────┬──────┬──────┐
                           ▼      ▼      ▼      ▼      ▼
                         US1    US2    US3    US4    US5
                        (P1)   (P1)   (P2)   (P2)   (P3)
                           │      │      │      │      │
                           └──────┴──────┴──────┴──────┘
                                         ▼
                              Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1: View Events | Foundational | Phase 2 complete |
| US2: View Details | Foundational, benefits from US1 list | Phase 2 complete |
| US3: Delete Event | Foundational, benefits from US2 drawer | Phase 2 complete |
| US4: Search/Filter | Foundational, extends US1 list | Phase 2 complete |
| US5: Statistics | Foundational, independent | Phase 2 complete |

### Within Each User Story

1. E2E test written first (should fail initially)
2. Backend service method
3. Backend API endpoint
4. Frontend component
5. Integration with page
6. Responsive styling
7. E2E test should pass

### Parallel Opportunities

**Phase 1 (parallel within):**
- T002 (configLoader) ∥ T003 (middleware)

**Phase 2 (parallel within):**
- T007 (API client) ∥ T008 (page skeleton)

**User Stories (parallel if team capacity allows):**
- US1 ∥ US5 (no dependency)
- US2 can start after US1 list exists (for click handler)
- US3 can start after US2 drawer exists (for delete button)
- US4 can start after US1 list exists (for filter controls)

---

## Parallel Example: Foundation + US1 Start

```bash
# After Phase 1, run Phase 2 tasks in parallel:
Task: T007 "Create systemApi.js client in frontend/src/services/systemApi.js"
Task: T008 "Create SystemPage.jsx skeleton in frontend/src/pages/SystemPage.jsx"

# After Phase 2, start US1:
Task: T011 "Create E2E test for event list in frontend/tests/e2e/specs/system.spec.js"
Task: T016 "Create EventList.jsx component in frontend/src/components/EventList.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup (T001-T005)
2. ✅ Complete Phase 2: Foundational (T006-T010)
3. ✅ Complete Phase 3: User Story 1 (T011-T019)
4. **STOP and VALIDATE**: Root can log in and see all events
5. Demo MVP to stakeholders

### Recommended Delivery Order

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 | View all events (core value) |
| +Details | US1 + US2 | Click to see event details |
| +Actions | US1-3 | Can delete events |
| +Search | US1-4 | Can find specific events |
| Complete | US1-5 | Full dashboard with stats |

---

## Task Summary

| Phase | Task Count | Stories |
|-------|------------|---------|
| Setup | 5 | — |
| Foundational | 5 | — |
| US1: View Events | 9 | P1 |
| US2: View Details | 9 | P1 |
| US3: Delete Event | 10 | P2 |
| US4: Search/Filter | 7 | P2 |
| US5: Statistics | 7 | P3 |
| Polish | 7 | — |
| **Total** | **59** | 5 stories |

---

## Notes

- [P] tasks = different files, can run in parallel
- [Story] label maps task to specific user story
- Each user story is independently testable
- E2E tests should fail before implementation, pass after
- Commit after each task or logical group
- Stop at any checkpoint to demo/validate independently
