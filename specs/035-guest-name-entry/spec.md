# Feature Specification: Collect Guest Name at Event Entry

**Feature Branch**: `035-guest-name-entry`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Collect guest name at event entry with localStorage pre-fill"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New Guest Enters Event (Priority: P1)

A first-time guest visits an event URL and is presented with a form requiring both their name and email address. After submitting both fields, the guest proceeds to PIN verification. Upon successful PIN entry, the guest's name is saved and displayed throughout the app wherever their identity appears (ratings tables, similar users, dashboards).

**Why this priority**: This is the core feature. Without name collection at entry, guests continue to appear as email prefixes or "Unnamed User" across the app. This story delivers the primary user value.

**Independent Test**: Can be fully tested by having a new guest access an event, fill in name and email, verify PIN, and confirm the name appears in the ratings table and similar users views.

**Acceptance Scenarios**:

1. **Given** a guest visiting an event URL for the first time, **When** they load the entry page, **Then** they see both a "Your Name" field and an "Email Address" field, both empty.
2. **Given** a guest on the entry page, **When** they attempt to submit with only an email (no name), **Then** the form prevents submission and displays a validation message.
3. **Given** a guest on the entry page, **When** they attempt to submit with only a name (no email), **Then** the form prevents submission and displays a validation message.
4. **Given** a guest who has submitted a valid name and email, **When** they complete PIN verification, **Then** their name is stored on the server and displayed wherever their identity appears in the app.

---

### User Story 2 - Admin Enters Event (Priority: P1)

An administrator visits an event URL and is presented with the same name and email form. After submitting, they are routed to OTP verification instead of PIN. Upon successful OTP entry, the admin's name is saved in the same way as a guest's name.

**Why this priority**: Admins have the same nameless problem as guests. The event creator is added to the users map at event creation time without a name. This story ensures all participants — guests and admins alike — have names on record.

**Independent Test**: Can be fully tested by having an admin access an event, fill in name and email, verify OTP, and confirm the name is stored and displayed.

**Acceptance Scenarios**:

1. **Given** an administrator visiting an event URL, **When** they submit their name and email, **Then** they are routed to OTP verification (not PIN).
2. **Given** an administrator who completes OTP verification, **When** the verification succeeds, **Then** their name is saved and appears wherever their identity is displayed in the app.
3. **Given** an administrator who was added to the event at creation time (already exists in user records without a name), **When** they enter via the entry page and complete OTP, **Then** their existing record is updated with the provided name without creating a duplicate.

---

### User Story 3 - Returning User Pre-Fill (Priority: P2)

A guest or admin who has previously entered an event on the same device visits the entry page again. Both the name and email fields are automatically pre-filled from their previous entry. The user can confirm the pre-filled values and proceed, or edit either field before submitting.

**Why this priority**: This is a convenience feature that eliminates repetitive data entry. It enhances the experience but is not required for names to be collected — users can always type their info manually.

**Independent Test**: Can be fully tested by having a user enter an event once, close the browser, reopen the event URL, and verify both fields are pre-filled.

**Acceptance Scenarios**:

1. **Given** a user who has previously submitted the entry form on this device, **When** they load the entry page for any event, **Then** both name and email fields are pre-filled with their previously submitted values.
2. **Given** a user with pre-filled fields, **When** they submit without making changes, **Then** the form accepts the pre-filled values and proceeds normally.
3. **Given** a user with pre-filled fields, **When** they edit the name and submit, **Then** the updated name is saved both locally (for future pre-fill) and on the server.
4. **Given** a user on a new device or browser where they have never entered an event, **When** they load the entry page, **Then** both fields are empty (no pre-fill available).

---

### User Story 4 - Name Change at Any Time (Priority: P2)

A user can change their display name at any time — either by editing the pre-filled name on the entry page during re-entry, or by editing their name in the existing in-app name editor. The email address is the sole identifier; changing the name does not affect the user's ratings, event membership, or any other data.

**Why this priority**: Reinforces the identity model. Users must be confident that updating their name is safe and non-destructive. This story ensures both name-editing paths (entry page and in-app) work consistently.

**Independent Test**: Can be fully tested by having a user change their name via the entry page on re-login, then verifying the new name appears in the ratings table without any data loss.

**Acceptance Scenarios**:

1. **Given** a user who previously entered as "Jon", **When** they re-enter the event and change their name to "Jonathan", **Then** the name "Jonathan" replaces "Jon" everywhere in the app.
2. **Given** a user who changes their name on re-entry, **When** they view their ratings and event data, **Then** all their existing ratings and data are intact — only the display name has changed.
3. **Given** a user who changes their name via the in-app name editor, **When** they next visit the entry page, **Then** the pre-filled name reflects the locally stored value (which may differ from the server-side name if changed from another device).

---

### Edge Cases

- What happens when a user enters leading/trailing whitespace in the name field? The name is trimmed before saving.
- What happens when a user enters a name consisting only of whitespace or special characters? The form requires at least one non-whitespace character.
- What happens when the browser's persistent local storage is unavailable (private browsing, storage full, disabled)? The form works normally with empty fields — pre-fill is a convenience, not a requirement.
- What happens when a user has pre-filled data from a previous event but is now accessing a different event? The pre-fill still works since name and email are stored globally, not per-event.
- What happens when the name save fails on the server but PIN/OTP verification succeeds? The user still enters the event. The name can be set later via the in-app editor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The entry page MUST display both a name field and an email field, with the name field appearing above the email field.
- **FR-002**: Both name and email fields MUST be mandatory — the form MUST NOT submit unless both contain valid input.
- **FR-003**: The name field MUST require at least one non-whitespace character after trimming.
- **FR-004**: On page load, the entry page MUST attempt to pre-fill both fields from previously saved values in the browser's persistent local storage.
- **FR-005**: On successful form submission, the system MUST save both the name and email to the browser's persistent local storage for future pre-fill.
- **FR-006**: The saved name and email MUST be global (not scoped to a specific event) since a person's identity does not change between events.
- **FR-007**: The name MUST be passed through to the server during both PIN verification (guest flow) and OTP verification (admin flow).
- **FR-008**: The server MUST store the provided name in the user's record upon successful verification, for both new and returning users (last-write-wins).
- **FR-009**: The name field on the entry page MUST NOT be the only way to set a name — the existing in-app name editor MUST continue to function as an alternative.
- **FR-010**: Changing a name MUST NOT affect the user's event membership, ratings, or any other data. The email address is the sole user identifier.
- **FR-011**: The public endpoint used to determine authentication flow (admin vs guest) MUST NOT be modified to expose user registration status or names, to prevent user enumeration on an unauthenticated endpoint.

### Key Entities

- **User (event participant record)**: Represents a participant in an event. Keyed by email address. Contains registration timestamp and display name. The email is the immutable identifier; the name is a mutable display label.
- **Remembered Identity (browser local storage)**: A convenience record stored in the user's browser containing their name and email. Used solely for pre-filling the entry form. Global across events. Not a source of truth — the server record is authoritative.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users who enter an event have a name on record at the time of entry (compared to the current state where name is only set if the user discovers and uses the in-app editor).
- **SC-002**: Returning users on the same device can access an event in under 10 seconds (pre-filled name and email, just confirm and enter PIN).
- **SC-003**: The proportion of users displayed as email prefixes or "Unnamed User" in ratings tables and dashboards decreases to near zero for events created after this feature ships.
- **SC-004**: Users can change their display name and see the change reflected across the app immediately, with no impact to their existing data.

## Assumptions

- Users are comfortable providing their name on a form alongside their email. This is a standard pattern for event access.
- A single name field (not separate first/last) is sufficient for this use case. Tasting events are informal and a single display name is appropriate.
- The browser's persistent local storage is available in the vast majority of usage scenarios. Degraded behavior (no pre-fill) in private browsing or restricted environments is acceptable.
- The existing in-app name editor will continue to update the same server-side field. Both paths write to the same location — no synchronization issues arise.

## Scope Boundaries

### In Scope

- Adding name field to the event entry page
- Making both name and email mandatory at entry
- Pre-filling from browser local storage on return visits
- Passing name through PIN and OTP verification flows to the server
- Storing name server-side during verification

### Out of Scope

- Modifying the public admin-check endpoint to return registration or name data
- Adding a "Remember me" checkbox (always remember — no opt-out needed for this use case)
- Per-event name storage in the browser (names are global)
- Separate first name / last name fields
- Profile picture or avatar functionality
- Name uniqueness validation (multiple users can have the same display name)
