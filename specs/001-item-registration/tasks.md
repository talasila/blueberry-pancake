# Tasks: Item Registration and Management

**Input**: Design documents from `/specs/001-item-registration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per Constitution Principle IV (Testing Standards). All features MUST include appropriate tests: unit tests for business logic, integration tests for workflows, and contract tests for APIs.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow web application structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Verify nanoid package is available in backend/package.json (should already be present)
- [x] T002 [P] Verify existing drawer component patterns in frontend/src/components/ (RatingDrawer.jsx, SimilarUsersDrawer.jsx)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create ItemService class structure in backend/src/services/ItemService.js
- [x] T004 [P] Implement normalizePrice function in backend/src/services/ItemService.js
- [x] T005 [P] Implement validateItemRegistration function in backend/src/services/ItemService.js
- [x] T006 [P] Implement validateItemIdAssignment function in backend/src/services/ItemService.js
- [x] T007 Create items API router structure in backend/src/api/items.js
- [x] T008 Mount items routes in backend/src/api/index.js under /events/:eventId/items

### Testing for Foundational Phase

- [x] T081 [P] Create unit tests for normalizePrice function in backend/tests/unit/ItemService.test.js (test various input formats: "$50", "50.00", "50", negative values, zero, invalid formats)
- [x] T082 [P] Create unit tests for validateItemRegistration function in backend/tests/unit/ItemService.test.js (test name length, description length, price validation, required fields)
- [x] T083 [P] Create unit tests for validateItemIdAssignment function in backend/tests/unit/ItemService.test.js (test range validation, excludedItemIds, duplicate prevention)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - User Registers Items on Profile Page (Priority: P1) 🎯 MVP

**Goal**: Users can register items they're bringing to the event on their profile page, providing item details (name, price, description) that will be revealed after the event is completed.

**Independent Test**: Can be fully tested by navigating to the profile page, adding an item with name (required), price (optional), and description (optional), saving it, and verifying it appears in the user's item list.

### Implementation for User Story 1

- [x] T009 [US1] Implement registerItem method in backend/src/services/ItemService.js
- [x] T010 [US1] Implement getItems method in backend/src/services/ItemService.js (filter by user email)
- [x] T011 [US1] Implement POST /api/events/:eventId/items endpoint in backend/src/api/items.js
- [x] T012 [US1] Implement GET /api/events/:eventId/items endpoint in backend/src/api/items.js
- [x] T013 [US1] Add state-based access control (created/started states only) in backend/src/services/ItemService.js
- [x] T014 [US1] Create itemService API client in frontend/src/services/itemService.js
- [x] T015 [US1] Add "My Items" section to ProfilePage in frontend/src/pages/ProfilePage.jsx
- [x] T016 [US1] Create item registration form component in frontend/src/pages/ProfilePage.jsx (name required, price/description optional)
- [x] T017 [US1] Add item list display in ProfilePage showing user's registered items in frontend/src/pages/ProfilePage.jsx
- [x] T018 [US1] Add client-side validation for item registration form in frontend/src/pages/ProfilePage.jsx (name 1-200 chars, description max 1000 chars, price zero or positive)
- [x] T019 [US1] Add state-based UI controls in ProfilePage (hide form when event is paused/completed) in frontend/src/pages/ProfilePage.jsx
- [x] T020 [US1] Ensure items array is initialized as empty array in event config when accessing items for first time in backend/src/services/ItemService.js

### Testing for User Story 1

- [x] T084 [US1] [P] Create unit tests for registerItem method in backend/tests/unit/ItemService.test.js (test successful registration, state validation, owner tracking, timestamp, unique ID generation, items array initialization)
- [x] T085 [US1] [P] Create unit tests for getItems method in backend/tests/unit/ItemService.test.js (test filtering by user email, returning user's items only)
- [x] T086 [US1] [P] Create integration tests for POST /api/events/:eventId/items endpoint in backend/tests/integration/items.test.js (test successful registration, validation errors, state-based access control, authentication)
- [x] T087 [US1] [P] Create integration tests for GET /api/events/:eventId/items endpoint in backend/tests/integration/items.test.js (test returning user's items, authentication, state-based access control)
- [ ] T088 [US1] [P] Create unit tests for ProfilePage item registration in frontend/tests/unit/ProfilePage.test.jsx (test form rendering, validation, state-based UI controls)
- [ ] T089 [US1] Create E2E test for item registration flow in frontend/tests/e2e/features/item-registration.feature (test complete user flow: navigate to profile, register item, verify in list)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can register items on their profile page.

---

## Phase 4: User Story 2 - Admin Views All Registered Items (Priority: P1)

**Goal**: Event administrators can view all registered items in a dedicated admin page/section, seeing all item details including owner information.

**Independent Test**: Can be fully tested by navigating to the admin items page as an administrator and verifying all registered items are displayed with their complete details.

### Implementation for User Story 2

- [x] T021 [US2] Extend getItems method in backend/src/services/ItemService.js to return all items for administrators
- [x] T022 [US2] Add admin authorization check in GET /api/events/:eventId/items endpoint in backend/src/api/items.js
- [x] T023 [US2] Add "Items Management" section to EventAdminPage in frontend/src/pages/EventAdminPage.jsx
- [x] T024 [US2] Create table/list view component for displaying all registered items in frontend/src/pages/EventAdminPage.jsx
- [x] T025 [US2] Display all item fields (name, price, description, owner email) in admin items view in frontend/src/pages/EventAdminPage.jsx
- [x] T026 [US2] Add empty state message when no items are registered in frontend/src/pages/EventAdminPage.jsx
- [x] T027 [US2] Prevent admin editing of item details (name, price, description) in frontend/src/pages/EventAdminPage.jsx

### Testing for User Story 2

- [x] T090 [US2] [P] Create unit tests for getItems admin functionality in backend/tests/unit/ItemService.test.js (test returning all items for administrators, admin authorization)
- [ ] T091 [US2] [P] Create integration tests for GET /api/events/:eventId/items admin endpoint in backend/tests/integration/items.test.js (test admin authorization, returning all items with all fields, non-admin access denied)
- [ ] T092 [US2] [P] Create unit tests for EventAdminPage items view in frontend/tests/unit/EventAdminPage.test.jsx (test displaying all items, empty state, preventing admin edits)
- [ ] T093 [US2] Create E2E test for admin items view in frontend/tests/e2e/features/item-registration.feature (test admin navigating to items management, viewing all items with details)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Administrators can view all registered items.

---

## Phase 5: User Story 3 - Admin Assigns Item IDs During Paused State (Priority: P1)

**Goal**: Event administrators can assign item IDs to registered items when the event is in "paused" state, mapping each item to a number from 1 to the configured maximum number of items.

**Independent Test**: Can be fully tested by navigating to the items management page when the event is paused, viewing all items with their details, and assigning item IDs to each item.

### Implementation for User Story 3

- [x] T028 [US3] Implement assignItemId method in backend/src/services/ItemService.js
- [x] T029 [US3] Add state validation (paused state only) in assignItemId method in backend/src/services/ItemService.js
- [x] T030 [US3] Add admin authorization check in assignItemId method in backend/src/services/ItemService.js
- [x] T031 [US3] Add item ID range validation (1 to numberOfItems) in backend/src/services/ItemService.js
- [x] T032 [US3] Add excludedItemIds validation in assignItemId method in backend/src/services/ItemService.js
- [x] T033 [US3] Add duplicate item ID prevention in assignItemId method in backend/src/services/ItemService.js
- [x] T034 [US3] Implement PATCH /api/events/:eventId/items/:itemId/assign-item-id endpoint in backend/src/api/items.js
- [x] T035 [US3] Add item ID assignment interface to EventAdminPage (when event is paused) in frontend/src/pages/EventAdminPage.jsx
- [x] T036 [US3] Create input field for item ID assignment in EventAdminPage in frontend/src/pages/EventAdminPage.jsx
- [x] T037 [US3] Add visual indicators for unassigned items in EventAdminPage in frontend/src/pages/EventAdminPage.jsx
- [x] T038 [US3] Add client-side validation for item ID assignment in frontend/src/pages/EventAdminPage.jsx (range, excludedItemIds, uniqueness)
- [x] T039 [US3] Add assignItemId method to itemService API client in frontend/src/services/itemService.js
- [x] T040 [US3] Display which items have item IDs assigned and which do not in EventAdminPage in frontend/src/pages/EventAdminPage.jsx
- [x] T041 [US3] Add state-based UI controls (show assignment interface only when event is paused) in frontend/src/pages/EventAdminPage.jsx

### Testing for User Story 3

- [x] T094 [US3] [P] Create unit tests for assignItemId method in backend/tests/unit/ItemService.test.js (test successful assignment, state validation, admin authorization, range validation, excludedItemIds validation, duplicate prevention)
- [ ] T095 [US3] [P] Create integration tests for PATCH /api/events/:eventId/items/:itemId/assign-item-id endpoint in backend/tests/integration/items.test.js (test successful assignment, validation errors, state-based access control, admin authorization)
- [ ] T096 [US3] [P] Create unit tests for EventAdminPage item ID assignment in frontend/tests/unit/EventAdminPage.test.jsx (test assignment interface, visual indicators, client-side validation, state-based UI controls)
- [ ] T097 [US3] Create E2E test for item ID assignment flow in frontend/tests/e2e/features/item-registration.feature (test admin assigning item IDs during paused state, validation, visual feedback)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Administrators can assign item IDs during paused state.

---

## Phase 6: User Story 4 - View Item Details After Event Completion (Priority: P1)

**Goal**: Users can view item details (name, price, description, owner) when the event is in "completed" state by clicking on item numbers or dashboard table rows.

**Independent Test**: Can be fully tested by completing an event, navigating to the event page or dashboard, clicking on an item number or table row, and verifying the item details drawer displays correctly.

### Implementation for User Story 4

- [x] T042 [US4] Implement getItemByItemId method in backend/src/services/ItemService.js (for finding item by assigned itemId)
- [x] T043 [US4] Add state validation (completed state only) in getItemByItemId method in backend/src/services/ItemService.js
- [x] T044 [US4] Create ItemDetailsDrawer component in frontend/src/components/ItemDetailsDrawer.jsx
- [x] T045 [US4] Implement drawer display logic for item details (name, price, description, owner) in frontend/src/components/ItemDetailsDrawer.jsx
- [x] T046 [US4] Add handling for missing optional fields (price, description) in ItemDetailsDrawer in frontend/src/components/ItemDetailsDrawer.jsx
- [x] T047 [US4] Add getItemByItemId method to itemService API client in frontend/src/services/itemService.js
- [x] T048 [US4] Integrate ItemDetailsDrawer into EventPage in frontend/src/pages/EventPage.jsx
- [x] T049 [US4] Add click handler for item numbers to open ItemDetailsDrawer in EventPage in frontend/src/pages/EventPage.jsx
- [x] T050 [US4] Add state check (only open drawer when event is completed) in EventPage in frontend/src/pages/EventPage.jsx
- [x] T051 [US4] Integrate ItemDetailsDrawer into DashboardPage in frontend/src/pages/DashboardPage.jsx
- [x] T052 [US4] Add click handler for Ratings table rows to open ItemDetailsDrawer in DashboardPage in frontend/src/pages/DashboardPage.jsx
- [x] T053 [US4] Add state check (only open drawer when event is completed) in DashboardPage in frontend/src/pages/DashboardPage.jsx
- [x] T054 [US4] Display owner information (name or email) in ItemDetailsDrawer in frontend/src/components/ItemDetailsDrawer.jsx

### Testing for User Story 4

- [x] T098 [US4] [P] Create unit tests for getItemByItemId method in backend/tests/unit/ItemService.test.js (test finding item by assigned itemId, state validation, returning item details)
- [ ] T099 [US4] [P] Create integration tests for GET /api/events/:eventId/items/by-item-id/:itemId endpoint in backend/tests/integration/items.test.js (test retrieving item by itemId, state-based access control, not found handling)
- [ ] T100 [US4] [P] Create unit tests for ItemDetailsDrawer component in frontend/tests/unit/ItemDetailsDrawer.test.jsx (test displaying item details, handling missing optional fields, owner information display)
- [ ] T101 [US4] [P] Create unit tests for EventPage item details integration in frontend/tests/unit/EventPage.test.jsx (test click handler, drawer opening, state check)
- [ ] T102 [US4] [P] Create unit tests for DashboardPage item details integration in frontend/tests/unit/DashboardPage.test.jsx (test click handler, drawer opening, state check)
- [ ] T103 [US4] Create E2E test for item details reveal flow in frontend/tests/e2e/features/item-registration.feature (test clicking item number/row after completion, drawer display, item details)

**Checkpoint**: At this point, User Stories 1, 2, 3, AND 4 should all work independently. Users can view item details after event completion.

---

## Phase 7: User Story 5 - Validation: Maximum Items Cannot Be Less Than Registered Items (Priority: P2)

**Goal**: The system prevents administrators from setting the maximum number of items to a value less than the total number of registered items.

**Independent Test**: Can be fully tested by registering multiple items, then attempting to set the maximum number of items to a value less than the item count, and verifying the system prevents the change.

### Implementation for User Story 5

- [x] T055 [US5] Add getRegisteredItemsCount helper method in backend/src/services/EventService.js
- [x] T056 [US5] Extend updateItemConfiguration validation in backend/src/services/EventService.js to check registered items count
- [x] T057 [US5] Add validation for highest assigned item ID in updateItemConfiguration in backend/src/services/EventService.js
- [x] T058 [US5] Add error message for numberOfItems validation failure in backend/src/services/EventService.js
- [x] T059 [US5] Update itemConfiguration API endpoint to use extended validation in backend/src/api/events.js

### Testing for User Story 5

- [ ] T104 [US5] [P] Create unit tests for getRegisteredItemsCount method in backend/tests/unit/EventService.test.js (test counting registered items correctly)
- [ ] T105 [US5] [P] Create unit tests for updateItemConfiguration validation in backend/tests/unit/EventService.test.js (test preventing numberOfItems below registered count, allowing greater than, highest assigned item ID validation)
- [ ] T106 [US5] [P] Create integration tests for itemConfiguration validation in backend/tests/integration/events.test.js (test API endpoint validation, error messages)
- [ ] T107 [US5] Create E2E test for numberOfItems validation in frontend/tests/e2e/features/item-registration.feature (test attempting to set numberOfItems below registered count, validation error)

**Checkpoint**: At this point, all user stories should work independently. System prevents numberOfItems from being set below registered items count.

---

## Phase 8: Additional User Story 1 Features (Edit/Delete Items)

**Purpose**: Complete User Story 1 functionality with edit and delete capabilities

- [x] T060 [US1] Implement updateItem method in backend/src/services/ItemService.js
- [x] T061 [US1] Implement deleteItem method in backend/src/services/ItemService.js
- [x] T062 [US1] Add ownership validation in updateItem method in backend/src/services/ItemService.js
- [x] T063 [US1] Add ownership validation in deleteItem method in backend/src/services/ItemService.js
- [x] T064 [US1] Implement PATCH /api/events/:eventId/items/:itemId endpoint in backend/src/api/items.js
- [x] T065 [US1] Implement DELETE /api/events/:eventId/items/:itemId endpoint in backend/src/api/items.js
- [x] T066 [US1] Add updateItem method to itemService API client in frontend/src/services/itemService.js
- [x] T067 [US1] Add deleteItem method to itemService API client in frontend/src/services/itemService.js
- [x] T068 [US1] Add edit functionality to item list in ProfilePage in frontend/src/pages/ProfilePage.jsx
- [x] T069 [US1] Add delete functionality to item list in ProfilePage in frontend/src/pages/ProfilePage.jsx
- [x] T070 [US1] Handle itemId reassignment when item with assigned itemId is deleted in backend/src/services/ItemService.js

### Testing for Phase 8 (Edit/Delete)

- [x] T108 [US1] [P] Create unit tests for updateItem method in backend/tests/unit/ItemService.test.js (test successful update, ownership validation, state validation)
- [x] T109 [US1] [P] Create unit tests for deleteItem method in backend/tests/unit/ItemService.test.js (test successful deletion, ownership validation, itemId reassignment handling)
- [ ] T110 [US1] [P] Create integration tests for PATCH /api/events/:eventId/items/:itemId endpoint in backend/tests/integration/items.test.js (test successful update, ownership validation, authentication, validation errors)
- [ ] T111 [US1] [P] Create integration tests for DELETE /api/events/:eventId/items/:itemId endpoint in backend/tests/integration/items.test.js (test successful deletion, ownership validation, authentication, itemId reassignment)
- [ ] T112 [US1] [P] Create unit tests for ProfilePage edit/delete functionality in frontend/tests/unit/ProfilePage.test.jsx (test edit form, delete confirmation, UI updates)
- [ ] T113 [US1] Create E2E test for edit/delete item flow in frontend/tests/e2e/features/item-registration.feature (test editing item, deleting item, verifying updates)

**Checkpoint**: User Story 1 is now complete with full CRUD functionality.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T071 [P] Add error handling for missing or corrupted item data in backend/src/services/ItemService.js
- [x] T072 [P] Add error handling for missing or corrupted item data in frontend/src/components/ItemDetailsDrawer.jsx
- [x] T073 [P] Add optimistic locking support for concurrent item updates in backend/src/services/ItemService.js
- [x] T074 [P] Add loading states for item operations in frontend components
- [x] T075 [P] Add success/error messages for item operations in frontend components
- [x] T076 [P] Ensure cache invalidation on all item write operations in backend/src/services/ItemService.js
- [x] T077 [P] Add performance monitoring for item operations (registration <30s, admin view <2s, drawer <500ms)
- [x] T078 [P] Verify backward compatibility (events without items array default to empty array) in backend/src/services/ItemService.js
- [x] T079 [P] Run quickstart.md validation scenarios
- [x] T080 [P] Code cleanup and refactoring across all item-related files

### Testing for Phase 9 (Polish & Cross-Cutting)

- [ ] T114 [P] Create integration tests for error handling in backend/tests/integration/items.test.js (test missing/corrupted item data, API error responses: 400, 401, 403, 404, 409, 500)
- [ ] T115 [P] Create unit tests for optimistic locking in backend/tests/unit/ItemService.test.js (test concurrent update handling, conflict detection)
- [ ] T116 [P] Create unit tests for cache invalidation in backend/tests/unit/ItemService.test.js (test cache invalidation on all write operations)
- [ ] T117 [P] Create performance tests for item operations in backend/tests/integration/items.test.js (test registration <30s, admin view <2s, drawer <500ms)
- [ ] T118 [P] Create integration tests for backward compatibility in backend/tests/integration/items.test.js (test events without items array default to empty array)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Additional Features (Phase 8)**: Depends on User Story 1 completion
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for item data structure
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 and US2 (needs items to exist and admin view)
- **User Story 4 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 and US3 (needs items with assigned itemIds)
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 (needs registered items to validate against)

### Within Each User Story

- Service methods before API endpoints
- API endpoints before frontend integration
- Core implementation before UI polish
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- Different user stories can be worked on in parallel by different team members (with coordination)
- Tasks within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch foundational tasks in parallel:
Task: "Implement normalizePrice function in backend/src/services/ItemService.js"
Task: "Implement validateItemRegistration function in backend/src/services/ItemService.js"
Task: "Create items API router structure in backend/src/api/items.js"

# Launch User Story 1 backend tasks in parallel:
Task: "Implement registerItem method in backend/src/services/ItemService.js"
Task: "Implement getItems method in backend/src/services/ItemService.js"
Task: "Create itemService API client in frontend/src/services/itemService.js"

# Launch User Story 1 frontend tasks in parallel:
Task: "Add 'My Items' section to ProfilePage in frontend/src/pages/ProfilePage.jsx"
Task: "Create item registration form component in frontend/src/pages/ProfilePage.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Register Items)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add Phase 8 (Edit/Delete) → Complete User Story 1
8. Add Phase 9 (Polish) → Final polish
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Register Items)
   - Developer B: User Story 2 (Admin View) - can start after US1 has item structure
   - Developer C: User Story 4 (Item Details Drawer) - can start independently
3. After US1 and US2 complete:
   - Developer A: User Story 3 (Assign Item IDs)
   - Developer B: User Story 5 (Validation)
   - Developer C: Phase 8 (Edit/Delete)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Item IDs use nanoid (12 characters) for uniqueness within event
- Price normalization handles various input formats ("$50", "50.00", "50")
- State-based access control is critical for blind tasting integrity
