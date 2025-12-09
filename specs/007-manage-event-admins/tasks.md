# Tasks: Manage Event Administrators

**Input**: Design documents from `/specs/007-manage-event-admins/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as they are required by the constitution (Testing Standards - NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow web application structure

## Phase 1: Setup (Data Structure Support)

**Purpose**: Prepare data structure support for administrators object

- [X] T001 Add migration helper method `migrateAdministratorField` to `backend/src/services/EventService.js`
- [X] T002 [P] Add helper method `isAdministrator` to check administrator status in `backend/src/services/EventService.js`
- [X] T003 [P] Add helper method `isOwner` to check owner status in `backend/src/services/EventService.js`
- [X] T004 [P] Add helper method `normalizeEmail` for email normalization in `backend/src/services/EventService.js`
- [X] T005 [P] Add helper method `isValidEmail` for email format validation in `backend/src/services/EventService.js`
- [X] T006 Update `createEvent` method to use administrators object structure (replace `administrator` string field with `administrators` object containing email key, assignedAt timestamp, and owner: true flag) in `backend/src/services/EventService.js`

---

## Phase 2: Foundational (Migration & Core Infrastructure)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement lazy migration logic in `getEvent` method to migrate existing events in `backend/src/services/EventService.js`
- [X] T008 [P] Add unit test for `migrateAdministratorField` method in `backend/tests/unit/EventService.test.js`
- [X] T009 [P] Add unit test for `isAdministrator` method in `backend/tests/unit/EventService.test.js`
- [X] T010 [P] Add unit test for `isOwner` method in `backend/tests/unit/EventService.test.js`
- [X] T011 [P] Add unit test for `normalizeEmail` method in `backend/tests/unit/EventService.test.js`
- [X] T012 [P] Add unit test for `isValidEmail` method in `backend/tests/unit/EventService.test.js`
- [X] T013 Add integration test for event creation with administrators object structure (verify owner flag and assignedAt timestamp) in `backend/tests/integration/events.test.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add New Administrator to Event (Priority: P1) 🎯 MVP

**Goal**: Enable event administrators to add new administrators by entering email addresses. New administrators are automatically added to the users section.

**Independent Test**: Navigate to event admin screen, enter valid email address for new administrator, submit form, verify new administrator appears in administrators list and users section.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T014 [P] [US1] Add unit test for `addAdministrator` method - success case in `backend/tests/unit/EventService.test.js`
- [X] T015 [P] [US1] Add unit test for `addAdministrator` method - duplicate administrator in `backend/tests/unit/EventService.test.js`
- [X] T016 [P] [US1] Add unit test for `addAdministrator` method - invalid email format in `backend/tests/unit/EventService.test.js`
- [X] T017 [P] [US1] Add unit test for `addAdministrator` method - unauthorized requester in `backend/tests/unit/EventService.test.js`
- [X] T018 [P] [US1] Add unit test for `addAdministrator` method - self-addition attempt in `backend/tests/unit/EventService.test.js`
- [X] T019 [P] [US1] Add integration test for POST /api/events/:eventId/administrators endpoint - success case in `backend/tests/integration/events.test.js`
- [X] T020 [P] [US1] Add integration test for POST /api/events/:eventId/administrators endpoint - duplicate administrator in `backend/tests/integration/events.test.js`
- [X] T021 [P] [US1] Add integration test for POST /api/events/:eventId/administrators endpoint - invalid email in `backend/tests/integration/events.test.js`
- [X] T022 [P] [US1] Add integration test for POST /api/events/:eventId/administrators endpoint - unauthorized access in `backend/tests/integration/events.test.js`
- [ ] T023 [P] [US1] Add E2E test for add administrator flow in `frontend/tests/e2e/administrators.feature` (E2E tests deferred - can be added separately)

### Implementation for User Story 1

