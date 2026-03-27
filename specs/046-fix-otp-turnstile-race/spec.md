# Feature Specification: Fix OTP Request Loop and Turnstile Race Condition

**Feature Branch**: `046-fix-otp-turnstile-race`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Fix OTP Request Loop and Turnstile Race Condition"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Returns After Inactivity and Logs In Successfully (Priority: P1)

An administrator returns to the app on their phone after a period of inactivity (minutes to hours). They see the email entry page, enter their name and email, and are sent to the OTP verification page. The system waits for the bot-protection check to complete before sending the verification code. The admin sees a brief "Sending verification code..." state, then receives confirmation that the code was sent. They enter the 6-digit code from their email and gain access to their event.

**Why this priority**: This is the core broken flow. Today, this scenario results in an immediate error and eventual rate limiting, completely blocking the admin from logging in. Fixing this unblocks the primary authentication path.

**Independent Test**: Can be fully tested by navigating to the OTP page with an email in session storage and verifying that exactly one OTP request is sent after the bot-protection check completes — no premature requests, no duplicate requests.

**Acceptance Scenarios**:

1. **Given** an admin has entered their email and been navigated to the OTP page, **When** the page loads, **Then** the system waits for the bot-protection check to complete before sending the OTP request (no request is sent with a missing or null verification token)
2. **Given** an admin is on the OTP page and the bot-protection check has not yet completed, **When** the page is in its initial loading state, **Then** the user sees a "Sending verification code..." indicator and no error is displayed
3. **Given** the bot-protection check completes successfully, **When** the OTP request is sent, **Then** exactly one OTP request is made and the user sees a confirmation message that the code was sent
4. **Given** the OTP was sent successfully, **When** the bot-protection token refreshes or expires in the background, **Then** no additional OTP requests are triggered automatically

---

### User Story 2 - Admin Manually Resends OTP Code (Priority: P2)

An admin on the OTP verification page did not receive the email or the code expired. They click the "Didn't receive code? Resend" button. The system sends a new OTP code. The resend button becomes available again for future resends (up to the rate limit).

**Why this priority**: Manual resend is the primary recovery mechanism when the initial OTP email doesn't arrive. It must work reliably and independently of the auto-send logic.

**Independent Test**: Can be tested by loading the OTP page, waiting for the initial send to complete, then clicking the resend button and verifying a new OTP request is made with a fresh bot-protection token.

**Acceptance Scenarios**:

1. **Given** an admin is on the OTP page and the initial OTP has been sent, **When** they click the "Resend" button, **Then** a new OTP request is sent with a fresh bot-protection token
2. **Given** an admin clicks "Resend", **When** the request succeeds, **Then** the bot-protection widget is refreshed so a new token is available for the next potential resend
3. **Given** an admin has exhausted the rate limit (3 requests in 15 minutes), **When** they click "Resend", **Then** the rate limit error message is displayed inline with the remaining wait time
4. **Given** an admin clicks "Resend", **When** the bot-protection token is not yet available, **Then** the resend button is disabled until the token is ready

---

### User Story 3 - Bot-Protection Check Fails Permanently (Priority: P3)

An admin navigates to the OTP page, but the bot-protection challenge fails to complete (e.g., network issues, mobile browser restrictions after waking from sleep, ad blocker interference). Instead of showing a cryptic "Request could not be processed" error, the system displays a clear, actionable error message.

**Why this priority**: While less common than the race condition, permanent bot-protection failure leaves users completely stuck with no guidance. A clear error message reduces support burden and helps users self-recover.

**Independent Test**: Can be tested by simulating a bot-protection widget failure (e.g., missing site key, blocked network request) and verifying the user sees an actionable error message rather than a generic processing error.

**Acceptance Scenarios**:

1. **Given** the bot-protection check fails after all retry attempts, **When** the OTP page is waiting for the check to complete, **Then** the user sees a clear error: "Verification check failed. Please reload the page and try again."
2. **Given** the bot-protection check has failed, **When** the user reloads the page, **Then** the bot-protection check starts fresh and the OTP auto-send waits for the new check to complete

---

### User Story 4 - Page Reload Does Not Burn Rate Limits (Priority: P2)

