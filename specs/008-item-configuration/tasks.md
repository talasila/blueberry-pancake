# Tasks: Item Configuration in Event Admin

**Input**: Design documents from `/specs/008-item-configuration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included for comprehensive coverage. All test tasks should be written first and verified to fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow the web application structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Note**: This feature extends existing infrastructure. No new setup tasks required as we're building on existing EventService, API routes, and React components.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Note**: This feature builds on existing EventService, FileDataRepository, and authentication infrastructure. No new foundational tasks required.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure Number of Items (Priority: P1) 🎯 MVP

**Goal**: Enable event administrators to configure the total number of items for blind tasting events. Items are numbered sequentially from 1 to the configured number. Default value is 20, range is 1-100.

**Independent Test**: Navigate to event admin screen, access item configuration section, set number of items (e.g., 20), save configuration, verify number is persisted and used to generate item IDs from 1 to specified number.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T001 [P] [US1] Unit test for getItemConfiguration method returning defaults in backend/tests/unit/EventService.test.js
- [x] T002 [P] [US1] Unit test for getItemConfiguration method returning configured values in backend/tests/unit/EventService.test.js
- [x] T003 [P] [US1] Unit test for updateItemConfiguration method validating numberOfItems range in backend/tests/unit/EventService.test.js
- [x] T004 [P] [US1] Unit test for updateItemConfiguration method saving numberOfItems in backend/tests/unit/EventService.test.js
- [x] T005 [P] [US1] Integration test for GET /api/events/:eventId/item-configuration endpoint in backend/tests/integration/events.test.js
- [x] T006 [P] [US1] Integration test for PATCH /api/events/:eventId/item-configuration endpoint updating numberOfItems in backend/tests/integration/events.test.js
- [x] T007 [P] [US1] Integration test for PATCH endpoint validation errors in backend/tests/integration/events.test.js
- [ ] T008 [P] [US1] E2E test for configuring number of items flow in frontend/tests/e2e/item-configuration.feature

### Implementation for User Story 1

- [x] T009 [US1] Implement getItemConfiguration method in backend/src/services/EventService.js (returns defaults or configured values)
- [x] T010 [US1] Implement updateItemConfiguration method in backend/src/services/EventService.js (validates numberOfItems range 1-100, saves to event config)
- [x] T011 [US1] Add GET /api/events/:eventId/item-configuration endpoint in backend/src/api/events.js
- [x] T012 [US1] Add PATCH /api/events/:eventId/item-configuration endpoint in backend/src/api/events.js
- [x] T013 [US1] Add getItemConfiguration method to frontend/src/services/apiClient.js
- [x] T014 [US1] Add updateItemConfiguration method to frontend/src/services/apiClient.js
- [x] T015 [US1] Add Item Configuration card component to frontend/src/pages/EventAdminPage.jsx (number of items input field)
- [x] T016 [US1] Add state management for item configuration in frontend/src/pages/EventAdminPage.jsx (numberOfItems state, fetch on load)
- [x] T017 [US1] Add save handler for number of items in frontend/src/pages/EventAdminPage.jsx
- [x] T018 [US1] Add validation and error handling for number of items input in frontend/src/pages/EventAdminPage.jsx
- [x] T019 [US1] Update EventPage to use itemConfiguration.numberOfItems to generate item IDs in frontend/src/pages/EventPage.jsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Administrators can configure the number of items, and the main event page displays item IDs from 1 to the configured number.

---

## Phase 4: User Story 2 - Configure Excluded Item IDs (Priority: P2)

**Goal**: Enable event administrators to specify which item IDs should be excluded from the event. System accepts comma-separated list, normalizes input (removes leading zeros, trims whitespace, removes duplicates), validates range, and prevents excluding all items.

**Independent Test**: Navigate to event admin screen, access item configuration section, enter comma-separated list of item IDs to exclude (e.g., "5,10,15"), save configuration, verify these item IDs are not displayed on main event page.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US2] Unit test for normalizeExcludedItemIds method parsing comma-separated string in backend/tests/unit/EventService.test.js
- [x] T021 [P] [US2] Unit test for normalizeExcludedItemIds method removing leading zeros in backend/tests/unit/EventService.test.js
- [x] T022 [P] [US2] Unit test for normalizeExcludedItemIds method trimming whitespace in backend/tests/unit/EventService.test.js
- [x] T023 [P] [US2] Unit test for normalizeExcludedItemIds method removing duplicates in backend/tests/unit/EventService.test.js
- [x] T024 [P] [US2] Unit test for normalizeExcludedItemIds method validating range in backend/tests/unit/EventService.test.js
- [x] T025 [P] [US2] Unit test for normalizeExcludedItemIds method preventing all items excluded in backend/tests/unit/EventService.test.js
- [x] T026 [P] [US2] Unit test for updateItemConfiguration method handling excludedItemIds in backend/tests/unit/EventService.test.js
- [x] T027 [P] [US2] Unit test for updateItemConfiguration method automatically removing invalid excluded IDs when number reduced in backend/tests/unit/EventService.test.js
- [x] T028 [P] [US2] Integration test for PATCH endpoint with excludedItemIds validation errors in backend/tests/integration/events.test.js
- [x] T029 [P] [US2] Integration test for PATCH endpoint with excludedItemIds success in backend/tests/integration/events.test.js
- [x] T030 [P] [US2] Integration test for PATCH endpoint returning warning when IDs removed in backend/tests/integration/events.test.js
- [ ] T031 [P] [US2] E2E test for configuring excluded item IDs flow in frontend/tests/e2e/item-configuration.feature

### Implementation for User Story 2

- [x] T032 [US2] Implement normalizeExcludedItemIds method in backend/src/services/EventService.js (parse, normalize, validate excluded item IDs)
- [x] T033 [US2] Extend updateItemConfiguration method to handle excludedItemIds in backend/src/services/EventService.js
- [x] T034 [US2] Add automatic cleanup logic for invalid excluded IDs when numberOfItems reduced in backend/src/services/EventService.js
- [x] T035 [US2] Add warning message generation when invalid IDs removed in backend/src/services/EventService.js
- [x] T036 [US2] Extend PATCH endpoint to handle excludedItemIds input in backend/src/api/events.js
- [x] T037 [US2] Add excluded item IDs input field to Item Configuration card in frontend/src/pages/EventAdminPage.jsx
- [x] T038 [US2] Add state management for excluded item IDs input in frontend/src/pages/EventAdminPage.jsx
- [x] T039 [US2] Update save handler to include excludedItemIds in frontend/src/pages/EventAdminPage.jsx
- [x] T040 [US2] Add validation and error handling for excluded item IDs input in frontend/src/pages/EventAdminPage.jsx
- [x] T041 [US2] Add warning message display when IDs are automatically removed in frontend/src/pages/EventAdminPage.jsx
- [x] T042 [US2] Update EventPage to filter out excluded item IDs from display in frontend/src/pages/EventPage.jsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Administrators can configure number of items and excluded item IDs, and the main event page displays only non-excluded item IDs.

---

## Phase 5: User Story 3 - View Item Configuration (Priority: P3)

**Goal**: Display current item configuration (number of items and excluded item IDs) to event administrators on the event admin screen. Show default values when not configured.

**Independent Test**: Navigate to event admin screen, access item configuration section, verify current number of items and excluded item IDs are displayed correctly (or defaults shown if not configured).

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T043 [P] [US3] Integration test for GET endpoint returning default values when not configured in backend/tests/integration/events.test.js
- [x] T044 [P] [US3] Integration test for GET endpoint returning configured values in backend/tests/integration/events.test.js
- [ ] T045 [P] [US3] E2E test for viewing item configuration display in frontend/tests/e2e/item-configuration.feature

### Implementation for User Story 3

- [x] T046 [US3] Ensure GET endpoint returns default values when itemConfiguration not present in backend/src/api/events.js
- [x] T047 [US3] Display current number of items in Item Configuration card in frontend/src/pages/EventAdminPage.jsx
- [x] T048 [US3] Display current excluded item IDs in Item Configuration card in frontend/src/pages/EventAdminPage.jsx
- [x] T049 [US3] Display default values (20 items, empty excluded list) when configuration not present in frontend/src/pages/EventAdminPage.jsx
- [x] T050 [US3] Update displayed values when configuration changes in frontend/src/pages/EventAdminPage.jsx

**Checkpoint**: All user stories should now be independently functional. Administrators can view, configure number of items, configure excluded item IDs, and see the current configuration state.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T051 [P] Add comprehensive error messages for all validation failures in backend/src/services/EventService.js
- [x] T052 [P] Add logging for item configuration operations in backend/src/services/EventService.js
- [x] T053 [P] Add loading states and error handling improvements in frontend/src/pages/EventAdminPage.jsx
- [x] T054 [P] Add success message display after saving configuration in frontend/src/pages/EventAdminPage.jsx
- [ ] T055 [P] Add input validation feedback (real-time) for number of items field in frontend/src/pages/EventAdminPage.jsx
- [ ] T056 [P] Add input validation feedback (real-time) for excluded item IDs field in frontend/src/pages/EventAdminPage.jsx
- [x] T057 [P] Verify mobile responsiveness of Item Configuration card in frontend/src/pages/EventAdminPage.jsx
- [ ] T058 [P] Performance test: Verify error messages display within 500ms (SC-006) in frontend/tests/e2e/item-configuration.feature
- [ ] T059 [P] Performance test: Verify item configuration section displays within 1 second (SC-007) in frontend/tests/e2e/item-configuration.feature
- [ ] T060 [P] Performance test: Verify 95% success rate for valid configuration saves (SC-008) in backend/tests/integration/events.test.js
- [ ] T061 [P] Run quickstart.md validation to ensure all implementation steps are covered
- [ ] T062 [P] Code cleanup and refactoring (remove unused code, improve comments)
- [ ] T063 [P] Update documentation if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (no tasks needed)
- **Foundational (Phase 2)**: No dependencies - can start immediately (no tasks needed, building on existing infrastructure)
- **User Stories (Phase 3+)**: All depend on existing infrastructure (EventService, API routes, React components)
  - User stories can proceed sequentially in priority order (P1 → P2 → P3)
  - US2 builds on US1 (needs numberOfItems to validate excludedItemIds)
  - US3 is independent but benefits from US1 and US2 being complete
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 completion - Needs numberOfItems to validate excludedItemIds range
- **User Story 3 (P3)**: Can start after US1 - Independent but displays data from US1 and US2

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Service methods before API endpoints
- API endpoints before frontend integration
- Backend before frontend
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All test tasks marked [P] within a user story can run in parallel
- Backend and frontend test tasks can run in parallel
- Service method implementation and API endpoint implementation can run in parallel (different files)
- Different user stories can be worked on in parallel by different team members (after dependencies are met)

---

## Parallel Example: User Story 1

```bash
# Launch all unit tests for User Story 1 together:
Task: "Unit test for getItemConfiguration method returning defaults in backend/tests/unit/EventService.test.js"
Task: "Unit test for getItemConfiguration method returning configured values in backend/tests/unit/EventService.test.js"
Task: "Unit test for updateItemConfiguration method validating numberOfItems range in backend/tests/unit/EventService.test.js"
Task: "Unit test for updateItemConfiguration method saving numberOfItems in backend/tests/unit/EventService.test.js"

