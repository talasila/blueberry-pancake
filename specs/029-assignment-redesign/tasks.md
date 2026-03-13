# Tasks: Assignment Tab Redesign (Number-First Grid)

**Input**: Design documents from `/specs/029-assignment-redesign/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational Components

**Purpose**: Create the reusable primitive components that all user stories depend on. These are building blocks with no assignment-specific logic.

- [x] T001 [P] Create BottomSheetPicker component in `frontend/src/components/BottomSheetPicker.jsx` — reusable slide-up panel extracted from the pattern in ItemDetailsDrawer/WelcomeBottomSheet (fixed bottom, backdrop, translate-y transition, close on backdrop tap). Props: `isOpen`, `onClose`, `title`, `children`. Reference `frontend/src/components/ItemDetailsDrawer.jsx` lines 365-430 for the animation pattern (backdrop `bg-black/50`, sheet `translate-y-full` → `translate-y-0`, 300ms transition, `max-h-[75vh]`, `rounded-t-2xl`)
- [x] T002 [P] Create AssignmentButton component in `frontend/src/components/AssignmentButton.jsx` — 60px circular button matching ItemButton's visual style but with assignment-specific states. Props: `itemId` (number), `isAssigned` (boolean), `isDisabled` (boolean), `isLoading` (boolean), `onClick`. Visual states: unassigned = `bg-muted` gray, assigned = `bg-green-500` green, disabled = `opacity-50`, loading = spinner. Reference `frontend/src/components/ItemButton.jsx` for the 60px circle, 28px font size, and visual pattern
- [x] T003 [P] Create unit tests for BottomSheetPicker in `frontend/tests/unit/BottomSheetPicker.test.jsx` — test: renders when `isOpen=true`, hidden when `isOpen=false`, calls `onClose` on backdrop tap, displays `title` and `children`, slide-up animation class is applied
- [x] T004 [P] Create unit tests for AssignmentButton in `frontend/tests/unit/AssignmentButton.test.jsx` — test: renders `itemId` number, shows gray background when unassigned, shows green background when assigned, shows reduced opacity when disabled, does not fire `onClick` when disabled, shows spinner when loading, calls `onClick(itemId)` on tap

**Checkpoint**: Both primitives exist with unit tests and can be rendered in isolation. No integration yet.

---

## Phase 2: User Story 1 — Number Grid as Primary View (Priority: P1) — MVP

**Goal**: Host opens the Assignment tab and sees a grid of circular numbered buttons (excluding omitted IDs) matching the rating page layout. Each button shows assigned vs unassigned state via color. Instructional text above the grid adapts to event state.

**Independent Test**: Open the Assignment tab for a paused event with 12 items (2 excluded) → verify exactly 10 buttons in a 3-column grid. Excluded IDs do not appear. Assigned buttons show green, unassigned show gray.

- [x] T005 [US1] Create AssignmentView component in `frontend/src/components/AssignmentView.jsx` with the number grid. Accept props: `eventId`, `event`, `items`, `isLoadingItems`, `onAssignItem`, `onPauseEvent`, `onItemsChange`. Compute `availableIds` from `event.itemConfiguration.numberOfItems` minus `excludedItemIds` (same logic as `frontend/src/pages/EventPage.jsx` lines 134-146). Compute `assignedMap` (Map of itemId number → item). Render a 3-column grid of AssignmentButton components (`grid grid-cols-3 gap-6 justify-items-center` with `width: fit-content`, centered — matching `frontend/src/pages/EventPage.jsx` lines 676-691). Use `useItemTerminology` (from `frontend/src/utils/itemTerminology.js`) for dynamic item/bottle terminology in all user-facing text
- [x] T006 [US1] Add instructional text above the grid in `frontend/src/components/AssignmentView.jsx` — adapt to event state per FR-010. Use `useItemTerminology` for dynamic terminology: when `paused` show "Tap a number to assign a {singularLower}" (e.g., "Tap a number to assign a bottle"); when `started` show "Pause the event to begin assignment"; when `created` show "Start and then pause the event to begin assignment"; when `completed` show "Assignment is not available after the event is completed". Follow the rating page's instructional text pattern from `frontend/src/pages/EventPage.jsx`
- [x] T007 [US1] Add disabled/non-interactive state to the grid in `frontend/src/components/AssignmentView.jsx` per FR-011 — when `event.state !== 'paused'`, render the grid with all buttons disabled (`isDisabled={true}`) and reduced opacity on the grid container. The grid remains visible but non-tappable

**Checkpoint**: AssignmentView renders a correct 3-column grid with color-coded buttons, instructional text, and disabled state when not paused. No assignment interaction yet.

---

## Phase 3: User Story 2 — Assign a Bottle to a Number via Bottom Sheet (Priority: P1)

**Goal**: Host taps an unassigned number button → bottom sheet slides up showing unassigned registered bottles → host taps a bottle → assignment is saved optimistically (sheet closes, button turns green, reverts on failure).

**Independent Test**: Tap unassigned tile #3 → bottom sheet shows 3 unassigned bottles → tap one → sheet closes, #3 turns green, API is called.

**Depends on**: Phase 1 (BottomSheetPicker), Phase 2 (AssignmentView grid)

- [x] T008 [US2] Add bottom sheet state management to `frontend/src/components/AssignmentView.jsx` — add `selectedNumber` state (which button was tapped). When an unassigned button is tapped and event is paused, set `selectedNumber` and open the BottomSheetPicker
- [x] T009 [US2] Implement unassigned bottle list content inside the BottomSheetPicker in `frontend/src/components/AssignmentView.jsx` — compute `unassignedBottles` from `items.filter(i => i.itemId == null)`. Display each as a tappable row: `{name} — {ownerDisplayName}`. Resolve owner display name from `event.users` by matching `ownerEmail`, falling back to email (FR-004). Show empty state using dynamic terminology: "All registered {pluralLower} have been assigned" when list is empty
- [x] T010 [US2] Add search/filter to the bottom sheet in `frontend/src/components/AssignmentView.jsx` per FR-008 — show a search input at the top of the sheet when unassigned bottles count >= 6. Filter list by bottle name or owner name/email in real time as the host types
- [x] T011 [US2] Implement optimistic assignment flow in `frontend/src/components/AssignmentView.jsx` per FR-005 — when host taps a bottle: (1) close sheet immediately (`selectedNumber = null`), (2) add `assigningNumber` state to show loading on the button, (3) call `onAssignItem(bottle.id, selectedNumber)`, (4) on success: update items via `onItemsChange` with the returned item, (5) on failure: revert by calling `onItemsChange` to restore previous state and show error toast via `sonner`. Note: if the API returns a conflict error (e.g., another admin assigned the same number), the error toast should display the backend message. After each successful assignment, the unassigned bottles list re-derives from the updated `items` prop, keeping it current for concurrent-admin scenarios. Reference the existing `handleAssignItemId` pattern in `frontend/src/pages/EventAdminPage.jsx` lines 1533-1559

**Checkpoint**: Full assign-by-tapping flow works: tap number → pick bottle → sheet closes → button turns green. Errors revert gracefully.

---

## Phase 4: User Story 3 — Review and Change an Existing Assignment (Priority: P1)

**Goal**: Host taps an assigned (green) button → sees current assignment with "Change" and "Clear" options. "Change" opens the bottle picker. "Clear" removes the assignment.

**Independent Test**: Tap assigned tile #3 → see "Cabernet Sauvignon — Sarah M." with Change/Clear buttons → tap Clear → tile reverts to gray.

**Depends on**: Phase 3 (assignment flow)

- [x] T012 [US3] Implement assigned-number bottom sheet mode in `frontend/src/components/AssignmentView.jsx` per FR-006 — when an assigned button is tapped, open the BottomSheetPicker showing: (1) header with "#{number} — {assignedBottleName}", (2) current assignment details (name, owner), (3) "Change" button that switches to the unassigned bottle picker, (4) "Clear" button to remove the assignment
- [x] T013 [US3] Implement clear assignment flow in `frontend/src/components/AssignmentView.jsx` per FR-007 — when host taps "Clear": call `onAssignItem(bottle.id, null)` to set itemId to null, close the sheet, revert button to unassigned gray state, and return the bottle to the unassigned pool. Handle errors with toast and revert
- [x] T014 [US3] Implement change assignment flow in `frontend/src/components/AssignmentView.jsx` — when host taps "Change": switch the bottom sheet content to show unassigned bottles (same list as US2). When a new bottle is selected: clear the old assignment first, then assign the new one. The previously assigned bottle should appear in the available list since it's being freed by the reassignment

**Checkpoint**: Host can review, change, and clear existing assignments. The unassigned bottle pool updates correctly after each operation.

---

## Phase 5: User Story 4 — Assignment Progress Indicator (Priority: P1)

**Goal**: A progress indicator at the top of the Assignment tab shows "{assigned} of {total} assigned · {remaining} bottles remaining" with a fill bar.

**Independent Test**: Assign bottles one at a time → progress updates after each. When all registered bottles are assigned, remaining count shows 0.

**Depends on**: Phase 2 (AssignmentView exists)

- [x] T015 [US4] Add progress indicator to `frontend/src/components/AssignmentView.jsx` per FR-009 — render above the grid (below instructional text). Use `useItemTerminology` for all user-facing text. Show text: "{assignedCount} of {totalSlots} assigned · {unassignedBottles.length} {pluralLower} remaining". Include a visual fill bar (`bg-green-500` or accent) proportional to `assignedCount / totalSlots`. When all registered bottles are assigned (unassignedBottles.length === 0), show "0 {pluralLower} remaining" even if some number slots are empty. When assignedCount === totalSlots, show a completion state: "All assigned ✓" with success styling

**Checkpoint**: Progress indicator accurately reflects assignment state, updates after each assignment, and shows completion when done.

---

## Phase 6: User Story 5 — Inline Pause CTA (Priority: P2)

**Goal**: When the event is in `started` state, a "Pause Event to Begin Assignment" button appears on the Assignment tab. Tapping it pauses the event without navigating away.

**Independent Test**: Open Assignment tab while event is `started` → see pause button → tap it → event pauses, grid becomes interactive.

**Depends on**: Phase 2 (AssignmentView exists)

- [x] T016 [US5] Add inline pause CTA to `frontend/src/components/AssignmentView.jsx` per FR-012 — when `event.state === 'started'` and `onPauseEvent` prop is provided, render a prominent "Pause Event to Begin Assignment" button (centered, full-width, primary styling). Use `useItemTerminology` so the button text adapts to event type (e.g., "Pause Event to Begin Assignment"). On tap: call `onPauseEvent()`, show loading state on the button during the API call. On success: the parent updates `event.state` to `paused` via props, the CTA disappears, and the grid becomes interactive. On failure: show error toast. Do NOT show the pause CTA for `created` or `completed` states — only show the appropriate instructional text (already handled in T006)

**Checkpoint**: Host can pause the event directly from the Assignment tab without navigating away. CTA only appears in `started` state.

---

## Phase 7: User Story 6 — Registered Bottles Verification List (Priority: P2)

**Goal**: A collapsible "Registered Bottles" section below the grid lists all registered bottles with their name, owner, and assigned number (or "unassigned").

**Independent Test**: Register 8 bottles, assign 6 → expand section → all 8 listed with correct status.

**Depends on**: Phase 2 (AssignmentView exists)

- [x] T017 [US6] Add collapsible registered bottles list to `frontend/src/components/AssignmentView.jsx` per FR-017 — render below the grid. Collapsed by default (`bottleListExpanded` state). Use `useItemTerminology` for dynamic terminology in the disclosure label (e.g., "Registered Bottles" or "Registered Items" based on event type) and count badge. When expanded, show a compact list: each row displays bottle name, owner (resolved from `event.users`), and assigned number (e.g., "#3") or "Unassigned" badge. The list updates in real time as assignments are made via the grid. Use the existing Radix Accordion component from `frontend/src/components/ui/accordion.jsx` or a simple collapsible div with transition

**Checkpoint**: Host can expand and verify all registered bottles. List reflects assignment changes in real time.

---

## Phase 8: User Story 7 — Eliminate Duplicated Assignment Code (Priority: P2)

**Goal**: Replace the duplicated assignment UI in both `EventAdminPage.jsx` (drawer) and `ItemAssignmentPage.jsx` (standalone page) with the shared `AssignmentView` component. Remove all old accordion/dropdown code.

**Independent Test**: Both the drawer and standalone page render identically using the shared component. Old accordion code is fully removed.

**Depends on**: All previous phases (AssignmentView must be feature-complete)

- [x] T018 [US7] Integrate AssignmentView into `frontend/src/pages/EventAdminPage.jsx` — replace the assignment tab content (approximately lines 2111-2316) with `<AssignmentView>`. Pass existing props: `eventId`, `event`, `items`, `isLoadingItems`, `onAssignItem={handleAssignItemId}`, `onPauseEvent` (wire to `handleStateTransition('paused')`), `onItemsChange={setItems}`. Remove the old assignment-related state variables that are no longer needed: `expandedItems`, `searchQuery`, `statusFilter`, and the `getAvailableItemIds` function (lines 1564-1581). Keep `assigningItemId` and `assignmentErrors` only if still used by the shared component's callback, otherwise remove
- [x] T019 [US7] Integrate AssignmentView into `frontend/src/pages/ItemAssignmentPage.jsx` — replace the entire assignment UI with `<AssignmentView>` in a full-page layout. The standalone page already fetches its own event and items data — pass them as props to AssignmentView. Create a `handlePauseEvent` callback that calls `apiClient.transitionEventState(eventId, 'paused', event.state)` and updates local event state on success, then pass it as the `onPauseEvent` prop so US5 (inline pause CTA) works on the standalone page too. Remove all duplicated assignment logic, state variables (`expandedItems`, `searchQuery`, `statusFilter`, `assigningItemId`, `assignmentErrors`), the `getAvailableItemIds` function, `filteredItems` memo, and the old accordion/dropdown JSX
- [x] T020 [US7] Remove old assignment UI code from `frontend/src/pages/EventAdminPage.jsx` per FR-018 — delete all code related to the old bottle-first accordion: expand/collapse handlers, inline dropdown rendering, status filter buttons, the assignment-specific search bar, and any unused imports. Verify no dead code remains. Run linter to confirm
- [x] T021 [US7] Update existing tests in `frontend/tests/unit/EventAdminPage.test.jsx` — update mocks and assertions to account for the new component structure. The assignment tab content is now rendered by AssignmentView (which can be mocked as a module), so update any tests that referenced the old accordion/dropdown elements. Remove stale mocks for deleted state variables and functions

**Checkpoint**: Assignment UI is defined in exactly one component file (`AssignmentView.jsx`). Both the drawer and standalone page import and render it. All old accordion/dropdown code is deleted. Tests pass.

---

## Phase 9: Tests & Polish

**Purpose**: Unit tests for the shared component, final verification, cleanup, and edge case handling

- [x] T022 Create unit tests for AssignmentView in `frontend/tests/unit/AssignmentView.test.jsx` — test the following per user story acceptance scenarios: (US1) renders correct number of buttons excluding excluded IDs, shows assigned buttons in green and unassigned in gray, shows instructional text adapted to event state, grid is disabled when not paused; (US2) opens bottom sheet on unassigned button tap, shows unassigned bottles with name and owner, closes sheet and updates button on assignment; (US3) opens review sheet on assigned button tap showing current assignment, clears assignment on "Clear" tap; (US4) progress indicator shows correct counts and updates after assignment; (US5) shows pause CTA when event is `started`, hides it when `paused`; (US6) registered bottles list is collapsed by default, expands on tap, shows correct assignment status. Mock `sonner` toast for error assertions
- [x] T023 [P] Manual QA: verify responsive layout on 320px screens — the 3-column grid with 60px buttons and gap-6 (24px) totals ~228px, which fits comfortably. Using browser dev tools, verify no horizontal overflow, no broken tap targets, and that the bottom sheet is usable on small screens at 320px, 375px, and 414px widths. Also verify that a full assignment of N bottles can be completed in 2×N taps (one tap per number, one tap per bottle) per SC-001
- [x] T024 [P] Manual QA: verify edge case with large item count (numberOfItems: 50+) — ensure the grid scrolls vertically without layout issues. Ensure the bottom sheet search works efficiently with many bottles
- [x] T025 [P] Manual QA: verify error handling — test assignment API failures (uniqueness conflict when two admins assign simultaneously, state validation error when event is unpaused during assignment). Confirm error toasts display correctly and grid state is not corrupted per SC-009
- [x] T026 Run full test suite — execute `npx vitest run` from `frontend/` to verify all unit tests pass, including updated EventAdminPage tests and new AssignmentView, AssignmentButton, and BottomSheetPicker tests. Fix any failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately
- **Phase 2 (US1 Grid)**: Depends on Phase 1 (needs AssignmentButton)
- **Phase 3 (US2 Assign)**: Depends on Phase 1 (needs BottomSheetPicker) + Phase 2 (needs grid)
- **Phase 4 (US3 Change)**: Depends on Phase 3 (needs assignment flow)
- **Phase 5 (US4 Progress)**: Depends on Phase 2 only (just reads data, no assignment interaction)
- **Phase 6 (US5 Pause CTA)**: Depends on Phase 2 only (just adds a button)
- **Phase 7 (US6 Bottle List)**: Depends on Phase 2 only (just reads data)
- **Phase 8 (US7 Integration)**: Depends on ALL previous phases (component must be complete)
- **Phase 9 (Tests & Polish)**: Depends on Phase 8

### User Story Dependencies

- **US1 (Grid)**: Independent after foundational → **MVP candidate**
- **US2 (Assign)**: Depends on US1 (grid must exist)
- **US3 (Change)**: Depends on US2 (assignment must work)
- **US4 (Progress)**: Independent of US2/US3 (reads data only) — can parallel with US2
- **US5 (Pause CTA)**: Independent of US2-US4 — can parallel with US2
- **US6 (Bottle List)**: Independent of US2-US5 — can parallel with US2
- **US7 (Integration)**: Depends on ALL above

### Parallel Opportunities

After Phase 2 completes (the grid exists), three work streams can proceed in parallel:

```
Phase 2 (US1 Grid) complete
  ├── Stream A: Phase 3 (US2 Assign) → Phase 4 (US3 Change)
  ├── Stream B: Phase 5 (US4 Progress)
  └── Stream C: Phase 6 (US5 Pause) + Phase 7 (US6 Bottle List)