- [X] T024 [US1] Implement `addAdministrator` method in `backend/src/services/EventService.js` with email validation, duplicate check, and atomic update to administrators and users sections
- [X] T025 [US1] Add POST /api/events/:eventId/administrators endpoint in `backend/src/api/events.js` with authentication and authorization checks
- [X] T026 [US1] Add error handling for add administrator endpoint in `backend/src/api/events.js`
- [X] T027 [US1] Add `addAdministrator` method to API client in `frontend/src/services/apiClient.js`
- [X] T028 [US1] Create Administrators Management card component structure in `frontend/src/pages/EventAdminPage.jsx` (Card, CardHeader, CardTitle, CardDescription, CardContent)
- [X] T029 [US1] Add email input field and submit button for adding administrator in `frontend/src/pages/EventAdminPage.jsx`
- [X] T030 [US1] Implement form submission handler for adding administrator in `frontend/src/pages/EventAdminPage.jsx`
- [X] T031 [US1] Add email validation (client-side) in `frontend/src/pages/EventAdminPage.jsx`
- [X] T032 [US1] Add success message display after adding administrator in `frontend/src/pages/EventAdminPage.jsx`
- [X] T033 [US1] Add error message display for add administrator failures in `frontend/src/pages/EventAdminPage.jsx`
- [X] T034 [US1] Add loading state during add administrator operation in `frontend/src/pages/EventAdminPage.jsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Administrators can be added via the UI, and they are automatically added to the users section.

---

## Phase 4: User Story 2 - Delete Administrator from Event (Priority: P2)

**Goal**: Enable event administrators to delete other administrators (except the owner). Deleted administrators are automatically removed from the users section. Owner deletion is prevented.

**Independent Test**: Navigate to event admin screen, select non-owner administrator to delete, confirm deletion, verify administrator removed from both administrators list and users section. Verify owner deletion is prevented.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T035 [P] [US2] Add unit test for `deleteAdministrator` method - success case in `backend/tests/unit/EventService.test.js`
- [X] T036 [P] [US2] Add unit test for `deleteAdministrator` method - owner deletion prevention in `backend/tests/unit/EventService.test.js`
- [X] T037 [P] [US2] Add unit test for `deleteAdministrator` method - unauthorized requester in `backend/tests/unit/EventService.test.js`
- [X] T038 [P] [US2] Add unit test for `deleteAdministrator` method - administrator not found in `backend/tests/unit/EventService.test.js`
- [X] T039 [P] [US2] Add unit test for `deleteAdministrator` method - atomic update to users section in `backend/tests/unit/EventService.test.js`
- [X] T040 [P] [US2] Add integration test for DELETE /api/events/:eventId/administrators/:email endpoint - success case in `backend/tests/integration/events.test.js`
- [X] T041 [P] [US2] Add integration test for DELETE /api/events/:eventId/administrators/:email endpoint - owner deletion prevention in `backend/tests/integration/events.test.js`
- [X] T042 [P] [US2] Add integration test for DELETE /api/events/:eventId/administrators/:email endpoint - unauthorized access in `backend/tests/integration/events.test.js`
- [ ] T043 [P] [US2] Add E2E test for delete administrator flow in `frontend/tests/e2e/administrators.feature` (E2E tests deferred - can be added separately)
- [ ] T044 [P] [US2] Add E2E test for owner deletion prevention in `frontend/tests/e2e/administrators.feature` (E2E tests deferred - can be added separately)

### Implementation for User Story 2

- [X] T045 [US2] Implement `deleteAdministrator` method in `backend/src/services/EventService.js` with owner protection, authorization check, and atomic update to administrators and users sections
- [X] T046 [US2] Add DELETE /api/events/:eventId/administrators/:email endpoint in `backend/src/api/events.js` with authentication and authorization checks
- [X] T047 [US2] Add error handling for delete administrator endpoint in `backend/src/api/events.js`
- [X] T048 [US2] Add `deleteAdministrator` method to API client in `frontend/src/services/apiClient.js`
- [X] T049 [US2] Add delete button for each non-owner administrator in administrators list in `frontend/src/pages/EventAdminPage.jsx`
- [X] T050 [US2] Implement delete confirmation dialog/flow in `frontend/src/pages/EventAdminPage.jsx`
- [X] T051 [US2] Implement delete handler for administrator deletion in `frontend/src/pages/EventAdminPage.jsx`
- [X] T052 [US2] Add success message display after deleting administrator in `frontend/src/pages/EventAdminPage.jsx`
- [X] T053 [US2] Add error message display for delete administrator failures (including owner deletion attempt) in `frontend/src/pages/EventAdminPage.jsx`
- [X] T054 [US2] Add loading state during delete administrator operation in `frontend/src/pages/EventAdminPage.jsx`
- [X] T055 [US2] Disable delete button for owner in administrators list in `frontend/src/pages/EventAdminPage.jsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Administrators can be added and deleted (except owner), with proper validation and error handling.

