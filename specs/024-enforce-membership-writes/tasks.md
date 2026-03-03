# Tasks: Enforce User Membership on Backend Write Operations

**Input**: Design documents from `/specs/024-enforce-membership-writes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — constitution principle IV (Testing Standards) is NON-NEGOTIABLE and plan.md specifies unit, integration, and E2E tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core shared infrastructure that ALL user stories depend on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Add `isEventMember(event, email)` method to `backend/src/services/EventService.js` — returns `true` if normalized email exists in `event.users` OR passes `isAdministrator()` check. This satisfies FR-001 and FR-005.
- [X] T002 [P] Add `deleteDashboardCache(eventId)` and `deleteAllSimilarUsersCache(eventId)` abstract methods to `backend/src/data/DataRepository.js` and implement in `backend/src/data/DynamoDBRepository.js`. Dashboard cache: delete item with `PK: EVENT#<eventId>`, `SK: DASHBOARD`. Similar-users cache: query `SK begins_with("SIMILAR#")` then batch-delete.
- [X] T003 Create `requireEventMembership` middleware in `backend/src/middleware/requireEventMembership.js` — loads event via `eventService.getEvent(eventId)`, calls `eventService.isEventMember(event, req.user.email)`, attaches `req.event = event` on success, returns `{ error: "User is not registered for this event", code: "EVENT_MEMBERSHIP_REQUIRED" }` with 403 on failure.
- [X] T004 [P] Add membership error classification to `backend/src/utils/apiErrorHandler.js` — in `handleApiError()`, match `"not registered for this event"` and return 403 with `code: "EVENT_MEMBERSHIP_REQUIRED"`. Insert before the existing authorization error block.
- [X] T005 Update `deleteUser()` in `backend/src/services/EventService.js` to call `dataRepository.deleteDashboardCache(eventId)` and `dataRepository.deleteAllSimilarUsersCache(eventId)` after rating deletion and before event persistence. This satisfies FR-009.
- [X] T005b Update `deleteAllUsers()` in `backend/src/services/EventService.js` to call the same `dataRepository.deleteDashboardCache(eventId)` and `dataRepository.deleteAllSimilarUsersCache(eventId)` after rating deletion — same pattern as `deleteUser()`. Both single-user and bulk-delete paths must invalidate caches.
- [X] T006 [P] Write unit tests for `isEventMember` in `backend/tests/unit/EventService.test.js` — test cases: user in `event.users` returns true, admin in `event.administrators` returns true, admin NOT in users returns true, email not in either returns false, null/undefined inputs return false.
- [X] T007 [P] Write unit tests for `requireEventMembership` middleware in `backend/tests/unit/requireEventMembership.test.js` — test cases: member passes through with `req.event` attached, non-member gets 403 with `EVENT_MEMBERSHIP_REQUIRED` code, missing email gets 403, missing eventId gets 403, admin-only (not in users) passes through.

- [X] T007b Update `ItemService.registerItem()`, `ItemService.updateItem()`, `ItemService.deleteItem()` in `backend/src/services/ItemService.js` and `RatingService.submitRating()`, `RatingService.deleteRating()` in `backend/src/services/RatingService.js` to accept an optional pre-loaded event parameter (or check a passed-in event) to avoid redundant `eventService.getEvent()` calls when `req.event` is already available from the middleware. Route handlers pass `req.event` when present. This satisfies FR-008 (no additional data retrieval).

**Checkpoint**: Foundation ready — all shared backend infrastructure is in place. User story implementation can now begin.

---

## Phase 2: User Story 1 — Deleted Guest Cannot Register New Items (Priority: P1) 🎯 MVP

**Goal**: Prevent a deleted guest from creating new items via POST /items. This is the most critical data integrity gap — orphaned items pollute admin views.

**Independent Test**: Delete a guest, then POST to `/api/events/:eventId/items` with that guest's credentials → expect 403, no item created.

### Implementation for User Story 1

- [X] T008 [US1] Apply `requireEventMembership` middleware to POST `/` route in `backend/src/api/items.js` — add as second middleware after `requireAuth` (which is applied via `router.use`). The middleware must be applied per-route on the POST handler, not globally on the router (GET routes must remain ungated). Pass `req.event` to `itemService.registerItem()` to avoid redundant `getEvent()` call (FR-008).
- [X] T009 [US1] Write integration tests for item registration membership enforcement in `backend/tests/integration/membership-enforcement.test.js` — test cases: (1) deleted guest POST /items → 403 with `EVENT_MEMBERSHIP_REQUIRED` code, then verify no item was persisted (query items and assert count unchanged, satisfies FR-006); (2) active guest POST /items → 201 item created (no regression).

**Checkpoint**: User Story 1 is fully functional. A deleted guest can no longer register items. Active guests are unaffected.

---

## Phase 3: User Story 2 — Deleted Guest Cannot Submit Ratings (Priority: P1)

**Goal**: Prevent a deleted guest from submitting new ratings via POST /ratings. Orphaned ratings corrupt scoring data.

**Independent Test**: Delete a guest, then POST to `/api/events/:eventId/ratings` with that guest's credentials → expect 403, no rating saved.

