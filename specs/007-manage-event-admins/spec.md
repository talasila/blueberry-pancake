# Feature Specification: Manage Event Administrators

**Feature Branch**: `007-manage-event-admins`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "manage event administrators

1. An event can have more than one administrator

2. The initial administrator is the one who created the event

3. Subsequently an administrator can go to the event admin screen and add one or more administrators by inputting their email ids.

4. An admin can only add one new admin at a time - no bulk adds

5. An admin can delete any other admin.

6. The last remaining admin cannot be deleted i.e there needs to be at least one admin for a event.

7. Everytime a new admin is created, even during initial event create, add them to the users section since they are a user of the event too. When an admin is deleted remove them from the users section of the configuration."

## Clarifications

### Session 2025-01-27

- Q: For development and testing in the dev environment, can a test OTP like "123456" be used to bypass email OTP verification? → A: Test OTP "123456" bypasses email verification in dev/test environments (same as feature 004-create-event)
- Q: How should the administrator data structure be stored in event configuration? → A: Use `administrators` object with email keys, tracking assignment dates (e.g., `{"admin1@example.com": {"assignedAt": "2025-01-27T10:30:00.000Z"}, "admin2@example.com": {"assignedAt": "2025-01-27T11:00:00.000Z"}}`)
- Q: How should the administrators management functionality be displayed on the event admin screen? → A: Display administrators management functionality as a separate card component (similar to "PIN Management" card structure) with CardHeader, CardTitle, CardDescription, and CardContent sections
- Q: Can the original administrator (event creator) be deleted by other administrators? → A: The original administrator who created the event is marked as the "owner" and can never be removed by anyone else, including themselves

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add New Administrator to Event (Priority: P1)

An event administrator navigates to the event admin screen and adds a new administrator by entering their email address. The system validates the email, adds the new administrator to the event, and automatically adds them to the users section since administrators are also users of the event.

**Why this priority**: This is the core functionality for expanding administrator access. Without the ability to add administrators, events remain limited to a single administrator, which creates a single point of failure. This must work independently to enable collaborative event management.

**Independent Test**: Can be fully tested by navigating to the event admin screen, entering a valid email address for a new administrator, submitting the form, and verifying that the new administrator appears in the administrators list and is also added to the users section.

**Acceptance Scenarios**:

1. **Given** an event administrator is on the event admin screen, **When** they enter a valid email address for a new administrator and submit, **Then** the system adds the new administrator to the event and adds them to the users section
2. **Given** an event administrator attempts to add a new administrator, **When** they enter an invalid email address format, **Then** the system displays a validation error and does not add the administrator
3. **Given** an event administrator attempts to add a new administrator, **When** they enter an email address that is already an administrator, **Then** the system displays an appropriate message indicating the email is already an administrator
4. **Given** an event administrator successfully adds a new administrator, **When** they view the administrators list, **Then** the new administrator appears in the list
5. **Given** an event administrator successfully adds a new administrator, **When** they view the users section, **Then** the new administrator's email appears in the users section with a registration timestamp

---

### User Story 2 - Delete Administrator from Event (Priority: P2)

An event administrator navigates to the event admin screen and removes another administrator from the event. The system prevents deletion of the last remaining administrator and automatically removes the deleted administrator from the users section.

**Why this priority**: This enables administrators to manage access and remove administrators who no longer need access. The protection against deleting the last administrator ensures events always have at least one administrator. This can be tested independently by verifying deletion functionality and the last-admin protection.

**Independent Test**: Can be fully tested by navigating to the event admin screen, selecting an administrator to delete (when multiple exist), confirming deletion, and verifying the administrator is removed from both the administrators list and users section. The test can also verify that deletion of the last administrator is prevented.

**Acceptance Scenarios**:

1. **Given** an event has multiple administrators, **When** an administrator selects another administrator (who is not the owner) to delete and confirms, **Then** the system removes the selected administrator from the administrators list and removes them from the users section
2. **Given** an event administrator attempts to delete the owner (original administrator who created the event), **When** they attempt the deletion, **Then** the system prevents the deletion and displays a message indicating that the owner cannot be removed
3. **Given** an event has only the owner as administrator, **When** the owner attempts to delete themselves, **Then** the system prevents the deletion and displays a message indicating that the owner cannot be removed
4. **Given** an administrator successfully deletes another administrator, **When** they view the administrators list, **Then** the deleted administrator no longer appears in the list
5. **Given** an administrator successfully deletes another administrator, **When** they view the users section, **Then** the deleted administrator's email is removed from the users section
6. **Given** an administrator attempts to delete another administrator, **When** they cancel the deletion action, **Then** no administrators are removed and the administrators list remains unchanged

