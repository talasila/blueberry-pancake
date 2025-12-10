# Tasks: Event Rating Page

**Input**: Design documents from `/specs/009-event-rating-page/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as they are required by the constitution (Testing Standards - NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below use web app structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify project structure matches plan.md (backend/src/, frontend/src/)
- [x] T002 [P] Review existing FileDataRepository.js in backend/src/data/FileDataRepository.js for CSV operations
- [x] T003 [P] Review existing CacheService in backend/src/cache/CacheService.js for caching patterns
- [x] T004 [P] Review existing API client patterns in frontend/src/services/apiClient.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Create CSV parser utility with RFC 4180 escaping in backend/src/utils/csvParser.js
- [x] T006 [P] Create RatingService with CSV operations in backend/src/services/RatingService.js
- [x] T007 [P] Create ratings API routes in backend/src/api/ratings.js
- [x] T008 Register ratings routes in backend/src/app.js
- [x] T009 [P] Create frontend rating service (API client) in frontend/src/services/ratingService.js
- [x] T010 [P] Create bookmark storage utility in frontend/src/utils/bookmarkStorage.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Access Items for Rating (Priority: P1) 🎯 MVP

**Goal**: Users can see all available items as numbered buttons on the event page and open item details by clicking a button.

**Independent Test**: Navigate to an event page and verify that all available items are displayed as numbered buttons in a dialpad-style layout, and clicking any button opens the drawer component.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] [US1] Unit test for ItemButton component in frontend/tests/unit/ItemButton.test.jsx
- [ ] T012 [P] [US1] Unit test for RatingDrawer component (basic open/close) in frontend/tests/unit/RatingDrawer.test.jsx
- [ ] T013 [P] [US1] Integration test for item button display and drawer opening in frontend/tests/integration/item-access.test.jsx

### Implementation for User Story 1

- [x] T014 [P] [US1] Create ItemButton component in frontend/src/components/ItemButton.jsx
- [x] T015 [P] [US1] Create RatingDrawer component (basic structure with open/close) in frontend/src/components/RatingDrawer.jsx
- [x] T016 [US1] Update EventPage to display item buttons in dialpad layout in frontend/src/pages/EventPage.jsx
- [x] T017 [US1] Implement item button click handler to open drawer in frontend/src/pages/EventPage.jsx
- [x] T018 [US1] Implement drawer close functionality in frontend/src/pages/EventPage.jsx
- [x] T019 [US1] Filter excluded items from button display in frontend/src/pages/EventPage.jsx
- [x] T020 [US1] Ensure only one drawer is open at a time in frontend/src/pages/EventPage.jsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - users can see items and open drawers

---

## Phase 4: User Story 2 - Rate Items When Event is Started (Priority: P1) 🎯 MVP

**Goal**: Users can provide ratings and optional notes for items when an event is in the "started" state.

**Independent Test**: Open an item drawer when the event is in "started" state, select a rating, optionally add a note, submit, and verify the rating is saved and the button is colored appropriately.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T021 [P] [US2] Unit test for csvParser RFC 4180 escaping in backend/tests/unit/csvParser.test.js
- [ ] T022 [P] [US2] Unit test for RatingService getRatings in backend/tests/unit/RatingService.test.js
- [ ] T023 [P] [US2] Unit test for RatingService submitRating (new rating) in backend/tests/unit/RatingService.test.js
- [ ] T024 [P] [US2] Unit test for RatingService submitRating (replace existing) in backend/tests/unit/RatingService.test.js
- [ ] T025 [P] [US2] Contract test for GET /api/events/:eventId/ratings in backend/tests/integration/ratings.test.js
- [ ] T026 [P] [US2] Contract test for POST /api/events/:eventId/ratings in backend/tests/integration/ratings.test.js
- [ ] T027 [P] [US2] Contract test for GET /api/events/:eventId/ratings/:itemId in backend/tests/integration/ratings.test.js
- [ ] T028 [P] [US2] Unit test for RatingForm component in frontend/tests/unit/RatingForm.test.jsx
- [ ] T029 [P] [US2] Integration test for rating submission flow in frontend/tests/integration/rating-submission.test.jsx

### Implementation for User Story 2

- [x] T030 [US2] Implement parseCSV function with RFC 4180 support in backend/src/utils/csvParser.js
- [x] T031 [US2] Implement toCSV function with RFC 4180 escaping in backend/src/utils/csvParser.js
- [x] T032 [US2] Implement getRatings method in RatingService in backend/src/services/RatingService.js
- [x] T033 [US2] Implement getRating method (by email and itemId) in RatingService in backend/src/services/RatingService.js
- [x] T034 [US2] Implement submitRating method with replace-on-update logic in RatingService in backend/src/services/RatingService.js
- [x] T035 [US2] Add event state validation to submitRating in RatingService in backend/src/services/RatingService.js
- [x] T036 [US2] Add input validation (rating range, note length) to submitRating in RatingService in backend/src/services/RatingService.js
- [x] T037 [US2] Implement cache invalidation on rating submission in RatingService in backend/src/services/RatingService.js
- [x] T038 [US2] Implement GET /api/events/:eventId/ratings endpoint in backend/src/api/ratings.js
- [x] T039 [US2] Implement POST /api/events/:eventId/ratings endpoint in backend/src/api/ratings.js
- [x] T040 [US2] Implement GET /api/events/:eventId/ratings/:itemId endpoint in backend/src/api/ratings.js
- [x] T041 [US2] Add error handling for file I/O failures in backend/src/api/ratings.js
- [x] T042 [US2] Implement getRatings method in frontend ratingService in frontend/src/services/ratingService.js
- [x] T043 [US2] Implement getRating method in frontend ratingService in frontend/src/services/ratingService.js
- [x] T044 [US2] Implement submitRating method in frontend ratingService in frontend/src/services/ratingService.js
- [x] T045 [US2] Create RatingForm component with rating options in frontend/src/components/RatingForm.jsx
- [x] T046 [US2] Add note textarea with 500 character limit and counter in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T047 [US2] Add rating validation (required) in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T048 [US2] Add note length validation in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T049 [US2] Implement rating submission handler in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T050 [US2] Add loading state during submission in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T051 [US2] Add error handling in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T052 [US2] Update RatingDrawer to show RatingForm when event is started in frontend/src/components/RatingDrawer.jsx
- [x] T053 [US2] Load existing rating when opening drawer for rated item in RatingDrawer in frontend/src/components/RatingDrawer.jsx
- [x] T054 [US2] Update EventPage to load user's ratings on mount in frontend/src/pages/EventPage.jsx
- [x] T055 [US2] Update ItemButton to display rating color based on user's rating in frontend/src/components/ItemButton.jsx
- [x] T056 [US2] Update EventPage to pass rating colors to ItemButtons in frontend/src/pages/EventPage.jsx
- [x] T057 [US2] Refresh button colors after rating submission in EventPage in frontend/src/pages/EventPage.jsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can view items, open drawers, and submit ratings

---

## Phase 5: User Story 3 - View Event State Messages (Priority: P2)

**Goal**: Users see appropriate messages when events are in states that prevent rating (created, paused, completed).

**Independent Test**: Open item drawers when events are in different states (created, paused, completed) and verify appropriate messages are displayed.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T058 [P] [US3] Unit test for RatingDrawer state-based content in frontend/tests/unit/RatingDrawer.test.jsx
- [ ] T059 [P] [US3] Integration test for event state messages in frontend/tests/integration/event-state-messages.test.jsx

### Implementation for User Story 3

- [x] T060 [US3] Add "created" state message content in RatingDrawer in frontend/src/components/RatingDrawer.jsx
- [x] T061 [US3] Add "paused" state message content in RatingDrawer in frontend/src/components/RatingDrawer.jsx
- [x] T062 [US3] Add "completed" state message content in RatingDrawer in frontend/src/components/RatingDrawer.jsx
- [x] T063 [US3] Implement state-based content rendering logic in RatingDrawer in frontend/src/components/RatingDrawer.jsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - users see appropriate messages for all event states

---

## Phase 6: User Story 4 - Bookmark Items for Later Review (Priority: P2)

**Goal**: Users can bookmark items while rating so they can easily return to them later.

**Independent Test**: Bookmark an item during rating, close the drawer, and verify the bookmark indicator appears on the item button.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T064 [P] [US4] Unit test for bookmarkStorage utility in frontend/tests/unit/bookmarkStorage.test.js
- [ ] T065 [P] [US4] Unit test for ItemButton bookmark indicator in frontend/tests/unit/ItemButton.test.jsx
- [ ] T066 [P] [US4] Integration test for bookmark functionality in frontend/tests/integration/bookmark.test.jsx

### Implementation for User Story 4

- [x] T067 [US4] Implement getBookmarks method in bookmarkStorage in frontend/src/utils/bookmarkStorage.js
- [x] T068 [US4] Implement addBookmark method in bookmarkStorage in frontend/src/utils/bookmarkStorage.js
- [x] T069 [US4] Implement removeBookmark method in bookmarkStorage in frontend/src/utils/bookmarkStorage.js
- [x] T070 [US4] Add bookmark toggle button to RatingForm in frontend/src/components/RatingForm.jsx
- [x] T071 [US4] Implement bookmark toggle handler in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T072 [US4] Load existing bookmark state when opening drawer in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T073 [US4] Add bookmark icon overlay to ItemButton in frontend/src/components/ItemButton.jsx
- [x] T074 [US4] Update EventPage to load bookmarks on mount in frontend/src/pages/EventPage.jsx
- [x] T075 [US4] Update EventPage to pass bookmark state to ItemButtons in frontend/src/pages/EventPage.jsx
- [x] T076 [US4] Update bookmark indicator when bookmark state changes in EventPage in frontend/src/pages/EventPage.jsx

**Checkpoint**: All user stories should now be independently functional - users can view items, rate items, see state messages, and bookmark items

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T077 [P] Implement periodic cache refresh (30 seconds) in RatingService in backend/src/services/RatingService.js
- [x] T078 [P] Add cache invalidation on event state change in RatingService in backend/src/services/RatingService.js
- [x] T079 [P] Add performance monitoring for page load time in EventPage in frontend/src/pages/EventPage.jsx
- [x] T080 [P] Add performance monitoring for drawer open time in RatingDrawer in frontend/src/components/RatingDrawer.jsx
- [x] T081 [P] Add error boundary for rating operations in frontend/src/components/RatingErrorBoundary.jsx
- [x] T082 [P] Add loading states for rating data fetch in EventPage in frontend/src/pages/EventPage.jsx
- [x] T083 [P] Add retry logic for failed rating submissions in RatingForm in frontend/src/components/RatingForm.jsx
- [x] T084 [P] Add E2E test for complete rating flow in frontend/tests/e2e/rating-flow.feature
- [x] T085 [P] Add E2E test for bookmark flow in frontend/tests/e2e/bookmark-flow.feature
- [x] T086 [P] Add E2E test for event state messages in frontend/tests/e2e/event-state-messages.feature
- [x] T087 Code cleanup and refactoring (remove dead code, consolidate patterns)
- [x] T088 Documentation updates in README.md or feature docs
- [x] T089 Run quickstart.md validation checklist
- [x] T090 Performance optimization (verify SC-001 through SC-009 targets)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for drawer structure, but can be developed in parallel
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for drawer component
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for ItemButton and US2 for RatingForm

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Components before integration
- Core implementation before polish
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel (with dependencies noted)
- All tests for a user story marked [P] can run in parallel
- Components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members (with dependency awareness)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for ItemButton component in frontend/tests/unit/ItemButton.test.jsx"
Task: "Unit test for RatingDrawer component (basic open/close) in frontend/tests/unit/RatingDrawer.test.jsx"
Task: "Integration test for item button display and drawer opening in frontend/tests/integration/item-access.test.jsx"

# Launch all components for User Story 1 together:
Task: "Create ItemButton component in frontend/src/components/ItemButton.jsx"
Task: "Create RatingDrawer component (basic structure with open/close) in frontend/src/components/RatingDrawer.jsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all backend tests together:
Task: "Unit test for csvParser RFC 4180 escaping in backend/tests/unit/csvParser.test.js"
Task: "Unit test for RatingService getRatings in backend/tests/unit/RatingService.test.js"
Task: "Unit test for RatingService submitRating (new rating) in backend/tests/unit/RatingService.test.js"
Task: "Contract test for GET /api/events/:eventId/ratings in backend/tests/integration/ratings.test.js"

# Launch all frontend tests together:
Task: "Unit test for RatingForm component in frontend/tests/unit/RatingForm.test.jsx"
Task: "Integration test for rating submission flow in frontend/tests/integration/rating-submission.test.jsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Basic MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Full MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (ItemButton, RatingDrawer, EventPage updates)
   - Developer B: User Story 2 backend (csvParser, RatingService, API)
   - Developer C: User Story 2 frontend (RatingForm, ratingService)
3. After US1 and US2 complete:
   - Developer A: User Story 3 (state messages)
   - Developer B: User Story 4 (bookmarks)
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
- CSV operations use RFC 4180 escaping (quotes, commas, newlines)
- Cache invalidation: on write, on state change, and every 30 seconds
- Bookmark storage: sessionStorage only (not persisted)
- Rating updates: replace previous rating (not append)

---

## Task Summary

**Total Tasks**: 90

**Tasks by Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 6 tasks
- Phase 3 (User Story 1): 10 tasks
- Phase 4 (User Story 2): 47 tasks
- Phase 5 (User Story 3): 6 tasks
- Phase 6 (User Story 4): 13 tasks
- Phase 7 (Polish): 14 tasks

**Tasks by User Story**:
- User Story 1: 10 tasks (3 tests + 7 implementation)
- User Story 2: 47 tasks (9 tests + 38 implementation)
- User Story 3: 6 tasks (2 tests + 4 implementation)
- User Story 4: 13 tasks (3 tests + 10 implementation)

**Parallel Opportunities**: 
- 45 tasks marked [P] can run in parallel
- Multiple user stories can be developed in parallel after foundational phase

**Suggested MVP Scope**: User Stories 1 & 2 (57 tasks total) - provides complete rating functionality
