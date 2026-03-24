# Tasks: Fix Stale Session Recovery for PIN Guests

**Input**: Design documents from `/specs/043-fix-pin-session-recovery/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. US5 (Race-Free State) is implemented as the Foundational phase since all other stories depend on the `isAuthenticated()` refactor.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational — Race-Free Session State (US5 implementation)

**Purpose**: Make `isAuthenticated()` side-effect-free and centralize session cleanup. This eliminates the race condition where multiple callers destroy session data that the recovery path needs. BLOCKS all user story work.

- [x] T001 Remove the `setUserSession(null)` side effect from `isAuthenticated()` in `frontend/src/services/apiClient.js` — make it return a pure boolean: `false` when session is missing or expired, `true` when valid. Do NOT call `setUserSession(null)` inside this method. All 14+ existing call sites depend only on the boolean return and continue working unchanged.

- [x] T002 Add a new `clearExpiredSession()` method to `frontend/src/services/apiClient.js` that: (a) checks if the session is expired (`exp * 1000 < Date.now()`), (b) captures a snapshot of `{ authMethod, email, userId, name }` from `this.userSession` before clearing, (c) calls `this.setUserSession(null)` to clear, (d) returns the snapshot object (or `null` if not expired). This is the ONLY place that clears an expired session.

- [x] T003 Update `_initVisibilityListener()` in `frontend/src/services/apiClient.js` to use `clearExpiredSession()` instead of the current pattern of capturing fields then calling `isAuthenticated()`. The listener should: call `_loadSession()`, call `clearExpiredSession()`, if snapshot returned → attempt `refreshToken()`, if refresh fails → dispatch `session-expired` with the snapshot's `authMethod`/`email`/`eventId`. If `clearExpiredSession()` returns null (not expired), check `isAuthenticated()` and return if still valid.

- [x] T004 Update the 401 error handler in `request()` method of `frontend/src/services/apiClient.js` (~line 386-396) to use `clearExpiredSession()` to capture the session snapshot before clearing. First, capture a pre-read of the current session: `const preRead = { authMethod: this.userSession?.authMethod || null, email: this.userSession?.email || null }`. Then call `const snapshot = this.clearExpiredSession()`. Use `snapshot || preRead` for the session-expired event detail (the pre-read handles the case where another code path already cleared the session before this handler ran, so `clearExpiredSession()` returns null and `this.userSession` is also null).

- [x] T005 [P] Write unit tests in `frontend/tests/unit/apiClient.sessionExpiry.test.js` for the refactored methods: (a) `isAuthenticated()` returns false for expired session but does NOT call `setUserSession(null)`, (b) `clearExpiredSession()` returns snapshot with correct authMethod/email/userId and clears the session, (c) `clearExpiredSession()` returns null when session is still valid, (d) calling `isAuthenticated()` after another caller already checked does NOT destroy data needed by the recovery path.

**Checkpoint**: Existing session-expiry E2E tests still pass. `isAuthenticated()` is pure. The session-expired event always has correct authMethod and email (never null for authenticated sessions). US5 acceptance scenarios 1-3 are met.

---

## Phase 2: User Story 1 — Silent Session Recovery for PIN Guests (Priority: P1) 🎯 MVP

**Goal**: PIN guests whose session token expired but whose refresh credential is still valid get their session silently renewed — no prompt, no interruption.

**Independent Test**: Authenticate as PIN guest, expire the JWT (but not the refresh token), return to tab. Event page continues working without any dialog.

### Backend: Auth-method-aware refresh token storage

- [x] T006 [P] [US1] Modify `storeRefreshToken(tokenHash, email, expiresAt)` in `backend/src/data/DynamoDBRepository.js` to accept an optional fourth parameter `metadata = {}`. Store `metadata.authMethod`, `metadata.userId`, and `metadata.events` as additional fields on the DynamoDB item alongside existing `email`, `createdAt`, `expiresAt`, `TTL`. Only write fields that are present in metadata (backward compatible — old callers pass no metadata).

- [x] T007 [P] [US1] Modify `getRefreshToken(tokenHash)` in `backend/src/data/DynamoDBRepository.js` to return `authMethod`, `userId`, and `events` fields from the item (in addition to existing `email`, `createdAt`, `expiresAt`). If these fields are absent (legacy records), return them as `undefined` — callers handle the fallback.

- [x] T008 [US1] Update `generateRefreshToken(email)` in `backend/src/middleware/jwtAuth.js` to accept a second parameter `metadata = {}` and pass it through to `dataRepository.storeRefreshToken(hashToken(refreshToken), email, expiresAt, metadata)`. Update the JSDoc to document the new parameter shape: `{ authMethod?: string, userId?: string, events?: string[] }`.

- [x] T009 [US1] Update `validateRefreshToken(refreshToken)` in `backend/src/middleware/jwtAuth.js` to return the full token record from `getRefreshToken()` — including `authMethod`, `userId`, and `events` alongside the existing `email`. Change the success return from `{ valid: true, email: tokenData.email }` to `{ valid: true, email: tokenData.email, authMethod: tokenData.authMethod, userId: tokenData.userId, events: tokenData.events }`.

### Backend: Refresh endpoint branches on authMethod

- [x] T010 [US1] Modify the `POST /auth/refresh` handler in `backend/src/api/auth.js` (~lines 287-346) to branch on the `authMethod` returned by `validateRefreshToken()`: (a) If `authMethod === 'pin'` and `userId` is present: generate JWT with `generateToken({ userId, events: validation.events || [], authMethod: 'pin' })` and return `{ user: { userId, exp, authMethod: 'pin' } }`. (b) If `authMethod` is absent or `'otp'`: keep existing behavior (re-query admin events, generate OTP JWT). (c) For BOTH branches: invalidate the old refresh token via `await invalidateRefreshToken(refreshToken)` (matching the existing OTP pattern at line 328), then generate a new one with metadata: `generateRefreshToken(email, { authMethod: validation.authMethod, userId: validation.userId, events: validation.events })`.

### Backend: Pass metadata when creating refresh tokens

- [x] T011 [US1] Update the verify-pin handler in `backend/src/api/events.js` (~line 220) to pass metadata to `generateRefreshToken`. Preserve the full events list: read the existing JWT's events array from the token (via `addEventToToken` or `req.user.events` if the token was valid, or default to `[eventId]` if no existing token). Pass to `generateRefreshToken(normalizedEmail, { authMethod: 'pin', userId, events })`. This ensures multi-event access is preserved across refresh token rotation, not just the single event from the current PIN entry.

- [x] T012 [P] [US1] Update the OTP verify handler in `backend/src/api/auth.js` (OTP verify endpoint) to pass metadata to `generateRefreshToken`: change `generateRefreshToken(normalizedEmail)` to `generateRefreshToken(normalizedEmail, { authMethod: 'otp', events: adminEvents })`. This keeps OTP tokens consistent with the new schema.

### Frontend: Enable silent refresh for PIN users

- [x] T013 [US1] Remove the `if (authMethod === 'otp')` guard in the 401 error handler in `frontend/src/services/apiClient.js` (~line 379). Change to attempt `refreshToken()` for ALL auth methods. The code should be: `const refreshed = await this.refreshToken(); if (refreshed) return this.request(endpoint, options, true);` — no authMethod check.

- [x] T014 [US1] Update `refreshToken()` method in `frontend/src/services/apiClient.js` to handle the PIN-style response from the refresh endpoint. When `data.user` contains `userId` (instead of `email`), call `setUserSession(data.user)` which already handles both shapes. Verify the method works for both `{ email, exp, authMethod: 'otp' }` and `{ userId, exp, authMethod: 'pin' }` responses.

### Tests for US1

- [x] T015 [P] [US1] Write backend unit tests in `backend/tests/unit/middleware/jwtAuth.test.js` for: (a) `generateRefreshToken(email, { authMethod: 'pin', userId: 'u_abc', events: ['ABCD1234'] })` stores metadata, (b) `validateRefreshToken()` returns authMethod/userId/events from stored record, (c) legacy tokens without metadata return `authMethod: undefined` (backward compat).

- [x] T016 [P] [US1] Write backend integration tests in `backend/tests/integration/auth.test.js` for `POST /auth/refresh`: (a) PIN user refresh returns JWT with `authMethod: 'pin'` and correct userId/events, (b) OTP user refresh returns JWT with `authMethod: 'otp'` and re-queried admin events, (c) legacy refresh token (no authMethod) falls back to OTP behavior, (d) expired refresh token returns 401.

- [x] T017 [P] [US1] Write frontend unit test in `frontend/tests/unit/apiClient.sessionExpiry.test.js` for: 401 handler attempts refresh for PIN users (not just OTP), and on success retries the original request.

- [x] T018 [US1] Write E2E test in `frontend/tests/e2e/specs/session-expiry.spec.js` for PIN silent renewal: set up PIN guest session, expire the JWT in localStorage (set `exp` to past), mock `/api/auth/refresh` to return 200 with PIN-style response, trigger `visibilitychange`, verify no session-expired dialog appears and event page continues working.

**Checkpoint**: PIN guest returns within 7 days → session renews silently. No dialog. Event page works. SC-001 is met. US1 acceptance scenarios 1-4 pass.

---

## Phase 3: User Story 2 — Prompted Re-Authentication (Priority: P2)

**Goal**: When silent renewal is not possible (refresh credential expired), the re-authentication dialog correctly identifies the guest and PIN re-entry works on the first attempt.

**Independent Test**: Authenticate as PIN guest, invalidate both JWT and refresh credentials, return to tab. Dialog appears, enter correct PIN, access is restored without page reload.

- [x] T019 [P] [US2] In `frontend/src/pages/PINEntryPage.jsx`, after successful PIN verification (~line 100, after `apiClient.setUserSession(response.user)`), persist the guest's email: `localStorage.setItem(\`pin:email:${eventId}\`, email)`. The `email` variable is already in scope from the form state.

- [x] T020 [P] [US2] In `frontend/src/components/SessionExpiredDialog.jsx`, update `handlePINSubmit` (~line 48) to read the recovery email from localStorage when the event's email is null: `const recoveryEmail = email || localStorage.getItem(\`pin:email:${eventId}\`);`. Pass `recoveryEmail` to `apiClient.verifyPIN(eventId, pin, recoveryEmail, name)` instead of `email`.

- [x] T021 [US2] In `frontend/src/components/SessionExpiredDialog.jsx`, after successful re-auth in `handlePINSubmit` (~line 54-56), also update the stored recovery email: `if (recoveryEmail && eventId) { localStorage.setItem(\`pin:email:${eventId}\`, recoveryEmail); }`.

- [x] T022 [US2] In `frontend/src/services/apiClient.js`, update `clearAllAuthState()` (~lines 122-129) to also clear `pin:email:*` keys. Add to the loop that already clears `pin:session:*`: check for keys starting with `pin:email:` and add them to `keysToRemove`.

- [x] T023 [P] [US2] Write unit test in `frontend/tests/unit/SessionExpiredDialog.test.jsx` for: (a) dialog reads `pin:email:{eventId}` from localStorage when session email is null, (b) `verifyPIN` is called with the recovered email, (c) after successful re-auth, the stored email is updated.

- [x] T024 [US2] Write E2E test in `frontend/tests/e2e/specs/session-expiry.spec.js` for prompted re-auth: set up PIN guest, set `pin:email:{eventId}` in localStorage, expire both JWT and refresh token, trigger session-expired event with null email, enter correct PIN in dialog, verify dialog dismisses and session is restored.

**Checkpoint**: PIN guest returns after 7+ days → dialog appears (FR-005 satisfied via T003/T004 ensuring session-expired fires with correct data + existing SessionExpiredDialog) → correct PIN restores access on first attempt without page reload (FR-007). SC-002 is met. US2 acceptance scenarios 1-5 pass.

---

## Phase 4: User Story 3 — Accurate Error Messages (Priority: P3)

**Goal**: Error messages in the re-authentication dialog match the actual error condition — no more "Invalid PIN" for non-PIN-related errors.

**Independent Test**: Trigger each error condition in the dialog (wrong PIN, rate limit, missing session data, network error) and verify the displayed message is accurate.

- [x] T025 [US3] In `frontend/src/components/SessionExpiredDialog.jsx`, refactor the catch block in `handlePINSubmit` (~lines 58-65) to detect specific error conditions and show accurate messages: (a) keep existing "Too many attempts" check for rate limiting, (b) add check for email/session-related errors: `if (err.message?.includes('Email') || err.message?.includes('required') || err.message?.includes('session'))` → show `'Session data expired. Please reload the page to sign in again.'`, (c) keep existing network error check, (d) only use `'Invalid PIN. Please try again.'` as the final fallback for genuinely unrecognized errors (which should now only be actual wrong PINs).

- [x] T026 [P] [US3] Write unit tests in `frontend/tests/unit/SessionExpiredDialog.test.jsx` for each error variant: (a) wrong PIN → "Invalid PIN. Please try again.", (b) rate limited → shows the rate limit message from backend, (c) email/session error → "Session data expired. Please reload the page to sign in again.", (d) network error → "Unable to connect. Please check your connection."

**Checkpoint**: Each error condition shows the correct message. SC-003 is met. US3 acceptance scenarios 1-4 pass.

---

## Phase 5: User Story 4 — Clean Session Lifecycle (Priority: P4)

**Goal**: Old refresh tokens are invalidated when a guest re-authenticates, preventing orphaned credentials.

**Independent Test**: Authenticate as PIN guest, let session expire, re-authenticate via PIN. Verify the old refresh token is rejected if presented again.

- [x] T027 [US4] In `backend/src/api/events.js`, in the verify-pin handler, BEFORE generating the new refresh token (~line 220), add invalidation of any existing refresh token: `const existingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME]; if (existingRefreshToken) { await invalidateRefreshToken(existingRefreshToken).catch(err => { loggerService.warn(\`Could not invalidate old refresh token: ${err.message}\`); }); }`. Import `invalidateRefreshToken` and `REFRESH_COOKIE_NAME` if not already imported.

- [x] T028 [P] [US4] Write backend integration test in `backend/tests/integration/auth.test.js` (or a new test section) for: (a) after PIN re-auth, the old refresh token is invalidated (calling `/auth/refresh` with old token returns 401), (b) the new refresh token works correctly.

**Checkpoint**: After re-auth, only one valid refresh token exists per guest. SC-004 is met. US4 acceptance scenarios 1-2 pass.

---

## Phase 6: US5 Verification — Race-Free State Tests

**Purpose**: US5 implementation was completed in Phase 1 (Foundational). This phase adds the specific verification tests for the race condition scenarios.

- [x] T029 [US5] Write E2E test in `frontend/tests/e2e/specs/session-expiry.spec.js` for the race condition scenario: set up PIN guest, expire JWT, trigger `visibilitychange` event, simultaneously verify that (a) only one session-expired dialog appears (no duplicates), (b) the dialog has correct authMethod and email (from the captured snapshot, never null for an authenticated session).

- [x] T029b [P] [US5] Write E2E test in `frontend/tests/e2e/specs/session-expiry.spec.js` for multi-tab session sync: in one page context, set up a PIN guest session and perform silent refresh (update localStorage with renewed session). Open a second page context for the same event and verify it picks up the renewed session from localStorage without showing a session-expired dialog.

**Checkpoint**: SC-005 is met. US5 acceptance scenarios 1-3 pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T030 Run all existing session-expiry E2E tests in `frontend/tests/e2e/specs/session-expiry.spec.js` to verify no regressions. Fix any failures caused by the `isAuthenticated()` refactor or refresh endpoint changes. SC-006.

- [x] T031 [P] Update `SYSTEM_DOCUMENTATION.md` with: (a) refresh token schema changes (new `authMethod`, `userId`, `events` fields), (b) new `pin:email:{eventId}` localStorage key, (c) updated session recovery flow description (silent refresh for PIN users).

- [x] T032 Run full test suite: `npm test && npm run lint`. Fix any failures.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately. BLOCKS all user story phases.
- **Phase 2 (US1)**: Depends on Phase 1 completion. Backend tasks (T006-T012) can start in parallel with each other. Frontend tasks (T013-T014) depend on backend tasks being complete.
- **Phase 3 (US2)**: Depends on Phase 1. Can run in parallel with Phase 2 (different files). However, E2E test T024 benefits from US1 being complete.
- **Phase 4 (US3)**: Depends on Phase 1. Can run in parallel with Phases 2-3 (only touches SessionExpiredDialog catch block).
- **Phase 5 (US4)**: Depends on Phase 2 (T008 for metadata parameter). Only touches `events.js`.
- **Phase 6 (US5 verification)**: Depends on Phase 1.
- **Phase 7 (Polish)**: Depends on all previous phases.

### User Story Dependencies

- **US5 (P5)**: Foundational — implemented first despite being lowest spec priority. No dependencies on other stories.
- **US1 (P1)**: Depends on US5 (foundational). Backend and frontend changes are mostly independent of US2-US4.
- **US2 (P2)**: Depends on US5 (foundational). Independent of US1 (email persistence is a separate mechanism from silent refresh).
- **US3 (P3)**: Depends on US5 (foundational). Independent of US1/US2 (only changes the catch block in SessionExpiredDialog).
- **US4 (P4)**: Depends on US1 backend (T008 for metadata parameter). Independent of US2/US3.

### Parallel Opportunities

Within Phase 1:
- T005 (tests) can run in parallel with T001-T004 (write tests while implementing)

Within Phase 2 (US1):
- T006 + T007 (DynamoDB methods) can run in parallel
- T012 (OTP metadata) can run in parallel with T011 (PIN metadata)
- T015 + T016 + T017 (all test tasks) can run in parallel

Across Phases 2-4:
- US2 (Phase 3) and US3 (Phase 4) can run in parallel with US1 backend tasks (different files)
- US4 (Phase 5) can start once US1 backend T008 is complete

---

## Parallel Example: Phase 2 (US1)

```text
# Backend storage (parallel — different methods in same file):
T006: storeRefreshToken metadata in backend/src/data/DynamoDBRepository.js
T007: getRefreshToken metadata in backend/src/data/DynamoDBRepository.js

# After T006+T007 complete — backend middleware (sequential):
T008: generateRefreshToken metadata in backend/src/middleware/jwtAuth.js
T009: validateRefreshToken metadata in backend/src/middleware/jwtAuth.js

# After T008+T009 — endpoint + caller updates (parallel — different files):
T010: /auth/refresh branching in backend/src/api/auth.js
T011: verify-pin metadata in backend/src/api/events.js
T012: OTP verify metadata in backend/src/api/auth.js

# Tests (parallel — all test files):
T015: jwtAuth unit tests
T016: auth integration tests
T017: apiClient unit tests
```

---

## Implementation Strategy

### MVP First (Phase 1 + US1)

1. Complete Phase 1: Foundational (isAuthenticated refactor)
2. Complete Phase 2: US1 (silent refresh for PIN guests)
3. **STOP and VALIDATE**: PIN guest returning overnight → session renews silently
4. This alone fixes the primary user complaint for the most common scenario (< 7 days idle)

### Incremental Delivery

1. Phase 1 (Foundational) → Race condition eliminated
2. + US1 → Silent refresh works (MVP — covers ~90% of cases)
3. + US2 → Prompted re-auth works (covers remaining ~10% — idle > 7 days)
4. + US3 → Error messages are accurate (UX polish)
5. + US4 → Refresh tokens properly cleaned up (hygiene)
6. + US5 verification + Polish → Full test coverage, documentation updated

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US5 is implemented in Phase 1 (Foundational) despite being P5 in spec because it's a prerequisite for all other stories
- Commit after each phase completion
- Stop at any checkpoint to validate the story independently
- All existing session-expiry tests must pass after every phase
