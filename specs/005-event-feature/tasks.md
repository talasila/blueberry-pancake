# Tasks: Event Feature

**Input**: Design documents from `/specs/005-event-feature/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per Testing Standards requirement in constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below use web app structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency verification

- [x] T001 [P] Verify EventService exists in `backend/src/services/EventService.js`
- [x] T002 [P] Verify FileDataRepository exists in `backend/src/data/FileDataRepository.js` with getEvent method
- [x] T003 [P] Verify ProtectedRoute component exists in `frontend/src/components/ProtectedRoute.jsx`
- [x] T004 [P] Verify Header component exists in `frontend/src/components/Header.jsx`
- [x] T005 [P] Verify API client exists in `frontend/src/services/apiClient.js`
- [x] T006 [P] Verify React Router is configured in `frontend/src/App.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Extend EventService with getEvent method in `backend/src/services/EventService.js` (validate event ID format, retrieve from DataRepository)
- [x] T008 [P] Add GET /api/events/:eventId endpoint in `backend/src/api/events.js` (use requireAuth middleware, call EventService.getEvent)
- [x] T009 [P] Add getEvent API client method in `frontend/src/services/apiClient.js` (GET request to /api/events/:eventId with JWT token)
- [x] T010 [P] Create useEvent hook in `frontend/src/hooks/useEvent.js` (fetch event data, manage loading/error states, extract eventId from route)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Access Event Main Page (Priority: P1) 🎯 MVP

**Goal**: Authenticated user navigates to `/event/<event-id>`, system validates authentication, verifies event exists, displays event main page, and shows event name in header.

**Independent Test**: Navigate to `/event/<valid-event-id>` with valid JWT token, verify event page loads, event name appears in header, page is protected (unauthenticated users redirected). Test can verify access flow without requiring admin functionality.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Unit test for EventService.getEvent in `backend/tests/unit/EventService.test.js` (valid event ID, invalid event ID, non-existent event)
- [x] T012 [P] [US1] Integration test for GET /api/events/:eventId endpoint in `backend/tests/integration/events.test.js` (success, 404, 401)
- [x] T013 [P] [US1] Unit test for useEvent hook in `frontend/tests/unit/useEvent.test.js` (loading state, success, error handling)
- [x] T014 [P] [US1] Unit test for EventPage component in `frontend/tests/unit/EventPage.test.jsx` (renders event data, shows loading, handles errors)
- [x] T015 [P] [US1] E2E test for event page access flow in `frontend/tests/e2e/features/event-access.feature` (authenticated access, unauthenticated redirect, non-existent event)

### Implementation for User Story 1

#### Backend

- [x] T016 [US1] Implement getEvent method in `backend/src/services/EventService.js` (validate 8-character alphanumeric format, retrieve from FileDataRepository, handle not found)
- [x] T017 [US1] Add error handling for invalid event ID format in `backend/src/services/EventService.js` (return appropriate error)
- [x] T018 [US1] Add error handling for event not found in `backend/src/api/events.js` (return 404 with error message)
- [x] T019 [US1] Add error handling for server errors in `backend/src/api/events.js` (return 500 with error message)

#### Frontend

