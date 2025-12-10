# Tasks: Event Dashboard Page

**Input**: Design documents from `/specs/010-dashboard-page/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included for comprehensive coverage as this is a critical feature affecting dashboard functionality and access control.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow the web application structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Minimal setup tasks - most infrastructure already exists

- [X] T001 [P] Verify existing EventService and RatingService support dashboard data access in `backend/src/services/`
- [X] T002 [P] Verify existing CacheService supports dashboard caching in `backend/src/cache/CacheService.js`
- [X] T003 [P] Verify existing API client patterns support dashboard endpoint in `frontend/src/services/apiClient.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core dashboard infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create Bayesian average calculation utility in `backend/src/utils/bayesianAverage.js` - Implement calculateWeightedAverage function with formula (C × global_avg + Σ(ratings)) / (C + n), handle edge cases (C=0, global_avg undefined), return null for invalid calculations
- [X] T005 [P] Create DashboardService in `backend/src/services/DashboardService.js` - Implement getDashboardData method with caching, calculateStatistics method, calculateGlobalAverage method, calculateItemSummaries method
- [X] T006 [P] Create dashboard API endpoint in `backend/src/api/dashboard.js` - Implement GET /api/events/:eventId/dashboard route with authentication middleware, access control check (admin OR event completed), error handling
- [X] T007 Register dashboard API routes in `backend/src/server.js` - Add dashboard routes to Express app
- [X] T008 [P] Create frontend dashboard service in `frontend/src/services/dashboardService.js` - Implement getDashboardData method with error handling
- [X] T009 [P] Create basic DashboardPage component structure in `frontend/src/pages/DashboardPage.jsx` - Basic page layout with loading state, error state, data fetching logic

**Checkpoint**: Foundation ready - dashboard API endpoint and basic page structure exist. User story implementation can now begin.

---

## Phase 3: User Story 1 - Admin Views Dashboard Anytime (Priority: P1) 🎯 MVP

**Goal**: Administrators can access the dashboard page at any time, regardless of event state, to view event statistics and item rating details.

**Independent Test**: Navigate to the dashboard as an administrator when the event is in any state (created, started, paused, or completed) and verify all statistics and table data are displayed correctly.

### Tests for User Story 1

- [ ] T010 [P] [US1] Unit test for DashboardService.getDashboardData in `backend/tests/services/DashboardService.test.js` - Test statistics calculation, item summaries calculation, caching behavior
- [ ] T011 [P] [US1] Unit test for bayesianAverage utility in `backend/tests/utils/bayesianAverage.test.js` - Test formula calculation, edge cases (C=0, global_avg undefined), null return for invalid inputs
- [ ] T012 [P] [US1] Integration test for dashboard API endpoint in `backend/tests/api/dashboard.test.js` - Test GET /api/events/:eventId/dashboard with admin authentication, verify response structure, verify access control for admins
- [ ] T013 [P] [US1] E2E test for admin dashboard access in `frontend/tests/e2e/dashboard.spec.js` - Test admin can access dashboard in all event states (created, started, paused, completed)

### Implementation for User Story 1

- [X] T014 [US1] Create DashboardRoute component in `frontend/src/components/DashboardRoute.jsx` - Route protection component that checks admin status OR event completed state, redirects to event page if access denied, shows loading state while checking
- [X] T015 [US1] Add dashboard route to App.jsx in `frontend/src/App.jsx` - Add route /event/:eventId/dashboard with DashboardRoute wrapper and EventRouteWrapper
- [X] T016 [US1] Add dashboard button to ProfilePage for administrators in `frontend/src/pages/ProfilePage.jsx` - Add Dashboard button in top navigation buttons, show for admins regardless of event state, use BarChart3 icon from lucide-react

**Checkpoint**: At this point, administrators can access the dashboard page in any event state and see the basic page structure.

---

## Phase 4: User Story 2 - Regular User Views Dashboard When Event Completed (Priority: P2)

**Goal**: Regular users (non-administrators) can access the dashboard page only when the event is in "completed" state to view final event statistics and item rating results.

