# Feature Specification: OTP Authentication

**Feature Branch**: `003-otp-auth`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Implement the authentication feature. 1. Access for all pages, except for the Landing page, need a user to be authenticated. 2. Authentication mechanism is via a OTP method sent to the users email 3. Basic flow - user enters email, system sends OTP to email, OTP is valid for 10 minutes, user enter OTP. 4. OTPs are 6 digits and randomly generated. 5. Implement rate limits for authentication. 6. Max tries for authentication, per email, is 5. Suspend for 5 minutes after that. 7. Create and use JWT tokens for API access. 8. Emails are sent via the "resend" email utility. The resend API key is "re_6RipC75d_PhQmhfHdnnhT542ZaRHjwhqu". This can be stored in the configuration file but should be overridable by an environment variable which takes precedence. 9. The from field for the email is "sreeni@7155421.xys""

## Clarifications

### Session 2025-01-27

- Q: Rate limiting scope and limits - Should rate limiting apply per email address, per IP address, or both? What are the specific limits? → A: Both email and IP - Apply limits to both email and IP independently (e.g., 3 requests per email AND 5 requests per IP per 15 minutes)
- Q: OTP invalidation behavior - When a user requests a new OTP while a previous valid OTP exists, what should happen to the previous OTP? → A: Invalidate previous OTP when new one is requested - When a new OTP is requested, immediately invalidate any existing valid OTP for that email
- Q: OTP request during suspension - When an email address is suspended (after 5 failed attempts), can the user still request a new OTP, or should OTP requests be blocked during the suspension period? → A: Block OTP requests during suspension - Users cannot request new OTPs while their email is suspended; must wait for suspension period to expire
- Q: Redirect destination for unauthenticated users - When an unauthenticated user tries to access a protected page, where should they be redirected? → A: Redirect to landing page - Unauthenticated users accessing protected pages are redirected to the landing page where they can request an OTP
- Q: Post-authentication redirect behavior - After a user successfully authenticates (verifies OTP and receives JWT token), where should they be redirected? → A: Redirect to originally requested page if available, otherwise landing page - If user was trying to access a specific protected page, redirect them there after authentication; otherwise redirect to landing page
- Q: Test OTP value and environment restriction - What should the test OTP be, and should it only work in development/test environments (never in production)? → A: Use "123456" as test OTP, only in development/test environments (not production) - The test OTP "123456" should be accepted for any email address in development and test environments only, bypassing email delivery for faster testing
- Q: Test OTP behavior and restrictions - Should the test OTP "123456" bypass normal restrictions (rate limiting, suspension, OTP expiration) in development/test environments, or should it still be subject to these restrictions? → A: Bypass all restrictions except environment check - Test OTP bypasses rate limiting, suspension, expiration, and failed attempt tracking in dev/test environments

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Request OTP via Email (Priority: P1)

A user wants to access a protected page (any page except the landing page). They enter their email address, and the system sends a 6-digit OTP code to that email address. The user receives the email and can proceed to verify their identity.

**Why this priority**: This is the entry point for authentication. Without the ability to request an OTP, users cannot authenticate and access protected content. This must work independently to enable the authentication flow.

**Independent Test**: Can be fully tested by submitting an email address to the OTP request endpoint and verifying that an email is sent with a valid 6-digit OTP code. The test can verify email delivery without requiring OTP verification to complete.

**Acceptance Scenarios**:

1. **Given** a user is on a protected page, **When** they enter a valid email address and request an OTP, **Then** the system sends a 6-digit OTP code to that email address
2. **Given** a user requests an OTP, **When** they provide an invalid email format, **Then** the system returns an error message indicating invalid email format
3. **Given** a user requests an OTP, **When** the email service fails, **Then** the system returns an appropriate error message to the user
4. **Given** a user requests an OTP, **When** rate limits are exceeded, **Then** the system returns a rate limit error message
5. **Given** a user requests an OTP, **When** their email address is suspended, **Then** the system returns an error message indicating the account is temporarily suspended and OTP requests are blocked

---

### User Story 2 - Verify OTP and Receive JWT Token (Priority: P1)

A user has received an OTP code via email. They enter the OTP code along with their email address. The system validates the OTP code, and if correct and not expired, issues a JWT token that allows the user to access protected pages and API endpoints.

**Why this priority**: This completes the authentication flow. Without OTP verification, users cannot obtain access tokens and cannot use protected features. This must work independently to enable authenticated access.

**Independent Test**: Can be fully tested by providing a valid email and OTP code (obtained from a previous OTP request) and verifying that a JWT token is returned. The test can verify token validity without requiring full application access.