---

## Phase 5: User Story 3 - View List of Event Administrators (Priority: P3)

**Goal**: Display list of all administrators for an event, showing email addresses, assignment dates, and owner designation.

**Independent Test**: Navigate to event admin screen, verify administrators list displays all administrators with owner clearly marked, including assignment dates.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T056 [P] [US3] Add unit test for `getAdministrators` method in `backend/tests/unit/EventService.test.js`
- [X] T057 [P] [US3] Add integration test for GET /api/events/:eventId/administrators endpoint - success case in `backend/tests/integration/events.test.js`
- [X] T058 [P] [US3] Add integration test for GET /api/events/:eventId/administrators endpoint - unauthorized access in `backend/tests/integration/events.test.js`
- [ ] T059 [P] [US3] Add E2E test for viewing administrators list in `frontend/tests/e2e/administrators.feature` (E2E tests deferred - can be added separately)

### Implementation for User Story 3

- [X] T060 [US3] Implement `getAdministrators` method in `backend/src/services/EventService.js` to return administrators object
- [X] T061 [US3] Add GET /api/events/:eventId/administrators endpoint in `backend/src/api/events.js` with authentication and authorization checks
- [X] T062 [US3] Add error handling for get administrators endpoint in `backend/src/api/events.js`
- [X] T063 [US3] Add `getAdministrators` method to API client in `frontend/src/services/apiClient.js`
- [X] T064 [US3] Fetch administrators list on EventAdminPage load in `frontend/src/pages/EventAdminPage.jsx`
- [X] T065 [US3] Display administrators list with email addresses in `frontend/src/pages/EventAdminPage.jsx`
- [X] T066 [US3] Display assignment dates for each administrator in `frontend/src/pages/EventAdminPage.jsx`
- [X] T067 [US3] Display owner badge/indicator for owner in administrators list in `frontend/src/pages/EventAdminPage.jsx`
- [X] T068 [US3] Format assignment dates for display (e.g., "Added on Jan 27, 2025") in `frontend/src/pages/EventAdminPage.jsx`
- [X] T069 [US3] Add loading state while fetching administrators list in `frontend/src/pages/EventAdminPage.jsx`
- [X] T070 [US3] Refresh administrators list after add/delete operations in `frontend/src/pages/EventAdminPage.jsx`

