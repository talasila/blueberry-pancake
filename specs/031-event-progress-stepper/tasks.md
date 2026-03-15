# Tasks: Event Progress Stepper

**Input**: Design documents from `/specs/031-event-progress-stepper/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — spec requires all relevant unit and e2e tests to be updated (SC-006, test-maintenance rule).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- All changes are frontend-only. No backend modifications.

---

## Phase 1: Setup

**Purpose**: Add the one new dependency required before implementation

- [ ] T001 Add shadcn/ui AlertDialog component by running `cd frontend && npx shadcn@latest add alert-dialog` (creates `frontend/src/components/ui/alert-dialog.jsx`)

---

## Phase 2: Foundational (State Utilities)

**Purpose**: Update the centralized state configuration that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Update `STATE_CONFIG` labels in `frontend/src/utils/eventState.jsx`: Created→Setup, Started→Tasting, Paused→Reveal, Completed→Results. Add `contextSentence` field to each state config (see data-model.md for exact sentences). Add `PHASE_ORDER` constant `['created', 'started', 'paused', 'completed']` as a named export.
- [ ] T003 Move `getValidTransitions` from `frontend/src/pages/EventAdminPage.jsx` (lines 40-48) into `frontend/src/utils/eventState.jsx` as a named export. Enrich to return array of objects: `{ targetState, label, isPrimary, requiresConfirmation }` per the transition table in data-model.md. Ensure `frontend/src/pages/EventAdminPage.jsx` and `frontend/src/components/EventProgressStepper.jsx` will import from the new location.
- [ ] T004 Replace the `StateIcon` component in `frontend/src/utils/eventState.jsx` with a `StateDot` component that renders a small colored circle (`h-2 w-2 rounded-full`) using the state's existing color class, with no label or border. Export `StateDot` as a named export. Keep `StateBadge` unchanged (still used by MyEventsPage).

**Checkpoint**: State utilities are updated. All consumers of `getStateConfig` automatically get new labels. `getValidTransitions` is centralized with enriched metadata.

---

## Phase 3: User Story 1 — Host sees event progress at a glance (Priority: P1) 🎯 MVP

**Goal**: A visual stepper on the Settings page showing the four phases (Setup → Tasting → Reveal → Results) with the current phase highlighted and a context sentence below.

**Independent Test**: Load the Settings page for an event in any state → stepper renders with correct phase highlighted and matching context sentence.

### Implementation for User Story 1

- [ ] T005 [US1] Create `frontend/src/components/EventProgressStepper.jsx` with the stepper visual: render 4 phases as circles connected by lines, each labeled (Setup, Tasting, Reveal, Results). Use `PHASE_ORDER` and `getStateConfig` from `eventState.jsx`. Style completed phases (filled/checked), active phase (highlighted with ring), and upcoming phases (muted). Display the `contextSentence` from the active state config below the stepper. Use `useItemTerminology` hook to dynamically replace "bottles" with the correct terminology in context sentences. Must be responsive down to 320px (use compact layout, no horizontal scroll). When `event` prop is null/undefined (data still loading), render a skeleton/shimmer placeholder matching the stepper layout dimensions to prevent layout shift (FR-019).
- [ ] T006 [US1] Integrate `EventProgressStepper` into `frontend/src/pages/EventAdminPage.jsx`: render it between the event name section and the first settings section ("Event Setup" `<section>` tag). Pass `event` object, `isTransitioning`, and `onTransition` (the existing `handleStateTransition`) as props. Import from new location.
- [ ] T007 [US1] Create unit test `frontend/tests/unit/EventProgressStepper.test.jsx`: test that stepper renders all 4 phase labels, highlights the correct active phase for each state (created/started/paused/completed), shows the correct context sentence for each state, and uses correct item terminology for non-wine events.

**Checkpoint**: Stepper visual is live on the Settings page. Host can see where their event stands at a glance. No interaction yet.

---

## Phase 4: User Story 2 — Host advances the event with one tap (Priority: P1)

**Goal**: Action buttons below the stepper for state transitions, with confirmation dialogs for backward transitions.

**Independent Test**: Click a transition button on the Settings page → event state changes, stepper updates, toast confirms.

### Implementation for User Story 2

- [ ] T008 [US2] Extend `frontend/src/components/EventProgressStepper.jsx` with action buttons: below the context sentence, render buttons for each valid transition from `getValidTransitions(event.state)`. Style primary transitions as default buttons and secondary transitions as outline/ghost buttons. Disable all buttons and show a loading spinner when `isTransitioning` is true. Call `onTransition(targetState)` on click for forward transitions.
- [ ] T009 [US2] Add backward-transition confirmation dialog to `frontend/src/components/EventProgressStepper.jsx` using the shadcn `AlertDialog` component: for transitions where `requiresConfirmation === true` (Completed→Started, Completed→Paused, Paused→Started), show a confirmation dialog with the transition label as the action button. Only call `onTransition(targetState)` if confirmed. Cancel returns to current state with no action.
- [ ] T010 [US2] Add unit tests to `frontend/tests/unit/EventProgressStepper.test.jsx`: test that correct action buttons render for each state (created: 1 button, started: 2, paused: 2, completed: 2), primary button is visually emphasized, backward transitions show confirmation dialog before executing, buttons are disabled during transition (isTransitioning=true), and `onTransition` is called with correct target state.
- [ ] T011 [US2] Rewrite `frontend/tests/e2e/specs/event-states.spec.js`: update all locators from drawer-based interaction (`getByRole('button', { name: /state.*created/i })` → click → `getByRole('button', { name: /^start$/i })`) to stepper-based interaction (directly click `getByRole('button', { name: /start tasting/i })`). Update state verification from `stateIndicator` badge text to stepper phase highlighting. Update guardrail test locators. Ensure all existing test scenarios (start, pause, resume, complete, reopen) pass with new UI.

**Checkpoint**: Full state transition functionality is working via the stepper. Host can advance, pause, resume, and complete the event with one tap (or one tap + confirm for backward transitions).

---

## Phase 5: User Story 3 — Host sees guardrail when item counts don't match (Priority: P2)

**Goal**: Concise guardrail note above the action buttons when registered items vs. rating slots mismatch, only in "created" state.

**Independent Test**: Create an event with mismatched item counts → guardrail note appears on Settings page in "created" state. Change to "started" → note disappears.

### Implementation for User Story 3

- [ ] T012 [US3] Add guardrail note to `frontend/src/components/EventProgressStepper.jsx`: above the action buttons, conditionally render a note when `event.state === 'created'` and registered item count (`event.items?.length || 0`) does not equal available slots (`event.numberOfItems`). Use `useItemTerminology` for dynamic "bottles"/"items" text. Three variants: (a) `registered < slots`: informational, (b) `registered > slots`: warning, (c) `registered === 0`: informational. Keep messages under 120 characters. Style with muted background for info, amber for warning. Do not render when counts match or state is not "created".
- [ ] T013 [US3] Add unit tests to `frontend/tests/unit/EventProgressStepper.test.jsx`: test guardrail appears in "created" state with mismatched counts (fewer, more, zero), does NOT appear when counts match, does NOT appear in "started"/"paused"/"completed" states, uses correct item terminology.

**Checkpoint**: Guardrail notes work correctly. Host gets helpful feedback before starting the event.

---

## Phase 6: User Story 4 — State drawer and help content removed (Priority: P2)

**Goal**: Remove the State row from settings, the State side drawer, and all related help content. Clean up dead code.

**Independent Test**: Navigate Settings page → no "State" row exists, no State drawer can be opened, no "What each state means" section exists.

### Implementation for User Story 4

- [ ] T014 [US4] Remove State drawer from `frontend/src/pages/EventAdminPage.jsx`: delete the State `SettingsRow` (line ~1720-1725), the State `SideDrawer` block (lines ~2131-2289), the `stateHelpExpanded` state variable, and the `openDrawerWithHistory('state')` handling. Remove the local `getValidTransitions` function (now in `eventState.jsx`). Remove the `eventStateHelpContent` import. Remove `ToggleLeft` icon import if no longer used. Keep `handleStateTransition`, `isTransitioning`, `transitionError`, `transitionSuccess` (used by stepper). Clean up any orphaned variables or imports.
- [ ] T015 [P] [US4] Delete `frontend/src/data/eventStateHelpContent.js` (only used by removed State drawer)
- [ ] T016 [P] [US4] Delete `frontend/tests/unit/eventStateHelpContent.test.js` and delete `frontend/tests/e2e/specs/event-state-help-guide.spec.js` (both test removed features)
- [ ] T017 [US4] Update `frontend/tests/unit/EventAdminPage.test.jsx`: remove any tests that reference the State drawer, State SettingsRow, or "What each state means" section. Add/update tests to verify the stepper renders on the Settings page and the State row is absent.

**Checkpoint**: All State drawer code and help content is removed. No dead code remains. Settings page shows only the inline stepper for state management.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Header dot update, AdminGuideDrawer text, and final test sweep

- [ ] T018 [P] Update `frontend/src/components/Header.jsx`: replace `StateIcon` import with `StateDot` from `eventState.jsx`. Replace the `<StateIcon state={event.state} className="flex-shrink-0" />` (line ~231) with the `StateDot` component. Verify the dot renders as a small colored circle next to the event name, visible only to admins.
- [ ] T019 [P] Update `frontend/src/components/guide/AdminGuideDrawer.jsx`: update `CTA_MESSAGES` text strings to reference the stepper instead of "the state management section below" (e.g., "Use the event progress stepper at the top of Settings to kick things off."). Update `STATE_LABELS` to align with the new friendly names (Setup Guide, Tasting Guide, Reveal Guide, Results Guide) per the app-wide label clarification.
- [ ] T020 Review and update any remaining e2e test files that match state labels in the UI: check `frontend/tests/e2e/specs/admin-guide.spec.js` for references to "state management section" or old state labels. Update locators as needed.
- [ ] T021 Run full test suite validation: `cd frontend && npx vitest run` for unit tests, `cd frontend && npx playwright test` for e2e tests. Fix any remaining failures from label changes or removed components.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: No dependency on Phase 1 (AlertDialog not needed until US2). Can start in parallel with Phase 1.
- **US1 (Phase 3)**: Depends on Phase 2 (needs updated state config and PHASE_ORDER)
- **US2 (Phase 4)**: Depends on Phase 1 (AlertDialog) + Phase 3 (stepper component must exist)
- **US3 (Phase 5)**: Depends on Phase 3 (stepper component must exist). Can run in parallel with Phase 4.
- **US4 (Phase 6)**: Depends on Phase 3 + Phase 4 (stepper must be fully functional before removing drawer)
- **Polish (Phase 7)**: Depends on Phase 2 (StateDot) + Phase 6 (cleanup complete)

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational. Creates the core component.
- **US2 (P1)**: Depends on US1 (extends the component created in US1). Depends on Phase 1 (AlertDialog).
- **US3 (P2)**: Depends on US1 (extends the component). Independent of US2 and US4.
- **US4 (P2)**: Depends on US1 + US2 (stepper must be fully functional before removing the drawer).

### Within Each User Story

- Component creation/extension → page integration → tests
- Core rendering before interaction logic
- Forward transitions before backward transitions (US2)

### Parallel Opportunities

- Phase 1 (AlertDialog) and Phase 2 (state utilities) can run in parallel
- T015 and T016 (file deletions) can run in parallel with T014 (drawer removal)
- T018 (Header) and T019 (AdminGuideDrawer) can run in parallel
- US3 (guardrail) can run in parallel with US2 (action buttons) after US1 is done

---

## Parallel Example: Foundational Phase

```text
# These can run simultaneously since they touch different parts of eventState.jsx:
# However, since they all modify the same file, run sequentially: T002 → T003 → T004
```

## Parallel Example: After US1 Complete

```text
# US2 and US3 can start in parallel (different concerns in same component file):
# Practically: US2 (T008-T011) and US3 (T012-T013) touch the same file,
# so recommend sequential: US2 first, then US3.
# But T018 (Header) and T019 (AdminGuideDrawer) CAN run in parallel with US2/US3.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (AlertDialog)
2. Complete Phase 2: Foundational (state utilities)
3. Complete Phase 3: User Story 1 (stepper visual)
4. **STOP and VALIDATE**: Stepper renders correctly for all 4 states with context sentences
5. The State drawer still exists as a fallback — safe to demo/test

### Incremental Delivery

1. Setup + Foundational → State labels updated app-wide (immediate visual change)
2. Add US1 → Stepper visual on Settings page → Validate
3. Add US2 → Stepper buttons functional → Validate all transitions work
4. Add US3 → Guardrail notes for created state → Validate
5. Add US4 → Remove State drawer → Validate no dead code, no broken links
6. Polish → Header dot, AdminGuide text, full test pass

### Risk Mitigation

- US1 and US2 are both P1 and tightly coupled (same component). Implement them back-to-back.
- The State drawer remains functional until US4 explicitly removes it, providing a safety net during US1-US3.
- E2e tests are updated in US2 (T011) and US4 (T016-T017) to avoid a broken test window.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No backend changes in this feature — all work is in `frontend/`
- The `changeEventState()` e2e helper function is unaffected (uses API-level state values, not UI labels)
- `StateBadge` in `MyEventsPage` automatically gets new labels from `STATE_CONFIG` — no explicit task needed
- Commit after each phase for clean rollback points
