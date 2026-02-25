# Tasks: Crockford Base32 Event IDs

**Input**: Design documents from `/specs/012-crockford-event-ids/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test update tasks are included because existing tests must be updated to match the new behavior (constitution Principle IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Backend Core Changes)

**Purpose**: Core backend changes that MUST complete before any user story work — alphabet swap, validation normalization, and DRY consolidation.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Update `customAlphabet` in `backend/src/services/EventService.js` — change alphabet from 62-char alphanumeric to Crockford Base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), keeping length at 8. Remove the duplicate `validateEventId` method (lines 247-258) and replace all ~20 `this.validateEventId()` calls with the shared import from `backend/src/utils/validators.js`
- [x] T002 [P] Update `backend/src/utils/validators.js` — modify `validateEventId` to trim whitespace and normalize to uppercase before regex check. Return the normalized event ID in the result: `{ valid: true, eventId: normalizedId }`
- [x] T003 [P] Add Express param middleware for eventId normalization in `backend/src/api/index.js` — use `router.param('eventId', ...)` to trim and uppercase `req.params.eventId` before route handlers execute, ensuring all downstream code (ratingsRouter, dashboardRouter, similarUsersRouter, itemsRouter, eventsRouter) receives the normalized ID without per-route changes

**Checkpoint**: Backend generates Crockford IDs, normalizes all input to uppercase, and has a single source of truth for validation.

---

## Phase 2: User Story 1 — Human-Readable Event IDs (Priority: P1) MVP

**Goal**: Newly created events receive IDs composed only of Crockford Base32 characters, displayed in uppercase everywhere.

**Independent Test**: Create a new event and verify the returned event ID contains only characters from `0123456789ABCDEFGHJKMNPQRSTVWXYZ` and is 8 characters long.

### Implementation for User Story 1

- [x] T004 [P] [US1] Update `backend/tests/unit/EventService.test.js` — add test that verifies `generateEventId` output contains only Crockford Base32 characters (`/^[0-9A-HJ-NP-TV-Z]{8}$/`) and is exactly 8 characters. Update mocked event IDs to use uppercase Crockford-valid values
- [x] T005 [P] [US1] Update `backend/tests/integration/events.test.js` — change all hardcoded test event IDs (e.g., `TEST1234`) to uppercase Crockford-valid IDs. Verify event creation response contains only Crockford characters

**Checkpoint**: Creating an event produces an 8-character uppercase Crockford Base32 ID. Backend tests pass.

---

## Phase 3: User Story 2 — Case-Insensitive Event ID Entry (Priority: P1)

**Goal**: Users can enter event IDs in any case (upper, lower, mixed) and the system normalizes to uppercase, redirecting URLs to the canonical uppercase form.

**Independent Test**: Enter a known event ID in lowercase in the join field, verify the system redirects to the uppercase URL and displays the correct event.

### Implementation for User Story 2

- [x] T006 [P] [US2] Add uppercase canonical URL redirect in `frontend/src/App.jsx` — when the extracted eventId from the URL path is not fully uppercase, use React Router `Navigate` to redirect to the same route with the uppercased eventId (e.g., `/event/a3rkt9wp/admin` → `/event/A3RKT9WP/admin`)
- [x] T007 [P] [US2] Normalize event ID input to uppercase in `frontend/src/pages/LandingPage.jsx` — in `handleJoinClick`, uppercase the eventId before calling `navigate()`
- [x] T008 [P] [US2] Update URL extraction regex in `frontend/src/components/Header.jsx` — ensure the regex on lines 40 and 86 continues to match any-case event IDs in the URL path (current regex already accepts `[A-Za-z0-9]`; verify no changes needed or add normalization if the extracted ID is used downstream)
- [x] T009 [P] [US2] Update event ID extraction in `frontend/src/services/apiClient.js` — ensure `getEventIdFromUrl` (line 211) regex continues to match any-case event IDs and returns the ID as-is (normalization happens at entry points, not extraction)
- [x] T010 [US2] Consolidate duplicated inline regex in `frontend/src/pages/ProfilePage.jsx` — replace ~8 occurrences of `/^[A-Za-z0-9]{8}$/` with a shared validation function. Add uppercase normalization to the event ID before API calls
- [x] T011 [US2] Update `frontend/tests/e2e/specs/create-event.spec.js` — change URL pattern assertions (lines 184, 293) from `/\/event\/[A-Za-z0-9]{8}\/admin/` to `/\/event\/[0-9A-Z]{8}\/admin/` to verify URLs contain only uppercase characters after redirect
- [x] T012 [US2] Add E2E test for case-insensitive event ID entry in `frontend/tests/e2e/specs/create-event.spec.js` — create an event, extract the uppercase ID, navigate to the same event using a lowercase version of the ID, and assert the browser URL redirects to the uppercase canonical form
- [x] T013 [US2] Add E2E test for excluded character passthrough in `frontend/tests/e2e/specs/create-event.spec.js` — enter an event ID containing excluded letters (e.g., `OILX1234`), submit, and verify the system shows a standard "event not found" message without a validation error about invalid characters

**Checkpoint**: Entering a lowercase event ID redirects to the uppercase canonical URL. E2E tests verify uppercase-only URLs, case-insensitive entry, and excluded character passthrough.

---

## Phase 4: User Story 3 — Validation Feedback on Event ID Entry (Priority: P2)

**Goal**: Users who enter invalid event IDs (special characters, wrong length) receive clear, actionable error messages.

**Independent Test**: Enter `A3R-T9!W` and verify a clear error message appears. Enter `ABC` (too short) and verify a length-specific message appears.

### Implementation for User Story 3

- [x] T014 [US3] Review and verify error messages across all event ID entry points — confirm `backend/src/utils/validators.js`, `frontend/src/pages/ProfilePage.jsx` (after consolidation in T010), and `frontend/src/pages/LandingPage.jsx` all provide clear, user-friendly error messages for invalid formats (special characters, wrong length). Update wording if any message is debug-style or unclear

**Checkpoint**: All entry points display clear, user-friendly validation messages for invalid event ID input.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories.

- [x] T015 Run quickstart.md validation scenarios end-to-end — create event, verify Crockford ID, test lowercase entry, test redirect, test excluded characters, test invalid input
- [x] T016 [P] Verify no remaining references to the old 62-char alphabet comment or documentation in changed files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
  - T001 must complete before T004/T005 (unit/integration tests depend on alphabet change)
  - T002 and T003 can run in parallel with T001 (different files)
- **US1 (Phase 2)**: Depends on Phase 1 completion
- **US2 (Phase 3)**: Depends on Phase 1 completion (does NOT depend on US1 — frontend changes are independent)
- **US3 (Phase 4)**: Depends on T002 (validators.js) and T010 (ProfilePage consolidation)
- **Polish (Phase 5)**: Depends on all phases complete

### Test Coverage (Constitution Principle IV)

- **US1**: T004 (Crockford output unit test), T005 (integration test with uppercase IDs)
- **US2**: T011 (URL pattern assertions), T012 (case-insensitive entry E2E), T013 (excluded char passthrough E2E)
- **US3**: T014 (error message review)

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 1 only. Tests backend generation.
- **User Story 2 (P1)**: Depends on Phase 1 only. Can run in parallel with US1. Tests frontend normalization and redirect.
- **User Story 3 (P2)**: Depends on T002 and T010. Verifies error messages.

### Within Each User Story

- Backend changes before frontend changes
- Implementation before test updates
- Core files before dependent files

### Parallel Opportunities

Phase 1 parallel group:
```
T001 (EventService.js)  |  T002 (validators.js)  |  T003 (middleware)
```

US1 parallel group (after Phase 1):
```
T004 (unit tests)  |  T005 (integration tests)
```

US2 parallel group (after Phase 1):
```
T006 (App.jsx)  |  T007 (LandingPage.jsx)  |  T008 (Header.jsx)  |  T009 (apiClient.js)
```

Then sequentially:
```
T010 (ProfilePage.jsx consolidation) → T011–T013 (E2E tests)
```

US1 and US2 can run fully in parallel since they touch different files (backend tests vs. frontend components).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001–T003)
2. Complete Phase 2: US1 (T004–T005)
3. **STOP and VALIDATE**: Create an event, verify Crockford ID output
4. Deploy/demo if ready — backend is fully functional at this point

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Add US1 (T004–T005) → Backend produces Crockford IDs → Validate
3. Add US2 (T006–T013) → Frontend normalizes and redirects → Validate end-to-end
4. Add US3 (T014) → Error messages verified → Validate
5. Polish (T015–T016) → Final validation

### Parallel Strategy

With two developers:

1. Both complete Phase 1 together (3 tasks, 2 parallelizable)
2. Once Phase 1 is done:
   - Developer A: US1 (backend tests) → US3 (error messages)
   - Developer B: US2 (frontend normalization + redirect)
3. Both complete Polish together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- T001 is the largest single task (~20 internal method call replacements in EventService.js)
- T008 and T009 may require no code changes after verification — current regexes may already be sufficient
- T010 is the key DRY improvement — consolidating 8 inline regex duplicates
- T012 and T013 are new E2E tests for Constitution Principle IV compliance
- Commit after each task or logical group
