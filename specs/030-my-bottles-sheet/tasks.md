# Tasks: My Bottles Bottom Sheet

**Input**: Design documents from `/specs/030-my-bottles-sheet/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included — the feature specification (FR-018, FR-019, US6) explicitly requires unit and e2e test updates.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extract shared utilities from ProfilePage before it's deleted

- [x] T001 Extract validation logic into `frontend/src/utils/itemFormValidation.js` — export `validateItemForm({ name, price, description })` returning `{ isValid, errors }` with rules: name required 1–200 chars, price optional non-negative flexible format, description optional max 1000 chars
- [x] T002 Create shared `ItemForm` component in `frontend/src/components/ItemForm.jsx` — accepts `initialValues`, `onSubmit`, `onCancel`, `isEditing`, `isLoading`, `terminology` props; renders name (required), price (optional), description (optional) fields; uses `validateItemForm` from T001 for validation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the MyBottlesSheet shell that all user stories build upon

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create `MyBottlesSheet` component shell in `frontend/src/components/MyBottlesSheet.jsx` — compose `BottomSheetPicker` as base; accept `isOpen`, `onClose`, `event`, `eventId` props; implement data fetching on open (`itemService.getItems`, `apiClient.getUserProfile`); render loading/error states; use `useItemTerminology(event)` for all text

**Checkpoint**: Foundation ready — shell renders with BottomSheetPicker, fetches data, and shows loading/empty states

---

## Phase 3: User Story 1 — Register Bottles (Priority: P1) MVP

**Goal**: Guest can add bottles via the bottom sheet during `created`/`started` states

**Independent Test**: Open the sheet with `isOpen={true}`, add a bottle (name + optional fields), verify it appears in the list as a ListCard

### Tests for User Story 1

- [x] T004 [P] [US1] Create unit test file `frontend/tests/unit/MyBottlesSheet.test.jsx` — tests for: renders name field, shows registered bottles as ListCard, add form appears on CTA tap, validates required name, shows empty state when no bottles, dynamic terminology, loading state
- [x] T005 [P] [US1] Create unit test file `frontend/tests/unit/ItemForm.test.jsx` — tests for: renders all three fields, name is required, price accepts flexible formats, description has max length, submit calls onSubmit with valid data, cancel calls onCancel, shows validation errors

### Implementation for User Story 1

- [x] T006 [US1] Implement add-bottle flow in `frontend/src/components/MyBottlesSheet.jsx` — "Add [Bottle/Item]" button toggles `showAddForm` state; renders `ItemForm` with `isEditing={false}`; on submit calls `itemService.registerItem(eventId, data)` and appends result to local `items` state; shows success toast via sonner
- [x] T007 [US1] Implement bottle list rendering in `frontend/src/components/MyBottlesSheet.jsx` — render each item as `ListCard` showing: bottle name (primary), price if present, description if present, registration date as relative time (e.g., "2 hours ago")
- [x] T008 [US1] Implement state-based gating in `frontend/src/components/MyBottlesSheet.jsx` — during `created`/`started`: show add button and forms; during `paused`: hide add button, show "Registration is closed while the event is paused." message; during `completed`: show "The event has ended." message; all using dynamic terminology. Handle reactive state transitions: if the `event` prop changes while the sheet is open (e.g., host pauses), the sheet must transition to read-only mode without crashing.
- [x] T009 [US1] Implement empty state in `frontend/src/components/MyBottlesSheet.jsx` — when no items and registration available: show "You haven't registered any [bottles/items] yet" with prominent "Add [Bottle/Item]" CTA

**Checkpoint**: MyBottlesSheet can add bottles, render them as ListCards, and gates by event state. Unit tests for add flow pass.

---

## Phase 4: User Story 2 — Manage Existing Bottles (Priority: P1)

**Goal**: Guest can edit and delete registered bottles with undo toast for deletes

**Independent Test**: Pre-register a bottle, open the sheet, edit the name, verify update persists. Delete a bottle, verify undo toast appears, tap undo, verify restoration. Let toast expire, verify deletion.

### Tests for User Story 2

- [x] T010 [P] [US2] Add edit/delete tests to `frontend/tests/unit/MyBottlesSheet.test.jsx` — tests for: edit button visible during created/started, edit form pre-populated, edit saves and updates list, delete removes item and shows undo toast, undo restores item, no edit/delete buttons during paused/completed

### Implementation for User Story 2

- [x] T011 [US2] Implement edit flow in `frontend/src/components/MyBottlesSheet.jsx` — edit button on each ListCard (visible during `created`/`started`); sets `editingItemId` state; renders inline `ItemForm` with `isEditing={true}` and `initialValues` pre-populated; on submit calls `itemService.updateItem(eventId, itemId, data)` and updates local `items` state; clears `editingItemId` on save/cancel
- [x] T012 [US2] Implement delete with undo toast in `frontend/src/components/MyBottlesSheet.jsx` — delete button on each ListCard (visible during `created`/`started`); on tap: optimistically remove item from local state, store in ref, show sonner toast with "Undo" action and 5s duration; on undo: restore item to state; on toast dismiss: call `itemService.deleteItem(eventId, itemId)`; on API error: restore item and show error toast. If the sheet closes while an undo toast is active, the pending delete must still complete on toast expiry.
- [x] T013 [US2] Implement assigned item number display in `frontend/src/components/MyBottlesSheet.jsx` — during `completed` state only: if item has `itemId` set, show Badge with `#[itemId]` on the ListCard (using handle prop or inline badge); match AssignmentView styling pattern (addresses FR-008a and US1 acceptance scenario 5)