---

### User Story 3 - View List of Event Administrators (Priority: P3)

An event administrator navigates to the event admin screen and views the current list of all administrators for the event, including the initial administrator who created the event.

**Why this priority**: This provides visibility into who has administrative access to the event. While not required for adding or deleting administrators, it enables administrators to understand the current state before making changes. This can be tested independently by verifying the administrators list displays correctly.

**Independent Test**: Can be fully tested by navigating to the event admin screen and verifying that all administrators are displayed in a clear, readable list format, including the initial administrator who created the event.

**Acceptance Scenarios**:

1. **Given** an event administrator navigates to the event admin screen, **When** they view the administrators section, **Then** the system displays a list of all current administrators for the event, with the owner clearly marked
2. **Given** an event has multiple administrators, **When** an administrator views the administrators list, **Then** all administrators are displayed, including the owner (initial administrator who created the event) with owner designation visible
3. **Given** an event administrator views the administrators list, **When** the list is updated (administrator added or deleted), **Then** the list reflects the current state of administrators

---

### Edge Cases

- What happens when an administrator attempts to add themselves as an administrator? (Should display a message indicating they are already an administrator)
- What happens when an administrator attempts to delete the owner? (Should prevent deletion and display a message indicating the owner cannot be removed)
- How does the system handle adding an administrator with an email that already exists in the users section but is not an administrator? (Should add them as an administrator and keep them in users section)
- What happens when an administrator attempts to delete another administrator while a deletion is in progress? (Should handle concurrent operations gracefully)
- How does the system handle network failures during administrator addition or deletion? (Should display an error message and allow retry without losing form data)
- What happens when an administrator enters an email address with extra whitespace? (Should trim whitespace before validation and processing)
- How does the system handle case sensitivity for email addresses? (Should treat emails as case-insensitive for comparison purposes)
- What happens when an administrator is deleted and then added again? (Should add them back as administrator and restore them to users section)
- How does the system handle very long email addresses? (Should validate email format and enforce reasonable length limits)
- What happens when an event administrator's session expires while managing administrators? (Should prompt for re-authentication or preserve intended action)
- How does the system handle adding an administrator when the event is in a finished state? (Should allow or prevent based on business rules - assume administrators can be managed regardless of event state unless specified otherwise)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support multiple administrators per event
- **FR-002**: System MUST automatically assign the event creator as the initial administrator and owner when an event is created, storing their email as a key in the administrators object with an assignedAt timestamp and owner designation
- **FR-003**: System MUST allow event administrators to navigate to the event admin screen
- **FR-004**: System MUST provide an interface on the event admin screen for adding new administrators, displayed as a separate card component (similar to PIN Management card structure)
- **FR-005**: System MUST allow administrators to add new administrators by entering a single email address at a time
- **FR-006**: System MUST validate email address format before adding an administrator
- **FR-007**: System MUST prevent adding duplicate administrators (same email address already exists as a key in the administrators object)
- **FR-008**: System MUST automatically add newly created administrators to the users section of the event configuration, storing their email as a key in the administrators object with an assignedAt timestamp
- **FR-009**: System MUST provide an interface on the event admin screen for deleting administrators, within the administrators management card component
- **FR-010**: System MUST allow administrators to delete any other administrator from the event, except the owner (original administrator who created the event)
- **FR-011**: System MUST prevent deletion of the owner (original administrator who created the event) by anyone, including the owner themselves
- **FR-020**: System MUST mark the original administrator (event creator) as the "owner" in the administrators object structure
- **FR-012**: System MUST automatically remove deleted administrators from the users section of the event configuration
- **FR-013**: System MUST display a list of all current administrators on the event admin screen, showing email addresses and assignment dates, within the administrators management card component
- **FR-014**: System MUST include the initial administrator (event creator) in the administrators object with their assignedAt timestamp and owner designation
- **FR-015**: System MUST handle administrator addition and deletion operations atomically (all-or-nothing updates to both administrators object and users section)
- **FR-019**: System MUST store assignment timestamps (assignedAt) for all administrators in ISO 8601 format when they are added to the event
- **FR-016**: System MUST display appropriate error messages when administrator operations fail
- **FR-017**: System MUST display appropriate success messages when administrator operations complete successfully
- **FR-018**: System MUST validate that only authenticated event administrators can access administrator management features

