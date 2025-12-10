# Tasks: Wine Note Suggestions

**Input**: Design documents from `/specs/001-wine-note-suggestions/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as they are required by the constitution (Testing Standards - NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below use web app structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and quotes API endpoint

- [X] T001 [P] Create quotes API route file `backend/src/api/quotes.js`
- [X] T002 [P] Implement `GET /api/quotes` endpoint in `backend/src/api/quotes.js` to read and return quotes.json
- [X] T003 [P] Add error handling for missing/corrupted quotes.json in `backend/src/api/quotes.js`
- [X] T004 [P] Register quotes route in `backend/src/api/index.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Install Switch component from shadcn/ui: `npx shadcn@latest add switch` in frontend directory
- [X] T006 [P] Create quote service `frontend/src/services/quoteService.js` with `getQuotes()` method
- [X] T007 [P] Add XSS sanitization for quote text in `frontend/src/services/quoteService.js` (sanitize before caching to prevent XSS)
- [X] T008 [P] Implement quote caching in `frontend/src/services/quoteService.js` (singleton pattern)
- [X] T009 [P] Add `getSuggestionsForRating(ratingLevel)` method to `frontend/src/services/quoteService.js` with random selection
- [X] T010 [P] Create `useQuotes()` hook in `frontend/src/hooks/useQuotes.js` to access quote service
- [X] T011 [P] Extend `EventService.getRatingConfiguration()` in `backend/src/services/EventService.js` to include `noteSuggestionsEnabled` (defaults to true for wine events)
- [X] T012 [P] Extend `EventService.updateRatingConfiguration()` in `backend/src/services/EventService.js` to accept `noteSuggestionsEnabled` parameter
- [X] T013 [P] Add validation in `EventService.updateRatingConfiguration()` for `noteSuggestionsEnabled` (state check, event type check)
- [X] T014 [P] Update `GET /api/events/:eventId/rating-configuration` endpoint in `backend/src/api/events.js` to include `noteSuggestionsEnabled` in response
- [X] T015 [P] Update `PATCH /api/events/:eventId/rating-configuration` endpoint in `backend/src/api/events.js` to accept `noteSuggestionsEnabled` in request body

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 3 - Configure Note Suggestions Toggle (Priority: P1) 🎯 MVP

**Goal**: Event administrators can enable or disable note suggestions for their wine events through a toggle in the Ratings Configuration section.

**Independent Test**: Open Event Admin page for a wine event, navigate to Ratings Configuration, verify toggle exists and can be changed when event is in "created" state. Toggle should be hidden for non-wine events and disabled when event is not in "created" state.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US3] Unit test for `EventService.getRatingConfiguration()` with `noteSuggestionsEnabled` default in `backend/tests/unit/EventService.test.js`
- [ ] T017 [P] [US3] Unit test for `EventService.updateRatingConfiguration()` with `noteSuggestionsEnabled` validation in `backend/tests/unit/EventService.test.js`
- [ ] T018 [P] [US3] Integration test for `GET /api/events/:eventId/rating-configuration` with `noteSuggestionsEnabled` in `backend/tests/integration/events.test.js`
- [ ] T019 [P] [US3] Integration test for `PATCH /api/events/:eventId/rating-configuration` with `noteSuggestionsEnabled` in `backend/tests/integration/events.test.js`
- [ ] T020 [P] [US3] Component test for toggle visibility in `EventAdminPage` for wine events in `frontend/tests/unit/EventAdminPage.test.jsx`
- [ ] T021 [P] [US3] Component test for toggle visibility in `EventAdminPage` for non-wine events in `frontend/tests/unit/EventAdminPage.test.jsx`
- [ ] T022 [P] [US3] Component test for toggle disabled state when event not in "created" state in `frontend/tests/unit/EventAdminPage.test.jsx`
- [ ] T023 [P] [US3] E2E test for admin toggling note suggestions on/off in `frontend/tests/e2e/features/note-suggestions-toggle.feature`

### Implementation for User Story 3

- [X] T024 [US3] Import Switch component from `@/components/ui/switch` in `frontend/src/pages/EventAdminPage.jsx` (requires T005)
- [X] T025 [US3] Add state for `noteSuggestionsEnabled` in `EventAdminPage` component in `frontend/src/pages/EventAdminPage.jsx`
- [X] T026 [US3] Load `noteSuggestionsEnabled` from rating configuration in `EventAdminPage` useEffect in `frontend/src/pages/EventAdminPage.jsx`
- [X] T027 [US3] Add toggle UI in Ratings Configuration accordion section in `frontend/src/pages/EventAdminPage.jsx` (below rating levels, above Save button)
- [X] T028 [US3] Conditionally show toggle only for wine events (`typeOfItem === "wine"`) in `frontend/src/pages/EventAdminPage.jsx`
- [X] T029 [US3] Disable toggle when event state !== "created" in `frontend/src/pages/EventAdminPage.jsx`
- [X] T030 [US3] Default toggle to `true` for new wine events in `frontend/src/pages/EventAdminPage.jsx`
- [X] T031 [US3] Include `noteSuggestionsEnabled` in rating configuration save in `frontend/src/pages/EventAdminPage.jsx`
- [X] T032 [US3] Handle toggle change and update local state in `frontend/src/pages/EventAdminPage.jsx`

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently. Administrators can toggle note suggestions on/off for wine events.