**Checkpoint**: Full CRUD works. Edit/delete properly gated by state. Undo toast pattern replaces window.confirm. Assigned numbers show in completed state. Unit tests pass.

---

## Phase 5: User Story 3 — Edit Display Name (Priority: P2)

**Goal**: Guest can edit their display name via auto-save on blur with toast confirmation

**Independent Test**: Open the sheet, change the name, blur the field, verify "Name updated" toast and persistence. Verify field is read-only during paused/completed.

### Tests for User Story 3

- [x] T014 [P] [US3] Add name field tests to `frontend/tests/unit/MyBottlesSheet.test.jsx` — tests for: name field pre-populated with current value, auto-saves on blur when changed, shows "Name updated" toast, does not save when value unchanged, read-only during paused/completed

### Implementation for User Story 3

- [x] T015 [US3] Implement name auto-save in `frontend/src/components/MyBottlesSheet.jsx` — name input at top of sheet; track `lastSavedNameRef` to compare on blur; on blur with changed value: call `apiClient.updateUserProfile(eventId, name)`, show "Name updated" toast on success, revert and show error toast on failure; make field read-only during `paused`/`completed` states

**Checkpoint**: Name field auto-saves on blur, shows toast, read-only when appropriate. Unit tests pass.

---

## Phase 6: User Story 4 — Entry Points (Priority: P2)

**Goal**: Sheet is accessible from hamburger menu, welcome sheet CTA, and inline prompt — no new persistent UI elements

**Independent Test**: Verify each of the three entry points opens the sheet by tapping them and confirming the sheet is visible.

### Tests for User Story 4

- [x] T016 [P] [US4] Update `frontend/tests/unit/GuestWelcomeBottomSheet.test.jsx` — add tests for: contextual CTA text ("Register My Bottle" when no items, "View My Bottles" when items exist); verify onRegister callback is called (no navigation assertion)

### Implementation for User Story 4

