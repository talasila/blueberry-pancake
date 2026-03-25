# Tasks: Landing Page Redesign

**Input**: Design documents from `/specs/045-landing-page-redesign/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — the constitution requires tests for all features, and existing test files must be rewritten to match the new UI.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup

**Purpose**: No new project setup needed — existing project with all dependencies already installed. This phase scaffolds the new component structure.

- [x] T001 Scaffold new LandingPage component: update imports (remove Card/CardContent/CardDescription/CardFooter/CardHeader/CardTitle/PlusCircle/List, add useRef/EyeOff/Star/Trophy from lucide-react, add useDarkMode from hooks), set up the `useDarkMode` hook call, define the STEPS constant array (icon, label, lightBg, darkBg color values per plan.md Color Values Reference), and preserve existing navigation handlers (handleCreateClick, handleMyEventsClick) and success message logic (success message must render above the hero gradient section as the first element in the content area per FR-012) in `frontend/src/pages/LandingPage.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No blocking infrastructure tasks — all dependencies and components (Button, Input, useDarkMode) already exist in the codebase.

**Checkpoint**: Foundation ready — user story implementation can begin immediately after T001.

---

## Phase 3: User Story 1 - First-Time Visitor Understands the App (Priority: P1) MVP

**Goal**: A first-time visitor sees a warm hero section with gradient background, bold headline, subtitle, and three-step visual strip that communicates what the app does at a glance.

**Independent Test**: Load the home page in an unauthenticated browser and confirm headline, subtitle, gradient, and three-step strip are visible above the fold on a 375px viewport.

### Implementation for User Story 1

- [x] T002 [US1] Implement gradient hero background section: add a wrapper div with radial-gradient inline style using oklch values (light: `oklch(0.95 0.03 350)` → transparent, dark: `oklch(0.20 0.04 350)` → transparent) selected via the `isDark` state from `useDarkMode` hook in `frontend/src/pages/LandingPage.jsx`
- [x] T003 [US1] Add headline and subtitle: render "Blind tastings, scored together." as `text-2xl sm:text-3xl font-bold` heading, and "Host a tasting party, rate the mystery bottles, and see who has the best palate." as `text-muted-foreground` subtitle below the headline in `frontend/src/pages/LandingPage.jsx`
- [x] T004 [US1] Implement three-step visual strip: render the STEPS constant as a horizontal flex row with three items, each containing a circular div (`h-14 w-14 sm:h-16 sm:w-16 rounded-full`) with oklch background color (cellar/golden/rosé, dark-mode aware via `isDark`), a white lucide-react icon (`h-6 w-6 sm:h-7 sm:w-7`), and a label below (`text-xs sm:text-sm`) in `frontend/src/pages/LandingPage.jsx`

**Checkpoint**: Home page displays hero with gradient, headline, subtitle, and three colored step icons. Visitors understand the app at a glance.

---

## Phase 4: User Story 2 - Host Creates a New Event (Priority: P1)

**Goal**: The primary "Host a Tasting" CTA is prominently displayed with a warm accent color and navigates to the event creation flow.

**Independent Test**: Click "Host a Tasting" — unauthenticated users go to auth, authenticated users go to create-event.

### Implementation for User Story 2

- [x] T005 [US2] Add "Host a Tasting" primary CTA button: render a full-width Button component below the three-step strip with inline `style` overriding `backgroundColor` (`oklch(0.45 0.15 15)` light / `oklch(0.65 0.15 15)` dark) and `color: white`. Wire the onClick to existing `handleCreateClick` logic (auth-aware navigation to `/create-event`) in `frontend/src/pages/LandingPage.jsx`

**Checkpoint**: Primary CTA has warm accent color and correctly routes users through auth or directly to event creation.

---

## Phase 5: User Story 3 - Returning User Accesses Their Events (Priority: P2)

**Goal**: A secondary "My Events" button provides clear access to the events list without competing with the primary CTA.

**Independent Test**: Click "My Events" — unauthenticated users go to auth, authenticated users go to my-events.

### Implementation for User Story 3

- [x] T006 [US3] Add "My Events" secondary CTA button: render a full-width Button with `variant="outline"` below the "Host a Tasting" button. Wire the onClick to existing `handleMyEventsClick` logic (auth-aware navigation to `/my-events`) in `frontend/src/pages/LandingPage.jsx`

**Checkpoint**: Secondary CTA renders in outline style and correctly routes users.

---

## Phase 6: User Story 4 - User Joins via Event Code (Priority: P3)

**Goal**: A subtle "Have an event code?" text link reveals an inline input for manual event code entry, replacing the old prominent Join card.

**Independent Test**: Click "Have an event code?", type a code, submit — navigates to the event page.

### Implementation for User Story 4

- [x] T007 [US4] Add "Have an event code?" collapsible input: add `showCodeInput` state toggle and `inputRef` (useRef). Render a `text-sm text-muted-foreground` text link below CTAs that sets `showCodeInput` to true on click. When expanded, show an inline flex row with the existing Input component (auto-focused via useEffect on `showCodeInput` change) and a small "Go" Button. On submit (button click or Enter), navigate to `/event/${eventId.trim().toUpperCase()}`. Disable submit when input is empty in `frontend/src/pages/LandingPage.jsx`
- [x] T008 [US4] Remove old "Join an event" card JSX markup: delete the entire Card-based join section (Card, CardHeader, CardContent with form, CardFooter with Join button) from `frontend/src/pages/LandingPage.jsx`. Note: Card component imports are already removed in T001.

**Checkpoint**: Old Join card is gone. "Have an event code?" link expands to reveal input; submission navigates correctly.

