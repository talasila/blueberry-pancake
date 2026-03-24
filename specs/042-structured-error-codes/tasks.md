# Tasks: Structured Error Codes for Authentication Error Disambiguation

**Input**: Design documents from `/specs/042-structured-error-codes/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/error-responses.md

**Tests**: Included — constitution principle IV (Testing Standards) is NON-NEGOTIABLE and spec SC-006 requires all existing tests to pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No setup tasks needed — existing project structure, no new dependencies or configuration.

*(Phase skipped — all infrastructure exists)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core changes that MUST be complete before ANY user story can be implemented: update apiErrorHandler.js to support error codes, update JWT middleware to emit session error codes, and update the frontend interceptor to route based on error codes.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add optional `code` parameter to all error helper functions in `backend/src/utils/apiErrorHandler.js`. Update `badRequestError`, `unauthorizedError`, `forbiddenError`, `notFoundError`, `rateLimitError`, and `formatRateLimitResponse` to accept a third `code` parameter. Include `code` in the JSON response only when provided (omit when undefined). Per research.md R3.
- [x] T002 Add unit tests for the `code` parameter in `backend/tests/unit/utils/apiErrorHandler.test.js`. Test each helper function: (a) returns `{ error, code }` when code is provided, (b) returns `{ error }` only (no code key) when code is omitted, (c) `formatRateLimitResponse` includes code alongside retryAfter when provided.
- [x] T003 [P] Add error codes to JWT authentication middleware in `backend/src/middleware/jwtAuth.js`. Use the updated `unauthorizedError` helper to return: `AUTHENTICATION_REQUIRED` for missing token (line ~61), `TOKEN_EXPIRED` for expired token (line ~87), `TOKEN_INVALID` for invalid token (line ~90). Per contracts/error-responses.md JWT Middleware section.
- [x] T004 [P] Update the frontend 401 interceptor in `frontend/src/services/apiClient.js`. In the `request()` method: (a) on 401 response, parse the response body to extract `code` BEFORE dispatching session-expired, (b) define `CREDENTIAL_ERROR_CODES` set: `INVALID_PIN`, `INVALID_OTP`, `OTP_EXPIRED`, `INVALID_EMAIL`, `SUSPENDED`, `ADMIN_MUST_USE_OTP`, `RATE_LIMITED`, (c) if code is in CREDENTIAL_ERROR_CODES, skip session-expired dispatch and throw the error for the caller to handle, (d) if code is a session error or absent, proceed with existing session-expired flow, (e) as safety net, also skip session-expired for requests to URLs containing `/verify-pin`, `/otp/verify`, or `/otp/request`. Per research.md R4 and contracts/error-responses.md Frontend Interceptor Contract.
- [x] T005 Update frontend 401 interceptor tests in `frontend/tests/unit/apiClient.sessionExpiry.test.js`. Add tests: (a) 401 with `code: "INVALID_PIN"` does NOT dispatch `session-expired` event, (b) 401 with `code: "TOKEN_EXPIRED"` DOES dispatch `session-expired` event, (c) 401 with no `code` field dispatches `session-expired` (backward compatibility), (d) 401 from `/verify-pin` URL does NOT dispatch `session-expired` regardless of code, (e) 401 with `code: "SUSPENDED"` does NOT dispatch `session-expired`.

**Checkpoint**: Foundation ready — apiErrorHandler supports codes, JWT middleware emits session codes, frontend interceptor routes credential vs session errors correctly.

---

## Phase 3: User Story 1 - Guest Sees Correct Error on Wrong PIN (Priority: P1) MVP

**Goal**: When a guest enters a wrong PIN, they see an inline "Invalid PIN" error, not the "Welcome back! Your session has expired" dialog.

**Independent Test**: Enter a wrong PIN on the PIN entry page → inline error appears, session dialog does NOT appear.

### Implementation for User Story 1

- [x] T006 [US1] Add error codes to PIN verification endpoint in `backend/src/api/events.js`. In the `verify-pin` handler, use updated apiErrorHandler helpers to include codes: `INVALID_EMAIL` for missing/invalid email (lines ~105-115), `INVALID_PIN` for PIN format errors and wrong PIN (lines ~133, ~163), `ADMIN_MUST_USE_OTP` for admin PIN attempt (line ~142), `RATE_LIMITED` for rate limit exceeded (line ~154), `EVENT_NOT_FOUND` for event not found (line ~157). Per contracts/error-responses.md PIN Verification section.
- [x] T007 [US1] Add integration test for PIN error codes in `backend/tests/integration/auth.test.js` (or create a new section in an existing integration test file). Assert: (a) wrong PIN returns 401 with `code: "INVALID_PIN"`, (b) admin PIN attempt returns 401 with `code: "ADMIN_MUST_USE_OTP"`, (c) missing email returns 400 with `code: "INVALID_EMAIL"`.
- [x] T008 [US1] Update E2E test for wrong PIN in `frontend/tests/e2e/specs/pin-access.spec.js`. Verify that when a guest enters a wrong PIN: (a) inline error message is visible on the PIN entry page (not the session-expired dialog), (b) the SessionExpiredDialog (`[data-testid="session-expired-dialog"]` or equivalent) is NOT present in the DOM.

**Checkpoint**: User Story 1 complete — wrong PIN shows inline error. This is the MVP.

---

## Phase 4: User Story 2 - User Sees Correct Error on Wrong OTP (Priority: P1)

**Goal**: When a user enters a wrong OTP, they see an inline error on the OTP page, not the session expiry dialog.

**Independent Test**: Enter a wrong OTP on the auth page → inline error appears, session dialog does NOT appear.

### Implementation for User Story 2

- [x] T009 [P] [US2] Add error codes to OTP request endpoint in `backend/src/api/auth.js`. In the `otp/request` handler, use updated apiErrorHandler helpers: `INVALID_EMAIL` for missing/invalid email (lines ~40, ~49), `SUSPENDED` for suspended account (line ~68). Per contracts/error-responses.md OTP Request section.
- [x] T010 [US2] Add error codes to OTP verify endpoint in `backend/src/api/auth.js`. In the `otp/verify` handler: `INVALID_EMAIL` for missing/invalid email (lines ~130, ~152), `INVALID_OTP` for missing/wrong OTP (lines ~139, ~145, ~191), `SUSPENDED` for suspended account and suspension-triggered (lines ~169, ~185). Also add `TOKEN_INVALID` for invalid refresh token in the `refresh` handler (line ~317). Per contracts/error-responses.md OTP Verification and Token Refresh sections.
- [x] T011 [US2] Add integration tests for OTP error codes in `backend/tests/integration/auth.test.js`. Assert: (a) wrong OTP returns 400 with `code: "INVALID_OTP"`, (b) suspended account returns 403 with `code: "SUSPENDED"`, (c) missing email returns 400 with `code: "INVALID_EMAIL"`, (d) invalid refresh token returns 401 with `code: "TOKEN_INVALID"`.
- [x] T012 [US2] Update E2E test for wrong OTP in `frontend/tests/e2e/specs/otp-auth.spec.js`. Verify that when a user enters a wrong OTP: (a) inline error message is visible on the auth page, (b) the SessionExpiredDialog is NOT present in the DOM.

**Checkpoint**: User Story 2 complete — wrong OTP shows inline error.

---

## Phase 5: User Story 3 - Session Expiry Behavior Preserved (Priority: P1)

**Goal**: Verify that genuine session expiry still triggers the "Welcome back!" dialog correctly (regression prevention).

**Independent Test**: Authenticate, expire the session, attempt an action → session dialog appears as before.

### Implementation for User Story 3

- [x] T013 [US3] Verify session expiry E2E tests still pass in `frontend/tests/e2e/specs/session-expiry.spec.js`. Run the existing session expiry E2E tests. If any fail due to the interceptor changes, fix the tests or the interceptor logic. These tests should verify: (a) expired session triggers re-auth dialog for PIN users, (b) expired session triggers re-auth dialog for OTP users (after failed refresh), (c) PIN re-entry within the dialog works correctly.
- [x] T014 [US3] Add an explicit regression test for session-expired with `TOKEN_EXPIRED` code in `frontend/tests/unit/apiClient.sessionExpiry.test.js`. Verify that when an authenticated API call (e.g., GET `/api/events/ABCD1234`) returns 401 with `code: "TOKEN_EXPIRED"`, the session-expired event IS dispatched with the correct detail (authMethod, email, eventId).

**Checkpoint**: User Story 3 complete — session expiry confirmed working, no regressions.

---

## Phase 6: User Story 4 - Rate-Limited User Sees Correct Feedback (Priority: P2)

**Goal**: Rate-limited users see "Too many attempts" instead of the session expiry dialog.

**Independent Test**: Exceed PIN attempt limit → rate limit message appears, not session dialog.

### Implementation for User Story 4

- [x] T015 [US4] Verify that `RATE_LIMITED` code is returned by PIN rate limit in `backend/src/api/events.js` (already added in T006). Ensure the `formatRateLimitResponse` call at line ~154 passes `'RATE_LIMITED'` as the code parameter. If T006 already handled this, mark as verified.
- [x] T016 [US4] Add `RATE_LIMITED` code to OTP rate limiting in `backend/src/api/auth.js`. If any rate limit responses in the OTP endpoints use `formatRateLimitResponse` or `rateLimitError`, ensure they pass `'RATE_LIMITED'` as the code parameter.
- [x] T017 [US4] Add integration test for rate limit error code. In `backend/tests/integration/auth.test.js`, verify that when PIN or OTP rate limit is hit, the response includes `code: "RATE_LIMITED"`.

**Checkpoint**: User Story 4 complete — rate limit errors correctly identified, no false session-expiry dialogs.

---

## Phase 7: User Story 5 - All Auth Error Responses Include Machine-Readable Codes (Priority: P2)

**Goal**: Complete coverage — every auth/authz error response includes a machine-readable code. Consolidate existing manual code fields.

**Independent Test**: Trigger each auth/authz error condition and verify the response includes a `code` field.

### Implementation for User Story 5

- [x] T018 [P] [US5] Consolidate `EVENT_ACCESS_DENIED` in `backend/src/middleware/requireAuth.js`. Replace the manual `res.status(403).json({ error: ..., code: "EVENT_ACCESS_DENIED" })` with `forbiddenError(res, message, 'EVENT_ACCESS_DENIED')` from apiErrorHandler. Per research.md R5.
- [x] T019 [P] [US5] Consolidate `EVENT_MEMBERSHIP_REQUIRED` in `backend/src/middleware/requireEventMembership.js`. Replace the manual `res.status(403).json({ error: ..., code: "EVENT_MEMBERSHIP_REQUIRED" })` with `forbiddenError(res, message, 'EVENT_MEMBERSHIP_REQUIRED')` from apiErrorHandler. Per research.md R5.
- [x] T020 [P] [US5] Add error codes to `backend/src/middleware/requireRoot.js`. Use `unauthorizedError(res, "Authentication required", 'AUTHENTICATION_REQUIRED')` for missing token (line ~15) and `forbiddenError(res, "Root access required", 'ROOT_ACCESS_REQUIRED')` for non-root admin (line ~21). Per contracts/error-responses.md requireRoot section.
- [x] T021 [US5] Run full backend test suite (`npm run test:backend`) and fix any test assertions that break due to the new `code` field in error responses. Update integration tests in `backend/tests/integration/security.test.js` to assert error codes from middleware responses where applicable. Also update `backend/tests/unit/middleware/jwtAuth.test.js` to explicitly assert that: (a) missing token returns `code: "AUTHENTICATION_REQUIRED"`, (b) expired token returns `code: "TOKEN_EXPIRED"`, (c) invalid token returns `code: "TOKEN_INVALID"`.

**Checkpoint**: User Story 5 complete — all auth/authz errors have machine-readable codes.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, test suite health, documentation updates.

- [x] T022 Run full backend test suite: `cd backend && npm run test:run` — verify zero failures.
- [x] T023 Run full frontend test suite: `cd frontend && npm run test:run` — verify zero failures.
- [x] T024 Run E2E test suite: `cd frontend && npx playwright test` — verify zero failures, paying attention to `pin-access.spec.js`, `otp-auth.spec.js`, and `session-expiry.spec.js`.
- [x] T025 Run quickstart.md manual validation: start dev environment, enter wrong PIN, verify inline error and no session dialog. Authenticate, expire session, verify session dialog appears.
- [x] T026 Update `SYSTEM_DOCUMENTATION.md` section 5 (API Endpoints) and section 7 (Security Mechanisms) to document the new error code taxonomy and the error response shape change `{ error, code }`. Per CLAUDE.md instruction to update system docs after significant changes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — no setup needed
- **Foundational (Phase 2)**: No dependencies — can start immediately. BLOCKS all user stories.
- **User Stories (Phase 3-7)**: All depend on Foundational phase (T001-T005) completion
  - US1 and US2 can proceed in parallel after Phase 2
  - US3 depends on US1 (frontend interceptor must be working to test session expiry)
  - US4 can proceed in parallel with US1/US2
  - US5 can proceed in parallel with US1/US2
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only. No dependencies on other stories.
- **US2 (P1)**: Depends on Phase 2 only. No dependencies on other stories. Can run in parallel with US1.
- **US3 (P1)**: Depends on Phase 2 + US1 (the frontend interceptor changes need to be in place to verify session expiry still works).
- **US4 (P2)**: Depends on Phase 2 only. Can run in parallel with US1/US2.
- **US5 (P2)**: Depends on Phase 2 only. Can run in parallel with US1/US2.

### Within Each User Story

- Backend changes before frontend changes
- Implementation before tests (tests validate implementation)
- Core logic before edge cases

### Parallel Opportunities

- T003 and T004 can run in parallel (different files: backend middleware vs frontend service)
- T009 then T010 sequentially (same file: `auth.js`; T009 handles `otp/request`, T010 handles `otp/verify` + `refresh`)
- T018, T019, and T020 can all run in parallel (different middleware files)
- US1 and US2 can be worked on in parallel after Phase 2

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Sequential: T001 must complete first (apiErrorHandler is a dependency)
Task T001: "Update apiErrorHandler.js with code parameter"
Task T002: "Add unit tests for code parameter"

# Then launch these in parallel (different files):
Task T003: "Add codes to jwtAuth.js middleware"
Task T004: "Update frontend apiClient.js interceptor"

# Then:
Task T005: "Update frontend interceptor tests"
```

## Parallel Example: User Story 1 + 2 (after Phase 2)

```bash
# These can run in parallel (different backend files):
Task T006: "PIN error codes in events.js"  (US1)
Task T009: "OTP request codes in auth.js"   (US2)

# Then sequentially (same file as T009):
Task T010: "OTP verify codes in auth.js"    (US2)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T005)
2. Complete Phase 3: User Story 1 (T006-T008)
3. **STOP and VALIDATE**: Enter wrong PIN → see inline error, not session dialog
4. Deploy/demo if ready — the primary bug is fixed

### Incremental Delivery

1. Phase 2 (Foundational) → apiErrorHandler + interceptor ready
2. Phase 3 (US1: Wrong PIN) → **MVP — primary bug fixed**
3. Phase 4 (US2: Wrong OTP) → OTP consistency
4. Phase 5 (US3: Session expiry) → Regression confirmed
5. Phase 6 (US4: Rate limiting) → Rate limit consistency
6. Phase 7 (US5: Full coverage) → All middleware consolidated
7. Phase 8 (Polish) → Full test suite green, docs updated

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The MVP (Phase 2 + Phase 3) fixes the primary reported bug with minimal changes
