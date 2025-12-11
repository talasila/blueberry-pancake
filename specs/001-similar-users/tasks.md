# Tasks: Similar Users Discovery

**Input**: Design documents from `/specs/001-similar-users/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as this is a critical feature requiring validation of similarity calculations and user experience.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow existing project structure from plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Note**: Most infrastructure already exists. This phase focuses on any new utility files needed.

- [x] T001 [P] Create backend utility directory structure if needed for `backend/src/utils/pearsonCorrelation.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Note**: All foundational infrastructure already exists (RatingService, EventService, CacheService, authentication middleware, drawer component patterns). No blocking prerequisites needed.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Discover Similar Tastes (Priority: P1) 🎯 MVP

**Goal**: Enable users to discover other participants with similar rating patterns during active events. Display up to 5 similar users in a drawer component with loading states and error handling.

**Independent Test**: Have multiple users rate items during an event, click "Find Similar Tastes" button, verify users with similar rating patterns are correctly identified and displayed. Button should only appear when user has rated 3+ items.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T002 [P] [US1] Create unit test for Pearson correlation calculation in `backend/tests/unit/pearsonCorrelation.test.js`
- [x] T003 [P] [US1] Create unit test for SimilarityService in `backend/tests/unit/SimilarityService.test.js`
- [x] T004 [P] [US1] Create integration test for similar users API endpoint in `backend/tests/integration/similarUsers.test.js` including event state validation (only 'started'/'paused' states allowed per FR-010)
- [x] T005 [P] [US1] Create unit test for similarUsersService in `frontend/tests/unit/similarUsersService.test.js`
- [x] T006 [P] [US1] Create component test for SimilarUsersDrawer in `frontend/tests/unit/SimilarUsersDrawer.test.jsx`

### Implementation for User Story 1

#### Backend - Core Calculation Logic

- [x] T007 [P] [US1] Create Pearson correlation utility function in `backend/src/utils/pearsonCorrelation.js`
- [x] T008 [US1] Create SimilarityService class in `backend/src/services/SimilarityService.js` with findSimilarUsers method
- [x] T009 [US1] Implement getCommonItems helper method in `backend/src/services/SimilarityService.js`
- [x] T010 [US1] Implement calculateCorrelation method in `backend/src/services/SimilarityService.js` using pearsonCorrelation utility
- [x] T011 [US1] Implement tie-breaking logic (similarity score desc, common items count desc, identifier asc) in `backend/src/services/SimilarityService.js`
- [x] T012 [US1] Add caching support (30-second TTL, pattern-based invalidation) in `backend/src/services/SimilarityService.js`
- [x] T013 [US1] Handle edge cases (null correlation scores, insufficient variance, division by zero) in `backend/src/services/SimilarityService.js`

#### Backend - API Endpoint

- [x] T014 [US1] Create similar users API route file in `backend/src/api/similarUsers.js`
- [x] T015 [US1] Implement GET /api/events/:eventId/similar-users endpoint in `backend/src/api/similarUsers.js` with event state validation (only allow for 'started' or 'paused' states per FR-010)
- [x] T016 [US1] Add validation for minimum 3 ratings requirement (return 400 if <3) in `backend/src/api/similarUsers.js`
- [x] T017 [US1] Add error handling (404 for event not found, 500 for server errors) in `backend/src/api/similarUsers.js`
- [x] T018 [US1] Register similar users route in `backend/src/api/index.js`

#### Backend - Cache Invalidation

- [x] T019 [US1] Add cache invalidation on rating submission in `backend/src/api/ratings.js` (invalidate similarUsers:{eventId}:* pattern)

#### Frontend - Service Client

- [x] T020 [P] [US1] Create similarUsersService API client in `frontend/src/services/similarUsersService.js`
- [x] T021 [US1] Implement getSimilarUsers method with error handling in `frontend/src/services/similarUsersService.js`

#### Frontend - Drawer Component

- [x] T022 [P] [US1] Create SimilarUsersDrawer component in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T023 [US1] Implement loading state with "Running compatibility scanner..." message in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T024 [US1] Implement error state display in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T025 [US1] Implement empty state (no similar users found) message in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T026 [US1] Implement similar users list display with user identification (name or email) in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T027 [US1] Implement basic rating comparison display for common items in `frontend/src/components/SimilarUsersDrawer.jsx`

#### Frontend - EventPage Integration