---

## Phase 4: User Story 1 - View Note Suggestions for Selected Rating (Priority: P1) 🎯 MVP

**Goal**: When rating a wine item in a wine event, users can see contextual note suggestions based on their selected rating level. The system displays one randomly selected suggestion from each quote type (snarky, poetic, haiku) that matches the selected rating level.

**Independent Test**: Open a wine event rating form with note suggestions enabled, select a rating level, and verify that one suggestion from each quote type appears for that rating level. Change rating level and verify suggestions update. Verify no suggestions shown for non-wine events or when rating not selected.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T033 [P] [US1] Unit test for `quoteService.getQuotes()` loading and caching in `frontend/tests/unit/quoteService.test.js`
- [ ] T034 [P] [US1] Unit test for XSS sanitization in quote service in `frontend/tests/unit/quoteService.test.js`
- [ ] T035 [P] [US1] Unit test for `quoteService.getSuggestionsForRating()` random selection in `frontend/tests/unit/quoteService.test.js`
- [ ] T036 [P] [US1] Unit test for `useQuotes()` hook in `frontend/tests/unit/useQuotes.test.js`
- [ ] T037 [P] [US1] Component test for `RatingForm` displaying suggestions when conditions met in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T038 [P] [US1] Component test for `RatingForm` hiding suggestions when rating not selected in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T039 [P] [US1] Component test for `RatingForm` hiding suggestions for non-wine events in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T040 [P] [US1] Component test for `RatingForm` hiding suggestions when `noteSuggestionsEnabled === false` in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T041 [P] [US1] Integration test for `GET /api/quotes` endpoint in `backend/tests/integration/quotes.test.js`
- [ ] T042 [P] [US1] Integration test for `GET /api/quotes` handling missing file gracefully in `backend/tests/integration/quotes.test.js`
- [ ] T043 [P] [US1] E2E test for user selecting rating and seeing suggestions in `frontend/tests/e2e/features/note-suggestions-display.feature`

### Implementation for User Story 1