### Implementation for User Story 2

- [X] T010 [US2] Apply `requireEventMembership` middleware to POST `/ratings` route in `backend/src/api/ratings.js` — add as additional middleware argument alongside `requireAuth` on the route handler. Pass `req.event` to `ratingService.submitRating()` to avoid redundant `getEvent()` call (FR-008).
- [X] T011 [US2] Write integration tests for rating submission membership enforcement in `backend/tests/integration/membership-enforcement.test.js` — test cases: (1) deleted guest POST /ratings → 403 with `EVENT_MEMBERSHIP_REQUIRED` code, then verify no rating was persisted (query ratings and assert count unchanged, satisfies FR-006); (2) active guest POST /ratings → 201 rating saved (no regression).

**Checkpoint**: User Stories 1 AND 2 are functional. The two most critical write operations (item creation, rating submission) are now guarded.

---

## Phase 4: User Story 6 — Administrator Access Is Unaffected (Priority: P1)

**Goal**: Verify that the membership enforcement does NOT block administrators. Admins operate via `event.administrators`, not `event.users`, and must always retain write access.

**Independent Test**: Have an admin (who may or may not be in the users list) perform all write operations → all succeed.

### Implementation for User Story 6

- [X] T012 [US6] Write integration tests verifying administrator bypass in `backend/tests/integration/membership-enforcement.test.js` — test cases: (1) admin who is also in users list → POST /items succeeds; (2) admin NOT in users list → POST /items succeeds; (3) admin removed from users list but still in administrators → POST /items and POST /ratings both succeed.

**Checkpoint**: All P1 stories are verified. Core security fix is complete with admin safety confirmed.

---

## Phase 5: User Story 3 — Deleted Guest Cannot Modify or Delete Items (Priority: P2)

**Goal**: Extend membership enforcement to PATCH and DELETE item operations. Lower risk since items are cleaned up during deletion, but needed for watertight enforcement.

**Independent Test**: Delete a guest, then PATCH or DELETE an item → expect 403.

### Implementation for User Story 3

- [X] T013 [US3] Apply `requireEventMembership` middleware to PATCH `/:itemId` and DELETE `/:itemId` routes in `backend/src/api/items.js` — add per-route as additional middleware argument alongside validation. Pass `req.event` to service calls to avoid redundant `getEvent()` (FR-008).
- [X] T014 [P] [US3] Write integration tests for item modify/delete membership enforcement in `backend/tests/integration/membership-enforcement.test.js` — test cases: (1) deleted guest PATCH /items/:id → 403; (2) deleted guest DELETE /items/:id → 403; (3) active guest PATCH/DELETE → succeeds (no regression).

**Checkpoint**: All item write endpoints (POST, PATCH, DELETE) are guarded.

---

## Phase 6: User Story 4 — Deleted Guest Cannot Delete Ratings (Priority: P2)

**Goal**: Extend membership enforcement to DELETE rating operation. Completes write-endpoint coverage for ratings.

**Independent Test**: Delete a guest, then DELETE a rating → expect 403.

### Implementation for User Story 4

- [X] T015 [US4] Apply `requireEventMembership` middleware to DELETE `/ratings/:itemId` route in `backend/src/api/ratings.js` — add as additional middleware argument alongside `requireAuth`. Pass `req.event` to `ratingService.deleteRating()` to avoid redundant `getEvent()` (FR-008).
- [X] T016 [US4] Write integration test for rating delete membership enforcement in `backend/tests/integration/membership-enforcement.test.js` — test case: deleted guest DELETE /ratings/:itemId → 403.

**Checkpoint**: All rating write endpoints (POST, DELETE) are guarded. Full backend enforcement is complete.

---

## Phase 7: User Story 5 — Frontend Handles Membership Rejection Gracefully (Priority: P2)

**Goal**: When a deleted guest's action is rejected with `EVENT_MEMBERSHIP_REQUIRED`, display a blocking modal explaining access removal, then log the user out on dismissal.

**Independent Test**: Trigger a 403 membership error in the browser → modal appears → dismiss → user is logged out and redirected.

### Implementation for User Story 5

- [X] T017 [US5] Add `EVENT_MEMBERSHIP_REQUIRED` handler in `frontend/src/services/apiClient.js` — in the 403 handling block (after `EVENT_ACCESS_DENIED` check), detect `errorData.code === 'EVENT_MEMBERSHIP_REQUIRED'`, dispatch `window.dispatchEvent(new CustomEvent('membership-revoked', { detail: { message: errorData.error } }))`, and reject with descriptive error.
- [X] T018 [US5] Create `MembershipRevokedDialog` component in `frontend/src/components/MembershipRevokedDialog.jsx` — follows `DeleteUserDialog` visual pattern: `fixed inset-0 z-[110]`, backdrop `bg-black/50 backdrop-blur-sm`, `role="dialog"`, `aria-modal="true"`. Listens for `membership-revoked` custom event on mount. Message: "Your access to this event has been removed". Single "OK" button calls `apiClient.clearJWTToken()` then `window.location.href = '/'`.
- [X] T019 [US5] Mount `MembershipRevokedDialog` at app level in `frontend/src/App.jsx` so it is always rendered regardless of current route. Add `<MembershipRevokedDialog />` inside the root `<Router>` alongside the existing `<Toaster />`.
- [X] T020 [P] [US5] Write unit test for `MembershipRevokedDialog` in `frontend/tests/unit/MembershipRevokedDialog.test.jsx` — test cases: (1) does not render when no event dispatched; (2) renders modal when `membership-revoked` event fires; (3) calls `clearJWTToken` and redirects when OK button clicked; (4) modal blocks interaction (aria-modal).

