# Tasks: Live Participation Ring on Item Buttons

**Input**: Design documents from `/specs/027-participation-ring/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared utility function that all user stories depend on for participation count data

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Create unit tests for `deriveItemRaterCounts` in `frontend/tests/unit/participationCounts.test.js` — cover: empty array returns empty object, single rater single item, multiple raters across multiple items, duplicate emails for same item (re-rating) counted once, case-insensitive email matching, whitespace-trimmed emails. Tests should FAIL before T002 implementation.
- [x] T002 Create `deriveItemRaterCounts(ratings)` utility function in `frontend/src/utils/participationCounts.js` — takes an array of rating objects (`{itemId, email, ...}`), returns `Record<number, number>` mapping each itemId to its unique rater count. Use `Set` on lowercased/trimmed email for uniqueness. Parse `itemId` as integer.

**Checkpoint**: Utility function ready and tested — user story implementation can begin

---

## Phase 2: User Story 1 — Ambient Participation Awareness (Priority: P1) 🎯 MVP

**Goal**: Each item button displays a participation ring that fills clockwise as more participants rate that item, updating every ~30 seconds via the existing polling cycle

**Independent Test**: Have multiple users rate items during a `started` event and observe ring fill progression on any participant's screen within 30 seconds

### Implementation for User Story 1

- [x] T003 [US1] Add `ratedCount` (number, optional), `totalParticipants` (number, default 0), and `showRing` (boolean, default false) props to ItemButton in `frontend/src/components/ItemButton.jsx`
- [x] T004 [US1] Render SVG participation ring in `frontend/src/components/ItemButton.jsx` — 68×68px SVG centered on the 60px button via absolute positioning, 2px stroke, `strokeLinecap="round"`, rotated -90deg so progress starts at 12 o'clock. Use `stroke-dasharray` = circumference and `stroke-dashoffset` = `circumference * (1 - progress)` where `progress = Math.min(ratedCount / totalParticipants, 1)`. Add `pointer-events: none` and `aria-hidden="true"` to the SVG. Only render when `showRing && totalParticipants > 0 && ratedCount !== undefined`.
- [x] T005 [US1] Add smooth CSS transition to the progress arc in `frontend/src/components/ItemButton.jsx` — `transition: stroke-dashoffset 600ms ease-out`. No animation on initial render (ring appears at current value).
- [x] T006 [US1] Add `itemRaterCounts` state (`Record<number, number>`) to `frontend/src/pages/EventPage.jsx`. Update `loadRatings()` to retain the full `allRatings` array and derive counts via `deriveItemRaterCounts()` before filtering to user-specific ratings.
- [x] T007 [US1] Trigger `loadRatings()` in the existing `contextEvent` watcher `useEffect` in `frontend/src/pages/EventPage.jsx` when `contextEvent.state === 'started'`, piggybacking on the 30-second event poll cycle.
- [x] T008 [US1] Pass `ratedCount={itemRaterCounts[itemId] || 0}`, `totalParticipants={event?.users ? Object.keys(event.users).length : 0}`, and `showRing={event?.state === 'started'}` to each `<ItemButton>` in `frontend/src/pages/EventPage.jsx`.

**Checkpoint**: Ring renders with basic styling (color treatment in US2). Data flows from poll → allRatings → counts → ring.

---

## Phase 3: User Story 2 — Ring Color Follows Button's Own Color (Priority: P1)

**Goal**: The ring uses a darker shade of the button's own color so it feels intrinsic — rated buttons get a darker version of their `ratingColor`, unrated buttons get a darker gray

**Independent Test**: Rate an item (changing its color), then compare the ring color on the rated button vs an unrated button — each ring should feel like it belongs to its button

**Dependency**: Builds on the SVG ring structure from US1 (Phase 2)

### Implementation for User Story 2

- [x] T009 [US2] Create unit tests for ItemButton ring rendering in `frontend/tests/unit/ItemButton.test.jsx` — cover: ring renders when `showRing=true` with correct SVG structure, ring hidden when `showRing=false`, ring hidden when `totalParticipants=0`, ring hidden when `ratedCount=undefined`, progress calculation at 0%/50%/100%, progress clamped at 100% when `ratedCount > totalParticipants`, correct color class application for unrated items, `aria-hidden="true"` on SVG, `pointer-events: none` on SVG. Tests should FAIL before T010–T012 implementation.
- [x] T010 [US2] Implement `color-mix()` color derivation for rated items in `frontend/src/components/ItemButton.jsx` — progress arc: `color-mix(in srgb, ${ratingColor} 70%, black)`, track: `color-mix(in srgb, ${ratingColor} 25%, transparent)`. Apply via inline `style` on the SVG `<circle>` elements.
- [x] T011 [US2] Implement Tailwind class fallback for unrated items in `frontend/src/components/ItemButton.jsx` — track: `stroke-gray-300 dark:stroke-gray-600 opacity-20`, progress arc: `stroke-gray-400 dark:stroke-gray-500 opacity-60`. Use `className` when `ratingColor` is falsy.
- [x] T012 [US2] Ensure graceful degradation in `frontend/src/components/ItemButton.jsx` — if `color-mix()` is unsupported, the inline `style.stroke` resolves to nothing and the SVG circle is invisible. Verify no layout breakage (the SVG still occupies space but has no visible stroke).

**Checkpoint**: Ring looks correct on both rated and unrated items in light and dark mode

---

## Phase 4: User Story 3 — Ring Only Visible During Active Tasting (Priority: P2)

**Goal**: Rings only appear when event state is `started` — hidden during `created`, `paused`, and `completed` states

**Independent Test**: Transition an event through all four states and verify ring visibility at each step

### Implementation for User Story 3

- [x] T013 [US3] Verify and harden edge case handling in `frontend/src/components/ItemButton.jsx` — confirm that the rendering guard (`showRing && totalParticipants > 0 && ratedCount !== undefined`) correctly handles all non-`started` states. Ensure no ring artifacts remain when `showRing` transitions from true to false.
- [x] T014 [US3] Create e2e test for ring visibility across event states in `frontend/tests/e2e/specs/participation-ring.spec.js` — test scenarios: ring not visible in `created` state, ring visible in `started` state with correct progress, ring disappears when event transitions to `paused`, ring not visible in `completed` state (winner ring takes precedence). Use existing e2e patterns for event state transitions.

**Checkpoint**: Ring visibility is correct across all event lifecycle states

---

## Phase 5: User Story 4 — Participation Count in Rating Drawer (Priority: P2)

**Goal**: When tapping an item, the rating drawer shows "N of M tasters have rated this item" as a text line near the top

**Independent Test**: Tap any item during a `started` event and verify the count text is accurate

### Implementation for User Story 4

- [x] T015 [P] [US4] Add `ratedCount` (number, optional) and `totalParticipants` (number, optional) props to RatingDrawer in `frontend/src/components/RatingDrawer.jsx`. Display "N of M tasters have rated this item" text below the drawer header when both props are provided and `totalParticipants > 0`. Use `text-sm text-muted-foreground` for subtle styling consistent with existing drawer text.
- [x] T016 [US4] Pass `ratedCount={itemRaterCounts[openDrawerItemId] || 0}` and `totalParticipants={event?.users ? Object.keys(event.users).length : 0}` from EventPage to `<RatingDrawer>` in `frontend/src/pages/EventPage.jsx`, only when `event?.state === 'started'`.

**Checkpoint**: Drawer shows accurate participation count during active events, hidden in other states

---

## Phase 6: User Story 5 — Accessible Participation Information (Priority: P2)

**Goal**: Screen reader users hear the participation count as part of the button's accessible label

**Independent Test**: Navigate the item grid with a screen reader and verify the label includes "N of M rated"

### Implementation for User Story 5

- [x] T017 [US5] Add accessibility test cases to `frontend/tests/unit/ItemButton.test.jsx` — verify aria-label includes participation count when `showRing=true`, aria-label omits participation count when `showRing=false`, aria-label composes with bookmark and winner labels. Tests should FAIL before T018 implementation.
- [x] T018 [US5] Update the `aria-label` on the `<button>` element in `frontend/src/components/ItemButton.jsx` — when `showRing` is true and `totalParticipants > 0`, append `, ${ratedCount} of ${totalParticipants} rated` to the existing label. Compose correctly with existing bookmark and winner suffixes. Example: `Item 3 (bookmarked), 6 of 8 rated`.

**Checkpoint**: Screen reader announces participation count for all items during active events

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and quality checks

- [x] T019 Verify grid layout with maximum item count (20 items) in `frontend/src/components/ItemButton.jsx` context — confirm 68px SVG within `gap-6` (24px) grid does not cause overflow or visual crowding. Test on mobile viewport widths.
- [x] T020 Run quickstart.md local verification steps end-to-end: dev environment, two-user scenario, ring fill after poll, state transitions, drawer text.
- [x] T021 Run existing test suites (`npm run test:frontend` and `npm run test:e2e`) to verify no regressions in ItemButton, EventPage, or RatingDrawer behavior.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Foundational (Phase 1) — uses `deriveItemRaterCounts`
- **US2 (Phase 3)**: Depends on US1 (Phase 2) — refines the SVG ring's color treatment
- **US3 (Phase 4)**: Depends on US1 (Phase 2) — tests the visibility gating already implemented in US1
- **US4 (Phase 5)**: Depends on US1 (Phase 2) — T015 (RatingDrawer) can start after Foundational, but T016 (EventPage wiring) requires T006 for `itemRaterCounts` state
- **US5 (Phase 6)**: Depends on US1 (Phase 2) — modifies ItemButton's aria-label alongside the ring
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Blocked by Foundational only — **MVP: stop here for minimal viable feature**
- **US2 (P1)**: Blocked by US1 — ring must exist before colors can be refined
- **US3 (P2)**: Blocked by US1 — ring must exist before visibility can be tested across states
- **US4 (P2)**: T015 (RatingDrawer component) can start after Foundational, but T016 (EventPage wiring) depends on US1's T006 for `itemRaterCounts` state
- **US5 (P2)**: Blocked by US1 — aria-label references the ring's `showRing` prop

### Within Each User Story

- Tests FIRST (where included), verify they FAIL, then implement
- Utility before component, component before page wiring
- Core rendering before refinements (color, edge cases, accessibility)

### Parallel Opportunities

- T001 and T002 are sequential (write test, then implement function)
- T003, T004, T005 are sequential within ItemButton (add props, render ring, add animation)
- T006 and T007 are sequential in EventPage (add state, then trigger refresh)
- **T015 [US4] can run in parallel with Phase 3 (US2)** — RatingDrawer is a separate file
- T009 and T014 are separate test files and can run in parallel
- T017 [US5] and T015 [US4] modify different files and can run in parallel

---

## Parallel Example: After Phase 2 (US1) Completes

```
# These can run in parallel (different files, independent concerns):
Task T010 [US2]: Color derivation in ItemButton.jsx
Task T015 [US4]: Participation text in RatingDrawer.jsx

# After US2 completes, these can also run in parallel:
Task T014 [US3]: E2e test in participation-ring.spec.js
Task T018 [US5]: Aria-label update in ItemButton.jsx
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Foundational (T001–T002)
2. Complete Phase 2: US1 (T003–T008)
3. **STOP and VALIDATE**: Ring renders with progress data, updates on poll cycle
4. The ring will use basic colors — good enough for demo

### Incremental Delivery

1. Foundational → utility ready
2. US1 → ring renders with data (**MVP — core value delivered**)
3. US2 → ring colors match button (**visual polish**)
4. US3 → state gating hardened + e2e test (**robustness**)
5. US4 → drawer shows count text (**progressive disclosure**)
6. US5 → accessibility labels (**inclusive design**)
7. Polish → grid verification, regression check

### Recommended Single-Developer Sequence

Phases 1 → 2 → 3 → 5 → 4 → 6 → 7

(US4/RatingDrawer and US5/accessibility can be swapped; US2 color treatment should immediately follow US1 since you're already in ItemButton.jsx)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new backend endpoints or dependencies required
- No new npm packages required
- All changes are frontend-only across 4 source files + 3 test files
- Commit after each phase for clean history
