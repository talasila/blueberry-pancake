# Feature Specification: Fix Stale Session Recovery for PIN Guests

**Feature Branch**: `043-fix-pin-session-recovery`
**Created**: 2026-03-24
**Status**: Draft
**Input**: User description: "Stale Session Recovery Fails for PIN-Authenticated Guests"

## Problem Statement

When a PIN-authenticated guest leaves the app open for an extended period (typically overnight or longer) and returns, the app detects the expired session and prompts them to re-enter their PIN. However, submitting the correct PIN produces a misleading "Invalid PIN" error that cannot be resolved without a full page reload. The guest is trapped in an unrecoverable error loop.

**Current behavior**: Guest returns after session expiry → sees re-authentication prompt → enters correct PIN → receives persistent error → must fully reload the page to recover.

**Expected behavior**: Guest returns after session expiry → session recovers silently (no prompt needed), OR guest is prompted and re-authentication succeeds on the first correct attempt.

## Clarifications

### Session 2026-03-24

- Q: How should the system retain enough information for re-authentication without undermining PIN guest email privacy (given feature 041 removed email from PIN sessions)? → A: Store email in a separate client-side key per event (e.g., `pin:email:{eventId}`). The minor privacy tradeoff is acceptable since the guest already entered their email on this device, and it is stored separately from the session token.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Silent Session Recovery for PIN Guests (Priority: P1)

A PIN-authenticated guest leaves the event page open overnight (or for longer than the session lifetime). When they return to the tab, the system silently renews their session in the background without any visible interruption. The guest continues using the app as if no expiry occurred.

**Why this priority**: This is the ideal experience for the most common scenario — a guest returning within the refresh window (up to 7 days). Eliminating the re-authentication prompt entirely removes all friction and makes the overnight-idle case invisible to the user.

**Independent Test**: Authenticate as a PIN guest, wait for session expiry (or simulate it), return to the tab. The event page MUST continue working without any dialog or redirect.

**Acceptance Scenarios**:

1. **Given** a PIN guest whose session token has expired but whose refresh credential is still valid, **When** the guest returns to the tab, **Then** the system silently renews the session and the guest sees no interruption or prompt.
2. **Given** a PIN guest whose session token has expired but whose refresh credential is still valid, **When** the guest returns and the page attempts to fetch event data, **Then** the fetch succeeds transparently (the guest never sees an error).
3. **Given** a PIN guest whose session is silently renewed, **When** they interact with the event page, **Then** all features (rating, viewing items, profile) work correctly with the renewed session.
4. **Given** a PIN guest whose session is silently renewed, **When** the renewal completes, **Then** the guest's identity (display name, role, event access) is preserved exactly as before expiry.

---

### User Story 2 — Prompted Re-Authentication When Silent Recovery Fails (Priority: P2)

When silent session renewal is not possible (e.g., the guest has been away longer than the refresh window), the system shows a "Welcome back" prompt asking the guest to re-enter their PIN. The guest enters the correct PIN and immediately regains access to the event without a full page reload.

**Why this priority**: This is the fallback for guests who exceed the refresh window. It must work reliably — the current bug makes this flow completely broken, trapping the user in an error loop.

**Independent Test**: Authenticate as a PIN guest, invalidate both session and refresh credentials (or wait beyond the refresh window), return to the tab. The re-authentication dialog MUST appear, accept the correct PIN, and restore access.

**Acceptance Scenarios**:

1. **Given** a PIN guest whose session and refresh credential have both expired, **When** the guest returns to the tab, **Then** the system shows a re-authentication prompt requesting their PIN.
2. **Given** the re-authentication prompt is displayed, **When** the guest enters the correct 6-digit PIN, **Then** the system restores their session and dismisses the prompt — the guest resumes using the event page.
3. **Given** the re-authentication prompt is displayed, **When** the guest enters an incorrect PIN, **Then** the system shows an accurate error message (e.g., "Incorrect PIN") and allows them to retry.
4. **Given** the re-authentication prompt is displayed, **When** the guest enters the correct PIN, **Then** no full page reload is required — the page recovers in place.
5. **Given** the re-authentication prompt is displayed, **When** the guest enters the correct PIN, **Then** the guest's identity (display name, event access) is preserved.

