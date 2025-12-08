# Tasks: Create Event Functionality

**Input**: Design documents from `/specs/004-create-event/`
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

**Purpose**: Project initialization and dependency installation

- [x] T001 Install nanoid package in backend: `cd backend && npm install nanoid`
- [x] T002 [P] Verify DataRepository infrastructure exists in `backend/src/data/DataRepository.js`
- [x] T003 [P] Verify FileDataRepository exists in `backend/src/data/FileDataRepository.js`
- [x] T004 [P] Verify OTP authentication middleware exists in `backend/src/middleware/requireAuth.js`
- [x] T005 [P] Verify ProtectedRoute component exists in `frontend/src/components/ProtectedRoute.jsx`
- [x] T006 [P] Verify landing page with Create button exists in `frontend/src/pages/LandingPage.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Extend FileDataRepository with event creation method in `backend/src/data/FileDataRepository.js` (add `createEvent` method)
- [x] T008 [P] Verify event data directory structure: ensure `data/events/` directory exists or will be created
- [x] T009 [P] Verify API routing structure exists in `backend/src/api/index.js` for registering new routes

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Navigate to Create Event Page via Landing Page (Priority: P1) 🎯 MVP

**Goal**: User clicks "Create" button on landing page, authenticates via OTP (if needed), and navigates to create event page

**Independent Test**: Click Create button on landing page, complete OTP authentication (or use test OTP in dev), verify navigation to create event page. Test can verify navigation flow without requiring event creation to complete.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] E2E test for Create button navigation flow in `frontend/tests/e2e/features/create-event-navigation.feature`
- [ ] T011 [P] [US1] Unit test for Create button click handler in `frontend/tests/unit/LandingPage.test.jsx`

### Implementation for User Story 1

- [x] T012 [US1] Update landing page Create button handler in `frontend/src/pages/LandingPage.jsx` to navigate to `/create-event` route
- [x] T013 [US1] Add protected route for `/create-event` in `frontend/src/App.jsx` using ProtectedRoute component
- [x] T014 [US1] Create placeholder CreateEventPage component in `frontend/src/pages/CreateEventPage.jsx` (basic structure, will be filled in US2)
- [x] T015 [US1] Verify OTP authentication redirect preserves intended destination (check `frontend/src/components/ProtectedRoute.jsx` handles redirect after auth)

**Checkpoint**: At this point, User Story 1 should be fully functional - user can click Create, authenticate, and reach create event page

---

## Phase 4: User Story 2 - Create Event with Required Details (Priority: P1) 🎯 MVP

**Goal**: Authenticated user fills out event form (name, type of item), submits, and event is created with unique ID. User is assigned as administrator, event starts in "created" state, and success popup displays event ID.

**Independent Test**: Fill out event creation form with valid data, submit, verify event is created with correct details, user assigned as administrator, event state is "created", and success popup displays event ID.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US2] Unit test for EventService.createEvent in `backend/tests/unit/EventService.test.js`
- [ ] T017 [P] [US2] Unit test for event name validation in `backend/tests/unit/EventService.test.js`
- [ ] T018 [P] [US2] Unit test for event ID generation and uniqueness in `backend/tests/unit/EventService.test.js`
- [ ] T019 [P] [US2] Integration test for POST /api/events endpoint in `backend/tests/integration/events.test.js`
- [ ] T020 [P] [US2] Unit test for CreateEventPage component in `frontend/tests/unit/CreateEventPage.test.jsx`
- [ ] T021 [P] [US2] E2E test for complete event creation flow in `frontend/tests/e2e/features/create-event.feature`

### Implementation for User Story 2

#### Backend

- [x] T022 [P] [US2] Create EventService class in `backend/src/services/EventService.js` with event creation logic
- [x] T023 [US2] Implement event name validation method in `backend/src/services/EventService.js` (1-100 chars, alphanumeric + spaces/hyphens/underscores)
- [x] T024 [US2] Implement event ID generation with nanoid in `backend/src/services/EventService.js` (8-character, with collision handling - max 3 retries)
- [x] T025 [US2] Implement createEvent method in `backend/src/services/EventService.js` (validate inputs, generate ID, create event object, persist via DataRepository)
- [x] T026 [US2] Create events API route in `backend/src/api/events.js` with POST /api/events endpoint
- [x] T027 [US2] Register events route in `backend/src/api/index.js` with requireAuth middleware
- [x] T028 [US2] Add error handling for validation errors in `backend/src/api/events.js` (400 responses)
- [x] T029 [US2] Add error handling for server errors in `backend/src/api/events.js` (500 responses)

#### Frontend

- [x] T030 [P] [US2] Create CreateEventPage component structure in `frontend/src/pages/CreateEventPage.jsx`
- [x] T031 [US2] Add event name input field in `frontend/src/pages/CreateEventPage.jsx` using shadcn Input component
- [x] T032 [US2] Add type of item dropdown in `frontend/src/pages/CreateEventPage.jsx` (currently only "wine" option)
- [x] T033 [US2] Implement client-side form validation in `frontend/src/pages/CreateEventPage.jsx` (name required, type required)
- [x] T034 [US2] Add form submission handler in `frontend/src/pages/CreateEventPage.jsx` with loading state
- [x] T035 [US2] Add createEvent API client method in `frontend/src/services/apiClient.js`
- [x] T036 [US2] Implement success popup component in `frontend/src/pages/CreateEventPage.jsx` using shadcn Card component
- [x] T037 [US2] Display event ID in success popup in `frontend/src/pages/CreateEventPage.jsx`
- [x] T038 [US2] Add error message display for validation errors in `frontend/src/pages/CreateEventPage.jsx`
- [x] T039 [US2] Add error message display for network/server errors in `frontend/src/pages/CreateEventPage.jsx`
- [x] T040 [US2] Implement duplicate request prevention (disable submit button during creation) in `frontend/src/pages/CreateEventPage.jsx`

**Checkpoint**: At this point, User Story 2 should be fully functional - user can create events, see success popup with event ID

---

## Phase 5: User Story 3 - Event Lifecycle State Management (Priority: P2)

**Goal**: Events have lifecycle states (created/started/paused/finished). Events start in "created" state. State transition logic is defined (but UI is out of scope).

**Independent Test**: Create an event and verify it starts in "created" state. Verify state transition rules are defined (but not implemented - that's future scope).

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T041 [P] [US3] Unit test for event state initialization in `backend/tests/unit/EventService.test.js` (verify new events have state "created")
- [ ] T042 [P] [US3] Unit test for state transition validation logic in `backend/tests/unit/EventService.test.js` (define transition rules, but transitions are out of scope)

### Implementation for User Story 3

- [x] T043 [US3] Ensure event state is set to "created" during event creation in `backend/src/services/EventService.js` (should already be done in US2, verify)
- [x] T044 [US3] Define state transition validation constants in `backend/src/services/EventService.js` (for future use, transitions are out of scope)
- [x] T045 [US3] Add state validation to ensure only valid states are set in `backend/src/services/EventService.js`

**Checkpoint**: At this point, User Story 3 is complete - events start in "created" state, state model is defined for future features

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T046 [P] Add comprehensive error logging for event creation failures in `backend/src/services/EventService.js`
- [x] T047 [P] Add input sanitization for event names in `backend/src/services/EventService.js` (trim whitespace)
- [x] T048 [P] Verify mobile responsiveness of CreateEventPage in `frontend/src/pages/CreateEventPage.jsx` (uses responsive classes: px-4 sm:px-6 lg:px-8, max-w-md)
- [x] T049 [P] Add loading indicators during form submission in `frontend/src/pages/CreateEventPage.jsx` (isSubmitting state, "Creating..." button text)
- [x] T050 [P] Verify success popup is dismissible and non-blocking in `frontend/src/pages/CreateEventPage.jsx` (has Close button, can be dismissed)
- [x] T051 [P] Add accessibility attributes to form fields in `frontend/src/pages/CreateEventPage.jsx` (aria-invalid, aria-describedby, aria-required, required attributes added)
- [x] T052 [P] Run quickstart.md validation checklist (implementation matches quickstart guide)
- [x] T053 [P] Code cleanup and refactoring (remove any dead code, unused imports) - no dead code found
- [x] T054 [P] Update documentation if needed - documentation complete

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
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for navigation flow
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Depends on US2 for event creation (state is set during creation)

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start sequentially (US1 → US2 → US3)
- All tests for a user story marked [P] can run in parallel
- Backend and frontend tasks within US2 marked [P] can run in parallel
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for EventService.createEvent in backend/tests/unit/EventService.test.js"
Task: "Unit test for event name validation in backend/tests/unit/EventService.test.js"
Task: "Unit test for event ID generation in backend/tests/unit/EventService.test.js"
Task: "Integration test for POST /api/events endpoint in backend/tests/integration/events.test.js"
Task: "Unit test for CreateEventPage component in frontend/tests/unit/CreateEventPage.test.jsx"
Task: "E2E test for complete event creation flow in frontend/tests/e2e/features/create-event.feature"

# Launch backend and frontend implementation in parallel:
Backend: "Create EventService class in backend/src/services/EventService.js"
Frontend: "Create CreateEventPage component structure in frontend/src/pages/CreateEventPage.jsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Navigation)
4. Complete Phase 4: User Story 2 (Event Creation)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Navigation works
3. Add User Story 2 → Test independently → Event creation works (MVP!)
4. Add User Story 3 → Test independently → State model defined
5. Each story adds value without breaking previous stories

### Sequential Implementation (Recommended)

With single developer or small team:

1. Team completes Setup + Foundational together
2. Implement User Story 1 (Navigation) → Test → Commit
3. Implement User Story 2 (Event Creation) → Test → Commit
4. Implement User Story 3 (State Management) → Test → Commit
5. Polish phase → Test → Commit

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 is the core functionality - US1 enables it, US3 defines state model
- State transitions (started/paused/finished) are out of scope - only initial "created" state is implemented
- Test OTP "123456" should work for accessing create event page in dev/test environments
