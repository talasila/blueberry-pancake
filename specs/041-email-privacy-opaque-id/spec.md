# Feature Specification: Email Privacy — Opaque User Identity for Guests

**Feature Branch**: `041-email-privacy-opaque-id`
**Created**: 2026-03-22
**Status**: Draft
**Input**: User description: "Introduce opaque, event-scoped user identifiers for guests to prevent email exposure in API responses and UI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest Email Hidden from Other Users (Priority: P1)

A guest joins a tasting event, rates items, and views the dashboard after the event completes. At no point does any other guest or non-admin user see this guest's email address. Their identity is represented only by their display name throughout all shared views — the dashboard user list, similar tastes comparisons, and user detail views.

**Why this priority**: This is the core privacy guarantee. Without this, the feature has no value. Every other story builds on the foundation that emails are stripped from non-admin responses.

**Independent Test**: Create an event, register two guests, have both rate items, complete the event. As Guest A, view the dashboard and similar users — confirm Guest B's email never appears in any API response or UI element. Confirm Guest A's own email also does not appear in shared views.

**Acceptance Scenarios**:

1. **Given** a completed event with multiple guests, **When** a guest views the dashboard, **Then** user summaries display names only — no email addresses appear anywhere in the response or UI.
2. **Given** a started event with multiple guests, **When** a guest views similar users, **Then** similar users are identified by name only — no email addresses in the response.
3. **Given** any event state, **When** a guest fetches ratings data, **Then** other guests' email addresses are not present in the response.
4. **Given** a guest viewing any screen in the app, **Then** no other user's email address is visible anywhere — not in text, tooltips, aria labels, or network responses.

---

### User Story 2 - Opaque User Identity at Registration (Priority: P1)

When a guest registers for an event via PIN verification, the system generates a unique, opaque, event-scoped identifier for them. This identifier is used for all subsequent data operations and communication between the application layers. The guest's email is used only at the moment of authentication and is never included in the session token or returned in responses.

**Why this priority**: This is the mechanism that enables Story 1. Without an alternative identifier, the application cannot function without email.

**Independent Test**: Register a guest for an event via PIN. Inspect the authentication response — confirm it contains a user identifier and display name but no email. Inspect the session token — confirm it contains the user identifier and authentication method but no email. Re-enter the same event as the same guest — confirm the same identifier is returned.

**Acceptance Scenarios**:

1. **Given** a new guest registering via PIN, **When** registration succeeds, **Then** the system generates a unique opaque identifier and stores it alongside the guest's record.
2. **Given** a successful PIN verification, **When** the response is returned, **Then** it contains the opaque identifier and display name but no email address.
3. **Given** a PIN-authenticated session token, **When** decoded, **Then** it contains the opaque identifier and authentication method but no email address.
4. **Given** a guest who previously registered for an event, **When** they re-enter the same event, **Then** they receive the same opaque identifier as before.

---

### User Story 3 - Admin Retains Email Visibility (Priority: P1)

Administrators can still see guest email addresses where they need them — on the admin page people/settings section and in data exports. Admin authentication continues to use email for cross-event operations like "My Events." Admins appear in shared views (dashboard, similar users) by name only, just like guests.

**Why this priority**: Admins need email for event management (contacting guests, identifying participants). Breaking admin workflows would make the feature unusable.

**Independent Test**: As an admin, navigate to the admin page people section — confirm guest emails are visible. Download a data export — confirm emails are included. View the dashboard — confirm all users (including the admin themselves) appear by name only, no emails.

**Acceptance Scenarios**:

1. **Given** an admin viewing the admin page people/settings section, **When** the user list loads, **Then** guest email addresses are visible for management purposes.
2. **Given** an admin downloading the ratings data export, **When** the export completes, **Then** the export file includes email addresses for all users.
3. **Given** an admin viewing the dashboard, **When** user summaries load, **Then** all users (including the admin) are identified by name only — no emails.
4. **Given** an admin authenticated via one-time password, **When** they access "My Events," **Then** the page correctly lists all events they administer across the system.
5. **Given** a non-admin guest requesting the ratings data export, **When** the response is returned, **Then** no email addresses are included — only opaque identifiers.

---

### User Story 4 - Mandatory Display Name (Priority: P2)

