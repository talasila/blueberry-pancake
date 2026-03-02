# Tasks: Event State Management Help Guide

**Input**: Design documents from `specs/021-event-state-help-guide/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Constitution IV (Testing Standards) mandates tests. Unit tests validate content shape; E2E tests validate help entry, content visibility, current-state display, and update-in-place when event state changes.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1–US5)
- Use exact file paths

---

## Phase 1: Content & Validation

**Purpose**: Static help content and unit tests that all user stories depend on

- [x] T001 [P] Create event state help content at `frontend/src/data/eventStateHelpContent.js` — export a single object with: (1) `lifecycleTitle`, `lifecycleSteps` (array of `{ state, transitions, whenToUse }` for created, started, paused, completed in order), optional `reopenNote`; (2) per-state entries keyed by `created`|`started`|`paused`|`completed` each with `adminCan`, `guestCan` (and optionally `adminCannot`, `guestCannot`) as strings or string arrays. Copy must satisfy FR-002 (lifecycle + transitions + when to use), FR-003 (admin can/cannot), FR-004 (guest can/cannot), FR-005 (plain language). See data-model.md.
- [x] T002 [P] Create unit test at `frontend/tests/unit/eventStateHelpContent.test.js` — assert all four state keys exist, each has `adminCan` and `guestCan` non-empty; `lifecycleSteps` has length 4 and each step has `state`, `transitions`, `whenToUse`; state keys match `created`|`started`|`paused`|`completed`.

**Checkpoint**: Content module exists and tests pass.

---

## Phase 2: Foundational (Blocking)

**Purpose**: Inline expandable help in the event state management section that all user stories depend on

**⚠️ CRITICAL**: No user story–specific content or behavior can be verified until this phase is complete

- [x] T003 Add inline expandable help to `frontend/src/pages/EventAdminPage.jsx` in the event state management section — i.e. inside the same SideDrawer/container where the Start/Pause/Complete controls live (the state drawer), not on the main admin page. (1) A visible, labeled trigger (e.g. "Learn about event states" or help icon with aria-label) that expands/collapses the help panel — always visible including when event is loading or failed (FR-001, FR-001a). (2) One expandable/collapsible panel (inline, no overlay/drawer/modal) that when open shows: a current-state line (from `event?.state` via existing context; show "—" or "Loading…" when `event` is null or loading — FR-007), and placeholders for lifecycle and per-state content. Use existing Accordion from `frontend/src/components/ui/accordion.tsx` with one item, or a boolean state + conditional content. (3) Panel reads `event` from the same `EventContext`/state the page already uses so it updates in place when event state changes (FR-009).
- [x] T004 [P] Create E2E test scaffolding at `frontend/tests/e2e/specs/event-state-help-guide.spec.js` — import test utilities, define `describe('Event state help guide')`, helpers for navigating to event admin, opening the state drawer (the SideDrawer that contains Start/Pause/Complete), expanding the help inside that drawer. Placeholder sections for: help visible, lifecycle and state content, current state display, state change updates help.

**Checkpoint**: Help trigger and inline panel exist; current-state line shows placeholder when no event and updates from context; E2E scaffolding ready.

---

## Phase 3: User Story 1 — Understand Event Lifecycle (Priority: P1) 🎯 MVP

**Goal**: Admin sees the event lifecycle in order with allowed transitions and when to use each

**Independent Test**: Open state section, expand help, confirm lifecycle is shown in order (created → started → paused/completed, reopen from completed) with transitions and when-to-use copy.

- [x] T005 [US1] Render lifecycle content in the help panel in `frontend/src/pages/EventAdminPage.jsx` — consume `eventStateHelpContent.lifecycleTitle`, `eventStateHelpContent.lifecycleSteps`, and optional `reopenNote`. Display in clear order; for each step show state label, allowed transitions, and when to use (FR-002). Reuse state labels from `frontend/src/utils/eventState.jsx` (STATE_CONFIG) where appropriate.
- [x] T006 [US1] E2E tests for US1 in `frontend/tests/e2e/specs/event-state-help-guide.spec.js` — (1) expand help and see lifecycle section with all four states in order, (2) each state shows which transitions are possible, (3) when-to-use copy is visible (e.g. pause for break/item ID, complete when finished).

**Checkpoint**: Lifecycle fully visible in help; US1 acceptance scenarios pass.

---

## Phase 4: User Story 2 — Understand What Each State Means (Priority: P1)

**Goal**: For each state, admin sees what they and guests can and cannot do

**Independent Test**: Expand help and verify for created, started, paused, completed: admin can/cannot and guest can/cannot are clearly stated.

- [x] T007 [US2] Render per-state admin/guest content in the help panel — for each of the four states display `adminCan`, `guestCan` (and optional `adminCannot`, `guestCannot`) from `eventStateHelpContent`. Structure so all four states are readable (e.g. sub-sections or accordion items per state) (FR-003, FR-004).
- [x] T008 [US2] E2E tests for US2 in `frontend/tests/e2e/specs/event-state-help-guide.spec.js` — (1) created: guests cannot provide feedback, admin can configure (and lock warning), (2) started: guests can rate, admin can pause/complete, (3) paused: guests cannot rate, admin can assign item IDs and resume/complete, (4) completed: guests cannot rate, results available, admin can dashboard/export/reopen.

**Checkpoint**: Per-state admin/guest copy visible for all four states; US2 acceptance scenarios pass.

---

## Phase 5: User Story 3 — Access Help From State Section (Priority: P2)

**Goal**: Admin finds a clear, obvious way to open the help from the state management section

**Independent Test**: On event admin page, go to state section, see labeled trigger; expand then collapse returns to same section without losing context.

- [x] T009 [US3] Ensure help trigger is visible and accessible in the state section — trigger has visible label or icon + aria-label (e.g. "Learn about event states"), is in view when the state management section is in view (FR-001), and is openable with one tap or click from that section (SC-001). Closing/collapsing the help keeps user in the same state section (FR-008).
- [x] T010 [US3] E2E tests for US3 in `frontend/tests/e2e/specs/event-state-help-guide.spec.js` — (1) on admin page, state drawer shows help trigger (e.g. by text or data-testid), (2) one tap/click opens help (SC-001), (3) close/collapse returns to state section without navigation.

**Checkpoint**: Help discoverable and dismissible without losing context; US3 pass.

---

## Phase 6: User Story 4 — Use Help on Mobile (Priority: P2)

**Goal**: Help is readable and tappable at the app’s minimum viewport; no horizontal scroll

**Independent Test**: Open help at app’s documented minimum width; no horizontal scroll, readable text, adequate touch targets.

- [x] T011 [US4] Style help panel for mobile — no horizontal overflow (FR-006); touch targets and text size consistent with rest of app; content in concise blocks. Use Tailwind responsive utilities; avoid fixed widths that cause overflow at app minimum viewport.
- [x] T012 [US4] E2E at minimum viewport (preferred): add a test that runs at the app’s documented minimum width and asserts no horizontal scroll and tappable controls (SC-004). If automated viewport testing is not in scope, document in quickstart that SC-004 is validated manually.

**Checkpoint**: Help usable at app minimum width; US4 pass.

---

## Phase 7: User Story 5 — See Help in Context of Current State (Priority: P3)

**Goal**: When help is open, current state and next available transitions are clear

**Independent Test**: Set event to a given state, open help, see "You are here: [State]" and next transitions; repeat for another state.

- [x] T013 [US5] Show current state and next transitions in help — current-state line shows event state (or placeholder when loading). Add a short "What you can do next" that lists valid transitions from current state (use same logic as state buttons, e.g. getValidTransitions from EventAdminPage or eventState utils) (FR-007, SC-006).
- [x] T014 [US5] E2E tests for US5 in `frontend/tests/e2e/specs/event-state-help-guide.spec.js` — (1) with event in "started", open help and see current state "Started" and next options (Pause, Complete), (2) with event in "created", see "Created" and next option (Start), (3) with event loading, see placeholder ("—" or "Loading…") and rest of help still visible.

**Checkpoint**: Current state and next transitions visible; US5 pass.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Edge cases, update-in-place, and cleanup

- [x] T015 Edge case and FR-009: When event state changes while help is open (e.g. another admin), help content updates in place without closing — verify by polling or simulated state change; no local cache of state for display (help reads from context at render).
- [x] T016 Edge cases: (1) Admin navigates away from state section with help open — help collapses or unmounts without errors. (2) Event in error/unknown state — help still openable, shows four normal states; current-state line shows "Unknown" or similar with suggestion to refresh.
- [x] T017 [P] Document minimum viewport — ensure app minimum width is documented (e.g. in quickstart.md or frontend README) for SC-004 acceptance testing. Optionally note manual validation steps for SC-003 (lifecycle readable in under 2 minutes) and SC-005 (admin can answer what each state means).
- [x] T018 Code cleanup — remove unused imports, add JSDoc where helpful, consistent naming; no dev-only console.logs. Verify expand/collapse and content render feel instant (no perceptible delay; Constitution VII).

---

## Dependencies & Execution Order

### Phase order

- **Phase 1 (Content)**: No dependency — start first.
- **Phase 2 (Foundational)**: Depends on Phase 1 (content module exists). Blocks Phases 3–7.
- **Phases 3–7 (US1–US5)**: Depend on Phase 2. Can be implemented in priority order (US1 → US2 → US3 → US4 → US5) or US1+US2 in parallel then US3–US5.
- **Phase 8 (Polish)**: After Phases 3–7 (or after MVP: Phase 3+4).

### Within phases

- T001 and T002 can run in parallel.
- T005 (lifecycle render) and T007 (per-state render) can be done in one or two edits to the same panel.
- E2E tasks (T006, T008, T010, T012, T014) can be written to fail first, then implementation makes them pass.

### Parallel opportunities

- T001, T002 [P]
- T004 [P] (scaffolding) alongside T003
- T011, T017 [P] (styling and docs) can run in parallel with other polish

---

## Implementation strategy

### MVP first (US1 + US2)

1. Phase 1: Content + unit tests.
2. Phase 2: Inline help UI + current-state line + scaffolding.
3. Phase 3: Lifecycle in panel + US1 E2E.
4. Phase 4: Per-state admin/guest in panel + US2 E2E.
5. **Stop and validate**: Help shows full lifecycle and per-state copy; current state and placeholder work.

### Full delivery

6. Phase 5–6: Discoverability (US3), mobile (US4).
7. Phase 7: Current state + next transitions (US5).
8. Phase 8: Edge cases, docs, cleanup.

---

## Notes

- No backend or API tasks; all work in `frontend/`.
- Help is inline only (no drawer/modal) per spec clarifications.
- Current-state indicator must show placeholder when event is null or loading.
- Reuse `getStateConfig` / state labels from `eventState.jsx` where it avoids duplication.