# Launch all integration tests for User Story 1 together:
Task: "Integration test for GET /api/events/:eventId/item-configuration endpoint in backend/tests/integration/events.test.js"
Task: "Integration test for PATCH /api/events/:eventId/item-configuration endpoint updating numberOfItems in backend/tests/integration/events.test.js"
Task: "Integration test for PATCH endpoint validation errors in backend/tests/integration/events.test.js"

# Launch backend service and API implementation together (after tests):
Task: "Implement getItemConfiguration method in backend/src/services/EventService.js"
Task: "Add GET /api/events/:eventId/item-configuration endpoint in backend/src/api/events.js"
```

---

## Parallel Example: User Story 2

```bash
# Launch all normalization unit tests together:
Task: "Unit test for normalizeExcludedItemIds method parsing comma-separated string in backend/tests/unit/EventService.test.js"
Task: "Unit test for normalizeExcludedItemIds method removing leading zeros in backend/tests/unit/EventService.test.js"
Task: "Unit test for normalizeExcludedItemIds method trimming whitespace in backend/tests/unit/EventService.test.js"
Task: "Unit test for normalizeExcludedItemIds method removing duplicates in backend/tests/unit/EventService.test.js"
Task: "Unit test for normalizeExcludedItemIds method validating range in backend/tests/unit/EventService.test.js"
Task: "Unit test for normalizeExcludedItemIds method preventing all items excluded in backend/tests/unit/EventService.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (no tasks needed)
2. Complete Phase 2: Foundational (no tasks needed)
3. Complete Phase 3: User Story 1 (Configure Number of Items)
   - Write tests first (T001-T008)
   - Implement backend (T009-T012)
   - Implement frontend (T013-T019)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (no tasks)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add Polish → Final release
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (no tasks)
2. Once ready:
   - Developer A: User Story 1 (backend focus)
   - Developer B: User Story 1 (frontend focus)