---

## Phase 7: User Story 5 - Dark Mode Visual Consistency (Priority: P2)

**Goal**: All new visual elements render correctly in dark mode with appropriate color shifts and WCAG AA contrast.

**Independent Test**: Toggle dark mode and visually verify gradient shifts to burgundy, icon circles brighten, CTA button adjusts.

### Implementation for User Story 5

- [x] T009 [US5] Verify and adjust dark mode rendering: review all inline style color selections in `frontend/src/pages/LandingPage.jsx` to confirm the `isDark` ternary correctly selects dark-mode oklch values for gradient (`oklch(0.20 0.04 350)`), icon circles (higher-lightness variants), and CTA button (`oklch(0.65 0.15 15)`). Verify white text on CTA meets WCAG AA contrast in dark mode. Fix any values that appear washed out or low-contrast.

**Checkpoint**: Page renders with visual warmth in both light and dark modes. No broken colors or contrast failures.

---

## Phase 8: Tests

**Purpose**: Rewrite unit and E2E tests to match the new home page UI structure.

- [x] T010 [P] Rewrite unit tests to match new home page UI: replace all existing tests in `frontend/tests/unit/LandingPage.test.jsx` with tests for: (1) headline and subtitle render, (2) three-step icons render with correct labels ("Cover", "Taste", "Reveal"), (3) "Host a Tasting" button renders and triggers navigation, (4) "My Events" button renders and triggers navigation, (5) "Have an event code?" link renders and toggles input visibility on click, (6) event code input auto-focuses when revealed, (7) event code submission triggers navigation to `/event/CODE`, (8) success message displays when navigation state is present
- [x] T011 [P] Rewrite E2E tests to match new home page UI: replace all existing tests in `frontend/tests/e2e/specs/landing-page.spec.js` with tests for: (1) page loads with headline, subtitle, three-step strip visible, (2) "Host a Tasting" navigates to auth when unauthenticated, (3) "My Events" navigates to auth when unauthenticated, (4) "Have an event code?" reveals input, entering code + submit navigates to event page, (5) mobile viewport (375px) shows all hero content above fold, (6) narrow viewport (320px) shows three-step icon strip in a single horizontal row without wrapping, (7) authenticated user: "Host a Tasting" navigates directly to create-event, (8) authenticated user: "My Events" navigates directly to my-events

**Checkpoint**: All unit and E2E tests pass against the new UI. `npm test && npm run lint` passes clean.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup.

- [x] T012 Run full test suite and lint: execute `npm test && npm run lint` and fix any failures in `frontend/src/pages/LandingPage.jsx`, `frontend/tests/unit/LandingPage.test.jsx`, or `frontend/tests/e2e/specs/landing-page.spec.js`
- [x] T013 Run quickstart.md verification checklist against the running dev server per `specs/045-landing-page-redesign/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 — can start immediately
- **User Stories (Phase 3–7)**: All depend on T001 completion
  - US1 (T002–T004): Start after T001
  - US2 (T005): Start after T004 (needs three-step strip rendered above CTA)
  - US3 (T006): Start after T005 (needs "Host a Tasting" rendered above "My Events")
  - US4 (T007–T008): Start after T006 (needs CTAs rendered above event code link)
  - US5 (T009): Start after T007 (all visual elements must exist to verify dark mode)
- **Tests (Phase 8)**: T010 and T011 can start after T009 (all implementation complete); T010 and T011 are parallel
- **Polish (Phase 9)**: T012 depends on T010 + T011; T013 depends on T012

### User Story Dependencies

- **US1 (P1)**: No dependencies — foundational visual layer
- **US2 (P1)**: Depends on US1 (CTA goes below the three-step strip)
- **US3 (P2)**: Depends on US2 (outline button goes below primary CTA)
- **US4 (P3)**: Depends on US3 (event code link goes below CTAs)
- **US5 (P2)**: Depends on US1–US4 (verifies dark mode across all elements)

Note: Dependencies here are layout ordering within a single file, not functional dependencies. Each story's navigation logic is independent.

### Within Each User Story

- Implementation adds to the component's JSX in visual top-to-bottom order
- Each task builds on the previous task's rendered output

### Parallel Opportunities

- T010 and T011 (unit tests and E2E tests) can run in parallel — different files, no dependencies
- Within Phase 3, T002 and T003 could technically be parallelized (different JSX sections) but are sequential by default since they're in the same file

---

## Parallel Example: Phase 8 (Tests)

```bash
# Launch both test rewrites together (different files):
Task: "Rewrite unit tests in frontend/tests/unit/LandingPage.test.jsx"
Task: "Rewrite E2E tests in frontend/tests/e2e/specs/landing-page.spec.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001: Scaffold component
2. Complete T002–T004: Hero, headline, three-step strip
3. **STOP and VALIDATE**: Page shows warm hero with gradient and visual strip

### Incremental Delivery

1. T001 → Scaffold ready
2. T002–T004 (US1) → Hero section visible (MVP!)
3. T005 (US2) → Primary CTA works
4. T006 (US3) → Secondary CTA works
5. T007–T008 (US4) → Event code join works, old card removed
6. T009 (US5) → Dark mode verified
7. T010–T011 → Tests passing
8. T012–T013 → Polish complete, ready for review

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All implementation tasks modify the same file (`LandingPage.jsx`) so they are sequential
- Test tasks (T010, T011) are in different files and can be parallelized
- Commit after each user story phase for clean git history
- Dark mode (US5) is a verification pass — colors are set during each element's implementation via the `isDark` ternary pattern
