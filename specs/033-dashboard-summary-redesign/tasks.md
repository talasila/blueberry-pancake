# Tasks: Dashboard Summary Redesign

**Input**: Design documents from `/specs/033-dashboard-summary-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — FR-011 requires e2e test updates, and workspace rule requires unit test maintenance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Tests: `frontend/tests/e2e/`, `frontend/tests/unit/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Enhance foundational component used by all user stories

- [x] T001 Add optional `accentColor` prop to `StatisticsCard` in `frontend/src/components/StatisticsCard.jsx` — accepts a CSS class string applied to the Card wrapper (e.g., `"bg-chart-2/10"`) with no visual change when omitted (backward-compatible)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove dead cards and restructure the Summary tab grid layout — MUST complete before user story cards are added

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [US6] In `frontend/src/pages/DashboardPage.jsx`, remove the "Least Controversial" `StatisticsCard` block (lines ~233–249) and all references to `dashboardData.leastControversial` in the Summary tab JSX
- [x] T003 [US6] In `frontend/src/pages/DashboardPage.jsx`, remove the "Ratings per Bottle" `StatisticsCard` block (the card using `statistics.averageRatingsPerItem` and `tooltipMessage`) from the Summary tab JSX
- [x] T004 [US6] In `frontend/src/pages/DashboardPage.jsx`, change the Summary tab grid from `grid grid-cols-2 gap-4 py-4` to a mixed layout using `flex flex-col gap-4 py-4` (full-width cards) with a nested `grid grid-cols-2 gap-4` for half-width card pairs
- [x] T005 [US6] In `frontend/src/pages/DashboardPage.jsx`, update the doc comment (lines ~16–23) to reflect the new Summary tab layout: hero card, stat cards, progress bar, avg rating, most divisive, personality strip
- [ ] T006 [US6] In `frontend/src/pages/DashboardPage.jsx`, add accent colors to the existing "People" and "Bottles" `StatisticsCard` components using the new `accentColor` prop — People: `chart-2` tint, Bottles: `chart-4` tint

**Checkpoint**: Summary tab shows only People and Bottles cards in the new layout structure. Dead cards removed.

---

## Phase 3: User Story 1 — Top-Rated Bottle Hero Card (Priority: P1) 🎯 MVP

**Goal**: Show the winning bottle as a prominent full-width hero card at the top of the Summary tab

**Independent Test**: Create an event with rated bottles → hero card appears at the top with item ID, weighted average, and trophy icon

### Implementation for User Story 1

- [x] T007 [US1] In `frontend/src/pages/DashboardPage.jsx`, add `Trophy` icon import from `lucide-react`
- [x] T008 [US1] In `frontend/src/pages/DashboardPage.jsx`, compute `topRatedItem` from `dashboardData.itemSummaries` — find max `weightedAverage` where `numberOfRaters > 0`, tie-break by lowest `itemId`; extract `maxRating` from `dashboardData.ratingConfiguration?.maxRating || 4`
- [x] T009 [US1] In `frontend/src/pages/DashboardPage.jsx`, add a full-width hero card at the top of the Summary tab — use a `Card` with `bg-primary/5 dark:bg-primary/10` accent background, showing `Trophy` icon, item ID (e.g., "Bottle #5"), weighted average as "{score} / {maxRating}". When no ratings exist, show "No ratings yet" in muted text. Make it tappable (opens `ItemDetailsDrawer`) when admin or event completed.

**Checkpoint**: Hero card visible at top of Summary tab. Clicking it opens item details. "No ratings yet" shown for empty events.

---

## Phase 4: User Story 2 — Full-Width Ratings Progress Bar (Priority: P1)

**Goal**: Replace the basic Ratings number card with a full-width progress bar showing actual/expected and a human-readable subtitle

**Independent Test**: Event with known users/bottles/ratings → progress card shows "87 / 96" and "91% complete · 9 to go"

### Implementation for User Story 2