### Key Entities *(include if feature involves data)*

- **Event Administrator**: Represents a user with administrative privileges for an event. Key attributes: email address (unique identifier, used as key in administrators object), event ID (which event they administer), assignedAt timestamp (when they became an administrator, stored in administrators object), owner designation (boolean flag indicating if this is the original administrator who created the event). Administrators have permissions to manage event settings, add/remove other administrators (except the owner), and manage event state. The initial administrator is automatically assigned as the owner when an event is created. Administrators are also users of the event and must be included in the users section. The owner cannot be deleted by anyone, including themselves.

- **Event**: Represents a user-created event that can have multiple administrators. Key attributes: event ID, administrators object (object with email addresses as keys, each containing assignedAt timestamp and optional owner flag), users section (collection of user email addresses with registration timestamps). Events must maintain at least one administrator at all times (the owner). When administrators are added or removed, corresponding updates must be made to the users section. The administrators object structure: `{"email@example.com": {"assignedAt": "ISO 8601 timestamp", "owner": true/false}}`. The owner is the original administrator who created the event and cannot be deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can add a new administrator to an event (enter email, submit, see confirmation) in under 30 seconds from accessing the event admin screen
- **SC-002**: Administrators can delete another administrator from an event (select, confirm, see confirmation) in under 20 seconds
- **SC-003**: 100% of newly added administrators are automatically added to the users section of the event configuration
- **SC-004**: 100% of deleted administrators are automatically removed from the users section of the event configuration
- **SC-005**: System prevents deletion of the owner in 100% of attempts (zero successful deletions of owner)
- **SC-011**: Administrators list clearly displays owner designation in 100% of views
- **SC-006**: Email validation for administrator addition displays clear error messages within 500 milliseconds of submission attempt
- **SC-007**: Administrators list displays all current administrators within 1 second of loading the event admin screen
- **SC-008**: 95% of administrator addition attempts with valid email addresses result in successful administrator creation
- **SC-009**: System handles duplicate administrator addition attempts gracefully (displays appropriate message) in 100% of cases
- **SC-010**: Administrators can view the complete list of administrators for their event without errors in 100% of attempts

## Assumptions

- The event admin screen already exists and is accessible to event administrators (from existing features)
- Email addresses are the unique identifier for administrators and users
- The users section in event configuration tracks users by email address with registration timestamps
- Administrators must be authenticated (via OTP/JWT) to access administrator management features
- Test OTP "123456" from OTP authentication system applies to this feature, allowing bypass of email OTP verification in development and test environments for faster development and testing workflows
- The event admin screen is a protected route that requires administrator authentication
- Email validation follows standard email format rules (reasonable format validation)
- Administrator operations (add/delete) require appropriate permissions that are validated on both frontend and backend
- The initial administrator assignment during event creation is handled by the existing event creation feature
- Administrator management operations are atomic (both administrators list and users section are updated together)
- The event admin screen can be refreshed or polled to show updated administrator lists
- Administrators can manage other administrators regardless of event state (created, started, paused, finished)
- Email addresses are case-insensitive for comparison purposes (same email in different case is considered duplicate)
- The users section structure supports adding and removing users by email address

## Dependencies

- Event creation feature (feature 004-create-event) for initial administrator assignment
- Event admin screen/page (existing feature) for administrator management interface
- Authentication system (OTP/JWT) for verifying administrator permissions
- Event data repository infrastructure for persisting administrator and user data
- Frontend form components and validation utilities for email input
- Backend endpoints for adding and deleting administrators
- Backend validation for preventing deletion of owner (original administrator)
- Event configuration data structure that supports administrators object (with email keys and assignedAt timestamps) and users section
- Migration strategy for converting existing single `administrator` string field to `administrators` object structure

## Out of Scope

- Bulk administrator addition (adding multiple administrators in a single operation)
- Administrator role differentiation or permissions beyond basic administrator status
- Administrator invitation system (email notifications to newly added administrators)
- Administrator activity logging or audit trail
- Administrator transfer of ownership (owner designation is permanent and cannot be transferred)
- Administrator management via API without UI
- Administrator expiration or time-limited administrator access
- Administrator groups or hierarchical administrator structures
- Administrator profile management or additional administrator metadata
- Administrator search or filtering within the administrators list
- Administrator sorting or custom ordering of administrators list
- Administrator export or reporting functionality