- [x] T017 [US4] Wire sheet state in `frontend/src/pages/EventPage.jsx` — add `isMyBottlesOpen` state; render `MyBottlesSheet` with `isOpen={isMyBottlesOpen}` and `onClose={() => setIsMyBottlesOpen(false)}`; pass `event` and `eventId` props
- [x] T018 [US4] Update `handleGuestWelcomeRegister` in `frontend/src/pages/EventPage.jsx` — replace `navigate(\`/event/${eventId}/profile\`)` with `setIsMyBottlesOpen(true)`; keep `setShowGuestWelcome(false)` and `window.history.replaceState`
- [x] T019 [US4] Update inline registration prompt in `frontend/src/pages/EventPage.jsx` — replace `onClick={() => navigate(\`/event/${eventId}/profile\`)}` with `onClick={() => setIsMyBottlesOpen(true)}`
- [x] T020 [US4] Update `frontend/src/components/GuestWelcomeBottomSheet.jsx` — accept `hasItems` prop; change CTA text to "View My [Plural]" when `hasItems` is true, keep "Register My [Singular]" when false; pass `hasItems` from EventPage based on user's item count
- [x] T021 [US4] Update `frontend/src/components/Header.jsx` — replace "Profile" menu item text with "My [Bottles/Items]" using dynamic terminology; replace `handleProfileClick` with `onMyBottlesClick` callback prop; accept `onMyBottlesClick` and `event` props from EventPage; remove `profilePath` useMemo and `handleProfileClick` handler
- [x] T022 [US4] Pass `onMyBottlesClick` callback from `frontend/src/pages/EventPage.jsx` to `Header` — pass `onMyBottlesClick={() => setIsMyBottlesOpen(true)}` and `event` prop

**Checkpoint**: Sheet opens from all three entry points. No navigation to /profile. Welcome CTA text is contextual. Unit tests pass.

---

## Phase 7: User Story 5 — Profile Page Removal (Priority: P2)

**Goal**: Delete ProfilePage and all references — no dead code remains

**Independent Test**: Navigate to `/event/:eventId/profile` — should 404 or redirect. Search codebase for "ProfilePage" or "/profile" — zero matches outside git history.

### Implementation for User Story 5

- [x] T023 [US5] Delete `frontend/src/pages/ProfilePage.jsx`
- [x] T024 [US5] Remove `/event/:eventId/profile` route and `ProfilePage` import from `frontend/src/App.jsx`
- [x] T025 [US5] Search entire `frontend/src/` for any remaining references to `/profile`, `ProfilePage`, `profilePath`, or `handleProfileClick` — remove all orphaned imports, variables, and functions (includes Header.jsx if not fully cleaned in T021)

**Checkpoint**: ProfilePage deleted. Route removed. Zero profile references in codebase. App compiles cleanly.

---

## Phase 8: User Story 6 — Test Suite Updates (Priority: P2)

**Goal**: All unit and e2e tests pass with zero references to profile page or navigation

**Independent Test**: Run full unit and e2e suites — all green. Grep test files for `/profile` or `ProfilePage` — zero matches.

### Unit Test Updates

- [x] T026 [US6] Update `frontend/tests/unit/EventPage.test.jsx` — remove any assertions about profile navigation; add assertions that entry points trigger sheet open state
- [x] T027 [US6] Update `frontend/tests/unit/GuestWelcomeBottomSheet.test.jsx` — ensure no tests assert navigation to `/profile`; consolidate with T016 contextual CTA tests if not already complete

### E2E Test Updates

- [x] T028 [US6] Rewrite `frontend/tests/e2e/specs/guest-registration-nudge.spec.js` — replace line 52 URL assertion (`/event/${eventId}/profile`) with assertion that "My Bottles" bottom sheet is visible; replace line 114 inline prompt assertion similarly; review all other assertions for `/profile` references
- [x] T029 [US6] Rewrite `frontend/tests/e2e/specs/item-assignment.spec.js` — replace `navigateToProfilePage` helper with a `openMyBottlesSheet` helper that opens the sheet from hamburger menu; update all item registration steps (lines 98–221) to use the sheet flow; update paused/completed state assertions to check sheet read-only behavior
- [x] T030 [P] [US6] Create `frontend/tests/e2e/specs/my-bottles-sheet.spec.js` — comprehensive e2e tests: opens from hamburger menu, opens from welcome CTA, opens from inline prompt, can add a bottle, can edit a bottle, can delete with undo, read-only during paused/completed, name auto-saves, assigned item number shows in completed state, dynamic terminology; include FR-014 regression verification (welcome sheet still appears on every login during created/started states)
- [x] T031 [US6] Search all test files in `frontend/tests/` for references to `/profile`, `ProfilePage`, `navigateToProfilePage` — remove or update any remaining references

