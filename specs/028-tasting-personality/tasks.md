# Tasks: Tasting Personality Card

**Input**: Design documents from `/specs/028-tasting-personality/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — Constitution Principle IV (Testing Standards) is NON-NEGOTIABLE, and workspace rules require test updates for all source changes.

**Organization**: Tasks are grouped by user story. US1 (Guest sees own personality), US2 (Shift detection), and US5 (Content voice) are combined in one phase because they are co-equal P1 stories that modify the same files and deliver together as the MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup

**Purpose**: No new dependencies or project structure changes needed. Existing monorepo with established patterns.

- [x] T001 Verify branch `028-tasting-personality` exists and is checked out; confirm no conflicting changes in target files

**Checkpoint**: Branch ready for implementation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core detection logic, content map, and reusable card component that ALL user stories depend on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: Every surface (My Progress, Similar Users, Dashboard) depends on the detection function, content map, and card component created here.

- [x] T002 Create backend personality detection function with 11 prioritized rules, threshold check (`min(max(4, ceil(totalItems*0.5)), totalItems)`), helpers for population standard deviation and inter-rating speed, and exclusion rules for low maxRating scales in `backend/src/services/PersonalityService.js`
- [x] T003 Create unit tests for PersonalityService covering each of the 11 detection rules, priority ordering (first match wins), threshold clamping for small events, 2-point scale exclusions (`diplomat`, `rollercoaster`), single-rating speed skip, and `null` return below threshold in `backend/tests/unit/PersonalityService.test.js`
- [x] T004 [P] Create frontend personality detection function mirroring backend logic exactly — same 11 rules, same priority order, same threshold, same helpers — in `frontend/src/utils/personalityDetection.js`
- [x] T005 [P] Create unit tests for frontend detection ensuring parity with backend (reuse test case data from T003) in `frontend/tests/unit/personalityDetection.test.js`
- [x] T006 [P] Create personality content map with all 11 personality types (`{ id → { name, quotes[] } }`), 3–5 wine-specific quotes per type with `{token}` placeholders, `getPersonalityDisplay(id, vars)` function (random quote selection + regex interpolation), and `getPersonalityName(id)` function in `frontend/src/utils/personalityContent.js`
- [x] T007 [P] Create unit tests for personalityContent covering template interpolation (all 8 token types), content integrity (all 11 types have name + 3–5 quotes), `getPersonalityName` for valid/invalid IDs, and graceful `null` return for unknown personality IDs in `frontend/tests/unit/personalityContent.test.js`
- [x] T008 Create reusable PersonalityCard component rendering personality display name, randomly selected interpolated quote, and optional "Previously: [name]" line; accepts `personalityId`, `templateVars`, and `previousPersonality` props; verify no layout overflow at 320px, 375px, and 428px widths in `frontend/src/components/PersonalityCard.jsx`
- [x] T009 Create unit tests for PersonalityCard covering card rendering with name + quote, "Previously" line when `previousPersonality` is provided, no "Previously" line when `null`, graceful degradation when quote pool is empty or personality ID is unknown (name shown without quote), and proper semantic markup in `frontend/tests/unit/PersonalityCard.test.jsx`

**Checkpoint**: Detection logic, content, and card component are complete and tested. All 3 surfaces can now consume them independently.

---

## Phase 3: User Story 1 + 2 + 5 — Guest Sees Own Personality with Shift Detection (Priority: P1) 🎯 MVP

**Goal**: A guest who has rated enough items during a wine event opens My Progress and sees a funny personality card. Returning after more ratings reveals if their personality shifted ("Previously: The Golden Retriever"). A dot badge on the My Progress button signals when the personality first becomes available. Quote content matches the voice and humor of existing suggested wine notes.

**Independent Test**: Rate 4+ of 8 items in a started wine event → dot badge appears on My Progress → open drawer → personality card with name + quote → rate more items to change pattern → reopen → see "Previously" line with old personality.

**Why combined**: US1 (card display), US2 (shift tracking), and US5 (content voice) modify the same files (`UserDetailsDrawer.jsx`, `EventPage.jsx`, `personalityContent.js`) and are all P1. US5 is satisfied by the content written in Phase 2 (T006) — its acceptance scenarios are verified by T007's content integrity tests and the tonal review in T012.

### Implementation

- [x] T010 [US1][US2] Modify UserDetailsDrawer to compute personality from loaded ratings via `detectPersonality()` when event is wine type and state is `started`/`paused`/`completed`, build template variables from rating data (avg, count, preview, minutes, item terminology), render `<PersonalityCard>` above Rating Timeline section, implement sessionStorage shift tracking (`personality-{eventId}` key) to detect and display personality changes between drawer openings in `frontend/src/components/UserDetailsDrawer.jsx`
- [x] T011 [P] [US1] Modify EventPage to add dot badge on My Progress button when user first qualifies for personality — check rating count against threshold, gate on `event.typeOfItem === "wine"`, use `sessionStorage` key `personality-badge-{eventId}` to track one-time discovery cue, clear badge when My Progress drawer opens in `frontend/src/pages/EventPage.jsx`
- [x] T012 [US5] Review all personality quotes in `frontend/src/utils/personalityContent.js` against existing wine note suggestions in `backend/src/quotes/*.quotes.txt` for tonal consistency — verify contemporary, self-aware, pop-culture-literate, slightly absurd voice; ensure no technical jargon or implementation references
- [x] T013 [US1][US2] Create unit tests for UserDetailsDrawer personality integration: card appears when threshold met and event is wine + active state, card hidden below threshold, card hidden for non-wine events, card hidden in `created` state, shift detection shows "Previously" line, no "Previously" on first visit, template tokens interpolated correctly in `frontend/tests/unit/UserDetailsDrawer.test.jsx`
- [x] T014 [US1] Update EventPage tests to cover dot badge: visible when user crosses personality threshold in wine event, hidden for non-wine events, cleared after drawer opens, does not reappear for subsequent personality shifts in `frontend/tests/unit/EventPage.test.jsx`

**Checkpoint**: MVP complete — a guest can see their personality, experience shift detection, and discover the feature via the dot badge. Content voice is validated.

---

## Phase 4: User Story 3 — See Other Guests' Personalities in Similar Users (Priority: P2)

**Goal**: When a guest browses the Similar Users drawer, each matched user's personality name appears as a subtitle alongside their name and common item count. Tapping into a user's detail view shows their full personality card with a quote.

**Independent Test**: Have 2+ users rate 4+ items in a wine event → open Similar Users → matched users show personality name subtitle → tap a user → detail view shows personality card with quote.

### Implementation

- [x] T015 [US3] Modify SimilarityService `findSimilarUsers()` to derive personality detection input (noteCount, noteLengths, timestamps, ratings, distribution, average) from grouped `allRatings` for each similar user, call `PersonalityService.detectPersonality()` when `event.typeOfItem === "wine"`, and add `personality` field to each similar user object in response in `backend/src/services/SimilarityService.js`
- [x] T016 [US3] Update SimilarityService tests to assert `personality` field is present in similar user response objects, verify `null` for non-qualifying users, verify `null` for non-wine events in `backend/tests/unit/SimilarityService.test.js`
- [x] T017 [US3] Modify SimilarUsersDrawer to show personality display name as subtitle in each user row (e.g., "The Rollercoaster · 5 common") when `user.personality` exists, omit subtitle when `null`, and render `<PersonalityCard>` with full quote in user detail view in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T018 [US3] Update SimilarUsersDrawer tests to cover: personality subtitle shown when present, subtitle hidden when personality is `null`, personality card rendered in detail view with quote in `frontend/tests/unit/SimilarUsersDrawer.test.jsx`

**Checkpoint**: Similar Users drawer shows personality names and detail view shows full cards.

---

## Phase 5: User Story 4 — Host and Guests See All Personalities on the Dashboard (Priority: P2)

**Goal**: The Dashboard Summary tab shows a "Tasting Personalities" section below the statistics cards, listing all qualifying participants with their display name and personality. Tapping a row opens the User Details drawer for that participant.

**Independent Test**: Complete a wine event where 4+ users rated enough items → open Dashboard → Summary tab → "Tasting Personalities" section lists qualifying participants → tap a row → User Details drawer opens with personality card.

### Implementation

- [x] T019 [US4] Modify DashboardService `calculateUserSummaries()` to count non-empty notes per user (`noteCount`), collect note lengths (`noteLengths`), preserve earliest/latest timestamps from ratings loop, call `PersonalityService.detectPersonality()` for each user when `event.typeOfItem === "wine"`, and add `noteCount` and `personality` fields to each user summary object in `backend/src/services/DashboardService.js`
- [x] T020 [US4] Update DashboardService tests to assert `noteCount` and `personality` fields in user summaries, verify correct personality detection, verify `null` for non-qualifying users, verify `null` for non-wine events in `backend/tests/unit/DashboardService.test.js`
- [x] T021 [US4] Modify DashboardPage Summary tab to add a "Tasting Personalities" section below statistics cards — filter `userSummaries` to those with non-null `personality`, render list of participant name + personality display name (via `getPersonalityName`), hide section when no participants qualify, make rows tappable to open UserDetailsDrawer for that participant in `frontend/src/pages/DashboardPage.jsx`
- [x] T022 [US4] Update or create DashboardPage tests for Tasting Personalities section: section visible with qualifying participants, section hidden when no participants qualify, correct personality display names shown, row tap opens UserDetailsDrawer, section hidden for non-wine events in `frontend/tests/unit/DashboardPage.test.jsx`

**Checkpoint**: Dashboard shows personality overview for all qualifying participants.

---

## Phase 6: User Story 6 — Accessible Personality Information (Priority: P3)

**Goal**: Screen reader users can access personality names and quotes through standard reading order on all three surfaces.

**Independent Test**: Navigate My Progress drawer with a screen reader → personality name and quote announced before Rating Timeline. Navigate Similar Users → personality subtitle announced per row.

### Implementation

- [x] T023 [US6] Ensure PersonalityCard uses semantic HTML (e.g., `<section>` with `aria-label`), personality name is a heading or strong element, quote text is in a paragraph, and "Previously" line is announced in reading order in `frontend/src/components/PersonalityCard.jsx`
- [x] T024 [US6] Verify SimilarUsersDrawer personality subtitle is included in the accessible name/description of each user row (not hidden via `aria-hidden`) in `frontend/src/components/SimilarUsersDrawer.jsx`
- [x] T025 [US6] Update PersonalityCard tests with accessibility assertions — verify `aria-label` on card region, verify heading/strong for personality name, verify "Previously" text is not aria-hidden in `frontend/tests/unit/PersonalityCard.test.jsx`

**Checkpoint**: All personality content is accessible via screen readers.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate consistency across surfaces and run end-to-end verification.

- [x] T026 Verify cross-surface personality consistency — confirm the same user with the same ratings receives the same personality type on My Progress (frontend detection), Similar Users (backend SimilarityService), and Dashboard (backend DashboardService)
- [x] T027 Run quickstart.md local verification steps (all 10 steps) to validate the full feature flow end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1+US2+US5 (Phase 3)**: Depends on Foundational (Phase 2) — MVP delivery
- **US3 (Phase 4)**: Depends on Foundational (Phase 2) — can run in parallel with Phase 3
- **US4 (Phase 5)**: Depends on Foundational (Phase 2) — can run in parallel with Phase 3 and 4
- **US6 (Phase 6)**: Depends on Phase 3 (PersonalityCard must exist with final markup)
- **Polish (Phase 7)**: Depends on all user story phases being complete

### User Story Dependencies

- **US1+US2+US5 (P1)**: Can start after Foundational — no dependencies on other stories
- **US3 (P2)**: Can start after Foundational — independent of US1/US2 (uses backend detection, different surfaces)
- **US4 (P2)**: Can start after Foundational — independent of US1/US2/US3 (uses backend detection, different surface)
- **US6 (P3)**: Depends on US1 being complete (needs PersonalityCard to be finalized)

### Within Each Phase

- Implementation before tests (tests verify the implementation)
- Backend before frontend when frontend consumes backend response (US3, US4)
- Content review (T012) can happen anytime after T006

### Parallel Opportunities

**Phase 2** (most parallelism):
```
Parallel batch 1:
  T002 (PersonalityService.js)
  ─── then T003 (PersonalityService.test.js)

  T004 [P] (personalityDetection.js)     ← parallel with T002
  ─── then T005 (personalityDetection.test.js)

  T006 [P] (personalityContent.js)       ← parallel with T002, T004
  ─── then T007 (personalityContent.test.js)

Parallel batch 2 (after batch 1):
  T008 (PersonalityCard.jsx)
  ─── then T009 (PersonalityCard.test.jsx)
```

**Phase 3** (after Phase 2):
```
Parallel:
  T010 (UserDetailsDrawer.jsx)       ← different file
  T011 [P] (EventPage.jsx)          ← different file

Then:
  T013 (UserDetailsDrawer.test.jsx)
  T014 (EventPage.test.jsx)         ← can parallel with T013
```

**Phases 3, 4, 5 can run in parallel** (after Phase 2):
```
Developer A: Phase 3 (US1+US2+US5 — frontend focus)
Developer B: Phase 4 (US3 — backend + frontend)
Developer C: Phase 5 (US4 — backend + frontend)
```

---

## Implementation Strategy

### MVP First (Phase 1 → 2 → 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — detection function, content, card component
3. Complete Phase 3: US1 + US2 + US5 — guest sees own personality with shift detection
4. **STOP and VALIDATE**: Test with a single user in a wine event — rate items, check dot badge, open My Progress, verify personality card, rate more, verify shift
5. Deploy/demo if ready — this is the core "show your friend" moment

### Incremental Delivery

1. Phase 2 → Foundation ready (detection + content + card)
2. Phase 3 → **MVP** — Guest sees own personality (US1+US2+US5) → Deploy
3. Phase 4 → Similar Users personalities (US3) → Deploy
4. Phase 5 → Dashboard personalities (US4) → Deploy
5. Phase 6 → Accessibility polish (US6) → Deploy
6. Phase 7 → Final validation

### Parallel Team Strategy

With multiple developers after Phase 2 completes:
- **Developer A**: Phase 3 (US1+US2+US5) — My Progress + EventPage
- **Developer B**: Phase 4 (US3) — SimilarityService + SimilarUsersDrawer
- **Developer C**: Phase 5 (US4) — DashboardService + DashboardPage
- All three stories are independently testable and deliverable

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [US1][US2] = task serves multiple user stories (common when stories share a file)
- Detection function exists in TWO places (backend + frontend) — both must produce identical output for the same input
- Wine-only gate (`event.typeOfItem === "wine"`) must be applied at every call site — backend (2 services) and frontend (3 surfaces)
- sessionStorage keys: `personality-{eventId}` (shift tracking), `personality-badge-{eventId}` (dot badge)
- Commit after each task or logical group
- Stop at any checkpoint to validate the current story independently
