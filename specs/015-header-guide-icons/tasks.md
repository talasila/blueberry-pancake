# Tasks: Header Guide Icons

**Input**: Design documents from `/specs/015-header-guide-icons/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Existing E2E tests must be updated to reflect the new trigger mechanism (header icon instead of FAB). This is required per SC-005 and SC-006.

**Organization**: Tasks are grouped by user story. US1 and US2 share foundational work (Phase 1) that must complete first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (State Lifting + Header Icon Rendering)

**Purpose**: Lift admin guide state to AppLayout, compute guide variant from route, build toggle callback, and add icon rendering to Header. This phase enables all subsequent user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Update `frontend/src/App.jsx`: (1) add `adminGuideOpen` / `setAdminGuideOpen` state alongside existing hosting guide state, (2) broaden `isAdminRoute` regex from `/^\/event\/[A-Za-z0-9]+\/admin$/` to `/^\/event\/[A-Za-z0-9]+\/admin(\/.*)?$/`, (3) derive `isSystemRoute` from pathname, (4) compute `guideVariant` ('admin' if isAdminRoute, null if isSystemRoute, 'hosting' otherwise), (5) build `onToggleGuide` callback that toggles the appropriate guide based on `guideVariant`, (6) compute `isGuideOpen` from the active guide's state, (7) pass `onToggleGuide`, `guideVariant`, and `isGuideOpen` props to `<Header />`, (8) render `<AdminGuideDrawer>` conditionally when `isAdminRoute` is true (with `isOpen={adminGuideOpen}` and `onClose={closeAdminGuide}`), (9) remove `GuideButton` import and `<GuideButton>` / conditional rendering, (10) keep conditional rendering for both drawers: render `<GuideDrawer>` only when `!isAdminRoute && !isSystemRoute` (preserving current unmount-on-nav behavior), and render `<AdminGuideDrawer>` only when `isAdminRoute` — this ensures navigating between route categories automatically closes the open guide by unmounting the drawer
- [x] T002 Update `frontend/src/components/Header.jsx`: (1) accept new props `onToggleGuide` (function), `guideVariant` ('hosting' | 'admin' | null), and `isGuideOpen` (boolean), (2) import `HelpCircle` and `BookOpen` from lucide-react, (3) render a guide icon button between the event-name/state-icon cluster and the hamburger menu / right edge, (4) conditionally show `HelpCircle` when `guideVariant === 'hosting'` and `BookOpen` when `guideVariant === 'admin'`, (5) render nothing when `guideVariant` is null, (6) icon button must have `data-testid="guide-icon"`, `aria-label` ("Open hosting guide" / "Open admin guide" / "Close hosting guide" / "Close admin guide" depending on variant and state), `flex-shrink-0`, and a 40×40 touch target, (7) onClick calls `onToggleGuide`, (8) icon must render independently of `authState` — outside the hamburger menu conditional block

**Checkpoint**: Header shows the correct guide icon on every route. Clicking toggles the appropriate drawer. Both drawers still function identically.

---

## Phase 2: User Story 1 — Access the Hosting Guide from the Header (Priority: P1) 🎯 MVP

**Goal**: The hosting guide is accessible via the header icon on all non-admin, non-system pages. The FAB is removed.

**Independent Test**: Navigate to landing page → see HelpCircle in header → tap → hosting guide drawer opens → tap header icon again → drawer closes.

### Implementation for User Story 1

- [x] T003 [US1] Delete `frontend/src/components/guide/GuideButton.jsx` — this file is dead code after T001 removed its import and usage (FR-007)
- [x] T004 [US1] Update `frontend/tests/e2e/specs/hosting-guide.spec.js`: (1) replace all `[data-testid="guide-button"]` locators with `[data-testid="guide-icon"]`, (2) update the `openGuide` helper to click the header icon, (3) update test descriptions from "floating button" to "header icon" where applicable, (4) add a test for toggle behavior — tap header icon to open, tap again to close (FR-012), (5) verify existing tests (role selection, host path, guest path, overview, close-via-button, keyboard navigation) still pass with the new trigger

**Checkpoint**: Hosting guide is fully accessible via header on all non-admin pages. No FAB visible. All hosting guide E2E tests pass (SC-005).

---

## Phase 3: User Story 2 — Access the Admin Guide from the Header (Priority: P1)

**Goal**: The admin guide is accessible via the BookOpen header icon on all `/event/:id/admin/*` routes. The admin page's inline FAB and local state are removed.

**Independent Test**: Navigate to admin page → see BookOpen in header (not HelpCircle) → tap → admin guide opens with state-aware content → navigate to main event page → icon switches to HelpCircle.

### Implementation for User Story 2

- [x] T005 [US2] Update `frontend/src/pages/EventAdminPage.jsx`: (1) remove `adminGuideOpen` state, `openAdminGuide` and `closeAdminGuide` callbacks, (2) remove `AdminGuideDrawer` import, (3) remove the admin guide FAB button (the `fixed bottom-6 right-6` block with `data-testid="admin-guide-button"`), (4) remove `<AdminGuideDrawer isOpen={adminGuideOpen} onClose={closeAdminGuide} />` rendering, (5) remove `BookOpen` from the lucide-react import if no other usage remains
- [x] T006 [US2] Update `frontend/tests/e2e/specs/admin-guide.spec.js`: (1) replace all `[data-testid="admin-guide-button"]` locators with `[data-testid="guide-icon"]`, (2) update the `openAdminGuide` helper to click the header icon, (3) add a test for toggle behavior — tap header icon to open, tap again to close (FR-012), (4) add a test that navigating from admin to main event page switches the icon from BookOpen to HelpCircle (US2 acceptance scenario 4), (5) verify existing tests (state-aware content, step navigation, overview, backdrop close, keyboard nav) still pass with the new trigger

**Checkpoint**: Admin guide is fully accessible via header on all admin routes. No admin FAB visible. All admin guide E2E tests pass (SC-006).

---

## Phase 4: User Story 3 — No Content Occlusion on Any Page (Priority: P1)

**Goal**: Verify no floating overlay elements remain in the application. All guide entry points are in the header chrome.

**Independent Test**: Visit landing, auth, event, admin, dashboard, and profile pages at 320px width — no floating elements in the bottom-right corner.

### Implementation for User Story 3

- [x] T007 [US3] Audit codebase for remaining fixed-position guide elements: search for `fixed bottom` and `z-30` class patterns across `frontend/src/` to confirm no FABs or floating guide buttons remain. If any are found, remove them. Validate FR-007 (no fixed-position guide buttons in the application).

**Checkpoint**: No floating overlay elements on any page. Content area is fully usable. (SC-001)

---

## Phase 5: User Story 4 — Guide Icon Visibility for Unauthenticated Users (Priority: P2)

**Goal**: The hosting guide HelpCircle icon is visible in the header for unauthenticated users on the landing page, auth page, and event entry flow pages.

**Independent Test**: Open the app in a fresh incognito-like state (no JWT token) → navigate to landing page → HelpCircle icon visible in header → tap → guide opens.

### Implementation for User Story 4

- [x] T008 [US4] Verify the guide icon renders outside the authenticated-only conditional block in `frontend/src/components/Header.jsx` (from T002). The icon must not be nested inside the `{authState && !isLandingPage && !isSystemRoute && (...)}` hamburger menu conditional. If T002 was implemented correctly, this is a verification-only task. If not, fix the placement.

**Checkpoint**: Unauthenticated users see and can use the hosting guide icon on all applicable pages. (SC-007)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, layout validation, and final walkthrough

- [x] T009 Verify accessibility attributes in `frontend/src/components/Header.jsx`: guide icon button has `aria-label` that updates based on guide state ("Open hosting guide" / "Open admin guide" / "Close hosting guide" / "Close admin guide"), is keyboard-focusable (native `<button>` element), and the icon is decorative (`aria-hidden="true"` on the SVG). Validate FR-011.
- [x] T010 Validate header layout at 320px viewport width: with event name + state icon + guide icon + hamburger menu all present, the header must not overflow. The event name must truncate (existing behavior) and the guide icon must remain fully visible. Validate FR-006 and SC-004.
- [x] T011 Run quickstart.md validation checklist: execute all 6 validation steps from `specs/015-header-guide-icons/quickstart.md` to confirm end-to-end correctness.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **US1 (Phase 2)**: Depends on Phase 1 completion
- **US2 (Phase 3)**: Depends on Phase 1 completion. Can run in parallel with US1 (different files).
- **US3 (Phase 4)**: Depends on Phase 2 and Phase 3 (all FABs must be removed first)
- **US4 (Phase 5)**: Depends on Phase 1 (Header icon rendering). Can run in parallel with US1/US2.
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Foundational Phase

- T001 (App.jsx) and T002 (Header.jsx) are different files but T002 depends on T001's prop interface decisions. Execute T001 first, then T002.

### Parallel Opportunities

- **Phase 2 + Phase 3**: T003/T004 (US1) and T005/T006 (US2) modify different files and can run in parallel after Phase 1.
- **Phase 4 + Phase 5**: T007 (US3) and T008 (US4) are independent verification tasks and can run in parallel.
- **Phase 6**: T009, T010, and T011 are independent checks and can run in parallel.

---

## Parallel Example: US1 + US2

```text
# After Phase 1 completes, launch US1 and US2 in parallel:

# US1 (different files from US2):
Task: "Delete frontend/src/components/guide/GuideButton.jsx"
Task: "Update frontend/tests/e2e/specs/hosting-guide.spec.js"

# US2 (different files from US1):
Task: "Update frontend/src/pages/EventAdminPage.jsx"
Task: "Update frontend/tests/e2e/specs/admin-guide.spec.js"
```

---

## Implementation Strategy

### MVP First (Phase 1 + User Story 1 Only)

1. Complete Phase 1: Foundational (T001, T002)
2. Complete Phase 2: User Story 1 (T003, T004)
3. **STOP and VALIDATE**: Hosting guide works via header icon, no FAB visible
4. Merge if ready — admin FAB still exists but hosting guide is migrated

### Incremental Delivery

1. Phase 1 → Foundation ready (both guides controllable from header)
2. Add US1 → Hosting guide migrated → Test → Deploy/Demo (MVP!)
3. Add US2 → Admin guide migrated → Test → Deploy/Demo
4. Add US3 → No occlusion validated → Test
5. Add US4 → Unauth visibility validated → Test
6. Polish → Accessibility + layout + final walkthrough

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new source files are created; this is purely modification and deletion
- The guide drawers (GuideDrawer, AdminGuideDrawer) are unchanged — only triggers move
- Total: 11 tasks across 6 phases