**Independent Test**: Attempt to access the dashboard as a regular user in different event states and verify access is granted only when the event is "completed", with appropriate access denial for other states.

### Tests for User Story 2

- [ ] T017 [P] [US2] Integration test for dashboard API access control in `backend/tests/api/dashboard.test.js` - Test regular user access denied when event not completed (403), test regular user access granted when event completed (200), test redirect behavior
- [ ] T018 [P] [US2] E2E test for regular user dashboard access in `frontend/tests/e2e/dashboard.spec.js` - Test regular user redirected when event not completed, test regular user can access when event completed, test dashboard button visibility in profile page

### Implementation for User Story 2

- [X] T019 [US2] Update DashboardRoute component access control logic in `frontend/src/components/DashboardRoute.jsx` - Add check for regular users (isAdmin OR event.state === 'completed'), redirect to event page if access denied
- [X] T020 [US2] Update ProfilePage dashboard button visibility in `frontend/src/pages/ProfilePage.jsx` - Show dashboard button for regular users only when event.state === 'completed', maintain admin visibility logic

**Checkpoint**: At this point, regular users can only access dashboard when event is completed, and dashboard button visibility is correct in profile page.

---

## Phase 5: User Story 3 - View Summary Statistics (Priority: P1)

**Goal**: Users can view four key summary statistics displayed as large number gadgets: total users, total bottles, total ratings, and average ratings per bottle.

**Independent Test**: Access the dashboard and verify all four statistics are displayed correctly with accurate calculations based on event data.

### Tests for User Story 3

- [ ] T021 [P] [US3] Unit test for DashboardService.calculateStatistics in `backend/tests/services/DashboardService.test.js` - Test totalUsers calculation, totalBottles calculation (with excluded items), totalRatings calculation, averageRatingsPerBottle calculation with 2 decimal places, edge cases (zero bottles, zero ratings)
- [ ] T022 [P] [US3] Component test for StatisticsCard in `frontend/tests/components/StatisticsCard.test.jsx` - Test card displays title and value correctly, test "N/A" display for null values
- [ ] T023 [P] [US3] E2E test for summary statistics display in `frontend/tests/e2e/dashboard.spec.js` - Test all four statistics cards display with correct values, test layout (two rows, two columns)

### Implementation for User Story 3

- [X] T024 [US3] Create StatisticsCard component in `frontend/src/components/StatisticsCard.jsx` - Reusable card component with title and value, handles null values (display "N/A"), uses Card components from UI library
- [X] T025 [US3] Update DashboardPage to display summary statistics in `frontend/src/pages/DashboardPage.jsx` - Add statistics cards section with grid layout (2x2), display Total Users, Total Bottles, Total Ratings, Average Ratings per Bottle, format numbers correctly (2 decimal places for average)

**Checkpoint**: At this point, users can see all four summary statistics displayed correctly on the dashboard.

---

## Phase 6: User Story 4 - View Item Ratings Table with Sortable Columns (Priority: P1)

**Goal**: Users can view a detailed table of item ratings with columns for item ID, rating progression (progress bar), average rating, and weighted average, with all columns being sortable.

**Independent Test**: Access the dashboard, view the table, and verify all columns display correctly and sorting works for each column.

### Tests for User Story 4

- [ ] T026 [P] [US4] Unit test for DashboardService.calculateItemSummaries in `backend/tests/services/DashboardService.test.js` - Test item summaries calculation, excluded items filtering, rating progression calculation, average rating calculation, edge cases (no ratings, excluded items)
- [ ] T027 [P] [US4] Component test for ProgressBar in `frontend/tests/components/ProgressBar.test.jsx` - Test progress bar displays correct percentage, test visual-only (no text labels), test accessibility (aria-label)
- [ ] T028 [P] [US4] Component test for ItemRatingsTable in `frontend/tests/components/ItemRatingsTable.test.jsx` - Test table displays all columns, test default sort (Item ID ascending), test sorting by each column (ascending/descending), test sort state persistence
- [ ] T029 [P] [US4] E2E test for item ratings table in `frontend/tests/e2e/dashboard.spec.js` - Test table displays all items (excluding excluded items), test progress bars display correctly, test sorting functionality for all columns

