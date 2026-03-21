# Tasks: Guide Redesign

**Input**: Design documents from `/specs/038-guide-redesign/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included — constitution principle IV (Testing Standards) requires tests for all features.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Content & Shared Components)

**Purpose**: Create the new content data and modify the shared step card component. These are blocking prerequisites for all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Create event guide content data file with 17 steps organized into 4 phases, each step having id, heading, description, icon, phase, stepType (real-world/in-app), and position fields per data-model.md in frontend/src/data/eventGuideContent.js
- [x] T002 [P] Create getStepVisualState utility function that maps event lifecycle state (created/started/paused/completed) to step visual states (done/now/ahead) per the mapping in data-model.md. Export from frontend/src/data/eventGuideContent.js alongside the content.
- [x] T003 [P] Modify GuideStepCard in frontend/src/components/guide/GuideStepCard.jsx to support expand/collapse toggle (new props: `isExpanded`, `onToggle`) and step-type indicator (new prop: `stepType` rendering a visual badge for real-world vs in-app). Must remain backward-compatible — existing GuideDrawer usage (no expand/collapse props) continues to work as before.

**Checkpoint**: Content data and shared component ready. User story implementation can begin.

---

## Phase 2: User Story 1 — First-Time Host Follows the Full Event Guide (Priority: P1) MVP

**Goal**: Admin opens the event guide on the admin page and sees all 17 steps in a scrollable list with phase section headers. Steps are expandable/collapsible. The guide opens as a bottom-sheet drawer with the same animation pattern as existing drawers.

**Independent Test**: Create a new event, open the event guide, verify all 17 steps visible in 4 phase groups. Tap any step to expand/collapse.

### Implementation for User Story 1

- [x] T004 [US1] Create EventGuideDrawer component in frontend/src/components/guide/EventGuideDrawer.jsx. Implement: bottom-sheet drawer (reuse animation pattern from AdminGuideDrawer — 10ms mount delay, 350ms unmount, body scroll lock, backdrop), scrollable list of all 17 steps grouped under 4 phase section headers (non-interactive dividers), each step rendered via modified GuideStepCard with expand/collapse. Props: `isOpen`, `onClose`. Read event state from `useEventContext()`. Include keyboard support (Escape to close) and ARIA attributes (`role="dialog"`, `aria-modal`, `aria-label="Event guide"`).
- [x] T005 [US1] Wire EventGuideDrawer into frontend/src/App.jsx: replace `AdminGuideDrawer` import and render with `EventGuideDrawer` on admin routes (`isAdminRoute`). Keep the same `adminGuideOpen`/`setAdminGuideOpen` state and `onToggleGuide` callback. Update the `onOpenAdminGuide` callback passed to EventAdminPage.
- [x] T006 [P] [US1] Write unit tests for eventGuideContent in frontend/tests/unit/eventGuideContent.test.js. Follow existing Vitest patterns from adminGuideContent.test.js: validate 17 steps total, 4 phases, required fields (id, heading, description, icon, phase, stepType, position), all IDs unique, all icons valid lucide-react exports, positions sequential 1-17, stepType is 'real-world' or 'in-app', phase values match the 4 defined phases.

**Checkpoint**: Event guide displays all 17 steps in a scrollable list with phase headers. Steps expand/collapse. Drawer opens/closes with animation. Wired into admin routes.

---

## Phase 3: User Story 2 — Guide Tracks Progress Across Lifecycle States (Priority: P1)

**Goal**: The guide's steps display in done/now/ahead visual states based on the event's lifecycle state. The guide auto-scrolls to the first "now" step on open.

**Independent Test**: Transition an event through all 4 states (created → started → paused → completed), open the guide at each state, verify the correct steps are done/now/ahead and the view auto-scrolls to the "now" section.

**Dependencies**: Requires Phase 2 (EventGuideDrawer exists and is wired in).

### Implementation for User Story 2

- [x] T007 [US2] Integrate getStepVisualState into EventGuideDrawer in frontend/src/components/guide/EventGuideDrawer.jsx. For each step, compute its visual state (done/now/ahead) from the current event state. Apply Tailwind classes: done steps get dimmed opacity and a check indicator, now steps get highlighted background and are auto-expanded, ahead steps get muted opacity and are collapsed. Pass `isExpanded` and visual state to GuideStepCard.
- [x] T008 [US2] Implement auto-scroll to first "now" step in EventGuideDrawer. After the mount animation completes (~300ms), use `scrollIntoView({ behavior: 'smooth', block: 'start' })` on the ref of the first step with visual state "now". Ensure this runs on every open (not just first mount) by triggering in the isOpen effect.
- [x] T009 [US2] Ensure event state re-read on each guide open in EventGuideDrawer. When `isOpen` transitions to true: re-read `event.state` from context, recompute all step visual states, reset any manually toggled expand/collapse states back to defaults (done=collapsed, now=expanded, ahead=collapsed).

**Checkpoint**: Guide correctly shows done/now/ahead states for all 4 lifecycle states. Auto-scrolls to current section on open. Visual states update when guide is reopened after a state transition.

---

## Phase 4: User Story 3 — Prospective Host Browses the Hosting Overview (Priority: P2)

**Goal**: The host path in the existing GuideDrawer is rewritten to summarize the full 17-step hosting journey at overview depth, so prospective hosts can understand the experience without creating an event.

**Independent Test**: Navigate to a non-admin page, open the guide, select host role, verify the overview covers the full journey from announcing the event through declaring the winner.

**Dependencies**: None — independent of Phases 2-3. Can be implemented in parallel.

### Implementation for User Story 3

- [x] T010 [US3] Rewrite the host path in frontend/src/data/guideContent.js. Replace the existing 8 host steps with a new set that summarizes the 17-step real-world flow at higher level (fewer steps, shorter descriptions). Cover: pre-event prep (announce, supplies), event day setup (collect bottles, cover, number, use the app), tasting, and the reveal. Keep the same data shape (id, heading, description, icon) for compatibility with GuideStepCard and GuideDrawer. Guest path remains unchanged.
- [x] T011 [P] [US3] Update frontend/tests/unit/guideContent.test.js to reflect the new host path step count and content. Verify the guest path assertions remain unchanged (4 steps, same content).

**Checkpoint**: Hosting overview on non-admin routes shows the rewritten host journey. Guest guide unchanged. GuideDrawer functions correctly with both paths.

---

## Phase 5: User Story 4 — Removal of Legacy Guide Systems (Priority: P2)

**Goal**: Remove the old admin guide, walkthrough, and their components. Update all references. Clean up dead code.

**Independent Test**: App builds without errors. Admin routes show EventGuideDrawer. Non-admin routes show GuideDrawer. No import errors or console warnings referencing removed files.

**Dependencies**: Requires Phases 2-3 complete (new EventGuideDrawer must be fully functional before removing old components).

### Implementation for User Story 4

- [x] T012 [P] [US4] Delete frontend/src/components/guide/AdminGuideDrawer.jsx and frontend/src/data/adminGuideContent.js. These are already unreferenced after T005 wired EventGuideDrawer into App.jsx.
- [x] T013 [P] [US4] Delete frontend/src/components/guide/WalkthroughDrawer.jsx and frontend/src/data/walkthroughContent.js.
- [x] T014 [US4] Update frontend/src/components/WelcomeBottomSheet.jsx: remove the WalkthroughDrawer import, render, and `walkthroughOpen` state variable. Consolidate the two guide buttons ("How does it work?" and "Setup guide") into a single "Event Guide" button that calls the `onOpenAdminGuide` callback (which now opens EventGuideDrawer). Two buttons opening the same guide would be redundant.
- [x] T015 [US4] Delete frontend/tests/unit/adminGuideContent.test.js. Search the entire frontend/ directory for any remaining imports or references to `AdminGuideDrawer`, `WalkthroughDrawer`, `adminGuideContent`, or `walkthroughContent` and remove them. Verify the app builds cleanly.

**Checkpoint**: All legacy guide files removed. No dead imports. App builds and runs. Admin routes show EventGuideDrawer, non-admin routes show GuideDrawer.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E test updates, final validation across all stories.

- [x] T016 Rewrite frontend/tests/e2e/specs/admin-guide.spec.js for EventGuideDrawer. Test: all 17 steps visible in scrollable list, phase headers present, done/now/ahead visual states for all 4 lifecycle states (created/started/paused/completed), expand/collapse on tap, auto-scroll to "now" section, dialog ARIA attributes (`role="dialog"`, `aria-modal`, `aria-label="Event guide"`). Include keyboard navigation tests: Escape to close, Tab through interactive elements. Include a 320px viewport test (`page.setViewportSize({ width: 320, height: 568 })`) verifying all steps render without horizontal overflow. Use existing Playwright patterns: role-based selectors, state transition helpers, heading content assertions.
- [x] T017 [P] Update frontend/tests/e2e/specs/hosting-guide.spec.js to match the rewritten host path content. Update expected step headings and count. Verify guest path assertions remain unchanged.
- [x] T018 Run full test suite (`npm test`) and lint (`npm run lint`), fix any failures across unit and E2E tests.
- [x] T019 Run quickstart.md manual verification steps: create event → verify guide at each lifecycle state → verify hosting overview → verify guest guide unchanged.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 completion
- **US2 (Phase 3)**: Depends on Phase 2 completion (EventGuideDrawer must exist)
- **US3 (Phase 4)**: Depends on Phase 1 only — can run in parallel with Phases 2-3
- **US4 (Phase 5)**: Depends on Phases 2+3 completion (new guide must be fully functional)
- **Polish (Phase 6)**: Depends on all user stories complete (Phases 2-5)

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 1) — no dependencies on other stories
- **US2 (P1)**: Depends on US1 — adds state-awareness to the EventGuideDrawer built in US1
- **US3 (P2)**: Can start after Foundational (Phase 1) — independent of US1/US2 (different component, different content file)
- **US4 (P2)**: Depends on US1+US2 — cannot remove old components until replacements are functional

### Within Each User Story

- Content/data before components
- Components before integration/wiring
- Unit tests can parallel with implementation (different files)
- E2E tests after full integration (Polish phase)

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel (different files)
- Phase 2: T006 can run in parallel with T004 (test file vs source file)
- Phase 4: T011 can run in parallel with T010 (test file vs source file) — though T011 depends on knowing the new step count
- Phase 4 (US3) can run entirely in parallel with Phases 2-3 (US1+US2)
- Phase 5: T012 and T013 can run in parallel (different files)
- Phase 6: T016 and T017 can run in parallel (different test files)

---

## Parallel Example: Phases 2-4

```
After Phase 1 completes:

  Track A (US1 → US2):          Track B (US3):
  T004 EventGuideDrawer         T010 Rewrite guideContent.js host path
  T005 Wire into App.jsx        T011 Update guideContent.test.js
  T006 Unit tests (parallel)
  T007 Visual states
  T008 Auto-scroll
  T009 State re-read
       ↓
  Phase 5 (US4): T012-T015 (after Track A complete)
       ↓
  Phase 6: T016-T019 (after both tracks + US4 complete)
```

---

## Implementation Strategy

### MVP First (User Stories 1+2 Only)

1. Complete Phase 1: Foundational content + shared component
2. Complete Phase 2: EventGuideDrawer with scrollable list
3. Complete Phase 3: Done/now/ahead states + auto-scroll
4. **STOP and VALIDATE**: Open guide at each event state, verify correct behavior
5. Old guides still exist but are dead code at this point

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phases 2+3 → Event guide fully functional (MVP!)
3. Phase 4 → Hosting overview rewritten (independent improvement)
4. Phase 5 → Legacy cleanup (dead code removed)
5. Phase 6 → Full test coverage and validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- GuideProgress and GuideNavigation are NOT modified or removed — they're still used by GuideDrawer for the carousel-style host/guest paths
- The EventGuideDrawer does NOT use GuideProgress or GuideNavigation — it uses native scroll instead of carousel navigation
- GuideStepCard expand/collapse must be backward-compatible (GuideDrawer doesn't pass expand props, so it should render as always-expanded by default)
