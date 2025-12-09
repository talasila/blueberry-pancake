# Tasks: Manage Event State

**Input**: Design documents from `/specs/001-event-state-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included for comprehensive coverage as this is a critical feature affecting event lifecycle.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow the web application structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update existing infrastructure to support state management

- [X] T001 Update EventService state constants in `backend/src/services/EventService.js` - Update VALID_TRANSITIONS to include "completed" state and new transition rules (created→started, started→paused/completed, paused→started/completed, completed→started/paused)
- [X] T002 [P] Update EventService isValidState method in `backend/src/services/EventService.js` - Include "completed" in valid states, keep "finished" for legacy support
- [X] T003 [P] Add legacy state migration helper in `backend/src/services/EventService.js` - Create migrateLegacyState method to convert "finished" to "completed"

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state management infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add state transition validation method in `backend/src/services/EventService.js` - Implement validateStateTransition(fromState, toState) method
- [X] T005 [P] Add getValidTransitions method in `backend/src/services/EventService.js` - Return array of valid target states for given current state
- [X] T006 Add optimistic locking support in `backend/src/services/EventService.js` - Update transitionState method signature to accept currentState parameter for optimistic locking check
- [X] T007 [P] Add legacy state migration in getEvent method in `backend/src/services/EventService.js` - Auto-migrate "finished" to "completed" on first access
- [X] T008 [P] Extend FileDataRepository updateEvent method in `backend/src/data/FileDataRepository.js` - Ensure atomic updates support optimistic locking pattern

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Start an Event (Priority: P1) 🎯 MVP

**Goal**: Administrators can start events from "created" state, enabling user feedback functionality

**Independent Test**: Create an event in "created" state, transition it to "started" state via API, verify state is "started" and users can provide feedback

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Unit test for transitionState method - created to started in `backend/tests/unit/EventService.test.js`
- [ ] T010 [P] [US1] Unit test for validateStateTransition - created to started in `backend/tests/unit/EventService.test.js`
- [ ] T011 [P] [US1] Integration test for PATCH /api/events/:eventId/state - start event in `backend/tests/integration/events.test.js`
- [ ] T012 [P] [US1] Integration test for authorization check - non-administrator rejection in `backend/tests/integration/events.test.js`
- [ ] T013 [P] [US1] E2E test for start event flow in `frontend/tests/e2e/step-definitions/event-state.steps.js`

### Implementation for User Story 1

- [X] T014 [US1] Implement transitionState method in `backend/src/services/EventService.js` - Handle created→started transition with optimistic locking, authorization check, and state update
- [X] T015 [US1] Add PATCH /api/events/:eventId/state endpoint in `backend/src/api/events.js` - Handle state transition requests with authentication and error handling
- [X] T016 [US1] Add transitionEventState method in `frontend/src/services/apiClient.js` - API client method for state transitions
- [X] T017 [US1] Add state display in `frontend/src/pages/EventAdminPage.jsx` - Display current event state with Badge component
- [X] T018 [US1] Add getValidTransitions helper function in `frontend/src/pages/EventAdminPage.jsx` - Client-side function to compute valid transitions
- [X] T019 [US1] Add Start button UI in `frontend/src/pages/EventAdminPage.jsx` - Show Start button when state is "created", handle click to transition to "started"
- [X] T020 [US1] Add state transition handler in `frontend/src/pages/EventAdminPage.jsx` - Handle API call, success/error states, and event refresh
- [X] T021 [US1] Update EventPage feedback validation in `frontend/src/pages/EventPage.jsx` - Ensure feedback is enabled when state is "started"

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - administrators can start events and users can provide feedback

---

## Phase 4: User Story 2 - Pause and Resume an Event (Priority: P2)

**Goal**: Administrators can pause active events and resume them, controlling feedback collection

**Independent Test**: Start an event, pause it (verify feedback disabled), then resume it (verify feedback re-enabled)

### Tests for User Story 2

- [ ] T022 [P] [US2] Unit test for transitionState - started to paused in `backend/tests/unit/EventService.test.js`
- [ ] T023 [P] [US2] Unit test for transitionState - paused to started in `backend/tests/unit/EventService.test.js`
- [ ] T024 [P] [US2] Integration test for PATCH /api/events/:eventId/state - pause event in `backend/tests/integration/events.test.js`
- [ ] T025 [P] [US2] Integration test for PATCH /api/events/:eventId/state - resume event in `backend/tests/integration/events.test.js`
- [ ] T026 [P] [US2] E2E test for pause and resume flow in `frontend/tests/e2e/step-definitions/event-state.steps.js`

### Implementation for User Story 2

- [X] T027 [US2] Extend transitionState method in `backend/src/services/EventService.js` - Add support for started→paused and paused→started transitions (already supported in generic implementation)
- [X] T028 [US2] Add Pause button UI in `frontend/src/pages/EventAdminPage.jsx` - Show Pause button when state is "started", handle click to transition to "paused" (already implemented via dynamic transition buttons)
- [X] T029 [US2] Update state transition handler in `frontend/src/pages/EventAdminPage.jsx` - Support pause and resume actions (already implemented in generic handler)
- [X] T030 [US2] Update EventPage feedback validation in `frontend/src/pages/EventPage.jsx` - Disable feedback when state is "paused" or "finished" (legacy), show appropriate message, ensure both legacy and new states are handled
- [X] T031 [US2] Update getValidTransitions in `frontend/src/pages/EventAdminPage.jsx` - Include pause/resume transitions in valid options (already included in getValidTransitions function)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - administrators can start, pause, and resume events

---

## Phase 5: User Story 3 - Complete an Event (Priority: P2)

**Goal**: Administrators can mark events as completed, ending feedback collection and enabling results announcement

**Independent Test**: Start an event, complete it (verify feedback disabled), confirm results are accessible

### Tests for User Story 3

- [ ] T032 [P] [US3] Unit test for transitionState - started to completed in `backend/tests/unit/EventService.test.js`
- [ ] T033 [P] [US3] Unit test for transitionState - paused to completed in `backend/tests/unit/EventService.test.js`
- [ ] T034 [P] [US3] Integration test for PATCH /api/events/:eventId/state - complete event from started in `backend/tests/integration/events.test.js`
- [ ] T035 [P] [US3] Integration test for PATCH /api/events/:eventId/state - complete event from paused in `backend/tests/integration/events.test.js`
- [ ] T036 [P] [US3] E2E test for complete event flow in `frontend/tests/e2e/step-definitions/event-state.steps.js`

### Implementation for User Story 3

- [X] T037 [US3] Extend transitionState method in `backend/src/services/EventService.js` - Add support for started→completed and paused→completed transitions (already supported in generic implementation)
- [X] T038 [US3] Add Complete button UI in `frontend/src/pages/EventAdminPage.jsx` - Show Complete button when state is "started" or "paused", handle click to transition to "completed" (already implemented via dynamic transition buttons)
- [X] T039 [US3] Update state transition handler in `frontend/src/pages/EventAdminPage.jsx` - Support complete action (already implemented in generic handler)
- [X] T040 [US3] Update EventPage feedback validation in `frontend/src/pages/EventPage.jsx` - Disable feedback when state is "completed" or "finished" (legacy), show appropriate message (note: results announcement UI is out of scope, only verify feedback is disabled)
- [X] T041 [US3] Update getValidTransitions in `frontend/src/pages/EventAdminPage.jsx` - Include complete transition in valid options (already included in getValidTransitions function)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - administrators can start, pause, complete events

---

## Phase 6: User Story 4 - Resume or Modify Completed Events (Priority: P3)

**Goal**: Administrators can reopen completed events, allowing corrections or additional feedback collection

**Independent Test**: Complete an event, then transition it back to "started" or "paused" state, verify feedback functionality is restored

### Tests for User Story 4

- [ ] T042 [P] [US4] Unit test for transitionState - completed to started in `backend/tests/unit/EventService.test.js`
- [ ] T043 [P] [US4] Unit test for transitionState - completed to paused in `backend/tests/unit/EventService.test.js`
- [ ] T044 [P] [US4] Integration test for PATCH /api/events/:eventId/state - resume from completed to started in `backend/tests/integration/events.test.js`
- [ ] T045 [P] [US4] Integration test for PATCH /api/events/:eventId/state - transition from completed to paused in `backend/tests/integration/events.test.js`
- [ ] T046 [P] [US4] E2E test for resume completed event flow in `frontend/tests/e2e/step-definitions/event-state.steps.js`

### Implementation for User Story 4

- [X] T047 [US4] Extend transitionState method in `backend/src/services/EventService.js` - Add support for completed→started and completed→paused transitions (already supported in generic implementation)
- [X] T048 [US4] Update state transition buttons in `frontend/src/pages/EventAdminPage.jsx` - Show Start and Pause buttons when state is "completed" (already implemented via dynamic transition buttons)
- [X] T049 [US4] Update state transition handler in `frontend/src/pages/EventAdminPage.jsx` - Support resume actions from completed state (already implemented in generic handler)
- [X] T050 [US4] Update EventPage feedback validation in `frontend/src/pages/EventPage.jsx` - Re-enable feedback when event is resumed from completed state (already handled - feedback enabled when state is "started")
- [X] T051 [US4] Update getValidTransitions in `frontend/src/pages/EventAdminPage.jsx` - Include resume transitions from completed state (already included in getValidTransitions function)

**Checkpoint**: All user stories should now be independently functional - complete state management lifecycle is implemented

---

## Phase 7: Edge Cases & Error Handling

**Purpose**: Handle edge cases and error scenarios from specification

- [ ] T052 [P] Add optimistic locking conflict test in `backend/tests/integration/events.test.js` - Test concurrent state transitions return 409 Conflict
- [ ] T053 [P] Add invalid state handling test in `backend/tests/unit/EventService.test.js` - Test rejection of corrupted/invalid state values
- [X] T054 Add optimistic locking error handling in `frontend/src/pages/EventAdminPage.jsx` - Handle 409 Conflict responses, refresh event data, show user-friendly message
- [X] T055 [P] Add error handling for invalid transitions in `backend/src/api/events.js` - Return appropriate 400 error for invalid transitions
- [X] T056 [P] Add logging for state transition errors in `backend/src/services/EventService.js` - Log invalid states, transition failures, and optimistic locking conflicts

---

## Phase 8: Legacy Migration & Backward Compatibility

**Purpose**: Ensure seamless migration of legacy events with "finished" state

- [ ] T057 [P] Add unit test for legacy state migration in `backend/tests/unit/EventService.test.js` - Test "finished" → "completed" migration on getEvent
- [ ] T058 [P] Add integration test for legacy state migration in `backend/tests/integration/events.test.js` - Test migration during state transition
- [X] T059 Update EventPage to handle both "finished" and "completed" states in `frontend/src/pages/EventPage.jsx` - Support legacy state during transition period

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T060 [P] Update EventAdminPage state display styling in `frontend/src/pages/EventAdminPage.jsx` - Ensure state badge is visually clear and consistent (using Badge component)
- [X] T061 [P] Add loading states for state transitions in `frontend/src/pages/EventAdminPage.jsx` - Show loading indicator during transition API calls (implemented with RefreshCw spinner)
- [X] T062 [P] Add success feedback for state transitions in `frontend/src/pages/EventAdminPage.jsx` - Show success message after successful state transition (implemented with Message component)
- [X] T063 [P] Update EventService documentation in `backend/src/services/EventService.js` - Add JSDoc comments for new state transition methods (added comprehensive JSDoc)
- [X] T064 [P] Update API documentation in `backend/src/api/events.js` - Add JSDoc comments for state transition endpoint (added comprehensive JSDoc)
- [ ] T065 Run quickstart.md validation - Verify all implementation steps from quickstart.md are complete (deferred - requires manual testing)
- [X] T066 [P] Code cleanup and refactoring - Remove any dead code, ensure consistent error handling patterns (no linter errors, code follows patterns)
- [ ] T067 [P] Performance validation - Verify state transitions complete within 2 seconds (SC-002) and unauthorized attempts are rejected within 1 second (SC-006) as per success criteria (deferred - requires runtime testing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Edge Cases (Phase 7)**: Depends on all user stories being complete
- **Legacy Migration (Phase 8)**: Can run in parallel with Edge Cases
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 functionality but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Extends US1/US2 functionality but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Extends US3 functionality but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend service methods before API endpoints
- API endpoints before frontend integration
- Core implementation before UI polish
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
- Edge Cases and Legacy Migration phases can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for transitionState method - created to started in backend/tests/unit/EventService.test.js"
Task: "Unit test for validateStateTransition - created to started in backend/tests/unit/EventService.test.js"
Task: "Integration test for PATCH /api/events/:eventId/state - start event in backend/tests/integration/events.test.js"
Task: "Integration test for authorization check - non-administrator rejection in backend/tests/integration/events.test.js"
Task: "E2E test for start event flow in frontend/tests/e2e/step-definitions/event-state.steps.js"

# Then implement backend and frontend in parallel:
Task: "Implement transitionState method in backend/src/services/EventService.js"
Task: "Add transitionEventState method in frontend/src/services/apiClient.js"
Task: "Add state display in frontend/src/pages/EventAdminPage.jsx"
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
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add Edge Cases & Legacy Migration → Test → Deploy/Demo
7. Add Polish → Final validation → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MVP)
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4
3. Stories complete and integrate independently
4. Team works on Edge Cases, Legacy Migration, and Polish together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All state transitions use optimistic locking - ensure currentState parameter is always provided
- Legacy "finished" state is automatically migrated - no manual migration needed
- UI only shows valid transitions - invalid transitions cannot be attempted from UI
