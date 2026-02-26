# Feature Specification: Bot Protection for OTP and Email Entry Endpoints

**Feature Branch**: `019-bot-protection`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Add global rate limiting and Cloudflare Turnstile bot protection to OTP request and email entry endpoints to prevent spray attacks, email bombing, and admin email enumeration."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Legitimate User Requests OTP Without Friction (Priority: P1)

A user navigates to the sign-in page, enters their email address, and clicks "Request OTP." An invisible bot challenge runs in the background. The user is unaware of the challenge and sees no additional prompts or delays beyond a brief "Preparing..." state. The OTP email arrives normally.

**Why this priority**: This is the core user journey. Bot protection must not degrade the experience for legitimate users — if it adds visible friction, users will abandon sign-in.

**Independent Test**: Can be fully tested by signing in with a valid email on the AuthPage and confirming the OTP email is received without any visible CAPTCHA or manual challenge.

**Acceptance Scenarios**:

1. **Given** a user is on the sign-in page, **When** they enter a valid email and submit, **Then** the bot challenge completes invisibly and the OTP is sent without the user seeing any CAPTCHA or puzzle.
2. **Given** a user is on the sign-in page with a slow device, **When** the bot challenge takes longer than expected, **Then** the user sees a non-intrusive loading indicator (e.g., "Preparing...") and the bot challenge adds no more than 200ms to total request latency.
3. **Given** a user is on the sign-in page and the bot detection service is temporarily unavailable, **Then** the system falls back gracefully and still allows the OTP request (subject to existing rate limits).

---

### User Story 2 - Bot Spray Attack on OTP Endpoint Is Blocked (Priority: P1)

A distributed bot network sends hundreds of OTP requests per minute across thousands of different email addresses using rotating IP addresses. The system detects this abnormal volume and blocks requests that exceed a global cap, preventing mass email sends, Resend cost spikes, and domain reputation damage.

**Why this priority**: This is the primary threat the feature addresses. Without this, the existing per-email and per-IP rate limits are ineffective against spray attacks.

**Independent Test**: Can be tested by sending a burst of OTP requests exceeding the global cap and verifying that excess requests are rejected before emails are sent.

**Acceptance Scenarios**:

1. **Given** the global OTP request rate is within normal bounds, **When** a new OTP request arrives, **Then** it is processed normally.
2. **Given** the global OTP request rate has exceeded the configured cap, **When** a new OTP request arrives, **Then** it is rejected with an appropriate error message and no email is sent.
3. **Given** the global rate limit has been triggered, **When** the time window passes and the rate drops below the cap, **Then** new requests are accepted again.

---

### User Story 3 - Direct API Bot With Forged Token Is Rejected (Priority: P1)

A bot sends a POST request directly to the OTP request endpoint with a valid JSON body and a forged, invalid, or expired Turnstile token. The system rejects the request with a generic error before any email is generated or sent. Bots that omit the token entirely are not rejected (fail-open per FR-019) but face all other rate limits (global, per-email, per-IP), limiting their blast radius.

**Why this priority**: The OTP endpoint is CSRF-exempt, so any script can call it directly. Turnstile verification ensures that bots attempting to forge or replay tokens are stopped. Tokenless requests are still constrained by rate limits.

**Independent Test**: Can be tested by sending a curl/HTTP request to the OTP endpoint with an invalid Turnstile token and verifying it is rejected with a generic 400 error. A second test with no token should confirm the request proceeds to rate limit checks.

**Acceptance Scenarios**:

1. **Given** a request to the OTP endpoint has no Turnstile token, **When** the server processes it, **Then** the system fails open and processes the request subject to all other rate limits (global, per-email, per-IP) per FR-019.
2. **Given** a request to the OTP endpoint has an invalid or expired Turnstile token, **When** the server processes it, **Then** the request is rejected.
3. **Given** a request to the OTP endpoint has a valid Turnstile token, **When** the server processes it, **Then** the request proceeds through normal rate limiting and OTP generation.

---

### User Story 4 - Legitimate User Accesses Event via Email Entry Without Friction (Priority: P2)

A user navigates to an event's email entry page, enters their email address, and clicks "Continue." An invisible bot challenge runs in the background. The system checks whether the email belongs to an event administrator and routes the user to the appropriate next step (PIN entry or OTP entry) without delay.

**Why this priority**: The email entry form is a secondary attack surface. Bots can enumerate administrator emails by probing the check-admin endpoint. Protecting this form prevents information disclosure.

**Independent Test**: Can be tested by accessing an event email entry page, entering an email, and confirming the routing works correctly with no visible CAPTCHA.