An admin reloads the OTP page (e.g., by pulling down to refresh on mobile, or hitting the browser reload button). The page should behave identically to the first load: wait for bot-protection, send one OTP request, and stop. Reloading multiple times should not silently exhaust the rate limit through duplicate requests.

**Why this priority**: Users instinctively reload when something seems stuck. Each reload must be safe and predictable, sending at most one OTP request.

**Independent Test**: Can be tested by reloading the OTP page 3 times in a row and verifying that exactly 3 OTP requests were made (one per load), not 6+ from hidden loops.

**Acceptance Scenarios**:

1. **Given** an admin reloads the OTP page, **When** the page re-mounts, **Then** the system sends exactly one OTP request after the bot-protection check completes
2. **Given** an admin reloads the OTP page 3 times within the rate limit window, **When** the 4th OTP request is attempted (by reload or resend), **Then** the rate limit error is displayed with the remaining wait time

---

### Edge Cases

- What happens when the admin navigates to the OTP page without an email in session storage? (Existing behavior: redirect to email entry page — must not regress)
- What happens when the bot-protection check is very slow (>10 seconds) on a poor mobile connection? (User should continue to see the loading state without timeout errors)
- What happens when the admin navigates away from the OTP page and back before the bot-protection check completes? (Auto-send should still fire once after the check completes on the new mount)
- What happens when the admin's OTP code expires (10-minute TTL) while they are on the OTP page? (Existing behavior: OTP verify returns "expired" error, user clicks resend — must not regress)
- What happens when the bot-protection token expires while the user is entering their OTP code? (Should not trigger a new OTP request; token expiry only matters for the next explicit send)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT send an OTP request until the bot-protection verification token is available (non-null)
- **FR-002**: The automatic OTP request on page load MUST fire exactly once per page mount — when both the user's email is available and the bot-protection token is ready for the first time
- **FR-003**: Changes to the bot-protection token after the initial automatic send (expiry, refresh, reset) MUST NOT trigger additional automatic OTP requests
- **FR-004**: The automatic OTP send MUST NOT reset/refresh the bot-protection widget upon completion
- **FR-005**: The manual "Resend" button MUST send a new OTP request using the current bot-protection token and refresh the widget afterward so a new token is available for subsequent resends
- **FR-006**: The "Resend" button MUST be disabled while the bot-protection token is unavailable (null or loading)
- **FR-007**: While the system is waiting for the bot-protection check to complete on initial page load, the user MUST see a loading indicator (e.g., "Sending verification code...") with no error message displayed
- **FR-008**: If the bot-protection check permanently fails (all retries exhausted), the system MUST display a clear, actionable error message: "Verification check failed. Please reload the page and try again."
- **FR-009**: Rate limit errors from any OTP request (automatic or manual resend) MUST be displayed inline on the page with the remaining wait time
- **FR-010**: All existing authentication flows (email entry page, OTP verify, PIN login, session recovery) MUST continue to function without changes

### Assumptions

- The bot-protection widget (Cloudflare Turnstile) will eventually produce a valid token on most page loads within a few seconds. Permanent failure is an edge case, not the norm.
- The production rate limit of 3 OTP requests per email per 15 minutes is correct and should not be changed.
- Backend Turnstile verification and rate limiting logic is correct as-is. This fix is frontend-only.
- The "interaction-only" appearance mode for the bot-protection widget is the correct choice and should be preserved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero OTP requests are sent before the bot-protection check completes (eliminating the "Request could not be processed" error on page load)
- **SC-002**: Exactly one automatic OTP request is sent per page load, regardless of how many times the bot-protection token changes afterward
- **SC-003**: An admin can complete the full login flow (email entry, OTP send, OTP verify) on the first attempt after returning from inactivity, without encountering errors
- **SC-004**: Reloading the OTP page 3 times sends exactly 3 OTP requests total (one per load), not more
- **SC-005**: The manual "Resend" button successfully sends a new OTP on each click (up to the rate limit) without triggering additional automatic requests
- **SC-006**: Rate limit errors are only encountered after 3 deliberate user actions (initial load + reloads/resends), never from hidden background loops
