# Tasks: Hosting Guide

**Input**: Design documents from `/specs/013-hosting-guide/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Constitution IV (Testing Standards) mandates tests for all features. E2E tests cover primary user flows; unit tests cover data integrity and navigation logic.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create the guide component structure and static content data

- [x] T001 Create guide component directory at `frontend/src/components/guide/`
- [x] T002 [P] Create guide content data file at `frontend/src/data/guideContent.js` with host path (8 steps) and guest path (4 steps) — step topics from spec.md "Guide Content Steps", data shape (id, heading, description, icon) per data-model.md. Content must use plain conversational language per FR-014.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core bottom sheet drawer that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create GuideDrawer component at `frontend/src/components/guide/GuideDrawer.jsx` — bottom sheet that slides up from bottom, backdrop with fade animation, max-h-[85vh], rounded-t-lg, z-50 backdrop z-40, body scroll prevention, close on backdrop click. Follow RatingDrawer.jsx animation pattern (isAnimating state with 10ms delay, translate-y transition).
- [x] T004 Add GuideDrawer open/close state management — isOpen boolean, selectedRole (null | 'host' | 'guest'), currentStep (number). State resets to initial values when drawer closes.

- [x] T004a [P] Create E2E test scaffolding at `frontend/tests/e2e/specs/hosting-guide.spec.js` — import test utilities, define describe block for Hosting Guide, add placeholder structure for each user story's test section
- [x] T004b [P] Create unit test for guide content data integrity — verify guideContent.host has 8 entries, guideContent.guest has 4 entries, each entry has required fields (id, heading, description, icon), no empty strings

**Checkpoint**: Foundation ready — guide drawer can be opened/closed programmatically, test scaffolding in place

---

## Phase 3: User Story 1 — Access the Guide from Any Page (Priority: P1) 🎯 MVP

**Goal**: A floating button is visible on every page; tapping it opens the guide drawer overlay

**Independent Test**: Visit any page (landing, auth, event, admin), confirm floating button is visible, tap it to open the drawer, close it and confirm return to page

- [x] T005 [US1] Create GuideButton component at `frontend/src/components/guide/GuideButton.jsx` — fixed position bottom-6 right-6, 48x48px touch target, z-30, lucide icon (HelpCircle or BookOpen), hidden when guide drawer is open. Use Tailwind classes only, follow Button component patterns.
- [x] T006 [US1] Integrate GuideButton into AppLayout in `frontend/src/App.jsx` — add as sibling to Header inside the layout div, pass isOpen/onOpen state. GuideButton and GuideDrawer share state at the AppLayout level.
- [x] T007 [US1] Wire GuideDrawer close behavior — close button (X) in drawer header, backdrop click to close, restore body scroll on close. Verify guide reopens at role selection (fresh start) on each open.

- [x] T007a [US1] Add E2E tests for US1 in `frontend/tests/e2e/specs/hosting-guide.spec.js` — test floating button visible on landing page, auth page, event page, and create-event page. Test guide opens on tap and closes on backdrop click/close button. Verify page scroll position preserved after close.

**Checkpoint**: Floating button visible on every page. Tap opens empty drawer. Close returns to page. E2E tests pass.

---

## Phase 4: User Story 2 — Self-Select a Role Path (Priority: P1)

**Goal**: When the guide opens, users see a role selection screen with "I'm Hosting" and "I'm a Guest" options

**Independent Test**: Open guide, see two role options, tap each one to confirm it sets the role state and transitions the view

- [x] T008 [US2] Create GuideRoleSelect component at `frontend/src/components/guide/GuideRoleSelect.jsx` — two large, visually distinct buttons ("I'm Hosting" with Wine icon, "I'm a Guest" with PartyPopper icon). Conversational tone. Mobile-friendly touch targets (full-width, min-h-[80px]).
- [x] T009 [US2] Wire role selection into GuideDrawer — render GuideRoleSelect when selectedRole is null. On role tap, set selectedRole to 'host' or 'guest' and currentStep to 0. Add "back to role selection" navigation from within a role path (sets selectedRole back to null).

**Checkpoint**: Guide opens to role selection. Tapping a role transitions to that path (empty for now). Can navigate back to role selection.

---

## Phase 5: User Story 3 — Browse Host Guide as Bite-Sized Visual Steps (Priority: P1)

**Goal**: Host path shows 8 swipeable step cards with progress indicator and navigation buttons

**Independent Test**: Select "I'm Hosting", navigate through all 8 steps via swipe and buttons, confirm each has heading + description + icon, progress indicator updates, final step shows host CTA

- [x] T010 [P] [US3] Create GuideStepCard component at `frontend/src/components/guide/GuideStepCard.jsx` — renders one step: lucide icon (dynamically resolved from icon name string), heading (text-lg font-semibold), description (text-sm text-muted-foreground, max 3 sentences). Card must fit within bottom sheet without scrolling at 320px width. Use Tailwind, centered layout.
- [x] T011 [P] [US3] Create GuideProgress component at `frontend/src/components/guide/GuideProgress.jsx` — dot indicator or "Step N of M" counter. Accepts currentStep and totalSteps props. Active dot highlighted, others muted. Compact for bottom sheet space.
- [x] T012 [US3] Create GuideNavigation component at `frontend/src/components/guide/GuideNavigation.jsx` — "Back" and "Next" buttons (use Button component). Swipe handler: track touchstart X, on touchend calculate delta, if |delta| > 50px trigger step change. Use touch-action: pan-y on swipe container. CSS transform translateX with transition-transform duration-300 ease-out for card transitions.
- [x] T013 [US3] Wire host path in GuideDrawer — when selectedRole is 'host', render GuideStepCard with current step data from guideContent.host[currentStep], plus GuideProgress and GuideNavigation. Step changes animate card transition. Back button on first step returns to role selection.
- [x] T014 [US3] Add contextual CTA on host path final step — check apiClient.isAuthenticated(): if authenticated, show "Create Your Event" button linking to /create-event; if unauthenticated, show "Sign Up to Host" button linking to /auth. Use react-router-dom useNavigate for navigation, close guide before navigating.

- [x] T014a [US3] Add E2E tests for US3 in `frontend/tests/e2e/specs/hosting-guide.spec.js` — test navigating through all 8 host steps via Next/Back buttons. Test swipe gesture triggers step change. Verify progress indicator updates per step. Verify contextual CTA on final step (authenticated vs unauthenticated).
- [x] T014b [US3] Add unit test for swipe threshold logic — verify delta >= 50px triggers step change, delta < 50px does not. Verify boundary (first step back, last step next) is handled.

**Checkpoint**: Full host path works — 8 steps, swipe + buttons, progress dots, contextual CTA on final step. E2E and unit tests pass.

---

## Phase 6: User Story 4 — Browse Guest Guide as Bite-Sized Visual Steps (Priority: P1)

**Goal**: Guest path shows 4 step cards reusing the same step card, progress, and navigation components

**Independent Test**: Select "I'm a Guest", navigate through all 4 steps, confirm content is guest-specific, final step has guest-appropriate CTA

- [x] T015 [US4] Wire guest path in GuideDrawer — when selectedRole is 'guest', render same GuideStepCard/GuideProgress/GuideNavigation with guideContent.guest[currentStep]. Reuses all components from US3; only the data source changes.
- [x] T016 [US4] Add contextual CTA on guest path final step — show "Ask your host for the event link" message or a "Join an Event" informational prompt. No authentication check needed for guest CTA.

- [x] T016a [US4] Add E2E tests for US4 in `frontend/tests/e2e/specs/hosting-guide.spec.js` — test navigating through all 4 guest steps. Verify guest-specific CTA on final step. Verify shared components render correctly for guest data.

**Checkpoint**: Full guest path works — 4 steps, same navigation pattern, guest-specific CTA. E2E tests pass.

---

## Phase 7: User Story 5 — Quick-Scan the Full Guide (Priority: P2)

**Goal**: Users can see an overview of all steps within their role path and jump to any step

**Independent Test**: Select a role, access overview, see all step titles listed, tap any title to jump directly to that step

- [x] T017 [US5] Add overview/table of contents view to GuideDrawer — add a toggle or button (e.g., list icon) in the drawer header that switches to overview mode. Overview renders a vertical list of step headings from the selected role's content array. Tapping a heading sets currentStep to that index and returns to card view.

- [x] T017a [US5] Add E2E test for US5 in `frontend/tests/e2e/specs/hosting-guide.spec.js` — test overview toggle shows all step titles, tapping a title jumps to that step, current step is highlighted in overview.

**Checkpoint**: Overview accessible from within any role path. Tapping a step title navigates directly to it. E2E tests pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, responsive, edge cases across all stories

- [x] T018 [P] Add ARIA attributes and keyboard navigation to all guide components — role="dialog" and aria-modal on drawer, aria-label on buttons, focus trap when drawer open, keyboard arrow keys for step navigation, Escape to close
- [x] T019 [P] Responsive validation at 320px width — verify role selection buttons, step cards, navigation controls, and progress indicator all fit without overflow or scrolling. Adjust spacing/font sizes if needed.
- [x] T020 Edge case handling — orientation change preserves step/role state, floating button repositions to avoid overlap with page CTAs (test on event page, create event page), drawer handles dynamic viewport height changes
- [x] T021 Code cleanup — ensure no unused imports, consistent naming, JSDoc on exported components, remove any development-only console.logs
- [x] T022 [P] Manual walkthrough validation — complete host path (8 steps) and guest path (4 steps) end-to-end, verify SC-002 (each path readable in under 3 minutes), verify SC-004 (content uses plain conversational language), record any content or UX issues
- [x] T023 Run full E2E and unit test suite — confirm all hosting-guide tests pass, verify no regressions in existing test suites

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (directory structure)
- **US1 (Phase 3)**: Depends on Phase 2 (GuideDrawer exists)
- **US2 (Phase 4)**: Depends on Phase 3 (GuideButton + open/close wired)
- **US3 (Phase 5)**: Depends on Phase 4 (role selection works)
- **US4 (Phase 6)**: Depends on Phase 4 (role selection works) — can run in parallel with US3
- **US5 (Phase 7)**: Depends on Phase 5 or 6 (at least one role path has steps)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational → Can start after Phase 2
- **US2 (P1)**: Depends on US1 (needs button + drawer)
- **US3 (P1)**: Depends on US2 (needs role selection) — can run in parallel with US4
- **US4 (P1)**: Depends on US2 (needs role selection) — can run in parallel with US3
- **US5 (P2)**: Depends on US3 or US4 (needs step content to show overview for)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T010 and T011 can run in parallel (different component files)
- T018 and T019 can run in parallel (different concerns)
- US3 and US4 can run in parallel after US2 completes (different data, same components)

---

## Parallel Example: User Story 3

```text
# After US2 is complete, launch these in parallel:
Task T010: "Create GuideStepCard component at frontend/src/components/guide/GuideStepCard.jsx"
Task T011: "Create GuideProgress component at frontend/src/components/guide/GuideProgress.jsx"

# Then sequentially:
Task T012: "Create GuideNavigation (depends on step card being renderable)"
Task T013: "Wire host path in GuideDrawer (depends on all step components)"
Task T014: "Add host CTA (depends on host path wiring)"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T004)
3. Complete Phase 3: US1 — floating button + drawer (T005-T007)
4. Complete Phase 4: US2 — role selection (T008-T009)
5. Complete Phase 5: US3 — host guide steps (T010-T014)
6. **STOP and VALIDATE**: Full host path works end-to-end
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Button visible, drawer opens → (minimal testable increment)
3. Add US2 → Role selection works → Demo role paths
4. Add US3 → Full host guide → **MVP Demo!**
5. Add US4 → Guest guide → Complete primary experience
6. Add US5 → Quick-scan overview → Enhanced UX
7. Polish → Accessibility + edge cases → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new npm dependencies needed (research.md confirmed custom touch events over libraries)
- All components in `frontend/src/components/guide/` directory
- Only one existing file modified: `frontend/src/App.jsx`
- Guide content in `frontend/src/data/guideContent.js` — edit here to update step text
- Follow existing patterns: RatingDrawer for drawer, Button for buttons, lucide-react for icons