- [x] T010 [US2] In `frontend/src/pages/DashboardPage.jsx`, refactor `calculateRatingsProgress()` to return an object `{ actual, expected, percentage, remaining }` instead of just the percentage number
- [x] T011 [US2] In `frontend/src/pages/DashboardPage.jsx`, replace the existing "Ratings" `StatisticsCard` with a full-width `StatisticsCard` showing: value = `"{actual} / {expected}"`, subtitle = `"{pct}% complete · {remaining} to go"` (or "100% complete" when done, or "No ratings possible yet" when expected is 0), `progressPercentage` using the computed percentage, using theme primary color (already the default in `StatisticsCard`)

**Checkpoint**: Full-width progress card shows actual/expected counts with human-readable subtitle. Division by zero handled.

---

## Phase 5: User Story 3 — Global Average Rating Card (Priority: P2)

**Goal**: Show the global average rating on the 1-to-max scale that participants used, replacing the removed "Ratings per Bottle" card

**Independent Test**: Submit known ratings → "Avg Rating" card shows the average formatted to 1 decimal place with "out of {maxRating}" subtitle

### Implementation for User Story 3

- [x] T012 [US3] In `frontend/src/pages/DashboardPage.jsx`, add an "Avg Rating" half-width `StatisticsCard` using `dashboardData.globalAverage` formatted to 1 decimal place, subtitle "out of {maxRating}", `accentColor` using `chart-1` tint. Show "N/A" when `globalAverage` is null.

**Checkpoint**: Avg Rating card visible alongside People/Bottles cards. Shows correct scale.

---

## Phase 6: User Story 4 — Most Divisive Item Card (Priority: P2)

**Goal**: Rename "Most Controversial" to "Most Divisive" and add average rating subtitle

**Independent Test**: Event with items having varying standard deviations → "Most Divisive" card shows item ID and "avg {rating}" subtitle

### Implementation for User Story 4

- [x] T013 [US4] In `frontend/src/pages/DashboardPage.jsx`, rename the "Most Controversial" `StatisticsCard` title to "Most Divisive", add subtitle `"avg ${dashboardData.mostControversial.averageRating?.toFixed(1)}"`, add `accentColor` using `chart-5` tint, and keep the existing `onClick` handler for opening `ItemDetailsDrawer`

**Checkpoint**: "Most Divisive" card shows with average rating subtitle. Tappable to open item details. "Least Controversial" is already gone (T002).

---

## Phase 7: User Story 5 — Personality Summary Strip (Priority: P3)

**Goal**: Show an aggregated personality breakdown at the bottom of the Summary tab with personality-specific colors

**Independent Test**: Event where users have distinct personality types → strip shows each type with icon, count, and name, sorted by count descending

### Implementation for User Story 5

- [x] T014 [P] [US5] Create `frontend/src/components/PersonalitySummaryStrip.jsx` — accepts `userSummaries` array prop, aggregates personality counts (group non-null `personality` fields, count per type, sort descending), renders nothing when no personalities exist. Each personality entry shows: icon (imported dynamically from lucide-react based on `PERSONALITY_CONTENT[id].icon`), count, and display name from `getPersonalityName()`. Use personality-specific Tailwind background tints per research.md color map.
- [x] T015 [US5] In `frontend/src/pages/DashboardPage.jsx`, import `PersonalitySummaryStrip` and render it as a full-width card at the bottom of the Summary tab, passing `dashboardData.userSummaries`

**Checkpoint**: Personality strip renders at the bottom with colored entries sorted by count. Hidden when no personalities exist.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tests, dead code verification, and final cleanup

