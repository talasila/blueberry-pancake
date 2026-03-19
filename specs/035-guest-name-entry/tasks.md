# Tasks: Collect Guest Name at Event Entry

**Input**: Design documents from `/specs/035-guest-name-entry/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-changes.md, quickstart.md

**Tests**: Included — constitution principle IV (Testing Standards) is NON-NEGOTIABLE.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Backend Data Layer + API Client)

**Purpose**: Shared infrastructure changes that both the guest (PIN) and admin (OTP) flows depend on. Must complete before any user story work begins.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Update `registerUserAtomic` signature in backend/src/data/DataRepository.js to accept optional `name` parameter (add to JSDoc and method signature, default to `undefined`)
- [x] T002 Update `registerUserAtomic` in backend/src/data/DynamoDBRepository.js to include `name` in the `:userData` expression value object (`{ registeredAt, ...(name && { name }) }`) so new users get their name stored atomically
- [x] T003 Update `registerUser` in backend/src/services/EventMemberService.js to accept optional `name` parameter and pass it through to `dataRepository.registerUserAtomic`; also return `alreadyExists` in the result object so callers can decide whether to call `updateUserName`
- [x] T004 [P] Update `verifyPIN` method in frontend/src/services/apiClient.js to accept a fourth `name` parameter and include it in the POST body sent to `/events/${eventId}/verify-pin`
- [x] T005 [P] Update `verifyOTP` method in frontend/src/services/apiClient.js to accept `name` and `eventId` as additional parameters and include them in the POST body sent to `/auth/otp/verify`

**Checkpoint**: Backend data layer accepts name; frontend API client sends name. No user-facing changes yet.

---

## Phase 2: User Story 1 — New Guest Enters Event (Priority: P1) MVP

**Goal**: A first-time guest provides their name and email on the entry page, verifies via PIN, and their name is stored server-side and displayed throughout the app.

**Independent Test**: New guest accesses event → fills name + email → enters PIN → name appears in ratings table and similar users views.

### Implementation for User Story 1

- [x] T006 [US1] Update verify-pin endpoint in backend/src/api/events.js: extract `name` from `req.body`; if provided, validate server-side (trim, reject if empty after trim, enforce max 100 characters); pass validated name to `eventMemberService.registerUser(eventId, email, name)`; after registration, if `result.alreadyExists` is true and `name` is provided, call `eventConfigService.updateUserName(eventId, email, name)` (import eventConfigService); name save failure must not fail PIN verification (wrap in try/catch, log warning)
- [x] T007 [US1] Add name field to frontend/src/pages/EmailEntryPage.jsx: add `name` state, add "Your Name" Input field above email field using existing Label/Input components, add name validation (required, at least one non-whitespace character after trim), store trimmed name in sessionStorage as `event:${eventId}:name` alongside email on successful submit, update button disabled logic to require both fields
- [x] T008 [US1] Update frontend/src/pages/PINEntryPage.jsx: read name from `sessionStorage.getItem(\`event:${eventId}:name\`)` in the useEffect that reads email, store in component state, pass name to `apiClient.verifyPIN(eventId, pin, email, name)` in handleVerifyPIN, add `sessionStorage.removeItem(\`event:${eventId}:name\`)` alongside existing email removal after successful verification

### Tests for User Story 1

- [x] T009 [P] [US1] Create frontend/tests/unit/EmailEntryPage.test.jsx: test that name field renders above email field, test form prevents submission when name is empty, test form prevents submission when name is only whitespace, test both fields are required, test name is stored in sessionStorage on successful submit, test navigation to PIN page for non-admin
- [x] T010 [P] [US1] Update frontend/tests/unit/PINEntryPage.test.jsx: add test that verifyPIN is called with name from sessionStorage as fourth argument, add test that sessionStorage name key is removed after successful verification, add test that PIN page redirects to email entry if name is missing from sessionStorage
- [x] T011 [P] [US1] Add integration tests in backend/tests/integration/api.test.js: test verify-pin with name stores name for new user, test verify-pin with name updates name for returning user (alreadyExists), test verify-pin without name still works (backward compatibility)

**Checkpoint**: Guest PIN flow complete. New guests provide name at entry, name is stored and displayed.

---

## Phase 3: User Story 2 — Admin Enters Event (Priority: P1)

**Goal**: An admin provides their name and email on the entry page, verifies via OTP, and their name is stored in the same user record as guests.

**Independent Test**: Admin accesses event → fills name + email → enters OTP → name is stored in event.users and displayed.

### Implementation for User Story 2

- [x] T012 [US2] Update verify-otp endpoint in backend/src/api/auth.js: extract `name` and `eventId` from `req.body`; if `name` provided, validate server-side (trim, reject if empty after trim, enforce max 100 characters); after successful OTP verification (after line ~196 where failed attempts are reset), if both validated `name` and `eventId` are provided, call `eventConfigService.updateUserName(eventId, email, name)` (import eventConfigService); wrap in try/catch, log warning on failure; validate eventId format if provided using existing `validateEventId`
- [x] T013 [US2] Update frontend/src/pages/EventOTPEntryPage.jsx: read name from `sessionStorage.getItem(\`event:${eventId}:name\`)` in the useEffect that reads email, store in component state, pass name and eventId to `apiClient.verifyOTP(email, otp, name, eventId)` in handleVerifyOTP, add `sessionStorage.removeItem(\`event:${eventId}:name\`)` alongside existing email removal after successful verification

### Tests for User Story 2

- [x] T014 [P] [US2] Add integration tests in backend/tests/integration/auth.test.js: test verify-otp with name and eventId saves name to event user record, test verify-otp without name/eventId still works (backward compatibility), test verify-otp with invalid eventId format is rejected gracefully

**Checkpoint**: Admin OTP flow complete. Both guest and admin flows now collect and store names.

---

## Phase 4: User Story 3 — Returning User Pre-Fill (Priority: P2)

**Goal**: Returning users on the same device see their name and email pre-filled from localStorage on the entry page.

**Independent Test**: User enters event once → closes browser → reopens event URL → both fields are pre-filled.

### Implementation for User Story 3

- [x] T015 [US3] Add localStorage pre-fill to frontend/src/pages/EmailEntryPage.jsx: on component mount, read `localStorage.getItem('remembered:name')` and `localStorage.getItem('remembered:email')` to initialize state (wrap in try/catch for private browsing); on successful form submit (before navigation), always overwrite with current form values via `localStorage.setItem('remembered:name', name.trim())` and `localStorage.setItem('remembered:email', email.trim())` (wrap in try/catch) — this ensures edited names replace pre-filled originals; this replaces the current initial empty state for both fields

### Tests for User Story 3

- [x] T016 [US3] Add localStorage tests to frontend/tests/unit/EmailEntryPage.test.jsx: test fields pre-fill from localStorage on mount, test localStorage is written on successful submit, test form works normally when localStorage is unavailable (throws), test pre-filled values are accepted on submit without changes

**Checkpoint**: Returning users get pre-filled fields. Full convenience flow works.

---

## Phase 5: User Story 4 — Name Change at Any Time (Priority: P2)

**Goal**: Users can freely change their display name on re-entry without affecting their ratings or event data. Last-write-wins.

**Independent Test**: User enters as "Jon" → re-enters as "Jonathan" → name updates everywhere, all ratings intact.

### Implementation for User Story 4

> Note: The last-write-wins behavior is already implemented by T006 (returning users path) and T012 (admin updateUserName). The localStorage overwrite-on-submit behavior is implemented by T015. This phase adds tests to validate name change propagation.

### Tests for User Story 4

- [x] T017 [US4] Add name change tests to frontend/tests/unit/EmailEntryPage.test.jsx: test that editing a pre-filled name and submitting saves the new name to localStorage (not the original), test that the new name is written to sessionStorage for the downstream PIN/OTP page

**Checkpoint**: All user stories complete. Name can be set, pre-filled, and changed freely.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and cross-cutting quality checks.

- [x] T018 Run full test suite (`npm test`) to verify no regressions across frontend and backend
- [x] T019 Run linter (`npm run lint`) and fix any issues introduced by changes
- [x] T020 Manual smoke test per quickstart.md: new guest flow, returning guest flow, admin flow, private browsing flow; also verify MyBottlesSheet name editing still works (FR-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **US1 (Phase 2)**: Depends on Phase 1 completion. This is the MVP.
- **US2 (Phase 3)**: Depends on Phase 1 completion. Can run in parallel with US1 (different backend endpoints, different frontend pages).
- **US3 (Phase 4)**: Depends on US1 (T007 creates the EmailEntryPage name field that T015 adds localStorage to).
- **US4 (Phase 5)**: Depends on US3 (T015 adds localStorage writes that T017 verifies).
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only — no dependencies on other stories
- **US2 (P1)**: Foundational only — independent of US1 (different endpoint, different page)
- **US3 (P2)**: Depends on US1 (EmailEntryPage name field must exist before adding localStorage)
- **US4 (P2)**: Depends on US3 (localStorage must exist before verifying name change behavior)

### Within Each User Story

- Backend changes before frontend changes (API must accept name before frontend sends it)
- Implementation before tests (tests reference the implemented code)
- Core flow before edge cases

### Parallel Opportunities

- **Phase 1**: T004 and T005 can run in parallel with T001→T002→T003 (frontend vs backend)
- **Phase 2 + Phase 3**: US1 and US2 can run in parallel after Phase 1 (different files entirely)
- **Phase 2 tests**: T009, T010, T011 can all run in parallel (different test files)
- **Phase 3 tests**: T014 can run in parallel with US1 tests

---

## Parallel Example: Phase 1 (Foundational)

```text
# Sequential chain (backend data layer):
T001: Update DataRepository.js signature
T002: Update DynamoDBRepository.js implementation
T003: Update EventMemberService.js to pass name through

# In parallel with the above (frontend, different files):
T004: Update apiClient.js verifyPIN method
T005: Update apiClient.js verifyOTP method
```

## Parallel Example: US1 + US2 (after Phase 1)

```text
# These can run concurrently (different endpoints, different pages):
US1: T006 (events.js) → T007 (EmailEntryPage) → T008 (PINEntryPage)
US2: T012 (auth.js) → T013 (EventOTPEntryPage)

# All tests can run in parallel:
T009, T010, T011, T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (backend data layer + API client)
2. Complete Phase 2: User Story 1 (guest PIN flow with name)
3. **STOP and VALIDATE**: New guest can enter name, verify PIN, name appears in app
4. Deploy/demo if ready — this alone eliminates "Unnamed User" for all new guests

### Incremental Delivery

1. Phase 1 (Foundational) → Backend and API client ready
2. US1 (Guest PIN flow) → Test independently → **MVP deployed**
3. US2 (Admin OTP flow) → Test independently → Admins now have names too
4. US3 (localStorage pre-fill) → Test independently → Returning users get convenience
5. US4 (Name change) → Test independently → Full feature complete
6. Polish → Run full suite, lint, smoke test

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- T004/T005 are in Foundational because both US1 and US2 need them
- US4 is test-only (T017) since last-write-wins and localStorage overwrite are implemented by US1/US2/US3 tasks
- EmailEntryPage.test.jsx is a new file; PINEntryPage.test.jsx already exists
- No changes needed to display logic (UserRatingsTable, DashboardService, SimilarUsers) — they already handle name when present
- Backend name validation (trim, max 100 chars) is included in T006 and T012 per constitution Principle V (Security)