**Acceptance Scenarios**:

1. **Given** a user is on the event email entry page, **When** they enter an email and submit, **Then** the bot challenge completes invisibly and the admin check proceeds normally.
2. **Given** a bot attempts to probe the admin-check endpoint with an invalid or expired Turnstile token, **When** the server processes the request, **Then** the request is rejected with a generic error.
3. **Given** a bot attempts to probe the admin-check endpoint without a Turnstile token, **When** the server processes the request, **Then** the system fails open and processes the request per FR-019.

---

### User Story 5 - Automated Tests Continue to Pass Without Modification (Priority: P2)

The development team runs E2E tests (Playwright/Cucumber) and smoke tests against development and test environments. Bot protection is configured with test/bypass keys so that automated test suites pass without changes to existing test code.

**Why this priority**: Bot protection must not break the development workflow. Test environments need a reliable bypass mechanism.

**Independent Test**: Can be tested by running the existing E2E and smoke test suites against a test environment with bot protection enabled and verifying all tests pass.

**Acceptance Scenarios**:

1. **Given** the application is running in a test environment, **When** E2E tests submit forms protected by bot detection, **Then** the bot challenge is bypassed using test keys and all tests pass.
2. **Given** the application is running in a production environment, **When** a request is made, **Then** real bot detection is enforced (test keys are not accepted).

---

### Edge Cases

- What happens when the Turnstile verification service is temporarily unreachable from the backend? The system fails open — the request is allowed through, subject to all other rate limits (FR-013).
- What happens when the global rate limit counter storage (DynamoDB) is temporarily unavailable? The system fails open — the request is allowed through to preserve availability (FR-014).
- What happens when a legitimate user's browser blocks the Turnstile script (ad blocker, strict CSP)? The frontend submits without a token; the backend fails open and processes the request subject to all other rate limits (FR-019).
- What happens when the global rate limit is hit during a genuine usage spike (e.g., large event with many attendees signing in simultaneously)? The 100/minute production cap is well above realistic legitimate peaks. If hit, users receive a retry-after message and can try again shortly.
- What happens when bot protection is enabled in production but the Turnstile secret key environment variable is missing or misconfigured? The application fails fast at startup with a clear error message, preventing it from running without proper configuration (FR-018).

## Requirements *(mandatory)*

### Functional Requirements

**Global Rate Limiting:**

- **FR-001**: System MUST enforce a global rate limit on OTP requests that caps the total number of requests across all emails and IP addresses within a configurable time window.
- **FR-002**: System MUST reject OTP requests that exceed the global rate limit before generating an OTP or sending an email.
- **FR-003**: System MUST return a clear error message with retry timing when a request is rejected due to the global rate limit.
- **FR-004**: System MUST evaluate the global rate limit before per-email and per-IP rate limits to short-circuit as cheaply as possible.
- **FR-005**: Global rate limit thresholds MUST be configurable per environment. The production default MUST be 100 requests per minute. Development and test environments MUST use a relaxed threshold (e.g., 10,000 per minute) to avoid interfering with automated testing.

**Cloudflare Turnstile Integration:**

- **FR-006**: System MUST require a valid Turnstile verification token for OTP request submissions from the sign-in page.
- **FR-007**: System MUST require a valid Turnstile verification token for email submissions from the event email entry page.
- **FR-008**: System MUST verify the Turnstile token server-side by calling Cloudflare's siteverify API before processing the protected request.
- **FR-009**: System MUST reject requests with invalid or expired Turnstile tokens. The error response MUST be a generic message (e.g., "Request could not be processed. Please try again.") that does not reveal bot detection as the rejection reason. A *missing* token triggers fail-open behavior per FR-019 (subject to all other rate limits).
- **FR-010**: The Turnstile challenge MUST be invisible to users under normal conditions (no manual puzzle or checkbox).
- **FR-011**: System MUST use Cloudflare's test/always-pass keys in development and test environments to allow automated testing. Test keys MUST be hardcoded as defaults so that local development and CI pipelines require zero Turnstile configuration.
- **FR-012**: System MUST NOT accept test keys in the production environment.

**Graceful Degradation:**

- **FR-013**: If the Turnstile verification service is unreachable from the backend, the system MUST fall back to allowing the request (subject to all other rate limits) rather than blocking all users.
- **FR-014**: If the global rate limit storage is temporarily unavailable, the system MUST fail open (allow the request) to preserve availability.
- **FR-019**: If the Turnstile widget fails to load on the client side (e.g., blocked by ad blocker, network error, or strict CSP), the frontend MUST submit the request without a Turnstile token. The backend MUST treat a missing token from such requests the same as a Turnstile service outage (fail open, subject to all other rate limits).