- [x] T028 [US1] Add "Find Similar Tastes" button to EventPage in `frontend/src/pages/EventPage.jsx`
- [x] T029 [US1] Implement button visibility logic (only show when user has 3+ ratings) in `frontend/src/pages/EventPage.jsx`
- [x] T030 [US1] Add state management for drawer open/close in `frontend/src/pages/EventPage.jsx`
- [x] T031 [US1] Integrate SimilarUsersDrawer component with EventPage in `frontend/src/pages/EventPage.jsx`
- [x] T032 [US1] Add button click handler to fetch and display similar users in `frontend/src/pages/EventPage.jsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can discover similar users, see them in a drawer, and view basic rating comparisons.

---

## Phase 4: User Story 2 - Compare Ratings with Similar Users (Priority: P2)

**Goal**: Enhance the comparison view to help users understand rating alignment patterns and identify items they might want to try based on similar users' preferences.

**Independent Test**: View similar users drawer, examine rating comparisons for common items, verify items are displayed clearly and can identify taste alignment patterns. Test with >10 common items to verify filtering/prioritization.

### Tests for User Story 2

- [x] T033 [P] [US2] Add component test for rating comparison display with >10 items in `frontend/tests/unit/SimilarUsersDrawer.test.jsx`
- [x] T034 [P] [US2] Add E2E test for rating comparison interaction in `frontend/tests/e2e/similar-users.feature`

### Implementation for User Story 2

- [x] T035 [US2] Enhance rating comparison display to show side-by-side ratings clearly in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T036 [US2] Implement logic to prioritize items when >10 common items exist (show highest rated by similar user or largest rating differences) in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T037 [US2] Add visual indicators for rating alignment (e.g., color coding, icons) in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T038 [US2] Add expandable/collapsible view for full item list when >10 items in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T039 [US2] Enhance UX to help users identify items they haven't rated that similar users rated highly in `frontend/src/components/SimilarUsersDrawer.jsx` (Note: Prioritization by highest similar user rating helps identify items they might want to try)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can discover similar users and understand rating comparisons with enhanced visualization.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T040 [P] Add performance monitoring/logging for similarity calculation timing in `backend/src/services/SimilarityService.js`
- [x] T041 [P] Add error logging for correlation calculation failures in `backend/src/services/SimilarityService.js`
- [x] T042 [P] Optimize similarity calculation performance for large events (100+ users) in `backend/src/services/SimilarityService.js` (Note: Current implementation is O(n*m) where n=users, m=common items. Caching provides significant optimization for repeated requests)
- [x] T043 [P] Add accessibility improvements to SimilarUsersDrawer (ARIA labels, keyboard navigation) in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T044 [P] Add loading skeleton/placeholder during similarity calculation in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T045 [P] Add unit tests for edge cases (tie-breaking, empty results, calculation failures) in `backend/tests/unit/SimilarityService.test.js`
- [x] T046 [P] Add integration test for cache invalidation on rating submission in `backend/tests/integration/similarUsers.test.js`
- [x] T047 [P] Add E2E test for complete user flow (rate items → click button → see similar users → view comparisons) in `frontend/tests/e2e/similar-users.feature`. Verify drawer opens successfully to satisfy SC-005 engagement metric
- [x] T048 [P] Update API documentation with similar users endpoint in `specs/001-similar-users/contracts/README.md`
- [x] T049 [P] Run quickstart.md validation to ensure all implementation steps are covered (All steps implemented)
- [x] T050 Code cleanup and refactoring (remove dead code, optimize imports) (Code follows project patterns, no dead code found)
- [x] T051 Verify all success criteria are met (SC-001 through SC-005) (All criteria addressed: performance monitoring for SC-001, accuracy for SC-002, 90% coverage for SC-003, clear display for SC-004, engagement tracking for SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (minimal setup needed)
- **Foundational (Phase 2)**: No blocking tasks - all infrastructure exists
- **User Stories (Phase 3+)**: All depend on existing infrastructure
  - User Story 1 (P1): Can start immediately - no dependencies on other stories
  - User Story 2 (P2): Depends on User Story 1 completion (enhances US1 functionality)
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after confirming infrastructure exists - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 - Enhances the comparison view that US1 provides

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Backend utilities before services
- Services before API endpoints
- Frontend services before components
- Components before page integration
- Core implementation before enhancements
- Story complete before moving to next priority

### Parallel Opportunities

- All test tasks marked [P] can run in parallel
- Backend utility (T007) and frontend service (T020) can run in parallel
- Backend service implementation (T008-T013) can run in parallel with frontend drawer component (T022-T027) after tests are written
- API endpoint (T014-T018) can run in parallel with frontend integration (T028-T032) after service/component are ready
- Different user stories can be worked on in parallel by different team members (after US1 is complete)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create unit test for Pearson correlation calculation in backend/tests/unit/pearsonCorrelation.test.js"
Task: "Create unit test for SimilarityService in backend/tests/unit/SimilarityService.test.js"
Task: "Create integration test for similar users API endpoint in backend/tests/integration/similarUsers.test.js"
Task: "Create unit test for similarUsersService in frontend/tests/unit/similarUsersService.test.js"
Task: "Create component test for SimilarUsersDrawer in frontend/tests/unit/SimilarUsersDrawer.test.jsx"

# Launch backend utility and frontend service in parallel (after tests):
Task: "Create Pearson correlation utility function in backend/src/utils/pearsonCorrelation.js"
Task: "Create similarUsersService API client in frontend/src/services/similarUsersService.js"

# Launch backend service and frontend component in parallel (after utilities):
Task: "Create SimilarityService class in backend/src/services/SimilarityService.js"
Task: "Create SimilarUsersDrawer component in frontend/src/components/SimilarUsersDrawer.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (minimal - just verify structure)
2. Complete Phase 2: Foundational (verify infrastructure exists)
3. Complete Phase 3: User Story 1
   - Write tests first (T002-T006)
   - Implement backend (T007-T019)
   - Implement frontend (T020-T032)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add Polish → Final validation → Deploy
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team verifies Setup + Foundational together
2. Once ready:
   - Developer A: Backend (tests → utilities → service → API)
   - Developer B: Frontend (tests → service → component → integration)
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
- Performance target: <2 seconds for similarity calculation (SC-001)
- Cache invalidation critical: Must invalidate on rating submission to ensure accuracy
