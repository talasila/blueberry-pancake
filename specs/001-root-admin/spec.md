# Feature Specification: Root Admin Dashboard

**Feature Branch**: `001-root-admin`  
**Created**: 2024-12-17  
**Status**: Ready for Planning  
**Input**: User description: "I want to build a feature for a system admin, or 'root'. This user can: 1. View a list of all events 2. Details about each event - like owner, type, number of users, items 3. Be able to delete an event, etc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View All Events (Priority: P1)

As a root administrator, I want to see a list of all events in the system so that I can monitor platform usage and identify events that may need attention.

**Why this priority**: This is the foundational capability - without visibility into all events, no other admin actions are possible. Delivers immediate value by providing system oversight.

**Independent Test**: Can be fully tested by logging in as root and verifying all events are displayed with summary information.

**Acceptance Scenarios**:

1. **Given** I am authenticated as root, **When** I access the admin dashboard, **Then** I see a list of all events with basic info (name, state, owner, creation date)
2. **Given** there are 100+ events, **When** I view the event list, **Then** I can paginate/scroll through all events efficiently
3. **Given** I am a regular user (not root), **When** I try to access the admin dashboard, **Then** I am denied access with a clear error message

---

### User Story 2 - View Event Details (Priority: P1)

As a root administrator, I want to view detailed information about any event so that I can understand event activity and troubleshoot issues.

**Why this priority**: Essential for understanding what's happening in each event. Without details, the event list is just a blind inventory.

**Independent Test**: Can be fully tested by clicking on any event and verifying all expected details are displayed.

**Acceptance Scenarios**:

1. **Given** I am viewing the event list, **When** I click on an event, **Then** I see comprehensive details including:
   - Event name and ID
   - Owner email
   - Event state (created, started, paused, completed)
   - Type of items (e.g., wine)
   - Number of registered items
   - Number of participants (unique users who have rated)
   - Creation date
   - Total ratings count
2. **Given** I am viewing event details, **When** I look at the participant count, **Then** I see the number of unique users who have submitted at least one rating

---

### User Story 3 - Delete Event (Priority: P2)

As a root administrator, I want to delete any event so that I can remove test events, abandoned events, or events that violate platform policies.

**Why this priority**: Important for platform maintenance but less frequently used than viewing. Requires caution due to destructive nature.

**Independent Test**: Can be fully tested by deleting a test event and verifying it no longer appears in the system.

**Acceptance Scenarios**:

1. **Given** I am viewing event details, **When** I click delete, **Then** I am prompted to confirm with a warning about permanent data loss
2. **Given** I confirm deletion, **When** the deletion completes, **Then** the event and all associated data (ratings, items) are permanently removed
3. **Given** I cancel the deletion confirmation, **When** I return to the event, **Then** the event remains unchanged
4. **Given** an event is currently active (state: started), **When** I attempt to delete it, **Then** I am warned that users may be actively using it and must confirm additionally

---

### User Story 4 - Search and Filter Events (Priority: P2)

As a root administrator, I want to search and filter events so that I can quickly find specific events among many.

**Why this priority**: Becomes critical as the platform grows. Without filtering, managing hundreds of events becomes impractical.

**Independent Test**: Can be fully tested by applying various filters and verifying correct results.

**Acceptance Scenarios**:

1. **Given** I am on the admin dashboard, **When** I search by event name, **Then** I see only matching events
2. **Given** I am on the admin dashboard, **When** I filter by state (created/started/paused/completed), **Then** I see only events in that state
3. **Given** I am on the admin dashboard, **When** I filter by owner email, **Then** I see only events owned by that user
4. **Given** I apply multiple filters, **When** I view results, **Then** all filters are applied together (AND logic)

---

### User Story 5 - View System Statistics (Priority: P3)

As a root administrator, I want to see aggregate system statistics so that I can understand overall platform health and usage trends.

**Why this priority**: Nice-to-have for strategic oversight but not essential for day-to-day administration.

**Independent Test**: Can be fully tested by viewing the statistics panel and verifying numbers match actual data.

**Acceptance Scenarios**:

1. **Given** I am on the admin dashboard, **When** I view the statistics panel, **Then** I see:
   - Total number of events
   - Events by state (breakdown)
   - Total number of unique users
   - Total ratings submitted
   - Events created in the last 7/30 days

---

### Edge Cases

- What happens when root tries to delete their own event (if root owns any)? → Allowed, same confirmation flow applies
- How does the system handle root access when the platform is under heavy load? → Standard rate limiting applies; root is not exempt
- What happens if two root users try to delete the same event simultaneously? → First deletion succeeds, second gets "event not found" error
- What happens when viewing details of an event that was just deleted by another admin? → User sees "event not found" error with clear message

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST identify root administrators via designated email addresses configured in environment/config
- **FR-002**: System MUST authenticate root users using the existing OTP email flow
- **FR-003**: System MUST display a paginated list of all events to authenticated root users
- **FR-004**: System MUST show event details including: name, ID, owner email, state, item type, item count, participant count, rating count, creation date
- **FR-005**: System MUST allow root to permanently delete any event and all associated data
- **FR-006**: System MUST require confirmation before event deletion
- **FR-007**: System MUST show additional warning when deleting active events (state: started)
- **FR-008**: System MUST deny access to non-root users attempting to access admin features
- **FR-009**: System MUST log all root administrative actions with action type, timestamp, and target event ID
- **FR-010**: System MUST allow filtering events by state, owner, and name
- **FR-011**: System MUST display aggregate statistics on the admin dashboard

### Key Entities

- **Root User**: A privileged system administrator identified by their email address being listed in the root admin configuration. Uses existing OTP authentication but gains access to admin dashboard.
- **Event Summary**: Lightweight view of an event for list display (name, state, owner, counts)
- **Event Details**: Full event information including all metadata and statistics
- **Admin Audit Log**: Record of administrative action including: action type, timestamp, root user email, target event ID

## Assumptions

- Root email addresses will be configured via environment variable (e.g., `ROOT_ADMIN_EMAILS=admin@example.com,superuser@example.com`)
- Audit logs will be written to existing logging infrastructure (no separate audit database)
- Root users are trusted and do not need additional 2FA beyond OTP
- The admin dashboard will be a new route accessible only to authenticated root users

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Root users can view any event's details within 3 seconds of selection
- **SC-002**: Event list loads within 2 seconds even with 1000+ events
- **SC-003**: 100% of deletion attempts are logged in audit trail
- **SC-004**: Zero unauthorized access to admin features (security test passes)
- **SC-005**: Root can locate a specific event using search/filter within 30 seconds
