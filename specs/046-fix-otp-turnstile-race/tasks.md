# Tasks: Fix OTP Request Loop and Turnstile Race Condition

**Input**: Design documents from `/specs/046-fix-otp-turnstile-race/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Included — constitution Principle IV (Testing Standards) requires tests, and EventOTPEntryPage is currently untested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (logically independent, no dependencies). Note: test tasks marked [P] target the same test file but write independent test blocks — implement them sequentially within the file
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create test file scaffold with mocks following established project patterns

- [x] T001 Create test file scaffold with standard mocks (apiClient, useTurnstile, react-router, sessionStorage) in frontend/tests/unit/EventOTPEntryPage.test.jsx — follow existing patterns from frontend/tests/unit/EmailEntryPage.test.jsx

**Checkpoint**: Test file compiles and runs (0 tests passing, scaffold only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor EventOTPEntryPage internals to decouple auto-send from Turnstile token identity — enables all user stories

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Add `hasAutoRequested` ref (init false) and `turnstileTokenRef` ref (init null) to component in frontend/src/pages/EventOTPEntryPage.jsx
- [x] T003 Add a `useEffect` that syncs `turnstileToken` state into `turnstileTokenRef.current` on every change in frontend/src/pages/EventOTPEntryPage.jsx
- [x] T004 Destructure `isLoading` (aliased as `turnstileLoading`) and `error` (aliased as `turnstileError`) from `useTurnstile` hook in frontend/src/pages/EventOTPEntryPage.jsx
- [x] T005 Extract shared `sendOTPRequest(emailToUse, token)` async helper that calls `apiClient.requestOTP`, sets `requestingOTP`/`error`/`success`/`otpRequested` state, and does NOT call `resetWidget` — in frontend/src/pages/EventOTPEntryPage.jsx

**Checkpoint**: Component renders identically to before (no behavioral changes yet). Existing functionality preserved.

---

## Phase 3: User Story 1 — Admin Returns After Inactivity and Logs In Successfully (Priority: P1) MVP

**Goal**: Auto-send OTP waits for Turnstile readiness and fires exactly once per mount. Eliminates the "Request could not be processed" error and the request loop.

**Independent Test**: Navigate to OTP page with email in sessionStorage. Verify exactly one OTP request fires after Turnstile token becomes available. No premature requests, no duplicate requests.

### Tests for User Story 1

- [x] T006 [P] [US1] Write test: OTP request is NOT sent when turnstileToken is null (page just mounted) in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T007 [P] [US1] Write test: OTP request IS sent exactly once when turnstileToken becomes available, and `resetWidget` is NOT called after the auto-send (FR-004) in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T008 [P] [US1] Write test: changing turnstileToken after initial send does NOT trigger another OTP request in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T009 [P] [US1] Write test: user sees loading indicator while turnstileToken is null (before auto-send) in frontend/tests/unit/EventOTPEntryPage.test.jsx

### Implementation for User Story 1

- [x] T010 [US1] Rewrite auto-send useEffect: deps = [eventId, navigate, turnstileToken]; guard on hasAutoRequested.current and !turnstileToken; set hasAutoRequested = true before calling sendOTPRequest; do NOT call resetWidget — in frontend/src/pages/EventOTPEntryPage.jsx
- [x] T011 [US1] Remove the old `requestOTP` useCallback that depended on turnstileToken (replaced by sendOTPRequest helper + auto-send effect) in frontend/src/pages/EventOTPEntryPage.jsx
- [x] T012 [US1] Add loading state UI: when turnstileToken is null AND turnstileError is null AND hasAutoRequested is false, show "Sending verification code..." indicator instead of error in frontend/src/pages/EventOTPEntryPage.jsx

**Checkpoint**: Auto-send fires exactly once. No loop. No premature error. Tests T006-T009 pass.

---

## Phase 4: User Story 2 — Admin Manually Resends OTP Code (Priority: P2)

**Goal**: Resend button sends one OTP with fresh Turnstile token, resets widget for next resend, and is disabled when token is unavailable.

**Independent Test**: Load OTP page, wait for auto-send, click Resend, verify new OTP request with fresh token. Verify button is disabled while Turnstile is loading.

### Tests for User Story 2

- [x] T013 [P] [US2] Write test: clicking Resend sends OTP using current turnstileToken and calls resetWidget afterward in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T014 [P] [US2] Write test: Resend button is disabled when turnstileToken is null in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T015 [P] [US2] Write test: rate limit error from resend is displayed inline in frontend/tests/unit/EventOTPEntryPage.test.jsx

### Implementation for User Story 2

- [x] T016 [US2] Create `handleResend` async handler that reads `turnstileTokenRef.current`, calls `sendOTPRequest`, then calls `resetWidget()` in frontend/src/pages/EventOTPEntryPage.jsx
- [x] T017 [US2] Wire Resend button to `handleResend` (replace existing `onClick={() => requestOTP(email)}`) in frontend/src/pages/EventOTPEntryPage.jsx
- [x] T018 [US2] Add `!turnstileToken` to Resend button's disabled condition (alongside existing `requestingOTP || loading`) in frontend/src/pages/EventOTPEntryPage.jsx

**Checkpoint**: Resend works correctly. Button disabled when appropriate. Tests T013-T015 pass.

---

## Phase 5: User Story 3 — Bot-Protection Check Fails Permanently (Priority: P3)

**Goal**: When Turnstile fails all retries, show a clear actionable error instead of a cryptic message or infinite loading.

**Independent Test**: Simulate Turnstile error state. Verify "Verification check failed. Please reload the page and try again." is displayed.

### Tests for User Story 3

- [x] T019 [P] [US3] Write test: when useTurnstile returns error state, component shows "Verification check failed. Please reload the page and try again." in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T019b [P] [US3] Write test: after Turnstile failure, remounting the component (simulating reload) starts fresh — Turnstile re-initializes and auto-send waits for the new token in frontend/tests/unit/EventOTPEntryPage.test.jsx

### Implementation for User Story 3

- [x] T020 [US3] Add Turnstile failure UI: when `turnstileError` is truthy AND `hasAutoRequested` is false, show "Verification check failed. Please reload the page and try again." error message in frontend/src/pages/EventOTPEntryPage.jsx

**Checkpoint**: Turnstile failure shows clear error. Test T019 passes.

---

## Phase 6: User Story 4 — Page Reload Does Not Burn Rate Limits (Priority: P2)

**Goal**: Verify that reloading the page sends exactly one OTP request per load (inherently satisfied by US1's hasAutoRequested ref, but needs explicit test validation).

**Independent Test**: Simulate 3 page remounts. Verify exactly 3 OTP requests total.

### Tests for User Story 4

- [x] T021 [US4] Write test: remounting the component (simulating reload) sends exactly one OTP request per mount in frontend/tests/unit/EventOTPEntryPage.test.jsx

### Implementation for User Story 4

No additional implementation needed — US1's `hasAutoRequested` ref (reset on each mount via `useRef(false)`) already ensures one request per mount.

**Checkpoint**: Test T021 passes. Reload behavior confirmed.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify regressions, cleanup, and validate end-to-end

- [x] T022 Write test: component redirects to /email when no email in sessionStorage (existing behavior regression check) in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T023 Write test: OTP verify flow still works correctly (enter code, submit, redirect to event page) in frontend/tests/unit/EventOTPEntryPage.test.jsx
- [x] T024 Run full test suite and linting (`npx vitest run && npm run lint`) and verify all existing tests and lint checks pass
- [x] T025 Update SYSTEM_DOCUMENTATION.md if any component behavior descriptions need updating

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — core fix, MVP
- **US2 (Phase 4)**: Depends on Foundational — can run in parallel with US1 but shares same file, recommend sequential after US1
- **US3 (Phase 5)**: Depends on Foundational — can run in parallel with US1/US2 but shares same file, recommend sequential
- **US4 (Phase 6)**: Depends on US1 (test validates US1's behavior) — must follow US1
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Independent of US1 but touches same file, best done sequentially
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Independent of US1/US2 but touches same file
- **User Story 4 (P2)**: Depends on US1 (validates US1's ref-based guard behavior)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation follows plan.md design exactly
- Story complete before moving to next priority

### Parallel Opportunities

- T006, T007, T008, T009 (US1 tests) can all run in parallel
- T013, T014, T015 (US2 tests) can all run in parallel
- T019 (US3 test) is standalone
- Implementation tasks within each story are sequential (same file)

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests in parallel:
Task: "T006 - Test: OTP not sent when token null"
Task: "T007 - Test: OTP sent exactly once when token available"
Task: "T008 - Test: Token change after send does not re-trigger"
Task: "T009 - Test: Loading indicator while token null"

# Then implement sequentially (same file):
Task: "T010 - Rewrite auto-send useEffect"
Task: "T011 - Remove old requestOTP useCallback"
Task: "T012 - Add loading state UI"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T005)
3. Complete Phase 3: User Story 1 (T006-T012)
4. **STOP and VALIDATE**: Run `npx vitest run` — all US1 tests pass, no regressions
5. This alone fixes the primary bug (race condition + request loop)

### Incremental Delivery

1. Setup + Foundational → Refactored internals ready
2. Add US1 → Core bug fixed, auto-send works correctly (MVP!)
3. Add US2 → Manual resend works correctly with proper widget lifecycle
4. Add US3 → Turnstile failure shows clear error message
5. Add US4 → Reload behavior explicitly validated
6. Polish → Regression tests, full suite validation

---

## Notes

- All implementation tasks modify the SAME file (`EventOTPEntryPage.jsx`) — parallel implementation within a phase is not possible, but test writing CAN be parallelized
- The test file (`EventOTPEntryPage.test.jsx`) is NEW — no risk of conflicting with existing tests
- The `useTurnstile` hook is NOT modified — only its return values are used differently
- No backend changes, no API contract changes, no data model changes