**Checkpoint**: Full unit and e2e suites pass. Zero profile references in test code.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T032 Verify dynamic terminology throughout — grep `frontend/src/components/MyBottlesSheet.jsx` and `frontend/src/components/ItemForm.jsx` for any hardcoded "bottle" or "Bottle" strings; replace with terminology from `useItemTerminology`
- [x] T033 Run `frontend/src/` codebase-wide check for `window.confirm` usage in bottle/item management flows — ensure zero instances remain
- [x] T034 Run quickstart.md verification checklist (all 13 items)
- [x] T035 Run full test suite: `npx vitest run` (unit) and `npx playwright test` (e2e) — all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001 then T002 (sequential).
- **Foundational (Phase 2)**: Depends on T001 and T002 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on T002 (ItemForm) and T003 (sheet shell)
- **US2 (Phase 4)**: Depends on US1 completion (add flow must exist to test edit/delete)
- **US3 (Phase 5)**: Depends on T003 (sheet shell) — can run in parallel with US1/US2
- **US4 (Phase 6)**: Depends on T003 (sheet shell must exist to wire up entry points)
- **US5 (Phase 7)**: Depends on US4 completion (entry points must work before removing old navigation)
- **US6 (Phase 8)**: Depends on US1–US5 (all features must be implemented before updating tests)
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2)
- **US2 (P1)**: Depends on US1 (same component, edit/delete require items to exist)
- **US3 (P2)**: Can start after Foundational — parallel with US1/US2
- **US4 (P2)**: Can start after T003 — parallel with US1/US2/US3 but recommended after US1
- **US5 (P2)**: Depends on US4 (must have new entry points before removing old navigation)
- **US6 (P2)**: Depends on US1–US5 (tests validate the final state)

### Within Each User Story

- Tests written first (should fail before implementation)
- Shared utilities/components before story-specific code
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001 then T002 (sequential — T002 imports `validateItemForm` from T001)
- T004 and T005 can run in parallel (different test files)
- US3 (name editing) can run in parallel with US1/US2 (different section of the sheet)
- T016 can run in parallel with T017–T022 (different files)
- T027 and T030 can run in parallel (different test files)

---

## Parallel Example: Phase 1 Setup

```
Task: T001 — Extract validation into frontend/src/utils/itemFormValidation.js
Task: T002 — Create ItemForm in frontend/src/components/ItemForm.jsx (depends on T001)
(Sequential — T002 imports validateItemForm from T001)
```

## Parallel Example: User Story 1 Tests

```
Task: T004 — Unit tests for MyBottlesSheet in frontend/tests/unit/MyBottlesSheet.test.jsx
Task: T005 — Unit tests for ItemForm in frontend/tests/unit/ItemForm.test.jsx
(Different test files, can run simultaneously)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: US1 — Register Bottles (T004–T009)
4. Complete Phase 4: US2 — Manage Bottles (T010–T013)
5. **STOP and VALIDATE**: Sheet renders, full CRUD works, state gating works
6. At this point the component exists but is not yet wired to the UI

### Incremental Delivery

1. Setup + Foundational → Sheet shell ready
2. Add US1 → Can add bottles → Test independently (render sheet with `isOpen={true}`)
3. Add US2 → Can edit/delete bottles → Test independently
4. Add US3 → Name editing works → Test independently
5. Add US4 → Sheet accessible from all entry points → Feature is user-facing
6. Add US5 → Old profile page removed → Clean codebase
7. Add US6 → All tests updated → Full confidence
8. Polish → Final validation → Ready for review

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 but US2 depends on US1 (edit/delete require existing items)
- US5 (delete ProfilePage) MUST come after US4 (new entry points) to avoid a broken intermediate state
- US6 (tests) is last because tests validate the final architecture
- The undo toast delete pattern (T012) requires careful handling of async timing — see research.md R3
- All ItemForm and MyBottlesSheet tests should mock `itemService` and `apiClient`