**Checkpoint**: All user stories should now be independently functional. Administrators can be viewed, added, and deleted (except owner) with proper UI feedback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T071 [P] Verify event creation uses administrators object structure (verification that T006 was completed correctly) in `backend/src/services/EventService.js`
- [ ] T072 [P] Add batch migration script for existing events in `scripts/migrate-administrators.js`
- [X] T073 [P] Add comprehensive error messages for all administrator operations in `backend/src/services/EventService.js`
- [X] T074 [P] Add logging for administrator add/delete operations in `backend/src/services/EventService.js`
- [X] T075 [P] Ensure email case-insensitive handling throughout codebase in `backend/src/services/EventService.js`
- [X] T076 [P] Add email trimming before validation in `backend/src/services/EventService.js`
- [ ] T077 [P] Verify atomic updates work correctly for administrators and users sections in `backend/tests/integration/events.test.js`
- [ ] T078 [P] Add edge case tests for concurrent administrator operations in `backend/tests/integration/events.test.js`
- [ ] T079 [P] Verify mobile responsiveness of Administrators Management card in `frontend/src/pages/EventAdminPage.jsx`
- [ ] T080 [P] Add accessibility attributes (ARIA labels) to administrators management UI in `frontend/src/pages/EventAdminPage.jsx`
- [ ] T081 [P] Run quickstart.md validation to ensure all implementation steps are covered
- [ ] T082 [P] Update API documentation with administrator management endpoints in `specs/007-manage-event-admins/contracts/README.md`
- [ ] T083 [P] Code cleanup and refactoring - remove any dead code or unused imports
- [ ] T084 [P] Performance testing - verify API response times meet targets (<500ms for add/delete, <1s for list)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Service methods before API endpoints
- API endpoints before frontend integration
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Service methods and API endpoints within a story can run in parallel if they don't conflict
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Add unit test for addAdministrator method - success case in backend/tests/unit/EventService.test.js"
Task: "Add unit test for addAdministrator method - duplicate administrator in backend/tests/unit/EventService.test.js"
Task: "Add unit test for addAdministrator method - invalid email format in backend/tests/unit/EventService.test.js"
Task: "Add unit test for addAdministrator method - unauthorized requester in backend/tests/unit/EventService.test.js"
Task: "Add unit test for addAdministrator method - self-addition attempt in backend/tests/unit/EventService.test.js"
Task: "Add integration test for POST /api/events/:eventId/administrators endpoint - success case in backend/tests/integration/events.test.js"
Task: "Add integration test for POST /api/events/:eventId/administrators endpoint - duplicate administrator in backend/tests/integration/events.test.js"
Task: "Add integration test for POST /api/events/:eventId/administrators endpoint - invalid email in backend/tests/integration/events.test.js"
Task: "Add integration test for POST /api/events/:eventId/administrators endpoint - unauthorized access in backend/tests/integration/events.test.js"
Task: "Add E2E test for add administrator flow in frontend/tests/e2e/administrators.feature"

# Launch implementation tasks that can run in parallel:
Task: "Add addAdministrator method to API client in frontend/src/services/apiClient.js"
Task: "Create Administrators Management card component structure in frontend/src/pages/EventAdminPage.jsx"
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
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Add Administrator)
   - Developer B: User Story 2 (Delete Administrator)
   - Developer C: User Story 3 (View Administrators List)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Migration can be done lazily (on first access) or proactively (batch script)
- Owner protection must be enforced in both service layer and API layer
- Email normalization (lowercase) must be consistent throughout
- Navigation to event admin screen (FR-003) is handled by existing feature - no task needed
- T006 is CRITICAL: Must be completed before any new events are created to ensure administrators object structure from start
- T071 is verification-only: Confirms T006 was completed correctly, does not perform the update

---

## Task Summary

- **Total Tasks**: 84
- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 7 tasks
- **Phase 3 (User Story 1 - Add Administrator)**: 21 tasks (10 tests + 11 implementation)
- **Phase 4 (User Story 2 - Delete Administrator)**: 21 tasks (10 tests + 11 implementation)
- **Phase 5 (User Story 3 - View Administrators)**: 15 tasks (4 tests + 11 implementation)
- **Phase 6 (Polish)**: 14 tasks

**Parallel Opportunities**: 
- Phase 1: 4 tasks can run in parallel
- Phase 2: 5 tasks can run in parallel
- Phase 3: 10 test tasks can run in parallel, 2 implementation tasks can run in parallel
- Phase 4: 10 test tasks can run in parallel, implementation tasks are sequential
- Phase 5: 4 test tasks can run in parallel, implementation tasks are sequential
- Phase 6: All 14 tasks can run in parallel

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 34 tasks
