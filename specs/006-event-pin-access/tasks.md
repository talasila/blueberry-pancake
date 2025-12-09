# Tasks: Event PIN Access

**Input**: Design documents from `/specs/006-event-pin-access/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as they are standard practice for this project. Write tests first, ensure they fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow web application structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify existing project structure matches plan.md requirements
- [x] T002 [P] Verify RateLimitService exists and is accessible in `backend/src/services/RateLimitService.js`
- [x] T003 [P] Verify CacheService exists and is accessible in `backend/src/cache/CacheService.js`
- [x] T004 [P] Verify EventService exists and is accessible in `backend/src/services/EventService.js`
- [x] T005 [P] Verify FileDataRepository exists and is accessible in `backend/src/data/FileDataRepository.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create PINService in `backend/src/services/PINService.js` with generatePIN method using crypto.randomInt
- [x] T007 [P] Extend EventService in `backend/src/services/EventService.js` to generate PIN during event creation (add pin and pinGeneratedAt fields)
- [x] T008 [P] Create requirePIN middleware in `backend/src/middleware/requirePIN.js` for PIN verification session checks
- [x] T009 [P] Extend FileDataRepository in `backend/src/data/FileDataRepository.js` to handle PIN fields in event data model
- [x] T010 Add unit test for PINService.generatePIN in `backend/tests/unit/PINService.test.js` (verify 6-digit format, randomness)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Regular User Accesses Event via PIN (Priority: P1) 🎯 MVP

**Goal**: Regular users can access events by entering a 6-digit PIN without OTP authentication

**Independent Test**: Navigate to `/event/<event-id>`, enter valid PIN, verify access to event main page without OTP authentication

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Add unit test for PINService.verifyPIN in `backend/tests/unit/PINService.test.js` (valid PIN, invalid PIN, rate limiting)
- [x] T011a [P] [US1] Add performance test for PIN format validation in `backend/tests/unit/PINService.test.js` (verify validation completes within 500ms per SC-007)
- [x] T012 [P] [US1] Add unit test for PINService.createPINSession in `backend/tests/unit/PINService.test.js` (session creation, cache storage)
- [x] T013 [P] [US1] Add integration test for POST /api/events/:eventId/verify-pin in `backend/tests/integration/events.test.js` (success, invalid PIN, rate limit, event not found)
- [x] T014 [P] [US1] Add integration test for GET /api/events/:eventId with PIN session in `backend/tests/integration/events.test.js` (with session, without session)
- [x] T015 [P] [US1] Add unit test for PINEntryPage component in `frontend/src/pages/__tests__/PINEntryPage.test.jsx` (rendering, PIN input, error handling)
- [x] T016 [P] [US1] Add unit test for PINContext in `frontend/src/contexts/__tests__/PINContext.test.jsx` (session management, persistence)
- [ ] T017 [P] [US1] Add E2E test for regular user PIN access flow in `frontend/tests/e2e/pin-access.test.js` (navigate to event, enter PIN, access granted)

### Implementation for User Story 1

- [x] T018 [US1] Implement PINService.verifyPIN method in `backend/src/services/PINService.js` (validate format, check rate limits, compare PIN, create session)
- [x] T019 [US1] Implement PINService.createPINSession method in `backend/src/services/PINService.js` (generate sessionId, store in cache)
- [x] T020 [US1] Implement PINService.checkPINSession method in `backend/src/services/PINService.js` (retrieve from cache)
- [x] T021 [US1] Integrate RateLimitService in PINService.verifyPIN in `backend/src/services/PINService.js` (per IP and per event limits)
- [x] T022 [US1] Add POST /api/events/:eventId/verify-pin endpoint in `backend/src/api/events.js` (validate input, call PINService, return sessionId)
- [x] T023 [US1] Extend GET /api/events/:eventId endpoint in `backend/src/api/events.js` to accept PIN session (check X-PIN-Session-Id header, validate session)
- [x] T024 [US1] Create PINEntryPage component in `frontend/src/pages/PINEntryPage.jsx` (full-page UI similar to AuthPage, InputOTP for 6-digit entry)
- [x] T025 [US1] Create PINContext provider in `frontend/src/contexts/PINContext.jsx` (session state management, localStorage persistence)
- [x] T026 [US1] Create usePINVerification hook in `frontend/src/hooks/usePINVerification.js` (PIN verification state, session management)
- [x] T027 [US1] Add verifyPIN method to apiClient in `frontend/src/services/apiClient.js` (POST to verify-pin endpoint)
- [x] T028 [US1] Extend apiClient request method in `frontend/src/services/apiClient.js` to include X-PIN-Session-Id header when session exists
- [x] T029 [US1] Extend EventPage component in `frontend/src/pages/EventPage.jsx` to check PIN verification before rendering (redirect to PIN entry if needed)
- [x] T030 [US1] Add route for PIN entry page in `frontend/src/App.jsx` (route: /event/:eventId/pin)
- [x] T031 [US1] Add error handling and validation messages in `frontend/src/pages/PINEntryPage.jsx` (invalid PIN, rate limit, format errors)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - regular users can access events via PIN