All guests must provide a display name when registering for an event. The name is the sole human-readable identifier in all shared views. For existing users who registered before this requirement, the system derives a display name from their email prefix (the part before the @ symbol) without user intervention.

**Why this priority**: Without mandatory names, stripping email creates unnamed users in the UI. This story ensures every user has a meaningful display identity.

**Independent Test**: Attempt to register for an event without providing a name — confirm registration is rejected. Check an existing user record that has no name — confirm the system automatically assigns a name derived from the email prefix.

**Acceptance Scenarios**:

1. **Given** a guest attempting to register via PIN, **When** they submit without a display name, **Then** registration fails with a clear error message.
2. **Given** a guest attempting to register via PIN, **When** they submit with a valid display name, **Then** registration succeeds and the name is stored.
3. **Given** an existing user record without a display name, **When** the system encounters this record, **Then** it automatically assigns the email prefix as the display name and persists it.

---

### User Story 5 - Backward Compatibility with Existing Events (Priority: P2)

Existing events and user records created before this feature continue to work without disruption. Users with old session tokens (containing email instead of opaque identifier) are seamlessly transitioned: the system detects the old format, generates an opaque identifier if missing, and proceeds normally. No migration script or downtime is required.

**Why this priority**: Production stability. Breaking existing events is unacceptable, but this can be built after the core identity system (Stories 1-3) is in place.

**Independent Test**: Using an event created before this feature with existing users and ratings, access the event with an old-format session token. Confirm the system transparently generates an opaque identifier, the user can continue using the app normally, and no errors occur.

**Acceptance Scenarios**:

1. **Given** a user with an old-format session token (containing email), **When** they access any endpoint, **Then** the system detects the old format, resolves the user, generates an opaque identifier if missing, and processes the request normally.
2. **Given** an existing event with user records that lack opaque identifiers, **When** any user accesses the event, **Then** identifiers are generated lazily for the accessed users without affecting other records.
3. **Given** an old completed event that nobody accesses, **Then** no changes are made to its data — it remains untouched.
4. **Given** a user whose opaque identifier was just generated via lazy backfill, **When** they make subsequent requests, **Then** the same identifier is used consistently.

---

### User Story 6 - Current User Ratings Without Email Exposure (Priority: P2)

A guest can view their own rating history and progress without exposing their identity. The system provides a dedicated mechanism for retrieving the current user's own ratings without requiring an identifier in the request — the session implicitly identifies them.

**Why this priority**: The "My Progress" view is a core guest feature. It currently fetches all ratings and filters by email on the client. This must be refactored to avoid exposing other users' emails.

**Independent Test**: As a guest during an active event, open "My Progress." Confirm your ratings are displayed correctly. Inspect the network request — confirm it does not contain or return any other user's email or identifier.

**Acceptance Scenarios**:

1. **Given** a guest who has rated items, **When** they open "My Progress," **Then** only their own ratings are returned — no other user's data is included in the response.
2. **Given** a guest requesting their own ratings, **When** the response is returned, **Then** it contains no email address or opaque identifier — the data is implicitly "yours."
3. **Given** a guest viewing another user's details from the dashboard, **When** the detail view loads, **Then** that user is identified by opaque identifier and name — no email.

---

### Edge Cases