### Implementation for User Story 4

- [X] T030 [US4] Create ProgressBar component in `frontend/src/components/ProgressBar.jsx` - Visual-only progress bar (no text labels), uses percentage value for width, includes aria-label for accessibility, uses Tailwind classes for styling
- [X] T031 [US4] Create ItemRatingsTable component in `frontend/src/components/ItemRatingsTable.jsx` - Sortable table with columns (ID, Rating Progression, Average Rating, Weighted Average), default sort by Item ID ascending, client-side sorting with state management, sort icons (ArrowUpDown, ArrowUp, ArrowDown), handles null values (display "N/A")
- [X] T032 [US4] Update DashboardPage to display item ratings table in `frontend/src/pages/DashboardPage.jsx` - Add table section with Card wrapper, pass itemSummaries to ItemRatingsTable component, handle empty state

**Checkpoint**: At this point, users can see the item ratings table with all columns, progress bars, and sorting functionality working correctly.

---

## Phase 7: User Story 5 - Calculate Weighted Average Using Bayesian Formula (Priority: P1)

**Goal**: The system calculates weighted average ratings for each item using a Bayesian average formula that accounts for the number of ratings and total users in the event.

**Independent Test**: Verify the weighted average calculation matches the specified formula for items with varying numbers of ratings.

**Note**: The Bayesian calculation is implemented in Phase 2 (T004) as foundational infrastructure. This phase focuses on ensuring it's properly integrated and tested.

### Tests for User Story 5

- [ ] T033 [P] [US5] Unit test for Bayesian formula edge cases in `backend/tests/utils/bayesianAverage.test.js` - Test item with no ratings (n=0) equals global_avg, test item with many ratings approaches simple average, test global average changes reflected in weighted averages
- [ ] T034 [P] [US5] Integration test for weighted average in item summaries in `backend/tests/services/DashboardService.test.js` - Test weighted averages calculated correctly for all items, test edge cases (C=0, global_avg undefined) display null
- [ ] T035 [P] [US5] E2E test for weighted average display in `frontend/tests/e2e/dashboard.spec.js` - Test weighted averages display correctly in table, test "N/A" display for invalid calculations

### Implementation for User Story 5

- [X] T036 [US5] Verify Bayesian calculation integration in DashboardService in `backend/src/services/DashboardService.js` - Ensure calculateItemSummaries uses calculateWeightedAverage correctly, handles null returns (display as null in response)
- [X] T037 [US5] Verify weighted average display in ItemRatingsTable in `frontend/src/components/ItemRatingsTable.jsx` - Ensure weighted average column displays null values as "N/A", formats to 2 decimal places when value exists

**Checkpoint**: At this point, weighted averages are calculated correctly using the Bayesian formula and displayed properly in the table.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T038 [P] Add manual refresh button to DashboardPage in `frontend/src/pages/DashboardPage.jsx` - Add refresh button with RefreshCw icon, implement refresh handler that invalidates cache and refetches data, show loading state during refresh, disable button during refresh
- [X] T039 [P] Add cache invalidation on rating submission in `backend/src/services/RatingService.js` - Invalidate dashboard cache (key: `dashboard:{eventId}`) when rating is submitted
- [X] T040 [P] Add cache invalidation on event state change in `backend/src/services/EventService.js` - Invalidate dashboard cache (key: `dashboard:{eventId}`) when event state transitions
- [X] T041 [P] Add error handling and user-friendly error messages in `frontend/src/pages/DashboardPage.jsx` - Display error messages with retry button, handle 403 errors (redirect to event page), handle 404/500 errors (show error message)
- [X] T042 [P] Add loading indicators to DashboardPage in `frontend/src/pages/DashboardPage.jsx` - Show LoadingSpinner during initial load, show loading state during refresh (LoadingSpinner is sufficient, skeleton screens are optional and not required)
- [X] T043 [P] Update documentation in `specs/010-dashboard-page/quickstart.md` - Verify all implementation steps match actual code
- [X] T046 [P] Add explanatory tooltips/help icons for edge case "N/A" values in `frontend/src/components/ItemRatingsTable.jsx` and `frontend/src/components/StatisticsCard.jsx` - Add Info icon (lucide-react) next to "N/A" values with tooltip messages: "Insufficient data: No users registered in this event" (for C=0) and "No ratings submitted yet" (for global_avg undefined)
- [X] T044 [P] Code cleanup and refactoring - Remove any dead code, ensure consistent error handling patterns, verify all edge cases handled
- [X] T045 [P] Performance optimization - Verify caching reduces file I/O, ensure calculations are efficient, test with large datasets (100 items, 1000 ratings)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start immediately after Foundational
  - User Story 2 (P2): Depends on User Story 1 (uses DashboardRoute component)
  - User Story 3 (P1): Can start after Foundational (independent of US1/US2)
  - User Story 4 (P1): Can start after Foundational (independent of US1/US2/US3)
  - User Story 5 (P1): Depends on Foundational (Bayesian utility already implemented, just needs integration verification)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 (DashboardRoute component) - Should be implemented after US1
