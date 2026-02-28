# Tasks: Post-Creation Welcome Bottom Sheet

**Input**: Design documents from `/specs/020-post-creation-welcome-modal/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. US4 (Toast Removal, P1) is merged into US1 since they modify the same code path — the toast `useEffect` is replaced by bottom sheet state.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Wire the `onOpenAdminGuide` callback from `App.jsx` through to `EventAdminPage` so US3 can open the admin guide from the bottom sheet. This is a small change but blocks the full component interface.

**⚠️ CRITICAL**: The bottom sheet component needs this prop to have the correct interface from the start.

- [X] T001 Pass `onOpenAdminGuide={() => setAdminGuideOpen(true)}` prop from the `EventAdminPage` route in `frontend/src/App.jsx` to `EventAdminPage`, mirroring how `onToggleGuide` is passed to `Header`

**Checkpoint**: `EventAdminPage` receives `onOpenAdminGuide` prop — ready for bottom sheet integration.

---

## Phase 2: User Story 1 + User Story 4 — Core Bottom Sheet & Toast Removal (Priority: P1) 🎯 MVP

**Goal**: Replace the transient toast notification with a welcome bottom sheet that displays the event PIN (with copy), a summary of pre-configured defaults, and a "Got it" dismiss button. The toast is removed as part of this integration.

**Independent Test**: Create a new event → verify bottom sheet slides up (no toast) with correct PIN, defaults summary, and dismiss behavior. Verify bottom sheet does NOT appear on subsequent admin page visits.

### Implementation

- [X] T002 [US1] Create `WelcomeBottomSheet` component shell in `frontend/src/components/WelcomeBottomSheet.jsx` — slide-up animation (`translate-y-full` → `translate-y-0`, `duration-300 ease-out`), dimmed backdrop (`bg-black/50`), body scroll prevention, `max-h-[85vh]` height constraint. Reuse animation pattern from `AdminGuideDrawer`. Props: `isOpen`, `onDismiss`, `onOpenDrawer`, `onOpenAdminGuide`, `event`
- [X] T003 [US1] Add "Start quickly" content section to `WelcomeBottomSheet` in `frontend/src/components/WelcomeBottomSheet.jsx` — title ("Your event is ready!"), reassuring subtitle, event PIN displayed with copy-to-clipboard button (reuse `navigator.clipboard.writeText` + `pinCopied` state + 2s reset pattern), note about Start button location, and pre-configured defaults summary (active item count, rating scale range "1–{maxRating}", tasting note suggestions status). All values read from the `event` prop, not hardcoded
- [X] T004 [US1] Add dismiss behavior to `WelcomeBottomSheet` in `frontend/src/components/WelcomeBottomSheet.jsx` — "Got it" primary button calls `onDismiss`, overlay tap calls `onDismiss`, browser back button dismissal via `popstate` listener (push history entry on open, dismiss on back navigation without navigating away from admin page)
- [X] T005 [US1] Integrate `WelcomeBottomSheet` into `EventAdminPage` in `frontend/src/pages/EventAdminPage.jsx` — remove the toast `useEffect` (lines 197-204 that check `location.state?.eventCreated`), add `showWelcome` state initialized from `location.state?.eventCreated`, guard bottom sheet render on event data being loaded (defer if PIN/config not yet available per FR-015), render `<WelcomeBottomSheet isOpen={showWelcome} onDismiss={handleWelcomeDismiss} ... event={event} />`. `handleWelcomeDismiss` sets `showWelcome = false` and calls `window.history.replaceState({}, document.title)` to clear navigation state
- [X] T006 [P] [US1] Write unit tests for `WelcomeBottomSheet` core behavior in `frontend/tests/unit/WelcomeBottomSheet.test.jsx` — renders title, subtitle, PIN, copy button, defaults summary when `isOpen=true`; does not render when `isOpen=false`; does not render when `event` prop is null or missing key fields (PIN, ratingConfiguration, itemConfiguration) per FR-015; copy button calls `navigator.clipboard.writeText` with event PIN; "Got it" button calls `onDismiss`; overlay click calls `onDismiss`
- [X] T007 [P] [US1] Update `EventAdminPage` unit tests in `frontend/tests/unit/EventAdminPage.test.jsx` — remove any tests for the creation toast; add test that `WelcomeBottomSheet` is rendered when `location.state.eventCreated` is true; add test that `WelcomeBottomSheet` is NOT rendered on normal admin page visit (no location state)

**Checkpoint**: Creating an event shows the bottom sheet with PIN and defaults. No toast appears. Dismissing via "Got it" or overlay works. Bottom sheet does not reappear on refresh or subsequent visits. US1 and US4 are fully functional.

---

## Phase 3: User Story 2 — Customize Defaults via Bottom Sheet (Priority: P2)

**Goal**: Add the "Customize first" section with three tappable rows that show current defaults as inline badges and open the corresponding admin page drawer when tapped.

**Independent Test**: Create a new event → see bottom sheet → tap each customization row → verify correct drawer opens and bottom sheet is dismissed. Verify badges show actual event data.

### Implementation

- [X] T008 [US2] Add "Customize first" section to `WelcomeBottomSheet` in `frontend/src/components/WelcomeBottomSheet.jsx` — three tappable rows below the "Start quickly" section: (1) "Adjust the number of wines" with badge showing active item count, (2) "Change the rating scale" with badge showing "Scale 1–{maxRating}", (3) "Add a co-host" with badge showing admin count or "Just you". Each row calls `onOpenDrawer` with the appropriate drawer name on tap
- [X] T009 [US2] Wire drawer shortcuts in `EventAdminPage` in `frontend/src/pages/EventAdminPage.jsx` — implement `handleOpenDrawerFromWelcome(drawerName)` that: (1) sets `showWelcome = false`, (2) calls `window.history.replaceState` to clear navigation state, (3) calls `setOpenDrawer(drawerName)`, (4) pushes history state for the opened drawer. Pass this as `onOpenDrawer` prop to `WelcomeBottomSheet`. Drawer name mapping: items → `'items'`, ratings → `'ratings-configuration'`, administrators → `'administrators'`
- [X] T010 [US2] Write unit tests for customization rows in `frontend/tests/unit/WelcomeBottomSheet.test.jsx` — renders three customization rows with correct badges from event data; tapping items row calls `onOpenDrawer('items')`; tapping ratings row calls `onOpenDrawer('ratings-configuration')`; tapping administrators row calls `onOpenDrawer('administrators')`

**Checkpoint**: All three customization rows display correct badges and open the correct drawer when tapped. Bottom sheet dismisses on each tap. US2 is fully functional.

---

## Phase 4: User Story 3 — Access Setup Guide from Bottom Sheet (Priority: P3)

**Goal**: Add a "Show me the setup guide" secondary link in the bottom sheet footer that dismisses the bottom sheet and opens the existing Admin Guide drawer.

**Independent Test**: Create a new event → see bottom sheet → tap "Show me the setup guide" → verify Admin Guide drawer opens with "created" state content and bottom sheet is dismissed.

### Implementation

- [X] T011 [US3] Add "Show me the setup guide" secondary link to the footer of `WelcomeBottomSheet` in `frontend/src/components/WelcomeBottomSheet.jsx` — text link styled as secondary action below the "Got it" button, calls `onOpenAdminGuide` on tap
- [X] T012 [US3] Wire guide shortcut in `EventAdminPage` in `frontend/src/pages/EventAdminPage.jsx` — implement `handleOpenGuideFromWelcome()` that: (1) sets `showWelcome = false`, (2) calls `window.history.replaceState` to clear navigation state, (3) calls `onOpenAdminGuide` prop (received from App.jsx via T001). Pass this as `onOpenAdminGuide` prop to `WelcomeBottomSheet`
- [X] T013 [US3] Write unit test for guide link in `frontend/tests/unit/WelcomeBottomSheet.test.jsx` — renders "Show me the setup guide" link; tapping it calls `onOpenAdminGuide`

**Checkpoint**: Guide link opens the Admin Guide drawer with correct "created" state content. US3 is fully functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: E2E test covering the full flow, and manual verification.

- [X] T014 Write E2E test for the full welcome bottom sheet flow in `frontend/tests/e2e/specs/welcome-bottom-sheet.spec.js` — create event → verify bottom sheet appears (no toast) → verify PIN displayed and copyable → verify default badges show correct values → tap "Got it" → verify dismissed and admin page interactive → create another event → tap customization row → verify correct drawer opens → create another event → tap "Show me the setup guide" → verify admin guide opens → refresh admin page → verify bottom sheet does NOT reappear
- [X] T015 Run quickstart.md manual verification checklist: create event, verify bottom sheet, dismiss, navigate away and return, verify no reappearance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately
- **US1+US4 (Phase 2)**: Depends on Phase 1 (needs `onOpenAdminGuide` prop plumbed, even though US1 doesn't use it, the component interface includes it)
- **US2 (Phase 3)**: Depends on Phase 2 (extends existing WelcomeBottomSheet component)
- **US3 (Phase 4)**: Depends on Phase 2 (extends existing WelcomeBottomSheet component) and Phase 1 (`onOpenAdminGuide` callback)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **US1+US4 (P1)**: Can start after Phase 1 — no dependencies on other stories
- **US2 (P2)**: Depends on US1 (adds to the existing bottom sheet component and admin page integration)
- **US3 (P3)**: Depends on US1 (adds to the existing bottom sheet component) and Phase 1 (`onOpenAdminGuide` prop)
- **US2 and US3 are independent of each other** — they could be implemented in parallel if they coordinated on the shared component file

### Within Each User Story

- Component changes before admin page integration
- Integration before tests
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 2**: T006 and T007 can run in parallel (different test files, both depend on T005 being complete)
- **Phase 3+4**: US2 and US3 touch the same component file so cannot truly run in parallel, but they are independently testable
- **Phase 5**: T014 and T015 can run in parallel (E2E test vs manual verification)

---

## Parallel Example: User Story 1

```bash
# After T005 (admin page integration) is complete, launch tests in parallel:
Task T006: "Unit test WelcomeBottomSheet in frontend/tests/unit/WelcomeBottomSheet.test.jsx"
Task T007: "Update EventAdminPage tests in frontend/tests/unit/EventAdminPage.test.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 4)

1. Complete Phase 1: Foundational (T001 — one file change)
2. Complete Phase 2: US1+US4 (T002-T007)
3. **STOP and VALIDATE**: Create an event, verify bottom sheet appears with PIN and defaults, verify toast is gone, verify dismiss works, verify no reappearance on refresh
4. Deploy/demo if ready — the core value is delivered

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 2 (US1+US4) → Core bottom sheet works → **MVP!**
3. Phase 3 (US2) → Customization shortcuts added → Enhanced onboarding
4. Phase 4 (US3) → Guide link added → Full feature complete
5. Phase 5 → E2E coverage → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US4 (Toast Removal) is merged into US1's phase because they modify the same `useEffect` block in `EventAdminPage.jsx` — the toast is replaced by bottom sheet state in a single change (T005)
- The `WelcomeBottomSheet` component is built incrementally: T002-T004 (shell + core content + dismiss) → T008 (customization rows) → T011 (guide link)
- All values in the bottom sheet come from the `event` prop — no hardcoded defaults
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