**Checkpoint**: Full end-to-end UX is implemented. Deleted guests see a clear modal and are logged out.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E test, regression check, and manual validation

- [X] T021 [P] Write E2E test for full membership enforcement flow in `frontend/tests/e2e/specs/membership-enforcement.spec.js` — using `testEvent` fixture: (1) admin creates event; (2) guest joins and registers a bottle; (3) admin deletes guest via API; (4) guest attempts to register another bottle; (5) verify 403 response or modal appearance; (6) verify guest is logged out.
- [X] T022 Run full backend test suite (`cd backend && npm test`) and verify no regressions. Spot-check that guarded endpoints respond within acceptable latency (no significant degradation from the middleware layer, validates SC-002).
- [X] T023 Run full frontend test suite (`cd frontend && npm test`) and verify no regressions
- [X] T024 Execute quickstart.md manual testing flow: two browser windows, admin deletes guest, guest attempts action, verify modal + logout

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **US1 (Phase 2)**: Depends on Foundational completion
- **US2 (Phase 3)**: Depends on Foundational completion. Can run in parallel with US1.
- **US6 (Phase 4)**: Depends on US1 and US2 (needs routes guarded to test admin bypass)
- **US3 (Phase 5)**: Depends on Foundational completion. Can run in parallel with US1/US2.
- **US4 (Phase 6)**: Depends on Foundational completion. Can run in parallel with US1/US2/US3.
- **US5 (Phase 7)**: Depends on Foundational completion (needs backend error code). No backend dependency beyond the error format.
- **Polish (Phase 8)**: Depends on ALL user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only — independently testable after Phase 1
- **US2 (P1)**: Foundational only — independently testable after Phase 1
- **US6 (P1)**: US1 + US2 (tests admin access on guarded routes) — independently testable after Phase 3
- **US3 (P2)**: Foundational only — independently testable after Phase 1
- **US4 (P2)**: Foundational only — independently testable after Phase 1
- **US5 (P2)**: Foundational only (error code format) — independently testable after Phase 1

### Within Each User Story

- Apply middleware (implementation) before writing integration tests
- Integration tests validate the acceptance scenarios from spec.md

### Parallel Opportunities

- T002, T004, T006, T007 can all run in parallel (different files)
- US1, US2, US3, US4, US5 can all start in parallel after Foundational (Phase 1)
- T014, T020 are marked [P] within their phases
- T021 (E2E) can run in parallel with T022/T023 (regression checks)

---

## Parallel Example: After Foundational Phase

```text
# All user stories can start simultaneously after Foundational:
Stream A: T008, T009 (US1 — items POST guard)
Stream B: T010, T011 (US2 — ratings POST guard)
Stream C: T017, T018, T019 (US5 — frontend UX)

# After US1+US2:
Stream D: T012 (US6 — admin verification tests)

# Independent of US1/US2:
Stream E: T013, T014 (US3 — items PATCH/DELETE guard)
Stream F: T015, T016 (US4 — ratings DELETE guard)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001–T007)
2. Complete Phase 2: US1 (T008–T009)
3. **STOP and VALIDATE**: Delete a guest, attempt POST /items → 403. Active guest → 201.
4. Deploy if ready — the most critical data integrity gap is closed.

### Incremental Delivery

1. Foundational → Foundation ready
2. US1 → Item creation guard → **MVP deployed**
3. US2 → Rating submission guard → Both critical write paths secured
4. US6 → Admin verification → P1 stories fully validated
5. US3+US4 → Remaining write guards → Full backend enforcement
6. US5 → Frontend UX → Complete user experience
7. Polish → E2E + regression → Release-ready

### Solo Developer Strategy

1. Phase 1: Foundational (T001–T007) — ~1 session
2. Phase 2–4: All P1 stories (T008–T012) — ~1 session
3. Phase 5–7: All P2 stories (T013–T020) — ~1 session
4. Phase 8: Polish (T021–T024) — ~1 session

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- The `requireEventMembership` middleware is the single shared piece — applied per-route, not globally, to preserve ungated GET endpoints
- `req.event` optimization: middleware attaches the loaded event to avoid redundant `getEvent()` calls in services. Services that already call `getEvent()` can optionally check `req.event` first (optimization, not blocking).
- Integration tests all live in a single file (`membership-enforcement.test.js`) organized by describe blocks per user story
- US6 has no implementation tasks — admin bypass is built into `isEventMember()` in T001. Phase 4 is test-only to explicitly verify FR-005.
