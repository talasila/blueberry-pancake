# Tasks: Codebase Refactoring & Simplification

**Input**: Design documents from `/specs/034-codebase-refactor/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included per FR-017 — unit tests required for all newly extracted utilities and shared components.

**Organization**: Tasks grouped by user story. Strict phase gates enforced (FR-018): all P1 stories must complete before P2; all P2 before P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

---

## Phase 1: P1 Gate — User Story 1: Backend Utility Extraction (Priority: P1)

**Goal**: Eliminate duplicated backend utilities (cookie clearing, rate limit formatting, email normalization, timestamp formatting) and add tests for new extractions.

**Independent Test**: Run `cd backend && npm test` after each extraction. Verify all existing tests pass and new utility tests pass.

### Implementation for User Story 1

- [x] T001 [P] [US1] Extract `clearAuthCookies(res)` utility function into `backend/src/middleware/jwtAuth.js` alongside existing cookie option helpers
- [x] T002 [US1] Replace cookie-clearing blocks in `backend/src/api/auth.js` (lines ~279-291 and ~321-332) with calls to `clearAuthCookies(res)`
- [x] T003 [P] [US1] Extract `formatRateLimitResponse(res, result, message?)` into `backend/src/utils/apiErrorHandler.js`
- [x] T004 [US1] Replace rate-limit formatting in `backend/src/api/auth.js` (lines ~55-60 and ~77-82) and `backend/src/api/events.js` (lines ~249-254 and ~262-266) with calls to `formatRateLimitResponse()`
- [x] T005 [P] [US1] Create `backend/src/utils/timestamps.js` with `getCurrentTimestamp(options?)` utility supporting optional `{ stripMs: true }` for millisecond-free format
- [x] T006 [US1] Replace all `new Date().toISOString()` calls in `backend/src/services/EventService.js` (~20 instances) with `getCurrentTimestamp()`
- [x] T007 [P] [US1] Replace all `new Date().toISOString()` calls in `backend/src/services/ItemService.js` (~6 instances) with `getCurrentTimestamp()`
- [x] T008 [P] [US1] Replace `new Date().toISOString().replace(...)` in `backend/src/services/RatingService.js` (line ~85) with `getCurrentTimestamp({ stripMs: true })`
- [x] T009 [US1] Replace all manual `.trim().toLowerCase()` email normalization with `normalizeEmail()` import in `backend/src/api/auth.js` (~2 instances)
- [x] T010 [P] [US1] Replace all manual `.trim().toLowerCase()` email normalization with `normalizeEmail()` import in `backend/src/api/events.js` (~4 instances)
- [x] T011 [P] [US1] Replace all manual `.trim().toLowerCase()` email normalization with `normalizeEmail()` in `backend/src/services/EventService.js` (~5 instances that don't already use the utility)
- [x] T012 [P] [US1] Replace all manual `.trim().toLowerCase()` email normalization with `normalizeEmail()` in `backend/src/services/ItemService.js` (~5 instances)
- [x] T013 [P] [US1] Replace all manual `.trim().toLowerCase()` email normalization with `normalizeEmail()` in `backend/src/services/DashboardService.js` (~2 instances)
- [x] T014 [US1] Search exhaustively for all imports of `isValidEmail` from `EmailService` across `backend/src/`, then remove the `isValidEmail()` wrapper method from `backend/src/services/EmailService.js` (lines ~58-60) and update all callers (including `backend/src/api/auth.js`) to import `isValidEmail` directly from `backend/src/utils/emailUtils.js`
- [x] T015 [P] [US1] Write unit tests for `clearAuthCookies()` in `backend/tests/unit/middleware/jwtAuth.test.js`
- [x] T016 [P] [US1] Write unit tests for `formatRateLimitResponse()` in `backend/tests/unit/utils/apiErrorHandler.test.js`
- [x] T017 [P] [US1] Write unit tests for `getCurrentTimestamp()` (both standard and stripMs modes) in `backend/tests/unit/utils/timestamps.test.js`
- [x] T018 [US1] Run full backend test suite (`cd backend && npm test`) and verify all tests pass

**Checkpoint**: All backend utility duplication eliminated. SC-002 (zero manual email normalization) and SC-003 (cookie clearing in 1 location) verified. Existing tests pass.

---

## Phase 2: P1 Gate — User Story 2: Frontend Wrapper Removal & Validation Consolidation (Priority: P1)

**Goal**: Remove unnecessary frontend wrappers (useQuotes, usePINVerification, dashboardService), consolidate event ID validation, remove EmailService.isValidEmail wrapper.

**Independent Test**: Run `cd frontend && npm test` and `cd frontend && npm run test:e2e` after each removal. All consumers function identically.

### Implementation for User Story 2

- [x] T019 [US2] Search exhaustively for all imports of `useQuotes` across `frontend/src/` and update `frontend/src/components/RatingForm.jsx` (line ~6) to import `quoteService` directly from `frontend/src/services/quoteService.js`
- [x] T020 [US2] Delete `frontend/src/hooks/useQuotes.js`
- [x] T021 [US2] Search exhaustively for all imports of `usePINVerification` across `frontend/src/` and update any consumers to import `usePIN` directly from `frontend/src/contexts/PINContext.jsx`
- [x] T022 [US2] Delete `frontend/src/hooks/usePINVerification.js`
- [x] T023 [US2] Search exhaustively for all imports of `dashboardService` across `frontend/src/` (DashboardPage.jsx, ItemDetailsDrawer.jsx, EventPage.jsx) and replace with direct `apiClient.get('/events/${eventId}/dashboard')` calls. Note: inlining 3 identical one-line calls is an intentional DRY exception — the removed wrapper added indirection without value
- [x] T024 [US2] Delete `frontend/src/services/dashboardService.js`
- [x] T025 [US2] Update `frontend/src/utils/serviceValidation.js` to remove `validateEventId()` function (keep `validateItemId()`)
- [x] T026 [US2] Update `frontend/src/services/ratingService.js` to replace inline event ID validation (lines ~133-135 and ~159-161) with import from `frontend/src/utils/eventIdValidation.js`
- [x] T027 [US2] Update `frontend/src/services/itemService.js` to replace `validateEventId` import from `serviceValidation.js` with import from `frontend/src/utils/eventIdValidation.js`
- [x] T028 [US2] Write unit test for consolidated event ID validation in `frontend/tests/unit/utils/eventIdValidation.test.js` covering valid IDs, invalid formats, edge cases (null, undefined, wrong length)
- [x] T029 [US2] Run full frontend test suite (`cd frontend && npm test`) and E2E suite (`cd frontend && npm run test:e2e`) — verify all tests pass

**Checkpoint**: SC-008 (zero unnecessary wrappers) and SC-009 (single validation module) verified. P1 gate complete — all P1 work merged before proceeding.

---

## Phase 3: P2 Gate — User Story 3: Delete Dialog Consolidation (Priority: P2)

**Goal**: Consolidate 4 delete dialog components into a single reusable `DestructiveActionDialog` with configurable props, reducing ~350 lines of duplication.

**Independent Test**: Open each delete action (delete user, delete event, delete ratings, delete all users) in the UI. Verify confirmation flow, styling, keyboard handlers, loading state, and error display match original exactly.

### Implementation for User Story 3

- [x] T030 [US3] Create `frontend/src/components/DestructiveActionDialog.jsx` with props: `isOpen`, `onClose`, `onConfirm`, `isDeleting`, `title`, `description`, `confirmationText`, `icon`, `children`
- [x] T031 [US3] Implement shared patterns in `DestructiveActionDialog`: backdrop/overlay, header (icon + title + close button), confirmation input with phrase matching, keyboard handlers (Enter/Escape), footer buttons with loading state
- [x] T032 [US3] Replace `frontend/src/components/DeleteEventDialog.jsx` with `DestructiveActionDialog` usage (pass title="Delete Event", confirmationText="DELETE", unique content as children)
- [x] T033 [US3] Replace `frontend/src/components/DeleteRatingsDialog.jsx` with `DestructiveActionDialog` usage (pass title="Delete All Ratings", confirmationText="DELETE RATINGS", unique content as children)
- [x] T034 [US3] Replace `frontend/src/components/DeleteAllUsersDialog.jsx` with `DestructiveActionDialog` usage (pass title="Delete All Users", confirmationText="DELETE ALL USERS", unique content as children)
- [x] T035 [US3] Replace `frontend/src/components/DeleteUserDialog.jsx` with `DestructiveActionDialog` usage (pass title="Delete User", confirmationText="DELETE USER", unique content including items/ratings counts and admin warning as children)
- [x] T036 [US3] Delete original dialog files after all consumers are updated: `DeleteEventDialog.jsx`, `DeleteRatingsDialog.jsx`, `DeleteAllUsersDialog.jsx`, `DeleteUserDialog.jsx`
- [x] T037 [US3] Update all parent components that import the deleted dialog files to import `DestructiveActionDialog` instead
- [x] T038 [P] [US3] Write unit test for `DestructiveActionDialog` in `frontend/tests/unit/components/DestructiveActionDialog.test.jsx` covering: rendering, confirmation phrase matching, keyboard handlers, loading state, onConfirm callback
- [x] T039 [US3] Verify SC-001: count total lines across dialog files and confirm reduction of at least 300 lines

**Checkpoint**: SC-001 verified (300+ line reduction). All 4 delete flows work identically to originals.

---

## Phase 4: P2 Gate — User Story 4: Route Protection & Header Refactor (Priority: P2)

**Goal**: Extract shared route protection into RouteGuard wrapper. Refactor Header.jsx with useDarkMode hook and data-driven menu items.

**Independent Test**: Navigate to protected/admin/dashboard routes in various auth states. Verify menu rendering, theme toggle, dark mode detection in Header.

### Implementation for User Story 4

- [x] T040 [P] [US4] Create `frontend/src/components/RouteGuard.jsx` accepting `checkPermission` async callback, `redirectTo` path, and optional `loadingText` — renders shared loading spinner while checking, redirects on failure
- [x] T041 [US4] Refactor `frontend/src/components/ProtectedRoute.jsx` to use `RouteGuard` with JWT authentication check
- [x] T042 [US4] Refactor `frontend/src/components/AdminRoute.jsx` to use `RouteGuard` with admin permission check
- [x] T043 [US4] Refactor `frontend/src/components/DashboardRoute.jsx` to use `RouteGuard` with admin-or-completed permission check
- [x] T044 [P] [US4] Create `frontend/src/hooks/useDarkMode.js` hook extracting MutationObserver logic from Header.jsx (lines ~35-44) — returns `{ isDark, toggleDark }`
- [x] T045 [US4] Refactor `frontend/src/components/Header.jsx`: replace inline MutationObserver with `useDarkMode()` hook import
- [x] T046 [US4] Refactor `frontend/src/components/Header.jsx`: define menu items as a declarative data array with `{ label, icon, onClick, visible: (ctx) => boolean }` and render by mapping/filtering the array
- [x] T047 [P] [US4] Write unit test for `useDarkMode` hook in `frontend/tests/unit/hooks/useDarkMode.test.js`
- [x] T048 [P] [US4] Write unit test for `RouteGuard` in `frontend/tests/unit/components/RouteGuard.test.jsx` covering: loading state, successful permission, failed permission redirect
- [x] T049 [US4] Run frontend test suite and E2E tests to verify no regressions

**Checkpoint**: Route protection uses shared abstraction. Header is data-driven with extracted dark mode hook.

---

## Phase 5: P2 Gate — User Story 5: Error Handling Standardization & RatingForm Utilities (Priority: P2)

**Goal**: Adopt `handleApiError()` in all backend routes. Extract RatingForm retry and character-limit logic into reusable utilities.

**Independent Test**: Trigger error conditions across API endpoints — verify consistent 4xx/5xx response formats. Unit test retry and char-limit utilities.

### Implementation for User Story 5

- [x] T050 [P] [US5] Add `handleApiError` import to `backend/src/api/auth.js` and wrap all catch blocks with `handleApiError()` calls, removing manual error classification
- [x] T051 [P] [US5] Add `handleApiError` import to `backend/src/api/quotes.js` and wrap error handling with `handleApiError()`
- [x] T052 [P] [US5] Add `handleApiError` import to `backend/src/api/system.js` and wrap error handling with `handleApiError()`
- [x] T053 [US5] Remove manual `error.message.includes('not found')` pattern in `backend/src/api/events.js` (line ~130) — replace with `handleApiError()` or throw typed error from service layer
- [x] T054 [P] [US5] Create `frontend/src/utils/retryWithBackoff.js` with `retryWithBackoff(fn, maxRetries, baseDelay)` utility — supports `isRetryable` check for network/5xx/timeout errors, exponential backoff
- [x] T055 [P] [US5] Create `frontend/src/utils/appendWithCharLimit.js` with `appendWithCharLimit(existingText, newText, maxLength)` utility — appends with space separator, truncates intelligently at word boundary if over limit
- [x] T056 [US5] Refactor `frontend/src/components/RatingForm.jsx`: replace inline retry logic (lines ~184-237) with `retryWithBackoff()` import
- [x] T057 [US5] Refactor `frontend/src/components/RatingForm.jsx`: replace inline `appendSuggestionWithLimit()` (lines ~122-146) with `appendWithCharLimit()` import, remove unused `appendSuggestion()` function (lines ~105-113)
- [x] T058 [P] [US5] Write unit tests for `retryWithBackoff()` in `frontend/tests/unit/utils/retryWithBackoff.test.js` covering: successful first attempt, retry on failure, max retries exceeded, backoff timing
- [x] T059 [P] [US5] Write unit tests for `appendWithCharLimit()` in `frontend/tests/unit/utils/appendWithCharLimit.test.js` covering: normal append, at limit, over limit truncation, empty inputs
- [x] T060 [US5] Run full backend test suite and frontend test suite — verify SC-010 (zero manual error.message pattern matching in api/)

**Checkpoint**: SC-010 verified. All P2 work complete. P2 gate passed — can proceed to P3.

---

## Phase 6: P3 — User Story 6: Large File Splits (Priority: P3)

**Goal**: Split ItemDetailsDrawer.jsx (589→~300 lines) by extracting calculations and sorting. Split EventService.js (2,146 lines) into 3 focused services.

**Independent Test**: Open item details drawer — verify all calculations, sorting, and display correct. Exercise all event management API endpoints — verify identical behavior.

### Implementation for User Story 6 — Frontend (ItemDetailsDrawer)

- [x] T061 [P] [US6] Create `frontend/src/utils/itemCalculations.js` with extracted functions: `calculateRatingDistribution(ratings)`, `calculateWeightedAverage(itemRatings, allRatings, totalUsers)`, `calculateItemRank(itemId, dashboardData)`, `calculateRatingProgression(itemRatings, totalUsers)`
- [x] T062 [P] [US6] Create `frontend/src/hooks/useColumnSort.js` hook with `useColumnSort(defaultColumn, defaultDirection)` — returns `{ sortColumn, sortDirection, handleSort, sortItems(items, comparators) }`
- [x] T063 [US6] Refactor `frontend/src/components/ItemDetailsDrawer.jsx`: replace 6 useMemo calculation blocks (lines ~160-272) with imports from `itemCalculations.js`
- [x] T064 [US6] Refactor `frontend/src/components/ItemDetailsDrawer.jsx`: replace inline sorting state and logic (lines ~274-313) with `useColumnSort()` hook
- [x] T065 [P] [US6] Write unit tests for `itemCalculations.js` functions in `frontend/tests/unit/utils/itemCalculations.test.js` covering: empty ratings, single rating, normal distribution, edge cases
- [x] T066 [P] [US6] Write unit tests for `useColumnSort` hook in `frontend/tests/unit/hooks/useColumnSort.test.js` covering: default state, column toggle, direction flip, sort function
- [x] T067 [US6] Verify SC-006: confirm ItemDetailsDrawer.jsx is 350 lines or fewer

### Implementation for User Story 6 — Backend (EventService Split)

- [x] T068 [US6] Create `backend/src/services/EventAdminService.js` — move methods from EventService.js: `getAdministrators`, `addAdministrator`, `deleteAdministrator`, `regeneratePIN`, `deleteUser`, `deleteAllUsers`, `deleteAllRatingsAndBookmarks`, `deleteAllBookmarks`. Import `getEvent`, `isAdministrator`, `isOwner`, `updateEvent`, `normalizeEmail` from EventService.
- [x] T069 [US6] Create `backend/src/services/EventConfigService.js` — move methods from EventService.js: `getRatingConfiguration`, `updateRatingConfiguration`, `validateMaxRatingChange`, `validateRatingConfiguration`, `getItemConfiguration`, `getRegisteredItemsCount`, `updateItemConfiguration`, `normalizeExcludedItemIds`, `updateTheme`, `getUserBookmarks`, `saveUserBookmarks`, `getUserProfile`, `updateUserName`, `convertColorToHex`, `generateDefaultRatings`. Import shared helpers from EventService.
- [x] T070 [US6] Trim `backend/src/services/EventService.js` to core responsibilities: `createEvent`, `getEvent`, `updateEvent`, `deleteEvent`, `generateEventId`, `transitionState`, `validateStateTransition`, `registerUser`, `isAdministrator`, `isOwner`, `isEventMember`, `isValidEmail`, `normalizeEmail`, `migrateAdministratorField`, `migrateLegacyState`, `validateEventName`, `validateTypeOfItem`, `validateTheme`, `isValidState`, `getEventsByAdministrator`, `getEventSummariesByAdministrator`
- [x] T071 [US6] Update `backend/src/api/events.js` to import from `EventAdminService` and `EventConfigService` for the moved methods (24 method usages to audit)
- [x] T072 [P] [US6] Update `backend/src/api/items.js` and `backend/src/api/dashboard.js` imports if they reference any moved methods
- [x] T073 [US6] Verify no circular dependencies: run `node -e "import('./backend/src/services/EventService.js')"` and same for EventAdminService and EventConfigService
- [x] T074 [US6] Verify SC-007: confirm EventService.js split into 3+ files, none exceeding 300 lines. If core EventService.js still exceeds 300 lines after T070, extract a 4th service (e.g., `EventMemberService.js` for user/member operations) to meet the target
- [x] T075 [US6] Run full backend test suite and frontend E2E tests — verify all existing tests pass

**Checkpoint**: SC-006 and SC-007 verified. All user stories complete.

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Final verification of all success criteria across the full codebase.

- [x] T076 [Cross-cutting] Verify SC-002: grep for `.trim().toLowerCase()` in `backend/src/` — confirm zero manual email normalization instances remain
- [x] T077 [Cross-cutting] Verify SC-003: grep for `clearCookie` in `backend/src/` — confirm cookie-clearing logic exists in exactly 1 utility
- [x] T078 [Cross-cutting] Verify SC-008: confirm `frontend/src/hooks/useQuotes.js`, `frontend/src/hooks/usePINVerification.js`, and `frontend/src/services/dashboardService.js` are deleted
- [x] T079 [Cross-cutting] Verify SC-009: grep for `validateEventId` and `isValidEventId` in `frontend/src/` — confirm all imports reference `frontend/src/utils/eventIdValidation.js`
- [x] T080 [Cross-cutting] Verify SC-010: grep for `error.message.includes` in `backend/src/api/` — confirm zero manual pattern-matching instances remain
- [x] T081 [Cross-cutting] Verify SC-011: confirm every new utility and component has at least one unit test
- [x] T082 [Cross-cutting] Run full backend test suite: `cd backend && npm test`
- [x] T083 [Cross-cutting] Run full frontend test suite: `cd frontend && npm test`
- [x] T084 [Cross-cutting] Run full E2E test suite: `cd frontend && npm run test:e2e` — 351/353 pass, 2 pre-existing flaky failures (otp-auth visibility timeout, personality-card click timeout)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies — can start immediately
- **Phase 2 (US2)**: No dependency on Phase 1 — can run in parallel with Phase 1 within the P1 tier
- **P1 Gate**: Both Phase 1 AND Phase 2 must complete before any P2 work begins (FR-018)
- **Phases 3, 4, 5 (US3, US4, US5)**: All depend on P1 gate — can run in parallel with each other within P2
- **P2 Gate**: Phases 3, 4, AND 5 must complete before P3 work begins (FR-018)
- **Phase 6 (US6)**: Depends on P2 gate
- **Phase 7 (Polish)**: Depends on Phase 6 completion

### User Story Dependencies

- **US1 (P1)**: Independent — backend utility extraction
- **US2 (P1)**: Independent — frontend wrapper removal. Can run in parallel with US1
- **US3 (P2)**: Depends on P1 gate. Independent of US4, US5
- **US4 (P2)**: Depends on P1 gate. Independent of US3, US5
- **US5 (P2)**: Depends on P1 gate. Independent of US3, US4
- **US6 (P3)**: Depends on P2 gate. Builds on patterns established in earlier phases

### Within Each User Story

- Extract/create new files before updating consumers
- Update all consumers before deleting old files
- Run tests after each logical group of changes
- Verify success criteria at checkpoint

### Parallel Opportunities

**Within P1 tier:**
- US1 and US2 can run fully in parallel (backend vs frontend, no file overlap)

**Within P2 tier:**
- US3, US4, and US5 can run in parallel (different component sets, no file overlap)
- Within US1: T001/T003/T005 can run in parallel (different new utility files)
- Within US1: T007/T008/T010/T011/T012/T013 can run in parallel (different service files)
- Within US3: T038 can run in parallel with T032-T037

**Within P3:**
- Frontend work (T061-T067) and backend work (T068-T075) in US6 can run in parallel

---

## Parallel Example: P1 Tier

```bash
# US1 and US2 can run simultaneously:
Agent A: T001-T018 (backend utility extraction)
Agent B: T019-T029 (frontend wrapper removal)