- What happens when two guests at the same event have the same display name? The system does not enforce unique names. Both appear with the same name in the dashboard and similar users views. Users can distinguish them by their rating patterns and statistics. No disambiguation suffix is added.
- What happens when a guest registers with an email that was previously used by an admin for the same event? The admin already has a record in the users map (with a userId). The guest registration reuses the existing record rather than creating a duplicate.
- What happens when a session token is expired or invalid? Standard authentication error handling applies — no special behavior related to opaque identifiers.
- What happens if the opaque identifier generation produces a collision? The identifier generator uses sufficient entropy to make collisions statistically impossible within an event's user count (typically under 100 users). No collision detection is required.
- What happens when a guest accesses the bulk ratings endpoint directly? Non-admin requests receive data with opaque identifiers instead of emails. Only admin-authenticated requests receive email addresses.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a unique, opaque, event-scoped identifier for each user when they register for an event.
- **FR-002**: System MUST NOT include email addresses in any non-admin API response. Specifically: dashboard user summaries, similar users, and ratings responses must use opaque identifiers and display names only.
- **FR-003**: System MUST issue role-dependent session tokens: admin tokens contain email and authentication method; guest tokens contain opaque identifier and authentication method — no email.
- **FR-004**: System MUST return the same opaque identifier when a guest re-enters an event they previously registered for.
- **FR-005**: System MUST require a non-empty display name during guest registration and reject registration attempts without one.
- **FR-006**: System MUST continue to show guest email addresses to administrators on the admin page people/settings section and in data exports.
- **FR-007**: System MUST provide a mechanism for guests to retrieve only their own ratings without exposing other users' data — the request implicitly identifies the current user via the session.
- **FR-008**: System MUST handle old-format session tokens (containing email) by transparently resolving the user, generating an opaque identifier if missing, and continuing normally.
- **FR-009**: System MUST automatically assign a display name derived from the email prefix for existing users who lack a name, without requiring user intervention.
- **FR-010**: System MUST assign opaque identifiers to administrators within each event so they appear consistently in shared views (dashboard, similar users) alongside guests.
- **FR-011**: System MUST NOT display opaque identifiers in the user interface. The identifier is strictly internal plumbing for data operations and communication between the application layers.
- **FR-012**: Admin session tokens MUST continue to support cross-event operations (event listing, administrator lookups) using email-based identity.
- **FR-013**: System MUST restrict the bulk ratings endpoint to return email-containing data only for admin-authenticated requests. Non-admin requests MUST receive data with opaque identifiers.

### Key Entities

- **User Identity**: Each user within an event has an opaque identifier (unique within the event), a display name, an email (internal only), and a registration timestamp. The identifier is generated once and persisted for the lifetime of the event.
- **Session Token**: Contains either email (for admin/OTP authentication) or opaque identifier (for guest/PIN authentication), plus the authentication method. The token type determines which identity model the backend uses for the request.
- **User Summary**: A view of a user's participation in an event — includes opaque identifier, display name, rating statistics, and personality data. Never includes email in non-admin contexts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero email addresses appear in any non-admin API response — verifiable by automated testing of all user-facing endpoints.
- **SC-002**: 100% of guest session tokens contain an opaque identifier and no email — verifiable by token inspection tests.
- **SC-003**: All existing events with pre-existing users continue to function without errors after deployment — verifiable by accessing old events and confirming normal operation.
- **SC-004**: Guest registration with a missing or empty display name is rejected 100% of the time — verifiable by validation tests.
- **SC-005**: The "My Progress" view loads successfully showing only the current user's data, with no other users' information in the network response — verifiable by network traffic inspection.
- **SC-006**: Admin pages (people/settings, data export) continue to display email addresses for all users — verifiable by admin workflow tests.
- **SC-007**: Users experience no change in application behavior or performance — page load times and interaction responsiveness remain unchanged.

## Scope

### In Scope

- Generating opaque identifiers for all users (guests and admins) per event
- Removing email from all non-admin API responses (dashboard, similar users, ratings)
- Role-dependent session tokens (admin: email, guest: opaque ID)
- Dedicated mechanism for fetching current user's own ratings
- Mandatory display name enforcement at registration
- Lazy backfill of opaque identifiers and display names for existing users
- Backward compatibility with old session tokens

### Out of Scope

- Replacing email in internal data storage keys (email remains the internal identifier)
- Changing the admin one-time-password authentication flow
- Changing the admin page user management (admins retain email visibility)
- Removing email from server-side logging (separate future concern)
- Cross-event user identity for guests (guests are intentionally ephemeral per event)
- Encrypting email addresses in the data store (provider-level encryption is sufficient)
- Adding uniqueness constraints on display names

## Assumptions

- Display names do not need to be unique within an event. Duplicate names are acceptable — users are distinguishable by their rating patterns and statistics in shared views.
- The opaque identifier format is a short alphanumeric string with sufficient entropy for uniqueness within an event (typically under 100 users).
- Existing events in production have a small user base, making lazy backfill practical without performance concerns.
- The frontend already enforces mandatory display names during registration. The backend change adds server-side enforcement to match.
- Admin data export functionality is already restricted to administrators. This feature does not change access control on the export — it only ensures non-admin access to the ratings endpoint does not include emails.
