# Tasks: OTP Authentication

**Input**: Design documents from `/specs/003-otp-auth/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: Tests are included as they are essential for authentication security and reliability.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure email service

- [x] T001 Install Resend package in backend/ (`npm install resend` in backend directory)
- [x] T002 [P] Add email configuration schema to config/default.json with email.resendApiKey and email.fromAddress fields (structure: `{ "email": { "resendApiKey": "", "fromAddress": "sreeni@7155421.xys" } }`). Environment variables RESEND_API_KEY and EMAIL_FROM_ADDRESS take precedence.
- [x] T003 [P] Add email configuration to config/development.json with test values (can use placeholder API key for local testing)
- [x] T004 [P] Add email configuration to config/staging.json with production values
- [x] T005 [P] Add email configuration to config/production.json with production values

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create EmailService in backend/src/services/EmailService.js with Resend integration. Service MUST read resendApiKey from config.get('email.resendApiKey') with RESEND_API_KEY environment variable override, and fromAddress from config.get('email.fromAddress') with EMAIL_FROM_ADDRESS environment variable override (per FR-012, FR-013)
- [x] T007 [P] Create OTPService in backend/src/services/OTPService.js with OTP generation and validation
- [x] T008 [P] Create RateLimitService in backend/src/services/RateLimitService.js with email and IP rate limiting
- [x] T009 [P] Create SuspensionService in backend/src/services/SuspensionService.js with suspension tracking
- [x] T010 [P] Write unit test for EmailService in backend/tests/unit/EmailService.test.js
- [x] T011 [P] Write unit test for OTPService in backend/tests/unit/OTPService.test.js
- [x] T012 [P] Write unit test for RateLimitService in backend/tests/unit/RateLimitService.test.js
- [x] T013 [P] Write unit test for SuspensionService in backend/tests/unit/SuspensionService.test.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Request OTP via Email (Priority: P1) 🎯 MVP

**Goal**: Users can request a 6-digit OTP code via email to begin authentication

**Independent Test**: Submit email address to OTP request endpoint and verify email is sent with valid 6-digit OTP code. Test can verify email delivery without requiring OTP verification.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T014 [P] [US1] Write integration test for OTP request endpoint in backend/tests/integration/auth.test.js (test email validation, rate limiting, suspension, email delivery)
- [x] T015 [P] [US1] Write E2E test for OTP request flow in frontend/tests/e2e/features/authentication.feature (Gherkin: Given user enters email, When requests OTP, Then email is sent)

### Implementation for User Story 1

- [x] T016 [US1] Create auth API router in backend/src/api/auth.js with POST /api/auth/otp/request endpoint
- [x] T017 [US1] Implement OTP request handler in backend/src/api/auth.js that validates email, checks rate limits, checks suspension, generates OTP, sends email, stores OTP
- [x] T018 [US1] Add email validation utility function in backend/src/services/EmailService.js
- [x] T019 [US1] Mount auth router in backend/src/api/index.js
- [x] T020 [US1] Create AuthPage component in frontend/src/pages/AuthPage.jsx with email input and request OTP button
- [x] T021 [US1] Add OTP request API method to frontend/src/services/apiClient.js
- [x] T022 [US1] Integrate AuthPage with apiClient for OTP request in frontend/src/pages/AuthPage.jsx
- [x] T023 [US1] Add route for /auth in frontend/src/App.jsx
- [x] T024 [US1] Add error handling and user feedback in frontend/src/pages/AuthPage.jsx for invalid email, rate limits, suspension, email failures

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can request OTP codes via email.

---

## Phase 4: User Story 2 - Verify OTP and Receive JWT Token (Priority: P1)

**Goal**: Users can verify OTP code and receive JWT token for authenticated access

**Independent Test**: Provide valid email and OTP code (from previous request) and verify JWT token is returned. Test can verify token validity without requiring full application access.

### Tests for User Story 2

- [x] T025 [P] [US2] Write integration test for OTP verification endpoint in backend/tests/integration/auth.test.js (test valid OTP, invalid OTP, expired OTP, failed attempts, suspension, test OTP bypass)
- [x] T026 [P] [US2] Write E2E test for OTP verification flow in frontend/tests/e2e/features/authentication.feature (Gherkin: Given user has OTP, When enters OTP, Then receives JWT token)

### Implementation for User Story 2

- [x] T027 [US2] Add POST /api/auth/otp/verify endpoint in backend/src/api/auth.js
- [x] T028 [US2] Implement OTP verification handler in backend/src/api/auth.js that validates OTP, checks expiration, handles test OTP, tracks failed attempts, suspends on max attempts, generates JWT token
- [x] T029 [US2] Add test OTP bypass logic in backend/src/api/auth.js (check NODE_ENV and OTP "123456")
- [x] T030 [US2] Add OTP verification API method to frontend/src/services/apiClient.js
- [x] T031 [US2] Add OTP input field and verify button to frontend/src/pages/AuthPage.jsx
- [x] T032 [US2] Integrate OTP verification with apiClient in frontend/src/pages/AuthPage.jsx
- [x] T033 [US2] Store JWT token in localStorage after successful verification in frontend/src/pages/AuthPage.jsx
- [x] T034 [US2] Add error handling for invalid OTP, expired OTP, suspension in frontend/src/pages/AuthPage.jsx
- [x] T035 [US2] Implement post-authentication redirect logic in frontend/src/pages/AuthPage.jsx (redirect to originally requested page or landing page)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can request and verify OTP codes to receive JWT tokens.

---

## Phase 5: User Story 3 - Access Protected Pages with Authentication (Priority: P2)

**Goal**: Protected pages require valid JWT token; unauthenticated users are redirected to landing page

**Independent Test**: Make requests to protected endpoints with valid JWT token (access granted) and with invalid/missing token (access denied). Test can verify access control without requiring full OTP flow.

### Tests for User Story 3

- [x] T036 [P] [US3] Write integration test for protected route middleware in backend/tests/integration/auth.test.js (test valid token, expired token, missing token, invalid token)
- [x] T037 [P] [US3] Write E2E test for protected page access in frontend/tests/e2e/features/authentication.feature (Gherkin: Given authenticated user, When accesses protected page, Then sees content; Given unauthenticated user, When accesses protected page, Then redirected to landing page)

### Implementation for User Story 3

- [x] T038 [US3] Create requireAuth middleware in backend/src/middleware/requireAuth.js that uses existing jwtAuth middleware
- [x] T039 [US3] Apply requireAuth middleware to protected API routes in backend/src/api/index.js (all routes except /health)
- [x] T040 [US3] Create ProtectedRoute component in frontend/src/components/ProtectedRoute.jsx that checks JWT token and redirects to landing page if missing
- [x] T041 [US3] Update frontend/src/App.jsx to wrap protected routes with ProtectedRoute component
- [x] T042 [US3] Add redirect state handling in frontend/src/components/ProtectedRoute.jsx to store intended destination
- [x] T043 [US3] Ensure landing page route (/) is accessible without authentication in frontend/src/App.jsx
- [x] T044 [US3] Update frontend/src/services/apiClient.js to include JWT token in Authorization header for all requests
- [x] T045 [US3] Handle 401 responses in frontend/src/services/apiClient.js by clearing token and redirecting to landing page
- [x] T046 [US3] Add token expiration handling in frontend/src/components/ProtectedRoute.jsx

**Checkpoint**: At this point, all three user stories should work together. Users can request OTP, verify OTP, receive JWT token, and access protected pages. Unauthenticated users are redirected to landing page.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T047 [P] Write comprehensive unit tests for edge cases in backend/tests/unit/OTPService.test.js (concurrent OTP requests, OTP invalidation, expiration)
- [ ] T048 [P] Write comprehensive unit tests for edge cases in backend/tests/unit/RateLimitService.test.js (email and IP limits, sliding window)
- [ ] T049 [P] Write comprehensive unit tests for edge cases in backend/tests/unit/SuspensionService.test.js (suspension expiration, failed attempt tracking)
- [ ] T050 [P] Write E2E test for test OTP bypass in frontend/tests/e2e/features/authentication.feature (test OTP "123456" in dev/test environments)
- [ ] T051 [P] Write E2E test for complete authentication flow in frontend/tests/e2e/features/authentication.feature (request OTP, verify OTP, access protected page)
- [ ] T052 Add error logging for authentication failures in backend/src/api/auth.js
- [ ] T053 Add performance monitoring for OTP generation and email delivery in backend/src/services/OTPService.js and EmailService.js
- [ ] T054 Update frontend/src/pages/AuthPage.jsx with loading states and better UX feedback
- [ ] T055 Add email template improvements in backend/src/services/EmailService.js (better formatting, branding)
- [ ] T056 Code cleanup and refactoring across all authentication-related files
- [ ] T057 Update documentation in README.md with authentication flow description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) can start after Foundational
  - User Story 2 (P1) depends on User Story 1 (needs OTP request endpoint)
  - User Story 3 (P2) depends on User Story 2 (needs JWT token generation)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 (needs OTP request to work first)
- **User Story 3 (P2)**: Depends on User Story 2 (needs JWT token generation to work first)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Services before endpoints
- Backend endpoints before frontend integration
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T005)
- All Foundational service creation tasks marked [P] can run in parallel (T007-T009)
- All Foundational test tasks marked [P] can run in parallel (T010-T013)
- All User Story 1 test tasks marked [P] can run in parallel (T014-T015)
- All User Story 2 test tasks marked [P] can run in parallel (T025-T026)
- All User Story 3 test tasks marked [P] can run in parallel (T036-T037)
- All Polish test tasks marked [P] can run in parallel (T047-T051)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write integration test for OTP request endpoint in backend/tests/integration/auth.test.js"
Task: "Write E2E test for OTP request flow in frontend/tests/e2e/features/authentication.feature"

# Then launch backend and frontend implementation in parallel (after tests):
Task: "Create auth API router in backend/src/api/auth.js"
Task: "Create AuthPage component in frontend/src/pages/AuthPage.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T013) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T014-T024)
4. **STOP and VALIDATE**: Test User Story 1 independently - users can request OTP via email
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: OTP request works!)
3. Add User Story 2 → Test independently → Deploy/Demo (Users can authenticate!)
4. Add User Story 3 → Test independently → Deploy/Demo (Protected pages work!)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (OTP request)
   - Developer B: Prepares for User Story 2 (can start after US1 complete)
   - Developer C: Prepares for User Story 3 (can start after US2 complete)
3. Stories complete sequentially (US1 → US2 → US3) due to dependencies

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- User Story 2 depends on User Story 1 (needs OTP request endpoint)
- User Story 3 depends on User Story 2 (needs JWT token generation)
- Test OTP "123456" only works in dev/test environments (NODE_ENV check)
- Rate limiting applies to both email AND IP independently
- Suspension blocks both OTP requests and verification