---

## Phase 4: User Story 2 - Event Administrator Accesses Event via PIN (Priority: P1)

**Goal**: Event administrators can access events via PIN, but admin pages require OTP authentication

**Independent Test**: Navigate to event URL as administrator, enter PIN, access event main page, attempt admin page access and verify OTP authentication is required

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T032 [P] [US2] Add integration test for admin PIN access then admin page redirect in `backend/tests/integration/events.test.js` (PIN access works, admin page requires OTP)
- [ ] T033 [P] [US2] Add E2E test for admin PIN access flow in `frontend/tests/e2e/pin-access.test.js` (admin enters PIN, accesses event, redirected to OTP for admin page)

### Implementation for User Story 2

- [x] T034 [US2] Extend EventAdminPage component in `frontend/src/pages/EventAdminPage.jsx` to check OTP authentication (redirect to OTP auth if no JWT token)
- [x] T035 [US2] Add OTP redirect logic in EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (preserve intended destination in navigation state)
- [x] T036 [US2] Ensure admin can navigate between event main page and admin page after OTP authentication in `frontend/src/pages/EventPage.jsx` and `frontend/src/pages/EventAdminPage.jsx` (no PIN re-entry required)
- [x] T037 [US2] Update requirePIN middleware in `backend/src/middleware/requirePIN.js` to work alongside requireAuth (allow either PIN or OTP for event access)
- [x] T038 [US2] Extend GET /api/events/:eventId endpoint in `backend/src/api/events.js` to accept either PIN session or JWT token (check both, prefer JWT if both present)
- [x] T038a [US2] Add test OTP "123456" support for admin page access in dev/test environments in `backend/src/api/events.js` (consistent with OTP auth feature, per FR-018)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - administrators can access via PIN but admin pages require OTP

---

## Phase 5: User Story 3 - PIN Generation and Regeneration (Priority: P2)

**Goal**: PINs are automatically generated on event creation, and administrators can regenerate PINs from admin screen

**Independent Test**: Create new event and verify PIN is generated, access admin screen and regenerate PIN, verify old PIN no longer works

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T039 [P] [US3] Add unit test for EventService PIN generation in `backend/tests/unit/EventService.test.js` (PIN generated on event creation, format validation)
- [x] T040 [P] [US3] Add unit test for EventService.regeneratePIN in `backend/tests/unit/EventService.test.js` (regeneration, authorization check, session invalidation)
- [x] T040a [P] [US3] Add performance test for PIN regeneration in `backend/tests/unit/EventService.test.js` (verify regeneration completes within 2s per SC-005)
- [ ] T040b [P] [US3] Add performance test for admin screen PIN display in `frontend/tests/integration/pin-access.test.js` (verify PIN display within 3s per SC-008)
- [x] T041 [P] [US3] Add integration test for POST /api/events/:eventId/regenerate-pin in `backend/tests/integration/events.test.js` (success, unauthorized, event not found)
- [ ] T042 [P] [US3] Add E2E test for PIN regeneration flow in `frontend/tests/e2e/pin-access.test.js` (admin regenerates PIN, old PIN invalid, new PIN displayed)

### Implementation for User Story 3

- [x] T043 [US3] Implement EventService.regeneratePIN method in `backend/src/services/EventService.js` (verify administrator, generate new PIN, update event, invalidate sessions)
- [x] T044 [US3] Implement PINService.invalidatePINSessions method in `backend/src/services/PINService.js` (delete all sessions for event from cache)
- [x] T045 [US3] Add POST /api/events/:eventId/regenerate-pin endpoint in `backend/src/api/events.js` (require OTP auth, call EventService.regeneratePIN, return new PIN)
- [x] T046 [US3] Add regeneratePIN method to apiClient in `frontend/src/services/apiClient.js` (POST to regenerate-pin endpoint with JWT token)
- [x] T047 [US3] Add PIN regeneration UI to EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (button, confirmation, display new PIN)
- [x] T048 [US3] Add PIN display section to EventAdminPage in `frontend/src/pages/EventAdminPage.jsx` (show current PIN for sharing)
- [x] T049 [US3] Add error handling for PIN regeneration in `frontend/src/pages/EventAdminPage.jsx` (unauthorized, network errors)
- [x] T050 [US3] Ensure PIN regeneration invalidates existing sessions in `backend/src/services/EventService.js` (call PINService.invalidatePINSessions)