# Within US1, these can run in parallel:
Task: T001 "Extract clearAuthCookies in backend/src/middleware/jwtAuth.js"
Task: T003 "Extract formatRateLimitResponse in backend/src/utils/apiErrorHandler.js"
Task: T005 "Create getCurrentTimestamp in backend/src/utils/timestamps.js"
```

## Parallel Example: P2 Tier

```bash
# US3, US4, US5 can run simultaneously:
Agent A: T030-T039 (delete dialog consolidation)
Agent B: T040-T049 (route protection + Header)
Agent C: T050-T060 (error handling + RatingForm utilities)
```

---

## Implementation Strategy

### MVP First (P1 Only)

1. Complete Phase 1 (US1) + Phase 2 (US2) in parallel
2. **STOP and VALIDATE**: Run all test suites, verify SC-002, SC-003, SC-008, SC-009
3. Merge P1 work

### Incremental Delivery

1. P1 tier → Merge → Backend cleaner, frontend simpler
2. P2 tier → Merge → Components consolidated, patterns standardized
3. P3 tier → Merge → Large files split, single-responsibility services
4. Each tier delivers measurable improvement without breaking prior work

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability; [Cross-cutting] for Phase 7 verification tasks
- Strict phase gates: P1 → P2 → P3 (FR-018)
- Tests required for all newly extracted utilities (FR-017)
- No user-visible behavior changes permitted (FR-016)
- Exhaustively search imports before deleting any file
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Test tasks are ordered after their corresponding extraction tasks for clarity; implementers SHOULD write tests alongside or immediately after each extraction per Constitution IV (TDD preferred)