- [x] T016 Update e2e test assertions in `frontend/tests/e2e/specs/dashboard.spec.js`: (a) remove/update `"Ratings per Bottle"` matcher (`/ratings.*bottle/i`) in `displays four summary statistics` test, (b) update stat count assertion (no longer exactly 4 stat cards), (c) add assertion for hero card visibility when ratings exist, (d) update the `shows zero/N/A values` test for the new card labels, (e) add assertion for "Most Divisive" card visibility in the summary panel when controversial data exists
- [x] T017 Update unit tests in `frontend/tests/unit/DashboardPage.test.jsx`: (a) update the mock `DASHBOARD_WITH_PERSONALITIES` to include `globalAverage` and `mostControversial` fields, (b) replace "Tasting Personalities" negative assertions with positive assertions for new features (hero card, progress bar, personality strip rendering), (c) add test for personality strip NOT rendering when no personalities exist
- [x] T018 [US6] Verify dead code cleanup in `frontend/src/pages/DashboardPage.jsx` — confirm no references remain to: `leastControversial` in rendering code, `averageRatingsPerItem` in Summary tab JSX, old `tooltipMessage` for "No bottles configured", old card names in comments
- [x] T019 Run `npx vitest run tests/unit/DashboardPage.test.jsx` from `frontend/` and fix any failures
- [x] T020 Run `npx playwright test tests/e2e/specs/dashboard.spec.js` from `frontend/` and fix any failures
- [x] T021 Run `npx vitest run tests/unit/StatisticsCard.test.jsx` from `frontend/` (if file exists) and fix any failures introduced by the `accentColor` prop addition

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001) — the `accentColor` prop is used in T006
- **User Stories (Phase 3–7)**: All depend on Phase 2 completion (layout structure must be in place)
  - US1, US2, US3, US4 all modify `DashboardPage.jsx` — execute sequentially in priority order
  - US5 T014 (new component) can run in parallel with US1–US4 implementation
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only — no cross-story dependencies
- **US2 (P1)**: Depends on Phase 2 only — no cross-story dependencies
- **US3 (P2)**: Depends on Phase 2 only — occupies the slot freed by "Ratings per Bottle" removal
- **US4 (P2)**: Depends on Phase 2 (T002 already removed "Least Controversial") — no cross-story dependencies
- **US5 (P3)**: T014 (new component file) has no dependencies and can be built early; T015 (integration) depends on Phase 2 layout being in place

### Within Each User Story

- Computation logic before rendering
- Card rendering before interactive behaviors (onClick)
- All implementation before test updates

### Parallel Opportunities

- **T001** (StatisticsCard) and **T014** (PersonalitySummaryStrip) can be built in parallel — different files
- **T016** and **T017** (e2e vs unit tests) can run in parallel — different files
- **T019**, **T020**, **T021** (test execution) can run in parallel — different test suites

---

## Parallel Example: Setup + US5 Component

```bash
# These can run in parallel (different files):
Task T001: "Add accentColor prop to StatisticsCard in frontend/src/components/StatisticsCard.jsx"
Task T014: "Create PersonalitySummaryStrip in frontend/src/components/PersonalitySummaryStrip.jsx"
```

## Parallel Example: Test Updates

```bash
# These can run in parallel (different test files):
Task T016: "Update e2e tests in frontend/tests/e2e/specs/dashboard.spec.js"
Task T017: "Update unit tests in frontend/tests/unit/DashboardPage.test.jsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + Layout)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006)
3. Complete Phase 3: US1 — Top-Rated Hero Card (T007–T009)
4. Complete Phase 4: US2 — Ratings Progress Bar (T010–T011)
5. **STOP and VALIDATE**: Hero card and progress bar visible with correct data
6. Deploy/demo if ready — this is the minimum viable redesign

### Incremental Delivery

1. Setup + Foundational → Dead cards gone, layout restructured
2. Add US1 (Hero Card) → The "wow" moment — winning bottle visible
3. Add US2 (Progress Bar) → Actionable completion status
4. Add US3 (Avg Rating) + US4 (Most Divisive) → Richer stat cards
5. Add US5 (Personality Strip) → Delightful personality summary
6. Polish → Tests green, dead code verified clean

---

## Notes

- All changes are frontend-only — no backend modifications
- `DashboardPage.jsx` is the primary file; most tasks modify it sequentially
- `StatisticsCard.jsx` change (T001) is backward-compatible — existing usage unaffected
- `PersonalitySummaryStrip.jsx` is the only new file
- Chart CSS variables (`--chart-1` through `--chart-5`) are already defined in `frontend/src/styles/globals.css` for both light and dark themes
- The `globalAverage` and `mostControversial.averageRating` fields are already in the API response — no backend work needed