---

### User Story 3 — Accurate Error Messages During Re-Authentication (Priority: P3)

When something goes wrong during re-authentication (wrong PIN, rate limit, connectivity issue), the error message shown to the guest accurately describes the problem so they know what to do next.

**Why this priority**: Even when fixes 1 and 2 are in place, edge cases and future regressions may surface errors. The current system masks the real error ("Email address is required") with a generic "Invalid PIN" message, which is confusing and misleading. Accurate feedback prevents guests from repeatedly trying the same (correct) action.

**Independent Test**: Trigger each error condition during the re-authentication dialog and verify the error message matches the actual problem.

**Acceptance Scenarios**:

1. **Given** the re-authentication prompt, **When** the guest enters an incorrect PIN, **Then** the message says the PIN is incorrect (not a generic or misleading error).
2. **Given** the re-authentication prompt, **When** the guest has exceeded the retry limit, **Then** the message describes the rate limit and advises waiting.
3. **Given** the re-authentication prompt, **When** the system cannot complete re-authentication due to missing or corrupt session data, **Then** the message advises the guest to reload the page rather than displaying "Invalid PIN."
4. **Given** the re-authentication prompt, **When** there is a network connectivity problem, **Then** the message indicates a connection issue.

---

### User Story 4 — Clean Session Lifecycle on Re-Authentication (Priority: P4)

When a guest re-authenticates (either via silent renewal or the PIN prompt), the system cleans up the previous session's credentials so that stale credentials do not accumulate or conflict with the new session.

**Why this priority**: This is a hygiene concern. Without cleanup, old credentials accumulate in the backend store and can cause subtle conflicts (e.g., an old credential being mistakenly accepted and producing a session with the wrong identity). Lower priority because it does not directly affect the guest's experience, but important for long-term system health.

**Independent Test**: Authenticate as a PIN guest, let the session expire, re-authenticate. Verify that the old refresh credential is no longer valid.

**Acceptance Scenarios**:

1. **Given** a PIN guest whose session expired and who re-authenticates successfully, **When** the old refresh credential is presented to the system, **Then** it is rejected (it was invalidated during re-authentication).
2. **Given** a PIN guest who re-authenticates via the PIN prompt, **When** the new session is established, **Then** only one valid refresh credential exists for that guest (no orphaned credentials).

---

### User Story 5 — Session State Is Race-Free Across Concurrent Readers (Priority: P5)

When the guest returns to the tab and multiple parts of the app simultaneously detect the expired session, the system handles this in a coordinated way. Only one recovery path runs, and no part of the system can accidentally destroy session data that another part needs to read.

**Why this priority**: This is the deepest underlying cause of the original bug. Fixing it eliminates an entire class of intermittent session-related issues — not just the PIN re-auth failure, but any future scenario where concurrent auth checks could corrupt state. It is P5 because the user-facing symptoms are addressed by US1–US2, but this fix prevents regressions.

**Independent Test**: Simulate the scenario where the tab-focus handler and a data-fetch both detect an expired session at the same moment. Verify that exactly one recovery path runs, the re-authentication dialog (if shown) has the correct guest identity, and no session data is lost.

**Acceptance Scenarios**:

1. **Given** a PIN guest whose session has expired, **When** multiple app components detect the expiry simultaneously, **Then** only one recovery attempt is initiated (no duplicate prompts, no conflicting state).
2. **Given** a PIN guest whose session has expired, **When** the session-expiry check runs, **Then** it does not destroy session metadata (auth method, identity) that the recovery path needs.
3. **Given** a PIN guest whose session has expired and multiple components detect it, **When** the recovery dialog appears, **Then** it contains the correct auth method and identity information — never null or incorrect values.

---

### Edge Cases

