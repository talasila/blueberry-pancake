# Feature Specification: Structured Error Codes for Authentication Error Disambiguation

**Feature Branch**: `042-structured-error-codes`
**Created**: 2026-03-23
**Status**: Draft
**Input**: User description: "As a guest user, I should see 'Incorrect PIN' when I enter a wrong PIN, not a misleading 'Welcome back! Your session has expired' dialog."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest Sees Correct Error on Wrong PIN (Priority: P1)

A guest navigates to an event's PIN entry page and enters an incorrect PIN. The system displays an inline error message such as "Invalid PIN" on the same page. The "Welcome back! Your session has expired" dialog does NOT appear, regardless of whether the guest has a previous session stored locally.

**Why this priority**: This is the primary bug being fixed. Guests currently receive a confusing, misleading message that implies they had a prior session when they simply mistyped a PIN. This directly harms the first-time user experience and causes support confusion.

**Independent Test**: Can be fully tested by entering a wrong PIN on the PIN entry page and verifying the correct inline error appears. Delivers immediate value by eliminating the most visible user-facing bug.

**Acceptance Scenarios**:

1. **Given** a guest with no prior session visits an event PIN page, **When** they enter an incorrect PIN, **Then** they see an inline error message indicating the PIN is wrong and are NOT shown a session expiry dialog.
2. **Given** a guest with an expired session from a previous visit, **When** they enter an incorrect PIN on the same or different event, **Then** they see an inline error message indicating the PIN is wrong and are NOT shown a session expiry dialog.
3. **Given** a guest enters an incorrect PIN, **When** they correct the PIN and resubmit, **Then** they are authenticated successfully and proceed to the event page.

---

### User Story 2 - User Sees Correct Error on Wrong OTP (Priority: P1)

An administrator (or returning user) enters an incorrect OTP code during email verification. The system displays an inline error message on the OTP entry page. The session expiry dialog does NOT appear, even if the user has a previous authenticated session stored locally.

**Why this priority**: Same class of bug as Story 1, affecting the other authentication method. Both must be fixed together to provide consistent behavior.

**Independent Test**: Can be fully tested by requesting an OTP and entering a wrong code, then verifying the correct inline error appears on the auth page.

**Acceptance Scenarios**:

1. **Given** a user on the OTP verification page, **When** they enter an incorrect OTP code, **Then** they see an inline error message indicating the code is wrong and are NOT shown a session expiry dialog.
2. **Given** a user with an existing OTP session in local storage, **When** they attempt a new login and enter a wrong OTP, **Then** they see an inline error on the OTP page, not a session expiry prompt.

---

### User Story 3 - Session Expiry Behavior Preserved (Priority: P1)

An authenticated user (admin or guest) whose session has genuinely expired attempts to perform an action that requires authentication. The system correctly identifies this as a session expiry and shows the existing "Welcome back! Your session has expired" dialog, allowing them to re-authenticate seamlessly.

**Why this priority**: Equal priority because the fix must not break the existing session recovery flow. Regression here would lock users out of in-progress events.

**Independent Test**: Can be tested by authenticating, waiting for session expiry (or manually expiring the token), then attempting an authenticated action and verifying the session expiry dialog appears.

**Acceptance Scenarios**:

1. **Given** an authenticated guest whose session has expired, **When** they attempt to submit a rating or perform any authenticated action, **Then** they see the "Welcome back!" session expiry dialog with PIN re-entry.
2. **Given** an authenticated admin whose session has expired, **When** they attempt any authenticated action, **Then** the system attempts a silent token refresh; if refresh fails, the session expiry dialog appears with OTP re-entry.

---

### User Story 4 - Rate-Limited User Sees Correct Feedback (Priority: P2)

A user who has exceeded the allowed number of PIN or OTP attempts sees a clear rate-limiting message (e.g., "Too many attempts. Please try again in X minutes.") rather than a session expiry dialog.

**Why this priority**: Secondary to the core fix but important for a consistent error experience. Rate limiting currently may also trigger the same misleading dialog.

**Independent Test**: Can be tested by repeatedly entering wrong PINs until the rate limit triggers, then verifying the correct message appears.

**Acceptance Scenarios**:

1. **Given** a guest who has entered the wrong PIN multiple times, **When** the rate limit is reached, **Then** they see a message indicating they must wait before trying again, not a session expiry dialog.
2. **Given** a user who has exceeded OTP attempt limits, **When** they try again, **Then** they see a rate-limit message with a retry time indication.

---

### User Story 5 - All Error Responses Include Machine-Readable Codes (Priority: P2)

Every authentication and authorization error response from the system includes a machine-readable error code alongside the human-readable message. This allows the application to programmatically distinguish between different error categories and respond appropriately in the user interface.

**Why this priority**: This is the foundational change that enables Stories 1-4. It is P2 because it delivers no direct user value on its own — its value is realized through the other stories.

**Independent Test**: Can be tested by triggering various error conditions and verifying each response contains both a machine-readable code and a human-readable message.