**Acceptance Scenarios**:

1. **Given** a user has received an OTP code, **When** they enter the correct email and OTP within 10 minutes, **Then** the system returns a valid JWT token and redirects them to their originally requested page (if available) or to the landing page
2. **Given** a user enters an OTP, **When** the OTP code is incorrect, **Then** the system returns an error message and increments the failed attempt counter
3. **Given** a user enters an OTP, **When** the OTP has expired (more than 10 minutes old), **Then** the system returns an error message indicating the OTP has expired
4. **Given** a user enters an OTP, **When** they have exceeded 5 failed attempts, **Then** the system suspends authentication for that email for 5 minutes
5. **Given** a user enters an OTP, **When** the email is suspended, **Then** the system returns an error message indicating the account is temporarily suspended

---

### User Story 3 - Access Protected Pages with Authentication (Priority: P2)

An authenticated user (with a valid JWT token) can access all pages except the landing page. The system validates the JWT token on each request to protected pages and API endpoints, allowing or denying access based on token validity.

**Why this priority**: This enforces the access control requirement. While important, it depends on the previous two stories being complete. Users can still request and verify OTPs even if page protection isn't fully implemented.

**Independent Test**: Can be fully tested by making requests to protected endpoints with a valid JWT token and verifying access is granted, and with an invalid/missing token and verifying access is denied.

**Acceptance Scenarios**:

1. **Given** a user has a valid JWT token, **When** they access a protected page, **Then** the system allows access and displays the page content
2. **Given** a user has an expired JWT token, **When** they access a protected page, **Then** the system redirects to the landing page
3. **Given** a user has no JWT token, **When** they access a protected page, **Then** the system redirects to the landing page
4. **Given** a user has a valid JWT token, **When** they access the landing page, **Then** the system allows access without requiring authentication
5. **Given** a user makes an API request, **When** they include a valid JWT token in the Authorization header, **Then** the system processes the request
6. **Given** a user makes an API request, **When** they do not include a valid JWT token, **Then** the system returns 401 Unauthorized

---

### Edge Cases

- What happens when a user requests multiple OTPs for the same email within a short time period? (Rate limiting should apply)
- How does the system handle concurrent OTP requests from the same email? (When a new OTP is requested, the system immediately invalidates any existing valid OTP for that email address, ensuring only the latest OTP is valid)
- What happens when a user enters an OTP that was generated for a different email? (Should fail validation)
- How does the system handle network failures during email delivery? (Should retry with appropriate error handling)
- What happens when JWT token expires while user is actively using the application? (Should redirect to landing page to trigger re-authentication flow)
- How does the system handle invalid or malformed JWT tokens? (Should return 401 and require re-authentication)
- What happens when rate limits are hit for OTP requests? (Should return rate limit error with appropriate message)
- How does the system handle email addresses that don't exist or bounce? (Should still process the request but handle delivery failures gracefully)
- What happens when a user tries to verify an OTP after the 5-minute suspension period expires? (Should allow new OTP request once suspension expires)
- What happens when a user tries to request an OTP while their email is suspended? (Should block the request and return suspension error message)
- How does the system handle timezone differences for OTP expiration? (Should use server-side time for consistency)
- What happens after successful authentication when user had no originally requested page? (Should redirect to landing page as default)
- How does the system handle test OTP "123456" in development/test environments? (Should accept it for any email address without requiring email delivery, bypassing rate limiting, suspension, expiration, and failed attempt tracking, but only in non-production environments)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authentication for all pages except the landing page, and MUST redirect unauthenticated users to the landing page when they attempt to access protected pages
- **FR-002**: System MUST authenticate users via OTP (One-Time Password) sent to user's email address
- **FR-003**: System MUST generate 6-digit random OTP codes for authentication
- **FR-004**: System MUST send OTP codes via email using the Resend email service
- **FR-005**: System MUST validate that OTP codes are exactly 6 digits
- **FR-006**: System MUST expire OTP codes after 10 minutes from generation
- **FR-007**: System MUST allow a maximum of 5 failed authentication attempts per email address
- **FR-008**: System MUST suspend authentication for an email address for 5 minutes after 5 failed attempts, and MUST block OTP requests during the suspension period
- **FR-009**: System MUST generate and issue JWT tokens upon successful OTP verification, and MUST redirect users to their originally requested protected page (if available) or to the landing page
- **FR-010**: System MUST validate JWT tokens on all protected API endpoints and pages
- **FR-011**: System MUST implement rate limiting for OTP request endpoints, applying limits independently to both email addresses and IP addresses
- **FR-012**: System MUST store Resend API key in configuration file with environment variable override capability
- **FR-013**: System MUST use "sreeni@7155421.xys" as the sender email address for OTP emails
- **FR-014**: System MUST allow users to request a new OTP if the previous one expires or is invalid, and MUST invalidate any existing valid OTP for that email address when a new OTP is requested
- **FR-015**: System MUST track failed authentication attempts per email address
- **FR-016**: System MUST reset failed attempt counters when authentication succeeds or suspension period expires
- **FR-017**: System MUST include email address in JWT token payload for user identification
- **FR-018**: System MUST handle email delivery failures gracefully with appropriate error messages
- **FR-019**: System MUST accept test OTP "123456" for any email address in development and test environments only (not in production), bypassing email delivery, OTP generation, rate limiting, suspension, expiration, and failed attempt tracking for testing purposes