- What happens if the guest has the app open in multiple tabs and the session expires? Only one tab should initiate recovery; other tabs should detect the updated session from shared storage.
- What happens if a guest's event membership was revoked while they were away? Re-authentication should succeed (PIN is correct) but event access should reflect the current membership status.
- What happens if the guest's PIN was regenerated by an admin while they were away? Re-authentication should fail with an accurate "Incorrect PIN" message.
- What happens if the guest returns to the tab during a brief network outage? The system should not permanently break — recovery should retry or show a connectivity error.
- What happens if the guest authenticates via PIN for multiple events? Session renewal must preserve access to all events, not just one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The session-validity check MUST be a pure read operation with no side effects — it MUST NOT clear, modify, or destroy any session data.
- **FR-002**: Session cleanup (clearing expired credentials and stored identity) MUST happen in exactly one coordinated location, and MUST capture a snapshot of the session's identity data (auth method, email, display name) before clearing.
- **FR-003**: When a PIN guest's session token expires but their refresh credential is still valid, the system MUST silently renew the session without any user-visible prompt or interruption.
- **FR-004**: Silent session renewal for PIN guests MUST produce a session with the correct identity (opaque user ID, auth method, event access) — not a different identity type.
- **FR-005**: When silent renewal is not possible (refresh credential expired or invalid), the system MUST show a re-authentication prompt that requests the guest's PIN.
- **FR-006**: The re-authentication prompt MUST have access to the guest's email (persisted separately from the session) so that PIN verification can complete successfully.
- **FR-007**: The re-authentication prompt MUST NOT require a full page reload to restore access after successful PIN entry.
- **FR-008**: The system MUST attempt silent renewal for PIN guests on 401 responses, not only for OTP-authenticated users.
- **FR-009**: When a guest re-authenticates (via silent renewal or PIN prompt), the system MUST invalidate the previous refresh credential before issuing a new one.
- **FR-010**: Error messages in the re-authentication prompt MUST accurately describe the problem: incorrect PIN, rate limit exceeded, session data corrupted (advise reload), or connectivity issue. The system MUST NOT show "Invalid PIN" for non-PIN-related errors.
- **FR-011**: The session renewal endpoint MUST be aware of the guest's original authentication method and MUST produce a session token appropriate for that method (preserving identity type and event access).
- **FR-012**: The system MUST persist the guest's email at PIN verification time in a separate client-side key per event (distinct from the session token) that survives session expiry, so that the re-authentication prompt can use it. This is an accepted privacy tradeoff: the guest already entered their email on the same device.

### Key Entities

- **Session Token**: Short-lived credential (24-hour lifetime) that authorizes API access. Contains the guest's identity, auth method, and event access list.
- **Refresh Credential**: Longer-lived credential (7-day lifetime) used to silently renew an expired session token without re-prompting the user. Stored server-side with the guest's email and auth metadata.
- **PIN Session**: Per-event record of a guest's PIN-based access, stored client-side. Persists across session token expiry.
- **Persisted Recovery Email**: The guest's email, stored client-side per-event at PIN verification time. Survives session clearing so the re-authentication prompt can use it.

## Assumptions

- The existing 24-hour session token lifetime and 7-day refresh credential lifetime are correct and should not change.
- The existing SessionExpiredDialog component is the correct place for the re-authentication prompt (no new UI components needed).
- PIN guests access one event at a time in most cases, but multi-event access must not break.
- The existing event polling mechanism will continue to detect expired sessions via API error responses.
- Storing the guest's email in a separate client-side key per event is an acceptable privacy tradeoff for session recovery, since the guest already entered their email on the same device and it is not included in the session token itself (preserving feature 041's privacy intent for the token layer).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A PIN guest who returns to the app within 7 days of their last session MUST recover seamlessly with no visible prompt — 100% success rate for silent renewal within the refresh window.
- **SC-002**: A PIN guest who returns after the refresh window and enters the correct PIN MUST regain access on the first attempt — 100% success rate (currently 0% due to the bug).
- **SC-003**: Error messages shown during re-authentication MUST match the actual error condition in 100% of cases — no misleading "Invalid PIN" for non-PIN errors.
- **SC-004**: After any re-authentication event (silent or prompted), zero orphaned refresh credentials MUST remain for that guest.
- **SC-005**: When multiple app components detect an expired session simultaneously, exactly one recovery path MUST execute — no duplicate prompts, no lost session data, no null identity in the recovery dialog.
- **SC-006**: All existing session expiry E2E tests MUST continue to pass, and new tests MUST cover the PIN silent-renewal and prompted-recovery flows.