- [x] T020 [P] [US1] Create EventPage component in `frontend/src/pages/EventPage.jsx` (basic structure, use useParams for eventId)
- [x] T021 [US1] Integrate useEvent hook in EventPage in `frontend/src/pages/EventPage.jsx` (fetch event data, handle loading/error states)
- [x] T022 [US1] Display loading indicator in EventPage in `frontend/src/pages/EventPage.jsx` (spinner or skeleton while fetching)
- [x] T023 [US1] Display event data in EventPage in `frontend/src/pages/EventPage.jsx` (event name, state, typeOfItem)
- [x] T024 [US1] Display error message for non-existent event in EventPage in `frontend/src/pages/EventPage.jsx` (404 error handling)
- [x] T025 [US1] Add route for /event/:eventId in `frontend/src/App.jsx` (wrap in ProtectedRoute)
- [x] T026 [US1] Create EventContext in `frontend/src/contexts/EventContext.jsx` (provide event data to Header component)
- [x] T027 [US1] Update Header component to display event name in `frontend/src/components/Header.jsx` (use useLocation to detect /event/* routes, use EventContext for event name)
- [x] T028 [US1] Implement event name truncation in Header in `frontend/src/components/Header.jsx` (CSS truncate with max-width, ellipsis)
- [x] T029 [US1] Remove event name from Header when leaving event routes in `frontend/src/components/Header.jsx` (check location.pathname)
- [x] T030 [P] [US1] Create useEventPolling hook in `frontend/src/hooks/useEventPolling.js` (setInterval for polling, cleanup on unmount, configurable interval 30-60 seconds)
- [x] T031 [US1] Integrate useEventPolling in EventPage in `frontend/src/pages/EventPage.jsx` (poll for event updates, update UI on state change)
- [x] T032 [US1] Implement state validation before user actions in EventPage in `frontend/src/pages/EventPage.jsx` (check event state before allowing rating, show error if invalid)
- [x] T033 [US1] Update UI to reflect event state in EventPage in `frontend/src/pages/EventPage.jsx` (disable rating when paused/finished, show state message)
- [x] T034 [US1] Pause polling when page is not visible in `frontend/src/hooks/useEventPolling.js` (use Page Visibility API)
- [x] T035 [US1] Handle polling errors gracefully in `frontend/src/hooks/useEventPolling.js` (retry with exponential backoff, don't stop polling on single error)
- [x] T036 [P] [US1] Unit test for useEventPolling hook in `frontend/tests/unit/useEventPolling.test.js` (polling interval, cleanup on unmount, state change detection)
- [x] T037 [P] [US1] Unit test for state validation on actions in `frontend/tests/unit/EventPage.test.jsx` (validate state before allowing action)
- [x] T038 [P] [US1] E2E test for state synchronization in `frontend/tests/e2e/features/event-access.feature` (polling detects changes, action validation)

**Checkpoint**: At this point, User Story 1 should be fully functional - authenticated users can access event pages, see event name in header, and see state updates via polling

---

## Phase 4: User Story 2 - Access Event Admin Page (Priority: P1)

**Goal**: Event administrator navigates to `/event/<event-id>/admin`, system validates authentication, verifies event exists, checks administrator status (case-insensitive email comparison), displays admin page, and shows event name in header. Non-administrators are denied access.

**Independent Test**: Navigate to `/event/<event-id>/admin` as administrator, verify admin page loads and access is granted. Navigate as non-administrator, verify access is denied. Test can verify admin access control without requiring navigation controls.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T039 [P] [US2] Unit test for administrator identification logic in `frontend/tests/unit/AdminRoute.test.jsx` (case-insensitive email comparison)
- [x] T040 [P] [US2] Unit test for AdminRoute component in `frontend/tests/unit/AdminRoute.test.jsx` (allows admin, denies non-admin, shows loading)
- [x] T041 [P] [US2] Unit test for EventAdminPage component in `frontend/tests/unit/EventAdminPage.test.jsx` (renders admin content, shows loading, handles errors)
- [x] T042 [P] [US2] E2E test for admin page access flow in `frontend/tests/e2e/features/event-access.feature` (admin access, non-admin denial, unauthenticated redirect)

### Implementation for User Story 2

#### Frontend

- [x] T043 [P] [US2] Create AdminRoute component in `frontend/src/components/AdminRoute.jsx` (check if user is administrator, redirect if not, show loading)
- [x] T044 [US2] Implement case-insensitive email comparison in AdminRoute in `frontend/src/components/AdminRoute.jsx` (convert both emails to lowercase before comparison)
- [x] T045 [US2] Extract user email from JWT token in AdminRoute in `frontend/src/components/AdminRoute.jsx` (decode JWT payload or use auth context)
- [x] T046 [US2] Create EventAdminPage component in `frontend/src/pages/EventAdminPage.jsx` (basic structure, use useParams for eventId)
- [x] T047 [US2] Integrate useEvent hook in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (fetch event data, handle loading/error states)
- [x] T048 [US2] Display loading indicator in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (spinner or skeleton while fetching)
- [x] T049 [US2] Display admin content in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (placeholder for admin functionality)
- [x] T050 [US2] Display error message for non-existent event in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (404 error handling)
- [x] T051 [US2] Display error message for unauthorized access in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (403 error handling via AdminRoute)
- [x] T052 [US2] Add route for /event/:eventId/admin in `frontend/src/App.jsx` (wrap in ProtectedRoute and AdminRoute)
- [x] T053 [US2] Update EventContext to provide isAdmin flag in `frontend/src/contexts/EventContext.jsx` (calculate from user email and event administrator)
- [x] T054 [US2] Integrate useEventPolling in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (poll for event updates)

**Checkpoint**: At this point, User Story 2 should be fully functional - administrators can access admin pages, non-administrators are denied

---

## Phase 5: User Story 3 - Navigate Between Event Main and Admin Pages (Priority: P2)

**Goal**: Event administrator can navigate between event main page and admin page using navigation controls visible only to administrators.

**Independent Test**: As administrator, verify navigation controls appear on both pages and clicking them successfully navigates to corresponding page. As non-administrator, verify navigation controls are hidden.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T055 [P] [US3] Unit test for navigation controls visibility in `frontend/tests/unit/EventPage.test.jsx` (visible for admin, hidden for non-admin)
- [x] T056 [P] [US3] Unit test for navigation controls in EventAdminPage in `frontend/tests/unit/EventAdminPage.test.jsx` (renders back to event button)
- [x] T057 [P] [US3] E2E test for navigation between pages in `frontend/tests/e2e/features/event-access.feature` (admin navigation, non-admin no controls)

### Implementation for User Story 3

#### Frontend

- [x] T058 [US3] Add navigation control to EventPage in `frontend/src/pages/EventPage.jsx` (button/link to /event/:eventId/admin, conditionally render based on isAdmin)
- [x] T059 [US3] Add navigation control to EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (button/link to /event/:eventId, always visible for admin)
- [x] T060 [US3] Implement navigation using React Router in EventPage in `frontend/src/pages/EventPage.jsx` (use useNavigate or Link component)
- [x] T061 [US3] Implement navigation using React Router in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (use useNavigate or Link component)
- [x] T062 [US3] Style navigation controls consistently in `frontend/src/pages/EventPage.jsx` and `frontend/src/pages/EventAdminPage.jsx` (use existing button/link patterns)

**Checkpoint**: At this point, User Story 3 should be fully functional - administrators can navigate between main and admin pages

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T063 [P] Add comprehensive error logging for event retrieval failures in `backend/src/services/EventService.js`
- [x] T064 [P] Add input validation for event ID format in `backend/src/api/events.js` (validate 8-character alphanumeric before processing)
- [x] T065 [P] Verify mobile responsiveness of EventPage in `frontend/src/pages/EventPage.jsx` (responsive classes, mobile-first design)
- [x] T066 [P] Verify mobile responsiveness of EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (responsive classes, mobile-first design)
- [x] T067 [P] Add accessibility attributes to navigation controls in `frontend/src/pages/EventPage.jsx` and `frontend/src/pages/EventAdminPage.jsx` (aria-labels, keyboard navigation)
- [x] T068 [P] Optimize event data caching in `backend/src/data/FileDataRepository.js` (ensure cache keys are correct, TTL appropriate)
- [x] T069 [P] Add performance validation for event page load times in `frontend/src/pages/EventPage.jsx` (measure load time, verify <2 seconds per SC-001, log for monitoring)
- [x] T070 [P] Add performance validation for admin page load times in `frontend/src/pages/EventAdminPage.jsx` (measure load time, verify <2 seconds per SC-002, log for monitoring)
- [x] T071 [P] Add performance validation for navigation between pages in `frontend/src/pages/EventPage.jsx` and `frontend/src/pages/EventAdminPage.jsx` (measure navigation time, verify <1 second per SC-008)
- [x] T072 [P] Run quickstart.md validation to ensure all implementation steps are documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - Depends on User Story 1 for EventContext and Header updates
  - User Story 3 (P2): Depends on User Story 1 and User Story 2 completion
  - User Story 4 (P2): Depends on User Story 1 completion (can work with US2 in parallel)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories. Includes state synchronization (polling) per acceptance scenario 6
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses EventContext and Header from US1, but can be implemented in parallel with minor coordination
- **User Story 3 (P2)**: Depends on User Story 1 and User Story 2 - Needs both pages and admin identification

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Backend before frontend (API endpoint before frontend consumption)
- Hooks before components (useEvent before EventPage)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - User Story 1 can start immediately
  - User Story 2 can start in parallel with US1 (with minor coordination on EventContext)
  - User Story 4 can start in parallel with US1 (polling is independent)
- All tests for a user story marked [P] can run in parallel
- Backend and frontend tasks within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for EventService.getEvent in backend/tests/unit/EventService.test.js"
Task: "Integration test for GET /api/events/:eventId endpoint in backend/tests/integration/events.test.js"
Task: "Unit test for useEvent hook in frontend/tests/unit/useEvent.test.js"
Task: "Unit test for EventPage component in frontend/tests/unit/EventPage.test.jsx"
Task: "E2E test for event page access flow in frontend/tests/e2e/features/event-access.feature"

# Launch backend and frontend implementation in parallel:
Task: "Implement getEvent method in backend/src/services/EventService.js"
Task: "Create EventPage component in frontend/src/pages/EventPage.jsx"
Task: "Create EventContext in frontend/src/contexts/EventContext.jsx"
Task: "Update Header component to display event name in frontend/src/components/Header.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (includes state synchronization) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo (navigation)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (event page access, including polling)
   - Developer B: User Story 2 (admin page access) - coordinate on EventContext
3. After US1 and US2 complete:
   - Developer A: User Story 3 (navigation)
   - Developer B: Polish tasks
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Event ID format: 8-character alphanumeric (`/^[A-Za-z0-9]{8}$/`)
- Email comparison: Case-insensitive (convert to lowercase before comparison)
- Polling interval: 30-60 seconds (configurable, start with 30 seconds)
- Performance targets: Page load <2 seconds (SC-001, SC-002), navigation <1 second (SC-008)
- Performance validation: Tasks T069-T071 in Polish phase verify performance targets are met per success criteria; early validation can be added during US1/US2 implementation if performance issues are detected
