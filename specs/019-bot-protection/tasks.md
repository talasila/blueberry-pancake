# Tasks: Bot Protection

**Input**: Design documents from `/specs/019-bot-protection/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Unit tests are included for new backend services (constitution principle IV requires tests for business logic).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration, environment files, and CSP updates that all user stories depend on

- [x] T001 Add Turnstile script tag to `frontend/index.html` (async defer, `https://challenges.cloudflare.com/turnstile/v0/api.js`)
- [x] T002 [P] Create `frontend/.env.development` with `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000BB` (invisible always-pass test key)
- [x] T003 [P] Add `VITE_TURNSTILE_SITE_KEY` placeholder to `frontend/.env.production`
- [x] T004 [P] Update Helmet CSP in `backend/src/app.js` to allow `https://challenges.cloudflare.com` in `scriptSrc` and add `frameSrc` directive for `https://challenges.cloudflare.com`
- [x] T005 [P] Add `TurnstileSecretKey` parameter and `TURNSTILE_SECRET_KEY` environment variable to `template.yaml`
- [x] T006 [P] Add `VITE_TURNSTILE_SITE_KEY` to frontend build command in `scripts/deploy-prod.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend services and frontend hook that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create `backend/src/services/TurnstileService.js` — Cloudflare siteverify API client with: `verify(token, remoteIP)` method, hardcoded test secret key default for non-production (`1x0000000000000000000000000000000AA`), production startup validation (FR-018), fail-open on network errors (FR-013), logging on rejection (FR-017)
- [x] T008 [P] Add `checkGlobalLimit()` method to `backend/src/services/RateLimitService.js` — uses identifier `global` with action `otp-request`, 60-second window, 100/min production limit, 10000/min dev/test limit, fail-open on DynamoDB errors (FR-014)
- [x] T009 [P] Create `backend/src/middleware/turnstileProtection.js` — reusable verification function (designed for inline invocation within route handlers, not route-level middleware, so callers control evaluation order). Extracts `turnstileToken` from request body or query params, calls TurnstileService.verify(), returns generic 400 error on invalid/expired tokens (FR-009), fails open when token is missing (FR-019). Non-production environments use always-pass test keys (FR-011) — verification runs but always succeeds.
- [x] T010 [P] Create `frontend/src/hooks/useTurnstile.js` — React hook that: renders Turnstile widget via explicit `turnstile.render()` API, exposes `{ token, isLoading, error, resetWidget }`, fails open if `window.turnstile` is undefined (FR-019), uses site key from `import.meta.env.VITE_TURNSTILE_SITE_KEY`
- [x] T011 [P] Write unit tests for TurnstileService in `backend/tests/unit/TurnstileService.test.js` — test: successful verification, invalid token rejection, network timeout fail-open, missing secret key in production, generic error response
- [x] T012 [P] Write unit tests for global rate limit in `backend/tests/unit/globalRateLimit.test.js` — test: requests within limit allowed, requests exceeding limit rejected, window reset after expiry, fail-open on DynamoDB error, environment-specific thresholds
- [x] T012b [P] Write unit tests for turnstile verification function in `backend/tests/unit/turnstileProtection.test.js` — test: valid token passes through, invalid token returns generic 400, missing token fails open (FR-019), query param extraction for GET endpoints, request body extraction for POST endpoints

**Checkpoint**: Foundation ready — TurnstileService, global rate limit, turnstile verification, and frontend hook are all independently testable

---

## Phase 3: User Story 1 — Legitimate User Requests OTP Without Friction (Priority: P1) 🎯 MVP

**Goal**: A user can sign in via the AuthPage with an invisible Turnstile challenge completing in the background. The OTP arrives normally with no visible CAPTCHA.

**Independent Test**: Sign in with a valid email on AuthPage and confirm OTP email is received without any visible challenge.

### Implementation for User Story 1

- [x] T013 [US1] Integrate `useTurnstile` hook into `frontend/src/pages/AuthPage.jsx` — render widget container div, obtain token before OTP request, show "Preparing..." state during widget load
- [x] T014 [US1] Update `requestOTP(email)` method in `frontend/src/services/apiClient.js` to accept and pass `turnstileToken` parameter in request body
- [x] T015 [US1] Add Turnstile verification to `POST /api/auth/otp/request` handler in `backend/src/api/auth.js` — invoke `turnstileProtection` inline after email validation and before global rate limit check (evaluation order: email → Turnstile → global → suspension → per-email/IP per contracts/turnstile-verification.md)
- [x] T016 [US1] Add global rate limit check to `POST /api/auth/otp/request` handler in `backend/src/api/auth.js` — call `rateLimitService.checkGlobalLimit()` after Turnstile verification and before suspension check, return 429 with retry-after on limit exceeded

**Checkpoint**: User Story 1 complete — OTP request flow works end-to-end with Turnstile + global rate limit. Legitimate users see no friction.

---

## Phase 4: User Story 2 — Bot Spray Attack Is Blocked (Priority: P1)

**Goal**: Distributed spray attacks sending OTP requests across many different email addresses are capped at 100/minute regardless of IP rotation.

**Independent Test**: Send >100 OTP requests within 1 minute and verify excess requests are rejected with 429 status before any emails are sent.

### Implementation for User Story 2

- [x] T017 [US2] Verify global rate limit returns 429 with `retryAfter` seconds in response body from `backend/src/api/auth.js` — confirm error message format matches FR-003 ("Too many requests. Please try again in N minute(s).")
- [x] T018 [US2] Verify global rate limit is evaluated before per-email/IP limits in `backend/src/api/auth.js` — confirm evaluation order: Turnstile → global → suspension → per-email/IP (FR-004)

**Checkpoint**: User Story 2 complete — spray attacks are capped. This was largely implemented by T008 and T016; this phase confirms correct integration and error responses.

---

## Phase 5: User Story 3 — Direct API Bot With Forged Token Is Rejected (Priority: P1)

**Goal**: Direct curl/HTTP requests to the OTP endpoint with invalid/expired Turnstile tokens are rejected with a generic error. Tokenless requests fail open but face all rate limits.

**Independent Test**: Send a curl request to `/api/auth/otp/request` with `{"email": "test@example.com", "turnstileToken": "invalid"}` and verify a 400 response. Send another without a token and verify it proceeds to rate limit checks.

### Implementation for User Story 3

- [x] T019 [US3] Verify turnstile verification in `backend/src/api/auth.js` fails open for missing token (FR-019) and returns generic 400 error for invalid/expired tokens (FR-009 — "Request could not be processed. Please try again.")
- [x] T020 [US3] Verify turnstile verification in `backend/src/api/auth.js` returns generic 400 error for invalid/expired tokens — test with malformed token string
- [x] T021 [US3] Verify Turnstile rejection is logged in `backend/src/middleware/turnstileProtection.js` — confirm log entry includes client IP and request path (FR-017)

**Checkpoint**: User Story 3 complete — bots with forged tokens are blocked; tokenless requests face all rate limits. This was largely implemented by T009 and T015; this phase confirms correct behavior and logging.

---

## Phase 6: User Story 4 — Email Entry Page Protection (Priority: P2)

**Goal**: The event email entry page (EmailEntryPage) is protected by Turnstile to prevent admin email enumeration via the check-admin endpoint.

**Independent Test**: Access an event email entry page, enter an email, and confirm routing works correctly with no visible CAPTCHA.

### Implementation for User Story 4

- [x] T022 [US4] Integrate `useTurnstile` hook into `frontend/src/pages/EmailEntryPage.jsx` — render widget container div, obtain token before admin check submission
- [x] T023 [US4] Update `checkEventAdmin(eventId, email)` method in `frontend/src/services/apiClient.js` to accept and pass `turnstileToken` as query parameter
- [x] T024 [US4] Add Turnstile verification to `GET /api/events/:eventId/check-admin` handler in `backend/src/api/events.js` — extract token from query params, verify via TurnstileService, return generic 400 on failure

**Checkpoint**: User Story 4 complete — email entry page protected. Admin enumeration via direct API calls is blocked.

---

## Phase 7: User Story 5 — Automated Tests Continue to Pass (Priority: P2)

**Goal**: All existing E2E and smoke tests pass without modification when bot protection is enabled.

**Independent Test**: Run the full E2E and smoke test suites and verify all tests pass.

### Implementation for User Story 5

- [x] T025 [US5] Verify `backend/src/services/TurnstileService.js` defaults to always-pass test secret key when `NODE_ENV` is not production — confirm test environments bypass Turnstile verification automatically
- [x] T026 [US5] Verify `frontend/.env.development` contains always-pass test site key — confirm `useTurnstile` hook produces valid tokens in test environments
- [x] T027 [US5] Run existing E2E test suite (`frontend/tests/e2e/`) against local dev environment with bot protection enabled — confirm all tests pass without modification
- [x] T028 [US5] Verify production startup validation in `backend/src/services/TurnstileService.js` rejects the test secret key when `NODE_ENV=production` (FR-012, FR-018)

**Checkpoint**: User Story 5 complete — development workflow is unaffected by bot protection.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge case handling, and documentation

- [x] T029 Verify fail-open behavior when Turnstile siteverify is unreachable — confirm `backend/src/services/TurnstileService.js` handles network timeouts gracefully and allows request through
- [x] T030 [P] Verify fail-open behavior when DynamoDB is unavailable — confirm `backend/src/services/RateLimitService.js` `checkGlobalLimit()` allows request through on error
- [x] T031 [P] Verify `frontend/src/hooks/useTurnstile.js` fail-open when Turnstile script is blocked (ad blocker simulation) — confirm form submits with null token
- [x] T032 Run `specs/019-bot-protection/quickstart.md` validation — follow setup guide end-to-end and confirm it works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Phase 2 — no dependencies on other stories
  - US2 (Phase 4): Depends on US1 (T016 implements the global rate limit integration)
  - US3 (Phase 5): Depends on US1 (T015 implements the Turnstile integration)
  - US4 (Phase 6): Can start after Phase 2 — independent of US1/2/3 (different page/endpoint)
  - US5 (Phase 7): Depends on US1 and US4 (needs bot protection active to verify bypasses)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — this is the MVP
- **US2 (P1)**: Depends on US1 (global rate limit integrated in T016)
- **US3 (P1)**: Depends on US1 (Turnstile verification integrated in T015)
- **US4 (P2)**: Foundation only — can proceed in parallel with US1
- **US5 (P2)**: Depends on US1 + US4 (needs both protected forms active)

### Within Each User Story

- Backend services before API route integration
- Frontend hook before page integration
- Page integration before API client updates (or parallel if different files)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T006 touch different files)
- All Foundational tasks marked [P] can run in parallel (T008-T012 touch different files)
- US1 (Phase 3) and US4 (Phase 6) can proceed in parallel after Foundation
- Within Foundation: TurnstileService (T007), RateLimitService (T008), middleware (T009), hook (T010) are all independent files

---

## Parallel Example: Foundational Phase

```bash
# These can all run in parallel (different files):
Task T007: "Create TurnstileService in backend/src/services/TurnstileService.js"
Task T008: "Add checkGlobalLimit() to backend/src/services/RateLimitService.js"
Task T009: "Create turnstileProtection in backend/src/middleware/turnstileProtection.js"
Task T010: "Create useTurnstile hook in frontend/src/hooks/useTurnstile.js"
Task T011: "Unit tests for TurnstileService in backend/tests/unit/TurnstileService.test.js"
Task T012: "Unit tests for global rate limit in backend/tests/unit/globalRateLimit.test.js"
Task T012b: "Unit tests for turnstile verification in backend/tests/unit/turnstileProtection.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T012b)
3. Complete Phase 3: User Story 1 (T013-T016)
4. **STOP and VALIDATE**: Test OTP request flow end-to-end — legitimate user sees no friction
5. Deploy/demo if ready — spray attack protection (US2) and bot rejection (US3) are already active via the same code

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (AuthPage + OTP endpoint) → Test → Deploy (MVP — covers US1, US2, US3 simultaneously)
3. US4 (EmailEntryPage) → Test → Deploy (extends protection to admin enumeration)
4. US5 (test validation) → Confirm all suites pass
5. Polish → Edge cases, fail-open verification, quickstart validation

### Key Insight

User Stories 1, 2, and 3 share the same implementation code (Turnstile + global rate limit on the OTP endpoint). US1 delivers the user-facing flow; US2 and US3 are verification phases confirming the protection works correctly for different attack vectors. The true MVP is completing Phase 3 (US1), which simultaneously delivers US2 and US3.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new npm dependencies — backend uses native `fetch`, frontend uses script tag
- Test keys are hardcoded defaults — zero-config for development
- Commit after each phase for clean rollback points
- Stop at any checkpoint to validate independently