**Configuration & Operations:**

- **FR-015**: The Turnstile site key (public) MUST be provided to the frontend as a build-time environment variable. A `.env.development` file MUST contain Cloudflare's always-pass test site key as the default for local development. Production MUST use the real site key via `.env.production` or deploy scripts.
- **FR-016**: The Turnstile secret key (private) MUST be stored as a backend environment variable in production. The backend MUST default to Cloudflare's always-pass test secret key when not in production (following the existing CSRF default secret pattern). The real secret key MUST never appear in source code or configuration files.
- **FR-017**: System MUST log when requests are rejected by bot protection (Turnstile failure or global rate limit) for operational monitoring.
- **FR-018**: System MUST validate that required Turnstile configuration is present at startup in production and fail fast with a clear error if missing.

### Key Entities

- **Global Rate Limit Counter**: A single counter tracking total OTP requests across all callers within a sliding time window. Attributes: current count, window start time, time-to-live.
- **Turnstile Token**: A one-time verification token generated by the Turnstile widget in the user's browser and verified server-side against Cloudflare's API. Attributes: token string, associated site key, verification result (success/failure), timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Automated spray attacks sending OTP requests across many different email addresses are capped at the configured global limit — no more than the configured maximum emails are sent per minute regardless of the number of attacking IPs or target email addresses.
- **SC-002**: Direct API requests to the OTP endpoint with invalid or expired Turnstile tokens are rejected 100% of the time in production. Requests with missing tokens fail open but are subject to all rate limits (global, per-email, per-IP).
- **SC-003**: Legitimate users experience no visible CAPTCHA, puzzle, or interactive challenge when requesting an OTP or entering their email for event access.
- **SC-004**: All existing E2E and smoke tests pass without modification. In test environments, Turnstile is bypassed via always-pass test keys. In production, the headed smoke test works natively because the Turnstile widget completes in the real browser — no smoke test code changes are required.
- **SC-005**: When the Turnstile verification service is unavailable, users can still request OTPs (protected by rate limits only) — zero complete outages caused by bot protection.
- **SC-006**: Bot-rejected requests are logged and visible in application logs for operational monitoring.

## Clarifications

### Session 2026-02-25

- Q: What should the global rate limit production default be? → A: 100 requests per minute (balanced — handles large event spikes, still caps spray attacks).
- Q: What happens when a user's browser blocks the Turnstile script (ad blocker, strict CSP)? → A: Fail open on client side — submit the request without a token if the widget fails to load; backend rate limits still apply.
- Q: What error response should bot-rejected requests return? → A: Generic error — return a non-specific "request could not be processed" message without mentioning bot detection, so bots get no signal about why they were rejected.
- Q: How should the Turnstile site key be made available to the frontend? → A: Build-time Vite env var (`VITE_TURNSTILE_SITE_KEY`), following the existing `VITE_API_BASE_URL` pattern. Test environments use Cloudflare's always-pass test key; production uses the real key. The backend secret key is a Lambda environment variable (`TURNSTILE_SECRET_KEY`).
- Q: Where are Cloudflare's test/always-pass keys stored for dev/test environments? → A: Hardcoded as defaults — backend defaults to Cloudflare's always-pass test secret key when not in production (following the existing `CSRF_DEFAULT_SECRET` pattern); frontend uses a `.env.development` file with the always-pass test site key. Zero-config for local dev and CI. Production requires real keys via environment variables (validated at startup per FR-018).
- Q: What is the impact on the production smoke test? → A: No test changes needed. The smoke test uses a headed browser with a human operator present, so the Turnstile widget completes natively. If Turnstile falls back to an interactive challenge, the operator can solve it manually. SC-004 updated to cover production smoke tests explicitly.

## Assumptions

- Cloudflare Turnstile's free tier (1M verifications/month) is sufficient for this application's traffic volume.
- The Turnstile invisible mode widget will function correctly for the vast majority of browsers used by the app's target audience.
- DynamoDB (already used for per-email and per-IP rate limits) is suitable for the global rate limit counter with negligible additional cost.
- The existing rate limiting infrastructure (RateLimitService, DynamoDB TTL) can be extended for the global counter without architectural changes.
- "Fail open" is the appropriate degradation strategy for both Turnstile verification failures and global rate limit storage failures, since the existing per-email/IP rate limits and suspension mechanisms provide a baseline safety net.
