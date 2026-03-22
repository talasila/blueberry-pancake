# Tasks: Email Privacy — Opaque User Identity for Guests

**Input**: Design documents from `/specs/041-email-privacy-opaque-id/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — constitution requires testing standards (Principle IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup

**Purpose**: Create the shared userId generation utility used by all subsequent phases.

- [x] T001 Create `backend/src/utils/userIdUtils.js` — export `generateUserId()` using `nanoid` customAlphabet (a-zA-Z0-9, length 10) with `u_` prefix, and `isValidUserId(id)` validation function matching pattern `u_[a-zA-Z0-9]{10}`
- [x] T002 Add unit tests for userId generation in `backend/tests/unit/userIdUtils.test.js` — test format, uniqueness across 1000 generations, validation function accepts/rejects correctly

**Checkpoint**: userId utility ready. All subsequent phases can use `generateUserId()`.

---

## Phase 2: Foundational (Backend Identity & JWT)

**Purpose**: Modify user registration and JWT to support opaque userId. MUST be complete before any API sanitization or frontend work.

**⚠️ CRITICAL**: All user story phases depend on these foundational changes.

- [x] T003 Modify `backend/src/services/EventMemberService.js` — import `generateUserId`, generate and store `userId` in users map during `registerUser()`. If user already exists and has no `userId`, generate one (lazy backfill). If user already exists and has `userId`, preserve it.
- [x] T004 Modify `backend/src/middleware/jwtAuth.js` — change `generateToken()` to accept role-dependent payloads: if `authMethod === 'pin'`, include `userId` (no email); if `authMethod === 'otp'`, include `email` (existing behavior). Add backward compatibility in token verification: if decoded token has `email` + `authMethod: 'pin'` but no `userId`, set `req.user.legacyPinToken = true`.
- [x] T005 Modify `backend/src/api/events.js` — in verify-PIN handler, after `registerUser()`, retrieve `userId` from the registration result or users map. Pass `userId` (not email) to `generateToken()` for PIN auth. Change response from `{ user: { email, exp, authMethod } }` to `{ user: { userId, name, exp, authMethod } }`.
- [x] T006 Modify `backend/src/api/auth.js` — in OTP verification, after successful auth, for each event the admin has access to, ensure admin has a `userId` in that event's users map (generate if missing). OTP JWT payload remains `{ email, events, authMethod: 'otp' }` (unchanged). Also modify `backend/src/services/EventConfigService.js` — in any "add administrator to event" flow, generate and store a `userId` for the new admin in the event's users map (ensures admins added outside of OTP login also get a userId).
- [x] T007 Add unit tests for JWT changes in `backend/tests/unit/jwtAuth.test.js` — test PIN token contains userId and no email, OTP token contains email, backward compat detects legacy PIN tokens
- [x] T008 Add unit tests for registration userId in `backend/tests/unit/EventMemberService.test.js` — test userId generated on new registration, userId preserved on re-registration, userId backfilled for existing user without one

**Checkpoint**: Backend generates userId at registration, JWT tokens are role-dependent. Existing tokens handled gracefully.

---

## Phase 3: User Story 1 - Guest Email Hidden from Other Users (Priority: P1) 🎯 MVP

**Goal**: Strip email from all non-admin API responses. Dashboard, similar users, and ratings return userId + name only.

**Independent Test**: Register two guests, rate items, complete event. As a guest, verify zero email addresses in any API response (dashboard, similar users, ratings).

### Implementation for User Story 1

- [x] T009 [US1] Modify `backend/src/services/DashboardService.js` — in `calculateUserSummaries()`, replace `email` field with `userId` from `event.users[email].userId`. Replace `name: userName` with `name: userName || email.split('@')[0]` (backfill fallback). If user lacks `userId`, generate and persist one (lazy backfill). Sort summaries by `name` instead of `email`.
- [x] T010 [US1] Modify `backend/src/api/dashboard.js` — pass `isAdmin` flag and requesting user's email to DashboardService so it can resolve admin context if needed
- [x] T011 [P] [US1] Modify `backend/src/api/similarUsers.js` — map `email` to `userId` and `name` in response using event's users map. Replace `currentUserEmail` with `currentUserId`. Resolve requesting user's userId from JWT (`req.user.userId` for PIN, lookup from email for OTP).
- [x] T012 [P] [US1] Modify `backend/src/api/ratings.js` — for non-admin GET requests (no `?mine` param), replace email column with userId in CSV output. Determine admin status using `EventService.isAdministrator()`. Admin requests keep email column unchanged.
- [x] T013 [US1] Add unit tests for dashboard sanitization in `backend/tests/unit/DashboardService.test.js` — test userSummaries contain userId and name but no email, test lazy backfill generates userId for users without one, test name backfill from email prefix
- [x] T014 [US1] Add E2E test for email privacy in `frontend/tests/e2e/specs/email-privacy.spec.js` — create event, register two guests, rate items, complete event. As guest, fetch dashboard API and verify response contains no email fields. Fetch similar users and verify no emails. Verify ratings CSV has userId column not email. Also verify that opaque userId values (matching `u_` prefix pattern) do not appear in any rendered DOM text content (FR-011: userId is internal plumbing, never displayed to users).

**Checkpoint**: No email in any non-admin API response. Core privacy guarantee verified.

---

## Phase 4: User Story 2 - Opaque User Identity at Registration (Priority: P1)

**Goal**: Verify-PIN response and guest JWT contain userId, not email. Frontend stores userId.

**Independent Test**: Register a guest, inspect verify-PIN response and session storage — confirm userId present, email absent.

### Implementation for User Story 2

- [x] T015 [US2] Modify `frontend/src/services/apiClient.js` — update `setUserSession()` to store `{ userId, name, exp, authMethod }` for PIN auth (from verify-PIN response). Add `getUserId()` method returning `this.userSession?.userId || null`. Keep `getUserEmail()` for OTP/admin flows. Update `_loadSession()` to handle both old (email-based) and new (userId-based) session formats in localStorage.
- [x] T016 [US2] Modify `frontend/src/pages/EventPage.jsx` — replace `apiClient.getUserEmail()` with `apiClient.getUserId()` for identifying the current user. Store `currentUserId` in state instead of `currentUserEmail` where used for guest identity.
- [x] T017 [US2] Add E2E test for registration identity in `frontend/tests/e2e/specs/email-privacy.spec.js` — register guest via PIN, verify response contains `userId` and `name` but no `email`. Re-enter same event, verify same `userId` returned.

**Checkpoint**: Guest registration returns opaque identity. Frontend operates on userId.

---

## Phase 5: User Story 3 - Admin Retains Email Visibility (Priority: P1)

**Goal**: Admin page and CSV export still show emails. Admin dashboard view shows names only (same as guests).

**Independent Test**: As admin, verify emails visible on admin page people section and in CSV export. Verify dashboard shows names only.

### Implementation for User Story 3

- [x] T018 [US3] Modify `backend/src/api/ratings.js` — for admin GET requests (without `?mine`), preserve email column in CSV (existing behavior). Ensure isAdmin check works for both OTP tokens (has email directly) and PIN tokens (resolve email from userId via event users map).
- [x] T019 [US3] Add E2E test for admin email visibility in `frontend/tests/e2e/specs/email-privacy.spec.js` — as admin, verify admin page people section shows guest emails. Download ratings CSV as admin, verify emails present. View dashboard as admin, verify names only (no emails).

**Checkpoint**: Admin workflows unbroken. Emails visible only where admins need them.

---

## Phase 6: User Story 4 - Mandatory Display Name (Priority: P2)

**Goal**: Backend enforces mandatory name at registration. Existing nameless users get email-prefix backfill.

**Independent Test**: Attempt registration without name — rejected. Access event with nameless user — name auto-assigned.

### Implementation for User Story 4

- [x] T020 [US4] Modify `backend/src/api/events.js` — in verify-PIN handler, change name validation from optional to required. Return 400 error if name is empty, null, or whitespace-only after trimming.
- [x] T021 [US4] Modify `backend/src/services/EventMemberService.js` — in lazy backfill path, if user has no name, derive from email prefix (`email.split('@')[0]`) and persist alongside the generated userId.
- [x] T022 [US4] Add unit test for mandatory name in `backend/tests/unit/EventMemberService.test.js` — test name backfill from email prefix for existing user without name
- [x] T023 [US4] Add E2E test for name enforcement in `frontend/tests/e2e/specs/email-privacy.spec.js` — attempt PIN verification without name, verify 400 error response

**Checkpoint**: Name is mandatory. No unnamed users in the system.

---

## Phase 7: User Story 5 - Backward Compatibility with Existing Events (Priority: P2)

**Goal**: Old JWTs and existing user records without userId work seamlessly.

**Independent Test**: Use an old-format token (email-based PIN), access endpoints, verify transparent backfill.

### Implementation for User Story 5

- [x] T024 [US5] Modify `backend/src/middleware/jwtAuth.js` — in the `requireAuth` middleware, when a legacy PIN token is detected (`legacyPinToken === true`), look up the event's users map to find the user by email, retrieve or generate their `userId`, and attach it to `req.user.userId`. This enables downstream handlers to always use `req.user.userId` for PIN-auth users.
- [x] T025 [US5] Modify `frontend/src/services/apiClient.js` — in `_loadSession()`, handle legacy localStorage format (`{ email, exp, authMethod: 'pin' }`) by treating it as valid but without userId. When a response from verify-PIN includes userId, overwrite the old session. Add `needsSessionRefresh()` method that returns true if session has email but no userId with authMethod pin.
- [x] T026 [US5] Add unit test for backward compat in `backend/tests/unit/jwtAuth.test.js` — test legacy PIN token triggers backfill, userId attached to req.user after middleware runs
- [x] T027 [US5] Add E2E test for backward compat in `frontend/tests/e2e/specs/email-privacy.spec.js` — create event and register user via old flow (simulated), access dashboard, verify userId is generated and response contains no email

**Checkpoint**: Existing events and old tokens work without disruption.

---

## Phase 8: User Story 6 - Current User Ratings Without Email Exposure (Priority: P2)

**Goal**: "My Progress" fetches only the current user's ratings via `?mine=true`, no other user data in response.

**Independent Test**: Open My Progress, inspect network — only your ratings, no other user emails or IDs.

### Implementation for User Story 6

- [x] T028 [US6] Modify `backend/src/api/ratings.js` — add support for `?mine=true` query parameter. When present, resolve the requesting user's email (from JWT email for OTP, or from userId→email lookup via event users map for PIN), filter ratings to only that user's, and return without email or userId columns (data is implicitly "yours").
- [x] T029 [US6] Modify `frontend/src/services/ratingService.js` — add `getMyRatings(eventId)` method that calls `GET /events/:eventId/ratings?mine=true` and parses response. Update `parseRatingsCSV()` to handle response without email/userId column.
- [x] T030 [US6] Modify `frontend/src/components/UserDetailsDrawer.jsx` — when opened for the current user (isCurrentUser), use `ratingService.getMyRatings()` instead of fetching all ratings and filtering. Accept `userId` prop instead of `userEmail` for non-current users. When opened from dashboard for another user, filter dashboard data by `userId`.
- [x] T031 [P] [US6] Modify `frontend/src/pages/DashboardPage.jsx` — pass `userId` instead of `userEmail` to UserDetailsDrawer and UserRatingsTable via `onRowClick`. Update `openUserDetailsEmail` state to `openUserDetailsUserId`.
- [x] T032 [P] [US6] Modify `frontend/src/components/UserRatingsTable.jsx` — replace `user.email` with `user.userId` as React key and `onRowClick` parameter. Remove `trimEmail()` function. Update `getUserDisplayName()` to use `user.name` only (no email fallback). Change sort option key from `'email'` to `'name'`.
- [x] T033 [P] [US6] Modify `frontend/src/components/SimilarUsersDrawer.jsx` — replace `user.email` with `user.userId` as React key. Replace `user.name || user.email` display with `user.name` only. Update detail view reference from email to userId.
- [x] T034 [US6] Add E2E test for My Progress privacy in `frontend/tests/e2e/specs/email-privacy.spec.js` — as guest, open My Progress, inspect ratings API call with `?mine=true`, verify response has no email/userId columns and contains only current user's ratings
- [x] T035 [US6] Modify `frontend/src/pages/EventPage.jsx` — update any remaining references that identify the current user by email to use userId instead (SimilarUsersDrawer opening, UserDetailsDrawer for current user detection)

**Checkpoint**: My Progress works without email. All frontend components use userId internally, name for display.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T036 Run all existing unit tests (`cd backend && npx vitest run` and `cd frontend && npx vitest run`) and fix any regressions
- [x] T037 Run quickstart.md validation — follow verification steps end-to-end
- [x] T038 Verify no email addresses appear in any non-admin API response by auditing all modified endpoints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (needs `generateUserId`)
- **Phase 3 (US1 - Email Hidden)**: Depends on Phase 2 (needs userId in users map, role-dependent JWT)
- **Phase 4 (US2 - Registration Identity)**: Depends on Phase 2 (needs verify-PIN changes). Can run in parallel with Phase 3.
- **Phase 5 (US3 - Admin Email Visibility)**: Depends on Phase 3 (needs sanitized endpoints to verify admin exemption)
- **Phase 6 (US4 - Mandatory Name)**: Depends on Phase 2. Can run in parallel with Phases 3-5.
- **Phase 7 (US5 - Backward Compat)**: Depends on Phase 2 (needs JWT backward compat middleware)
- **Phase 8 (US6 - My Ratings)**: Depends on Phase 3 (needs sanitized ratings endpoint) and Phase 4 (needs userId in frontend)
- **Phase 9 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (Email Hidden)**: Depends on Foundational (Phase 2) only
- **US2 (Registration Identity)**: Depends on Foundational (Phase 2) only — independent of US1
- **US3 (Admin Email)**: Depends on US1 (needs sanitized endpoints to verify admin path)
- **US4 (Mandatory Name)**: Depends on Foundational (Phase 2) only — independent of US1-3
- **US5 (Backward Compat)**: Depends on Foundational (Phase 2) only — independent of US1-4
- **US6 (My Ratings)**: Depends on US1 (sanitized ratings) and US2 (frontend userId)

### Parallel Opportunities

- T011, T012 can run in parallel (different API files, no dependencies)
- T031, T032, T033 can run in parallel (different frontend files)
- Phase 3 (US1) and Phase 4 (US2) can run in parallel after Phase 2
- Phase 6 (US4) and Phase 7 (US5) can run in parallel, independent of other stories

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T008)
3. Complete Phase 3: Email Hidden (T009-T014)
4. Complete Phase 4: Registration Identity (T015-T017)
5. **STOP and VALIDATE**: Emails stripped from non-admin responses, frontend uses userId
6. Deploy/demo if ready

### Full Delivery

1. Setup → Foundational → Email Hidden → Registration Identity → Admin Email → Mandatory Name → Backward Compat → My Ratings → Polish
2. Total: 38 tasks across 9 phases
3. Estimated parallel groups: 4 (setup sequential, foundational sequential, US1-US4 partially parallel, frontend components parallel)

---

## Notes

- All API response changes replace `email` with `userId` — never add `userId` alongside `email` (that defeats the purpose)
- Lazy backfill writes happen during normal request processing — no separate migration job
- The `u_` prefix on userIds prevents confusion with event IDs (Crockford Base32) or item IDs (alphanumeric without prefix)
- `?mine=true` on the ratings endpoint is a performance improvement too — reduces payload from "all ratings" to "just mine"
- Admin CSV export is the ONLY place emails appear in API responses after this feature
- `getUserEmail()` remains in apiClient for admin flows — do not remove it