**Checkpoint**: At this point, all user stories should be independently functional - PINs are generated on creation and can be regenerated by administrators

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T051 [P] Add comprehensive error messages for all PIN-related errors in `backend/src/services/PINService.js` and `backend/src/api/events.js`
- [x] T052 [P] Add logging for PIN operations in `backend/src/services/PINService.js` (PIN verification attempts, regenerations, session creation)
- [x] T053 [P] Add loading states and error handling improvements in `frontend/src/pages/PINEntryPage.jsx` (better UX feedback)
- [x] T054 [P] Add PIN session expiration handling in `frontend/src/contexts/PINContext.jsx` (detect invalid sessions, prompt re-entry)
- [x] T055 [P] Verify test OTP "123456" support is working correctly for admin page access in dev/test environments (already implemented in T038a, verify integration)
- [x] T056 [P] Update documentation in `specs/006-event-pin-access/quickstart.md` validation (verify all examples work)
- [x] T057 [P] Code cleanup and refactoring (remove dead code, optimize imports)
- [x] T058 [P] Performance optimization (cache PIN lookups, optimize session checks)
- [x] T059 [P] Security review (rate limiting effectiveness, session security, PIN storage)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - Depends on US1 components (shares PIN verification infrastructure)
  - User Story 3 (P2): Can start after Foundational - Depends on US2 (needs admin page access)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Shares PIN verification infrastructure with US1, adds OTP requirement for admin pages
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Requires admin page access (from US2), adds PIN regeneration functionality

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Services before endpoints
- Backend before frontend (for API-dependent features)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Story 1 can start
- User Story 2 can start in parallel with User Story 1 (shares infrastructure but different features)
- User Story 3 should start after User Story 2 (needs admin page)
- All tests for a user story marked [P] can run in parallel
- Backend and frontend tasks within a story can run in parallel (after API contracts are defined)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T011: "Add unit test for PINService.verifyPIN in backend/tests/unit/PINService.test.js"
Task T012: "Add unit test for PINService.createPINSession in backend/tests/unit/PINService.test.js"
Task T013: "Add integration test for POST /api/events/:eventId/verify-pin in backend/tests/integration/events.test.js"
Task T014: "Add integration test for GET /api/events/:eventId with PIN session in backend/tests/integration/events.test.js"
Task T015: "Add unit test for PINEntryPage component in frontend/src/pages/__tests__/PINEntryPage.test.jsx"
Task T016: "Add unit test for PINContext in frontend/src/contexts/__tests__/PINContext.test.jsx"
Task T017: "Add E2E test for regular user PIN access flow in frontend/tests/e2e/pin-access.test.js"

# Launch backend implementation tasks (after tests):
Task T018: "Implement PINService.verifyPIN method in backend/src/services/PINService.js"
Task T019: "Implement PINService.createPINSession method in backend/src/services/PINService.js"
Task T020: "Implement PINService.checkPINSession method in backend/src/services/PINService.js"
Task T021: "Integrate RateLimitService in PINService.verifyPIN in backend/src/services/PINService.js"
Task T022: "Add POST /api/events/:eventId/verify-pin endpoint in backend/src/api/events.js"
Task T023: "Extend GET /api/events/:eventId endpoint in backend/src/api/events.js to accept PIN session"

# Launch frontend implementation tasks (after backend API):
Task T024: "Create PINEntryPage component in frontend/src/pages/PINEntryPage.jsx"
Task T025: "Create PINContext provider in frontend/src/contexts/PINContext.jsx"
Task T026: "Create usePINVerification hook in frontend/src/hooks/usePINVerification.js"
Task T027: "Add verifyPIN method to apiClient in frontend/src/services/apiClient.js"
Task T028: "Extend apiClient request method in frontend/src/services/apiClient.js to include X-PIN-Session-Id header"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Regular User PIN Access)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Admin PIN access with OTP requirement)
4. Add User Story 3 → Test independently → Deploy/Demo (PIN regeneration)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Regular user PIN access)
   - Developer B: User Story 2 (Admin PIN access) - can start after US1 tests pass
   - Developer C: User Story 3 (PIN regeneration) - can start after US2 admin page is ready
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- PIN sessions stored in CacheService (in-memory) - no expiration until PIN regenerated
- Rate limiting: 5 attempts per IP per 15 minutes AND 5 attempts per event per 15 minutes
- Test OTP "123456" works in dev/test environments for admin page access (consistent with OTP auth)