- **User Story 3 (P1)**: Can start after Foundational - Independent of US1/US2
- **User Story 4 (P1)**: Can start after Foundational - Independent of US1/US2/US3
- **User Story 5 (P1)**: Depends on Foundational (Bayesian utility) - Mostly verification and integration

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Backend services before API endpoints
- API endpoints before frontend components
- Components before page integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - User Story 1, 3, 4 can start in parallel (if team capacity allows)
  - User Story 2 should wait for User Story 1
  - User Story 5 can start in parallel (mostly verification)
- All tests for a user story marked [P] can run in parallel
- Backend and frontend tasks within a story marked [P] can run in parallel
- Polish phase tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for DashboardService.getDashboardData in backend/tests/services/DashboardService.test.js"
Task: "Unit test for bayesianAverage utility in backend/tests/utils/bayesianAverage.test.js"
Task: "Integration test for dashboard API endpoint in backend/tests/api/dashboard.test.js"
Task: "E2E test for admin dashboard access in frontend/tests/e2e/dashboard.spec.js"

# Launch implementation tasks (after tests):
Task: "Create DashboardRoute component in frontend/src/components/DashboardRoute.jsx"
Task: "Add dashboard route to App.jsx in frontend/src/App.jsx"
Task: "Add dashboard button to ProfilePage for administrators in frontend/src/pages/ProfilePage.jsx"
```

---

## Parallel Example: User Story 3

```bash
# Launch all tests for User Story 3 together:
Task: "Unit test for DashboardService.calculateStatistics in backend/tests/services/DashboardService.test.js"
Task: "Component test for StatisticsCard in frontend/tests/components/StatisticsCard.test.jsx"
Task: "E2E test for summary statistics display in frontend/tests/e2e/dashboard.spec.js"

# Launch implementation tasks (after tests):
Task: "Create StatisticsCard component in frontend/src/components/StatisticsCard.jsx"
Task: "Update DashboardPage to display summary statistics in frontend/src/pages/DashboardPage.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Admin access + basic dashboard)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - Admin can access dashboard)
3. Add User Story 3 → Test independently → Deploy/Demo (Summary statistics visible)
4. Add User Story 4 → Test independently → Deploy/Demo (Item ratings table visible)
5. Add User Story 5 → Test independently → Deploy/Demo (Weighted averages working)
6. Add User Story 2 → Test independently → Deploy/Demo (Regular user access)
7. Add Polish → Final deployment
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Admin access)
   - Developer B: User Story 3 (Summary statistics) - can start in parallel
   - Developer C: User Story 4 (Item ratings table) - can start in parallel
3. After User Story 1 complete:
   - Developer A: User Story 2 (Regular user access)
4. Developer D: User Story 5 (Weighted average verification) - can start after Foundational
5. All developers: Polish phase tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Bayesian calculation (US5) is implemented in Foundational phase, US5 phase focuses on verification
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
