# Tasks: Admin Guide

**Input**: Design documents from `/specs/014-admin-guide/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Constitution IV (Testing Standards) mandates tests for all features. E2E tests cover all user stories across all 4 event states; unit tests cover data integrity.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create the admin guide content data and validation tests

- [x] T001 [P] Create admin guide content data file at `frontend/src/data/adminGuideContent.js` — export `adminGuideContent` object keyed by event state (`created`, `started`, `paused`, `completed`). Step shape identical to hosting guide: `{ id, heading, description, icon }` per data-model.md. Step counts: 7 (created) + 4 (started) + 3 (paused) + 4 (completed) = 18 total. Content topics from spec.md "Guide Content Steps". Content must use plain conversational language per FR-013. Include warnings about locked settings per FR-008 (rating config in created steps, item assignment in paused steps).
- [x] T002 [P] Create unit test at `frontend/tests/unit/adminGuideContent.test.js` — verify step counts per state (7, 4, 3, 4), all steps have required fields (`id`, `heading`, `description`, `icon`) as non-empty strings, all step IDs globally unique across all states, all `icon` values are valid lucide-react exports.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core drawer component and hosting guide FAB suppression that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create AdminGuideDrawer component at `frontend/src/components/guide/AdminGuideDrawer.jsx` — bottom sheet that reads `event.state` from `useEventContext()` and selects `adminGuideContent[eventState]`. Follow GuideDrawer.jsx animation pattern: isMounted/isAnimating states, backdrop with fade (z-40), drawer slide-up (z-50, max-h-[85vh], rounded-t-lg), body scroll prevention, close on backdrop click, 350ms unmount delay. Reuse `GuideStepCard`, `GuideProgress`, `GuideNavigation` from existing guide components. Include: header with state label and close button, overview/table of contents toggle (List icon), keyboard navigation (Escape to close, ArrowLeft/Right for steps), informational CTA text on final step per state (FR-016 — must not trigger state transitions). Handle fallback when `event` is null or state is unrecognized.
- [x] T004 [P] Modify `frontend/src/App.jsx` — hide the hosting guide GuideButton on admin routes. Add route detection: when `location.pathname` matches `/event/:id/admin`, do not render `<GuideButton>` or `<GuideDrawer>`. The hosting guide continues to render on all other routes. This satisfies FR-001a and FR-002.
- [x] T005 [P] Create E2E test scaffolding at `frontend/tests/e2e/specs/admin-guide.spec.js` — import test utilities, define `describe` block for Admin Guide, add helper functions for navigating to admin page, opening the guide, and transitioning event state. Add placeholder sections for each user story.

**Checkpoint**: AdminGuideDrawer can be instantiated with event state, hosting guide FAB hidden on admin routes, test scaffolding ready.

---

## Phase 3: User Story 1 — Access a State-Aware Admin Guide (Priority: P1) 🎯 MVP

**Goal**: An admin sees a guide FAB on the admin page that opens a state-aware guide tailored to the current event lifecycle

**Independent Test**: Create an event (state: created), open admin guide, confirm setup content. Transition to started, reopen guide, confirm running content.

- [x] T006 [US1] Integrate admin guide into `frontend/src/pages/EventAdminPage.jsx` — add `adminGuideOpen` state, `openAdminGuide`/`closeAdminGuide` callbacks. Render a FAB button (fixed bottom-6 right-6, z-30, 48×48 touch target, BookOpen icon, `data-testid="admin-guide-button"`, `aria-label="Open admin guide"`) that is hidden when the drawer is open. Render `<AdminGuideDrawer isOpen={adminGuideOpen} onClose={closeAdminGuide} />`.
- [x] T007 [US1] E2E tests for US1 in `frontend/tests/e2e/specs/admin-guide.spec.js` — test: (1) admin guide FAB visible on admin page, (2) hosting guide FAB NOT visible on admin page, (3) guide opens on FAB tap with content matching "created" state, (4) transition event to "started" and reopen guide — content matches "started" state, (5) repeat for "paused" and "completed" states, (6) guide closes on backdrop click and close button, (7) FAB reappears after guide closes.

**Checkpoint**: Admin guide FAB visible on admin page. Opens state-aware guide. Hosting guide FAB hidden on admin page. E2E tests pass.

---

## Phase 4: User Story 2 — Walk Through Event Setup (Priority: P1)

**Goal**: The created-state guide walks admins through all setup steps with locked-settings warnings

**Independent Test**: Create a new event, open admin guide, walk through all 7 setup steps, confirm each references a real admin setting and explains it clearly

- [x] T008 [US2] E2E tests for US2 in `frontend/tests/e2e/specs/admin-guide.spec.js` — test: (1) created-state guide shows 7 steps, (2) each step heading matches spec content, (3) navigate through all steps via Next/Back buttons, (4) progress indicator updates correctly, (5) rating configuration step contains warning about locking, (6) final step shows informational CTA about starting the event, (7) CTA text does not include an action button that triggers state transition.

**Checkpoint**: Full created-state walkthrough works — 7 steps, locked-settings warning visible, informational CTA. E2E tests pass.

---

## Phase 5: User Story 3 — Understand Running State (Priority: P1)

**Goal**: The started-state guide explains what to do while guests are actively rating

**Independent Test**: Transition event to started, open admin guide, confirm running-phase content with actionable guidance

- [x] T009 [US3] E2E tests for US3 in `frontend/tests/e2e/specs/admin-guide.spec.js` — test: (1) started-state guide shows 4 steps, (2) content explains guest experience, pause option, and completion, (3) navigate through all steps, (4) final step shows informational CTA about completing the event, (5) swipe gesture navigates between steps.

**Checkpoint**: Full started-state walkthrough works — 4 steps, pause/complete guidance. E2E tests pass.

---

## Phase 6: User Story 4 — Wrap Up After Completion (Priority: P2)

**Goal**: The completed-state guide walks admins through dashboard, export, and reopen options

**Independent Test**: Transition event to completed, open admin guide, confirm completion-phase content

- [x] T010 [US4] E2E tests for US4 in `frontend/tests/e2e/specs/admin-guide.spec.js` — test: (1) completed-state guide shows 4 steps, (2) content covers dashboard, export, and reopen, (3) navigate through all steps, (4) final step shows informational CTA about reopening options.

**Checkpoint**: Full completed-state walkthrough works — 4 steps, export and reopen guidance. E2E tests pass.

---

## Phase 7: User Story 5 — Understand Paused State (Priority: P2)

**Goal**: The paused-state guide explains item ID assignment and resume options

**Independent Test**: Transition event to paused, open admin guide, confirm pause-specific content

- [x] T011 [US5] E2E tests for US5 in `frontend/tests/e2e/specs/admin-guide.spec.js` — test: (1) paused-state guide shows 3 steps, (2) content explains item ID assignment is only available in this state, (3) navigate through all steps, (4) final step shows informational CTA about resuming or completing.

**Checkpoint**: Full paused-state walkthrough works — 3 steps, item assignment guidance. E2E tests pass.

---

## Phase 8: User Story 6 — Quick-Reference Any Setting (Priority: P3)

**Goal**: Admins can see an overview of all steps and jump directly to any one

**Independent Test**: Open admin guide, access overview, see all step titles, tap a title to jump to that step

- [x] T012 [US6] E2E tests for US6 in `frontend/tests/e2e/specs/admin-guide.spec.js` — test: (1) overview button visible in drawer header, (2) tapping overview shows list of all step titles for current state, (3) tapping a step title jumps directly to that step, (4) current step is highlighted in overview, (5) back button returns from overview to step view.

**Checkpoint**: Overview accessible. Jump to any step works. E2E tests pass.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, responsive, edge cases across all stories

- [x] T013 [P] ARIA attributes and keyboard navigation validation — verify `role="dialog"`, `aria-modal="true"`, `aria-label` on FAB and drawer, `aria-hidden` when closed, focus management, Escape closes drawer, Arrow keys navigate steps (FR-015, SC-007)
- [x] T014 [P] Responsive validation at 320px width — verify step cards, navigation controls, progress indicator, overview list, and CTAs all fit without overflow or scrolling at minimum viewport (FR-014, SC-004)
- [x] T015 Edge case handling — (1) state changes while guide is open: guide content should update reactively, (2) guide resets to step 0 on each open (FR-018), (3) admin page state preserved after guide close (FR-017), (4) graceful handling when event is null, loading, or in an error state, (5) admin navigates away from admin page while guide is open: guide should close/unmount gracefully without errors
- [x] T016 Code cleanup — ensure no unused imports, consistent naming, JSDoc on exported components, remove development-only console.logs
- [x] T017 [P] Manual walkthrough validation — walk through all 4 state guides end-to-end, verify SC-003 (each state readable in under 2 minutes), verify SC-005 (setup guide enables successful event configuration), verify SC-006 (locked settings warnings visible before state transition), verify guide opens within 300ms and step transitions feel instant (<100ms perceived), record any content or UX issues
- [x] T018 Run full E2E and unit test suite — confirm all admin-guide tests pass, verify hosting-guide tests still pass (no regressions from FAB hiding), verify no regressions in existing test suites (especially event-page.spec.js)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (content data file exists)
- **US1 (Phase 3)**: Depends on Phase 2 (AdminGuideDrawer exists, App.jsx modified)
- **US2 (Phase 4)**: Depends on Phase 3 (FAB + drawer integrated in admin page)
- **US3 (Phase 5)**: Depends on Phase 3 — can run in parallel with US2
- **US4 (Phase 6)**: Depends on Phase 3 — can run in parallel with US2, US3
- **US5 (Phase 7)**: Depends on Phase 3 — can run in parallel with US2, US3, US4
- **US6 (Phase 8)**: Depends on Phase 3 (needs steps to overview)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational → Can start after Phase 2
- **US2 (P1)**: Depends on US1 (needs admin guide integrated)
- **US3 (P1)**: Depends on US1 — can run in parallel with US2
- **US4 (P2)**: Depends on US1 — can run in parallel with US2, US3
- **US5 (P2)**: Depends on US1 — can run in parallel with US2, US3, US4
- **US6 (P3)**: Depends on US1 (needs step content and overview feature)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T004 and T005 can run in parallel with T003 (different files)
- US2 through US5 E2E tests can all run in parallel after US1 integration (different test groups, same component)
- T013 and T014 can run in parallel (different validation concerns)

---

## Implementation Strategy

### MVP First (US1 — State-Aware Entry Point)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: US1 — admin guide integrated, state detection works (T006-T007)
4. **STOP and VALIDATE**: Guide opens on all 4 event states with correct content

### Incremental Delivery

1. Setup + Foundational → Content data + drawer component + FAB hidden
2. Add US1 → Admin guide opens with state-aware content → **MVP Demo!**
3. Add US2-US3 → P1 stories validated with E2E tests
4. Add US4-US5 → P2 stories validated
5. Add US6 → Quick-reference overview
6. Polish → Accessibility + edge cases + full regression → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new npm dependencies needed — reuses existing guide components and lucide icons
- New files: `adminGuideContent.js`, `AdminGuideDrawer.jsx`, `admin-guide.spec.js`, `adminGuideContent.test.js`
- Modified files: `App.jsx` (hide hosting FAB on admin routes), `EventAdminPage.jsx` (add admin guide FAB + drawer)
- Existing components reused unchanged: `GuideStepCard`, `GuideProgress`, `GuideNavigation`
- Content edits: update `frontend/src/data/adminGuideContent.js` — no other files need changes
- Follow existing patterns: GuideDrawer for drawer lifecycle, GuideButton for FAB, EventContext for state