**Acceptance Scenarios**:

1. **Given** any authentication-related error occurs (wrong credentials, expired session, rate limit, suspension), **When** the error response is returned, **Then** it contains both a machine-readable code (string identifier from a defined taxonomy) and a human-readable error message.
2. **Given** the system returns an error without a recognized code (e.g., from an unexpected failure), **When** the application receives a 401 response, **Then** it falls back to treating the error as a session expiry (preserving current behavior for unrecognized errors).

---

### Edge Cases

- What happens when a guest enters a wrong PIN and has multiple expired sessions from different events in local storage? The system shows the inline PIN error regardless of what is in local storage.
- What happens when the error response body cannot be parsed (e.g., network error, malformed JSON)? The system falls back to existing session-expired behavior to avoid silently swallowing errors.
- What happens when a suspended user tries to enter a PIN or OTP? They see a suspension message (e.g., "Too many failed attempts. Try again in X minutes."), not a session expiry dialog.
- What happens when an admin enters a wrong PIN (admins must use OTP)? Existing behavior is preserved: admins are told they must use OTP to access admin features. This is unrelated to the error code change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST include a machine-readable error code in every authentication and authorization error response, alongside the existing human-readable error message.
- **FR-002**: The system MUST categorize error codes into distinct groups: credential errors (wrong PIN/OTP), session errors (expired/invalid token), rate-limit errors, suspension errors, and authorization errors.
- **FR-003**: The application MUST distinguish between credential errors and session errors when handling 401 responses, using the error code from the response body.
- **FR-004**: When the application receives a credential error code in a 401 response, it MUST pass the error through to the calling page for inline display and MUST NOT trigger the session expiry dialog.
- **FR-005**: When the application receives a session error code (or no recognized code) in a 401 response, it MUST proceed with the existing session expiry/refresh flow.
- **FR-006**: As a safety net, the application MUST skip the session expiry flow for 401 responses from known authentication endpoints (PIN verification, OTP verification, OTP request), regardless of error code presence.
- **FR-007**: The system MUST return appropriate error codes for all PIN verification failure modes: wrong PIN and rate-limited.
- **FR-008**: The system MUST return appropriate error codes for all OTP verification failure modes: wrong OTP, expired OTP, rate-limited, and suspended.
- **FR-009**: The system MUST return appropriate error codes for token validation failures: expired token, invalid token, and event access denied.
- **FR-010**: The system MUST return appropriate error codes for membership and authorization failures: membership revoked, forbidden, and root admin required.
- **FR-011**: All existing error handling behavior MUST be preserved for any response that does not contain a recognized error code (backward compatibility).

### Error Code Taxonomy

- **Credential errors** (login attempt failures): wrong PIN, wrong OTP, expired OTP, invalid email, user suspended
- **Session errors** (authenticated request failures): token expired, token invalid, event access denied, membership required
- **Rate-limit errors**: too many requests
- **Authorization errors**: forbidden action, root admin required

### Key Entities

- **Error Response**: Represents a structured error returned by the system. Contains a machine-readable code (string identifier from a defined taxonomy) and a human-readable error message.
- **Error Code**: A string identifier from a predefined set that categorizes the specific type of error. Grouped into credential, session, rate-limit, and authorization categories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of wrong-PIN attempts display the correct inline error message on the PIN entry page, with zero false session-expiry dialogs triggered.
- **SC-002**: 100% of wrong-OTP attempts display the correct inline error message on the OTP entry page, with zero false session-expiry dialogs triggered.
- **SC-003**: 100% of genuine session expiry events continue to trigger the session recovery dialog as before (zero regressions).
- **SC-004**: 100% of authentication and authorization error responses include a machine-readable error code.
- **SC-005**: Rate-limited and suspended users see the appropriate feedback message, not a session expiry dialog.
- **SC-006**: All existing automated tests continue to pass with no regressions.

## Assumptions

- The human-readable error messages shown to users for PIN/OTP failures already exist in the page-level error handling (PINEntryPage, AuthPage). The fix enables these messages to reach the user by preventing the session-expired interceptor from swallowing them.
- The session expiry dialog copy ("Welcome back! Your session has expired...") does not need to change — it is correct for genuine session expiry cases.
- Error codes are flat string constants (e.g., "INVALID_PIN"), not nested objects or URIs, to keep the response shape simple and consistent.
- HTTP status codes remain unchanged (401 for both credential and session errors, per RFC 9110). The disambiguation happens entirely via the response body.
- Error codes for non-authentication errors (404 Not Found, 500 Internal Server Error, etc.) are out of scope and can be added incrementally later.

## Out of Scope

- Changing HTTP status codes for existing error responses.
- Modifying the SessionExpiredDialog UI, copy, or behavior (beyond what it already does for genuine session expiry).
- Adding error codes to non-authentication error responses (404, 500, etc.).
- Internationalization or localization of error messages.
- Client-side error logging or analytics for error codes.