3. After US1 complete:
   - Developer A: User Story 2 (backend focus)
   - Developer B: User Story 2 (frontend focus)
   - Developer C: User Story 3 (can start in parallel)
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
- US2 depends on US1 for numberOfItems validation, but can be tested independently with mock data
- All tasks include exact file paths for clarity

---

## Task Summary

**Total Tasks**: 63

**By Phase**:
- Phase 1 (Setup): 0 tasks
- Phase 2 (Foundational): 0 tasks
- Phase 3 (User Story 1): 19 tasks (8 tests + 11 implementation)
- Phase 4 (User Story 2): 23 tasks (12 tests + 11 implementation)
- Phase 5 (User Story 3): 8 tasks (3 tests + 5 implementation)
- Phase 6 (Polish): 13 tasks (3 performance tests + 10 other improvements)

**By User Story**:
- User Story 1: 19 tasks
- User Story 2: 23 tasks
- User Story 3: 8 tasks

**Parallel Opportunities**: 
- 45 tasks marked [P] can run in parallel with other [P] tasks
- Tests can be written in parallel
- Backend and frontend work can proceed in parallel after initial setup

**Independent Test Criteria**:
- **US1**: Configure number of items, save, verify persistence and item ID generation
- **US2**: Configure excluded item IDs, save, verify exclusion on main event page
- **US3**: View current configuration, verify display of values or defaults

**Suggested MVP Scope**: User Story 1 only (Configure Number of Items) - 19 tasks total
