# Tasks: Guest Management on Event Admin Page

**Input**: Design documents from `/specs/023-guest-management/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: E2E tests included (Constitution IV: Testing Standards is NON-NEGOTIABLE; project uses Playwright for E2E).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for source, `frontend/tests/` for tests
- Single file modified: `frontend/src/pages/EventAdminPage.jsx`
- Single file created: `frontend/tests/e2e/specs/guest-management.spec.js`

---

## Phase 1: Foundational (Data Layer)

**Purpose**: Extend existing data aggregation function to support the Guests feature. All user stories depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Extend `getAllUsersWithStats()` to include `itemNames` (array of item name strings) in its return object in `frontend/src/pages/EventAdminPage.jsx` (~line 753). Add `const userItemNames = userItems.map(item => item.name).filter(Boolean);` and include `itemNames: userItemNames` in the return. The `userItems` array is already computed internally — no new filtering needed.
- [x] T002 Add new state variables to EventAdminPage component in `frontend/src/pages/EventAdminPage.jsx`: `const [guestSearchQuery, setGuestSearchQuery] = useState('');` and `const [isRefreshingGuests, setIsRefreshingGuests] = useState(false);`. Add these near the existing state declarations (~line 130–170).

**Checkpoint**: Data layer ready — user story implementation can now begin.

---

## Phase 2: User Story 1 — View Guest List (Priority: P1) 🎯 MVP

**Goal**: Admin sees a "Guests" card on the settings page with guest count; tapping it opens a drawer showing all registered users with name, email, registration date, items count, item names, and role badges. Drawer auto-refreshes data on open and includes a manual Refresh button.

**Independent Test**: Create an event with several registered users (some with items, some without, at least one additional admin). Navigate to event admin page. Verify Guests card appears between Administrators and Export Data with correct count. Tap it and verify the drawer opens with all users listed correctly.

### Implementation for User Story 1

- [x] T003 [US1] Add the "Guests" card button in `frontend/src/pages/EventAdminPage.jsx` between the Administrators card (~line 1861) and the Export Data card (~line 1863). Follow the exact same `<button>` pattern as adjacent cards. Include `<span className="font-semibold">Guests</span>` and a `<Badge variant="outline">` showing `{getNonAdminUserCount()} registered`. On click: `setOpenDrawer('guests'); history.pushState({ drawer: 'guests' }, '', window.location.pathname);`.
- [x] T004 [US1] Add a `refreshGuestsData` async function in `frontend/src/pages/EventAdminPage.jsx` that: sets `isRefreshingGuests(true)`, calls `apiClient.getEvent(eventId)` → `setEvent()`, calls `itemService.getItems(eventId)` → `setItems()`, calls `fetchAdministrators()`, then sets `isRefreshingGuests(false)` in a finally block. Place near existing fetch functions (~line 800–900).
- [x] T005 [US1] Add a `useEffect` in `frontend/src/pages/EventAdminPage.jsx` that watches for `openDrawer === 'guests'` and triggers `refreshGuestsData()` when the drawer opens. Follow the same pattern used by the Items drawer for re-fetching on open.
- [x] T006 [US1] Add the Guests `<SideDrawer>` in `frontend/src/pages/EventAdminPage.jsx` after the Administrators SideDrawer (~line 2786). Use `isOpen={openDrawer === 'guests'}`, `title="Guests"`, `width="w-full max-w-2xl"`, and the same `onClose` pattern with `history.state?.drawer` check used by all other drawers.
- [x] T007 [US1] Inside the Guests SideDrawer, add a Refresh button using `<Button variant="outline" size="sm" onClick={refreshGuestsData} disabled={isRefreshingGuests}>` with a `<RefreshCw>` icon that shows `className="animate-spin"` when `isRefreshingGuests` is true. Place in the drawer content above the guest list, right-aligned.
- [x] T008 [US1] Inside the Guests SideDrawer, render the guest list by calling `getAllUsersWithStats()` and mapping each guest to a row. Each row displays: guest name (bold, truncated with `truncate` class for long names) with email below in `text-muted-foreground`; if no name, email as primary. Registration date via `new Date(registeredAt).toLocaleDateString()` with "Unknown" fallback for missing/invalid dates. Items count and names: `"{count} {itemTerminology.pluralLower}: {names.join(', ')}"` — item names are NOT truncated; they wrap naturally so all names are visible (per spec clarification). Role badges: `<Badge variant="outline">Owner</Badge>` or `<Badge variant="outline">Admin</Badge>` for administrators. Use `useItemTerminology(event)` for item labels.
- [x] T009 [US1] Add empty state rendering inside the Guests SideDrawer: when `getAllUsersWithStats().length === 0`, show a centered `text-muted-foreground` message "No guests registered yet" in `frontend/src/pages/EventAdminPage.jsx`.

**Checkpoint**: Guests card and drawer are fully functional with auto-refresh and manual Refresh. Admin can view all guests with complete details. This is the MVP.

---

## Phase 3: User Story 2 — Search and Filter Guests (Priority: P2)

**Goal**: Admin can search the guest list by name, email, or item name. A summary line shows total and filtered counts.

**Independent Test**: Open Guests drawer with 10+ users. Type a partial name or email — list filters. Type an item name — the owner of that item appears. Summary line updates. Clear search — all guests reappear.

### Implementation for User Story 2

- [x] T010 [US2] Add a search `<Input>` at the top of the Guests SideDrawer content in `frontend/src/pages/EventAdminPage.jsx`. Use a `<Search>` icon from lucide-react (same pattern as Items Assignment tab ~line 2036). Set placeholder to `"Search by name, email, or {itemTerminology.singularLower}..."`. Bind to `guestSearchQuery` / `setGuestSearchQuery` state.
- [x] T011 [US2] Add a `filteredGuests` `useMemo` in `frontend/src/pages/EventAdminPage.jsx` that filters `getAllUsersWithStats()` by `guestSearchQuery`. Match against `guest.name`, `guest.email`, and `guest.itemNames` entries (case-insensitive, partial match). Dependencies: `[event?.users, items, administrators, guestSearchQuery]`. Follow the same search pattern as the Items Assignment tab (~lines 1555–1580).
- [x] T012 [US2] Update the guest list rendering (from T008) to iterate over `filteredGuests` instead of calling `getAllUsersWithStats()` directly.
- [x] T013 [US2] Add a summary line above the guest list in `frontend/src/pages/EventAdminPage.jsx`. When `guestSearchQuery` is active: `"Showing {filteredGuests.length} of {allGuests.length} guests"`. When no search: `"{allGuests.length} guests"`. Use `text-sm text-muted-foreground` styling.
- [x] T014 [US2] Add empty search state rendering: when `filteredGuests.length === 0` and `guestSearchQuery` is non-empty, show "No guests match your search" message instead of the empty-event message from T009.

**Checkpoint**: Guest list is searchable. Admin can find guests by name, email, or item name with real-time filtering and count display.

---

## Phase 4: User Story 3 — Delete Individual Guest (Priority: P2)

**Goal**: Each guest row has a delete button (hidden for owner) that opens the existing delete confirmation dialog. After deletion, the list refreshes in place.

**Independent Test**: Open Guests drawer. Click trash icon on a guest row. Confirmation dialog shows correct counts. Type "DELETE USER" and confirm. Guest disappears from list. Verify owner row has no delete button.

### Implementation for User Story 3

- [x] T015 [US3] Add a delete button (`<Button variant="ghost" size="icon">` with `<Trash2>` icon) to each guest row in the Guests drawer in `frontend/src/pages/EventAdminPage.jsx`. The button MUST NOT be rendered for the owner (`!guest.isOwner`). The button MUST be disabled when `isRefreshingGuests` is true (prevents deletion while stale data is being replaced). For the last remaining administrator, the button is shown but deletion is prevented server-side. On click: call `handleOpenDeleteUserDialog(guest.email, guest.name, guest.isAdministrator)` — this is the existing function that fetches items/ratings counts and opens the `DeleteUserDialog`.
- [x] T016 [US3] Verify that the existing `handleDeleteUser()` function in `frontend/src/pages/EventAdminPage.jsx` already refreshes event data, items, and administrators after successful deletion. If the Guests drawer is open during deletion, the list should update automatically since it derives from `event.users` and `items` state. Confirm the search filter (`guestSearchQuery`) is preserved across the deletion refresh. **If any of these behaviors are missing**, add the necessary logic (e.g., call `refreshGuestsData()` after deletion, or persist `guestSearchQuery` across re-renders) before moving to T017.
- [x] T017 [US3] Add success/error message display inside the Guests SideDrawer in `frontend/src/pages/EventAdminPage.jsx`. Show `deleteUserSuccess` and `deleteUserError` using existing `<Message>` component with `type="success"` and `type="error"` respectively. These state variables are already managed by `handleDeleteUser()`.

**Checkpoint**: Admin can delete individual guests from the Guests drawer with full confirmation flow, owner protection, and automatic list refresh.

---

## Phase 5: User Story 4 — Remove Individual User Delete from Danger Zone (Priority: P3)

**Goal**: Remove the redundant "Users Management" section from the Danger Zone drawer. Keep "Delete All Users" unchanged.

**Independent Test**: Open Danger Zone drawer. Verify "Users Management" section is gone. Verify "Delete All Users" is still present and functional.

### Implementation for User Story 4

- [x] T018 [US4] Remove the "Users Management" section from the Danger Zone drawer in `frontend/src/pages/EventAdminPage.jsx` (~lines 3007–3071). This includes: the `<div className="p-4 border border-destructive/20 ...">` wrapper, the `<h4>Users Management</h4>` heading, the `<select data-testid="user-select">` dropdown, and the `<Button data-testid="delete-user-button">` delete button. Keep the `isCurrentUserAdministrator()` guard on surrounding sections.
- [x] T019 [US4] Remove the `selectedUserEmail` state variable and its `setSelectedUserEmail` setter from `frontend/src/pages/EventAdminPage.jsx` (~line 152). Search for all references to `selectedUserEmail` and remove them. Keep `deleteUserSuccess`, `deleteUserError`, `deleteUserDialogState`, and `isDeletingUser` state — these are still used by the Guests drawer delete flow.
- [x] T020 [US4] Verify the "Delete All Users" section in the Danger Zone drawer remains unchanged and functional in `frontend/src/pages/EventAdminPage.jsx`. Confirm the `deleteUsersError`, `deleteUsersSuccess`, `isDeleteUsersDialogOpen`, `isDeletingUsers`, `handleDeleteAllUsers`, and `getNonAdminUserCount()` are all still present and wired correctly.

**Checkpoint**: Danger Zone is cleaned up. Individual user delete lives only in the Guests drawer. "Delete All Users" is intact.

---

## Phase 6: E2E Tests

**Purpose**: Playwright E2E tests covering all 4 user stories per Constitution IV (Testing Standards).

> **Note on timing**: Ideally, E2E tests would be written alongside each user story (TDD). They are grouped here for practical reasons — the test file depends on the full UI being in place. If preferred, stub tests can be authored during earlier phases and filled in as each user story is completed.

- [x] T021 [P] Create E2E test file `frontend/tests/e2e/specs/guest-management.spec.js`. Import `test` from `./fixtures.js` and helpers from `./helpers.js`. Use the `testEvent` fixture pattern for isolated test events.
- [x] T022 [P] [US1] Add E2E tests for User Story 1 (View Guest List) in `frontend/tests/e2e/specs/guest-management.spec.js`: verify Guests card appears between Administrators and Export Data; verify card shows correct non-admin count; verify drawer opens with all users listed; verify name/email/date/items display; verify Owner and Admin badges; verify sort order; verify empty state; verify Refresh button fetches fresh data; verify auto-refresh on re-open.
- [x] T023 [P] [US2] Add E2E tests for User Story 2 (Search) in `frontend/tests/e2e/specs/guest-management.spec.js`: verify search input is visible; verify filtering by name; verify filtering by email; verify filtering by item name; verify summary line counts update; verify empty search state; verify clearing search restores full list.
- [x] T024 [P] [US3] Add E2E tests for User Story 3 (Delete) in `frontend/tests/e2e/specs/guest-management.spec.js`: verify delete button on guest rows; verify owner row has no delete button; verify delete confirmation dialog shows correct counts; verify successful deletion removes guest from list; verify cancel does not delete; verify search filter preserved after deletion.
- [x] T025 [P] [US4] Add E2E tests for User Story 4 (Danger Zone cleanup) in `frontend/tests/e2e/specs/guest-management.spec.js`: verify "Users Management" section is NOT present in Danger Zone drawer; verify "Delete All Users" section IS still present and functional.

**Checkpoint**: All user stories have E2E test coverage.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation.

- [x] T026 Run linter and fix any lint errors introduced in `frontend/src/pages/EventAdminPage.jsx`
- [x] T027 Remove any unused imports from `frontend/src/pages/EventAdminPage.jsx` resulting from the Danger Zone cleanup (e.g., if `selectedUserEmail`-related imports are no longer needed)
- [x] T028 Run quickstart.md manual validation steps (all 12 steps) to verify end-to-end feature correctness
- [x] T029 Run the full E2E test suite to ensure no regressions in existing tests (`frontend/tests/e2e/specs/danger-zone.spec.js`, `frontend/tests/e2e/specs/admin-management.spec.js`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately
- **User Story 1 (Phase 2)**: Depends on Phase 1 completion — this is the MVP
- **User Story 2 (Phase 3)**: Depends on Phase 2 (builds on guest list rendering from US1)
- **User Story 3 (Phase 4)**: Depends on Phase 2 (adds delete to guest rows from US1); independent of US2
- **User Story 4 (Phase 5)**: Depends on Phase 4 (delete must work in Guests drawer before removing from Danger Zone)
- **E2E Tests (Phase 6)**: Depends on all user stories being implemented (Phases 2–5)
- **Polish (Phase 7)**: Depends on Phase 6

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 1 — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (needs the guest list to add search to)
- **User Story 3 (P2)**: Depends on US1 (needs the guest rows to add delete buttons to); independent of US2
- **User Story 4 (P3)**: Depends on US3 (delete must exist in Guests drawer before removing from Danger Zone)

### Within Each User Story

- All tasks within a story are sequential (same file: `EventAdminPage.jsx`)
- No parallel tasks within a story phase (all modify the same file)

### Parallel Opportunities

- **US2 and US3** can be implemented in parallel after US1 is complete (both add features to the guest list independently)
- **E2E tests (T021–T025)** can be written in parallel since they are in a separate file
- **T026 and T027** (lint + cleanup) can run in parallel

---

## Parallel Example: After User Story 1

```text
# After US1 is complete, US2 and US3 can proceed in parallel:

# Developer A (or sequential pass 1):
Task T010–T014: Search and filter (US2)

# Developer B (or sequential pass 2):
Task T015–T017: Delete from guest rows (US3)

# After both complete, US4 can proceed:
Task T018–T020: Danger Zone cleanup (US4)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001–T002)
2. Complete Phase 2: User Story 1 (T003–T009)
3. **STOP and VALIDATE**: Open Guests card, verify list, verify refresh — this is the MVP
4. Manual test with quickstart.md steps 1–3, 8–9, 11–12

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 2 → US1: Guest list viewable (MVP)
3. Phase 3 → US2: Search works
4. Phase 4 → US3: Delete works from Guests drawer
5. Phase 5 → US4: Danger Zone cleaned up
6. Phase 6 → E2E tests pass
7. Phase 7 → Polish, lint, regression check

### Single Developer Strategy (Recommended)

All changes are in one file (`EventAdminPage.jsx`) plus one test file, so sequential execution is natural:

1. T001–T002 (foundation) → T003–T009 (MVP) → **validate**
2. T010–T014 (search) → T015–T017 (delete) → **validate**
3. T018–T020 (cleanup) → **validate**
4. T021–T025 (E2E tests) → T026–T029 (polish)

---

## Notes

- All source changes are in a single file: `frontend/src/pages/EventAdminPage.jsx`
- E2E tests go in a single new file: `frontend/tests/e2e/specs/guest-management.spec.js`
- No new components, no new utilities, no backend changes
- Commit after each phase checkpoint for clean git history
- The existing `DeleteUserDialog` is already rendered once at the bottom of EventAdminPage — no need to add another instance

### Implicit Coverage (no dedicated tasks required)

- **FR-019** (Guests card/drawer visible only to admins): Satisfied by the existing admin page authentication gate — EventAdminPage is only accessible to authenticated administrators. No additional task needed.
- **FR-006** (Guest list sort order: owner → admins → guests, alphabetical by email): Already implemented by the existing `getAllUsersWithStats()` function which returns users in this order. T008 consumes this output directly.