### Key Entities *(include if feature involves data)*

- **OTP Code**: Represents a one-time password for authentication. Key attributes: 6-digit numeric code, associated email address, generation timestamp, expiration timestamp (10 minutes), verification status. Only one valid OTP may exist per email address at a time; requesting a new OTP invalidates any previously issued OTP for that email
- **Authentication Attempt**: Represents a single attempt to verify an OTP. Key attributes: email address, OTP code provided, timestamp, success/failure status
- **Email Suspension**: Represents a temporary lockout for an email address. Key attributes: email address, suspension start timestamp, suspension end timestamp (5 minutes from start), reason (failed attempts exceeded). During suspension, users cannot request new OTPs or verify existing OTPs; must wait for suspension period to expire
- **JWT Token**: Represents an authenticated session. Key attributes: token string, email address in payload, expiration timestamp, issued timestamp
- **Rate Limit Record**: Represents rate limiting state for OTP requests. Key attributes: identifier (email address or IP address), request count, time window, reset timestamp. System maintains separate rate limit records for email addresses and IP addresses independently

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete authentication (request OTP, receive email, verify OTP, receive token) in under 2 minutes from start to finish
- **SC-002**: OTP emails are delivered to users within 10 seconds of request 95% of the time (measured over any 1-hour window)
- **SC-003**: 90% of users successfully authenticate on their first OTP verification attempt
- **SC-004**: System prevents unauthorized access to protected pages (100% of protected page requests without valid JWT tokens are denied)
- **SC-005**: System enforces rate limits effectively (100% of rate limit violations are blocked)
- **SC-006**: System enforces authentication attempt limits (100% of emails exceeding 5 failed attempts are suspended for 5 minutes)
- **SC-007**: JWT token validation occurs on all protected endpoints (100% of protected API requests validate tokens)
- **SC-008**: Users can access the landing page without authentication (100% of landing page requests succeed without JWT tokens)

## Assumptions

- Email delivery via Resend service is reliable and available
- Users have access to their email accounts to receive OTP codes
- JWT token expiration follows existing system configuration (default 24 hours as per baseline setup)
- Rate limiting applies independently to both email addresses and IP addresses (e.g., 3 requests per email AND 5 requests per IP per 15 minutes)
- OTP codes are stored server-side with associated metadata (email, timestamp, expiration)
- Failed attempt tracking persists across OTP requests (counter doesn't reset when new OTP is requested)
- Suspension period is enforced server-side and cannot be bypassed by client-side manipulation
- Landing page route is clearly defined and excluded from authentication requirements
- Protected pages include all routes except the landing page
- Email validation follows standard email format rules
- OTP generation uses cryptographically secure random number generation
- JWT tokens are stored client-side (localStorage, sessionStorage, or httpOnly cookies) per existing patterns
- Environment variable for Resend API key takes precedence over configuration file value when both are present
- Test OTP "123456" is only available in development and test environments, never in production, to prevent security vulnerabilities. In dev/test environments, the test OTP bypasses all restrictions (rate limiting, suspension, expiration, failed attempt tracking) to streamline development and testing workflows

## Dependencies

- Existing JWT middleware infrastructure (`jwtAuth.js` with `generateToken` and `jwtAuth` functions)
- Existing configuration system (`configLoader.js`) for storing Resend API key
- Resend email service API access and account
- Frontend API client (`apiClient.js`) for making authenticated requests
- Existing routing infrastructure to distinguish between landing page and protected pages

## Out of Scope

- Password-based authentication
- Social login (OAuth, Google, Facebook, etc.)
- Multi-factor authentication beyond email OTP
- Remember me / persistent login functionality
- Password reset flows (not applicable to OTP-only authentication)
- User account management (profile pages, account settings)
- Email verification beyond OTP delivery
- Session management beyond JWT token expiration
- Admin or role-based access control (all authenticated users have same access level)