All streams → Phase 8 (US7 Integration) → Phase 9 (Tests & Polish)
```

---

## Parallel Example: After Phase 2

```bash
# These can execute simultaneously after the grid is built:
Task: T008-T011 (US2: Bottom sheet assignment flow)
Task: T015      (US4: Progress indicator)
Task: T016      (US5: Inline pause CTA)
Task: T017      (US6: Registered bottles list)
```

---

## Implementation Strategy

### MVP First (US1 Only — Phase 1 + Phase 2)

1. Complete Phase 1: BottomSheetPicker + AssignmentButton (with unit tests)
2. Complete Phase 2: AssignmentView with grid display
3. **STOP and VALIDATE**: Grid renders correctly with color-coded buttons, instructional text, disabled states
4. This alone replaces the mental model (number-first vs bottle-first)

### Core Flow (US1 + US2 + US3 + US4 — Phases 1-5)

1. Complete MVP above
2. Add US2: Assignment via bottom sheet (the core 2-tap interaction)
3. Add US3: Change/clear existing assignments
4. Add US4: Progress indicator
5. **STOP and VALIDATE**: Full assignment workflow is functional
6. This covers all P1 stories — the host can do everything needed for the reveal

### Full Feature (All User Stories — Phases 1-9)

1. Complete core flow above
2. Add US5: Inline pause CTA
3. Add US6: Registered bottles verification list
4. Add US7: Integration into both pages + remove old code
5. Tests for AssignmentView + polish and verify
6. **All done**: Feature is complete, old code removed, tests pass

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 26 |
| Phase 1 (Foundational) | 4 tasks (2 components + 2 test files) |
| Phase 2 (US1 Grid) | 3 tasks |
| Phase 3 (US2 Assign) | 4 tasks |
| Phase 4 (US3 Change) | 3 tasks |
| Phase 5 (US4 Progress) | 1 task |
| Phase 6 (US5 Pause) | 1 task |
| Phase 7 (US6 Bottle List) | 1 task |
| Phase 8 (US7 Integration) | 4 tasks |
| Phase 9 (Tests & Polish) | 5 tasks (1 test file + 3 manual QA + 1 suite run) |
| Parallel opportunities | 4 streams after Phase 2 |
| MVP scope | Phases 1-2 (7 tasks) |
| Core flow scope | Phases 1-5 (15 tasks) |
| New files | 3 components + 3 test files |
| Modified files | 2 pages + 1 test file |