- [X] T044 [US1] Add `eventType` and `noteSuggestionsEnabled` props to `RatingForm` component in `frontend/src/components/RatingForm.jsx`
- [X] T045 [US1] Import and use `useQuotes()` hook in `RatingForm` component in `frontend/src/components/RatingForm.jsx`
- [X] T046 [US1] Add state for current suggestions in `RatingForm` component in `frontend/src/components/RatingForm.jsx`
- [X] T047 [US1] Implement logic to check if suggestions should be displayed (wine event, enabled, rating selected) in `RatingForm` in `frontend/src/components/RatingForm.jsx`
- [X] T048 [US1] Add useEffect to update suggestions when rating level changes in `RatingForm` in `frontend/src/components/RatingForm.jsx`
- [X] T049 [US1] Implement `getSuggestionsForRating()` call with random selection in `RatingForm` in `frontend/src/components/RatingForm.jsx`
- [X] T050 [US1] Add UI to display suggestion buttons below note textarea in `RatingForm` in `frontend/src/components/RatingForm.jsx` (using shadcn/ui Button with variant="outline")
- [X] T051 [US1] Handle missing quote types gracefully (only show suggestions for available types) in `RatingForm` in `frontend/src/components/RatingForm.jsx`
- [X] T052 [US1] Handle missing quotes.json gracefully (no suggestions shown, no error) in `RatingForm` in `frontend/src/components/RatingForm.jsx`
- [X] T053 [US1] Update `EventPage` to pass `event.typeOfItem` to `RatingDrawer` in `frontend/src/pages/EventPage.jsx`
- [X] T054 [US1] Update `EventPage` to pass `noteSuggestionsEnabled` from rating config to `RatingDrawer` in `frontend/src/pages/EventPage.jsx`
- [X] T055 [US1] Update `RatingDrawer` to pass `eventType` and `noteSuggestionsEnabled` props to `RatingForm` in `frontend/src/components/RatingDrawer.jsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can see note suggestions when rating wine items.

---

## Phase 5: User Story 2 - Add Suggestion to Note Field (Priority: P1)

**Goal**: Users can click on any displayed suggestion to add it to their note text field, making it easy to incorporate suggested text into their rating notes without manual typing.

**Independent Test**: Click a displayed suggestion and verify it appears in the note text field. Test with existing note text (spacing), near character limit (partial addition), and duplicate suggestions.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T056 [P] [US2] Unit test for text insertion with spacing logic in `frontend/tests/unit/textInsertion.test.js`
- [ ] T057 [P] [US2] Unit test for character limit handling (partial addition) in `frontend/tests/unit/textInsertion.test.js`
- [ ] T058 [P] [US2] Component test for suggestion click appending text correctly in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T059 [P] [US2] Component test for suggestion click with existing text (spacing) in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T060 [P] [US2] Component test for character limit handling (partial addition) in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T061 [P] [US2] Component test for duplicate suggestions allowed in `frontend/tests/unit/RatingForm.test.jsx`
- [ ] T062 [P] [US2] E2E test for user clicking suggestion and text added to note in `frontend/tests/e2e/features/note-suggestions-click.feature`

### Implementation for User Story 2

- [X] T063 [US2] Implement `appendSuggestion()` helper function with spacing logic in `RatingForm` in `frontend/src/components/RatingForm.jsx` (add space only if existing text doesn't end with whitespace)
- [X] T064 [US2] Implement `appendSuggestionWithLimit()` helper function with character limit handling in `RatingForm` in `frontend/src/components/RatingForm.jsx` (partial addition)
- [X] T065 [US2] Add click handler for suggestion buttons in `RatingForm` in `frontend/src/components/RatingForm.jsx`
- [X] T066 [US2] Call `appendSuggestionWithLimit()` in click handler to update note state in `RatingForm` in `frontend/src/components/RatingForm.jsx`
- [X] T067 [US2] Ensure note field updates correctly when suggestion is clicked in `RatingForm` in `frontend/src/components/RatingForm.jsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can view and click suggestions to add them to their notes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T068 [P] Add error logging for quotes.json load failures in `backend/src/api/quotes.js`
- [X] T069 [P] Add error logging for quote service failures in `frontend/src/services/quoteService.js`
- [X] T070 [P] Add loading state UI for quotes in `RatingForm` component in `frontend/src/components/RatingForm.jsx`
- [X] T071 [P] Optimize quote selection performance (ensure O(1) random selection) in `frontend/src/services/quoteService.js`
- [X] T072 [P] Add accessibility attributes to suggestion buttons (aria-label with descriptive text) in `frontend/src/components/RatingForm.jsx`
- [X] T073 [P] Add keyboard navigation support for suggestion buttons in `frontend/src/components/RatingForm.jsx`
- [X] T074 [P] Document SC-002 measurement approach (90% success rate) in `specs/001-wine-note-suggestions/quickstart.md` (manual testing with sample users or analytics tracking)
- [X] T075 [P] Update documentation in `specs/001-wine-note-suggestions/quickstart.md` with implementation notes
- [X] T076 [P] Run quickstart.md validation checklist
- [X] T077 [P] Code cleanup and refactoring (remove unused imports, dead code)
- [X] T078 [P] Performance testing: verify suggestions display within 1 second (SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 3 (Toggle) can proceed independently after Foundational
  - User Story 1 (View Suggestions) can proceed independently after Foundational
  - User Story 2 (Add to Note) depends on User Story 1 completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 3 (P1) - Toggle**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 1 (P1) - View Suggestions**: Can start after Foundational (Phase 2) - No dependencies on other stories (works with default enabled state)
- **User Story 2 (P1) - Add to Note**: Depends on User Story 1 - Needs suggestions to be displayed before they can be clicked

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Services before components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T004) marked [P] can run in parallel
- All Foundational tasks (T005-T015) marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - User Story 3 (Toggle) can start independently
  - User Story 1 (View Suggestions) can start independently
  - These can be worked on in parallel by different team members
- All tests for a user story marked [P] can run in parallel
- User Story 2 must wait for User Story 1 completion

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for quoteService.getQuotes() in frontend/tests/unit/quoteService.test.js"
Task: "Unit test for quoteService.getSuggestionsForRating() in frontend/tests/unit/quoteService.test.js"
Task: "Unit test for useQuotes() hook in frontend/tests/unit/useQuotes.test.js"
Task: "Component test for RatingForm displaying suggestions in frontend/tests/unit/RatingForm.test.jsx"
Task: "Integration test for GET /api/quotes endpoint in backend/tests/integration/quotes.test.js"

# Launch foundational implementation tasks together:
Task: "Add eventType and noteSuggestionsEnabled props to RatingForm in frontend/src/components/RatingForm.jsx"
Task: "Import and use useQuotes() hook in RatingForm in frontend/src/components/RatingForm.jsx"
Task: "Update EventPage to pass event.typeOfItem to RatingDrawer in frontend/src/pages/EventPage.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 3 + User Story 1)

1. Complete Phase 1: Setup (Quotes API)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 3 (Toggle) - Admin control
4. Complete Phase 4: User Story 1 (View Suggestions) - Core display
5. **STOP and VALIDATE**: Test User Stories 3 and 1 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 3 (Toggle) → Test independently → Deploy/Demo
3. Add User Story 1 (View Suggestions) → Test independently → Deploy/Demo (MVP!)
4. Add User Story 2 (Add to Note) → Test independently → Deploy/Demo
5. Add Polish → Final improvements
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 3 (Toggle)
   - Developer B: User Story 1 (View Suggestions)
3. Once User Story 1 is done:
   - Developer C: User Story 2 (Add to Note)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- User Story 2 depends on User Story 1 (needs suggestions displayed to click them)
- User Story 3 and User Story 1 can proceed in parallel after Foundational phase
