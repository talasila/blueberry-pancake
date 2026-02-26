# Feature Specification: Admin Event List Enhancements

**Feature Branch**: `018-admin-event-list`  
**Created**: 2026-02-26  
**Status**: Draft  
**Input**: User description: "Enhancements to the system admin 'All Events' section at /system — limit display to 25 most recent events, show event ID and PIN on cards, show PIN in event details drawer, and expand search to cover all events by ID, name, or admin email."

## Clarifications

### Session 2026-02-26

- Q: When a search matches many events (e.g., 200+), should results be uncapped, capped at a fixed number, or paginated? → A: Cap search results at a fixed number (100) with a "showing first 100 results" message.
- Q: Should admin email search match only the event owner's email or all administrator emails (owner + co-admins)? → A: Owner email only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full-Text Search Across All Events (Priority: P1)

A root administrator opens the system admin page and uses the search box to find a specific event. The search covers **all events in the database**, not just the 25 currently displayed. The administrator can search by event ID, event name, or event owner email address. Results replace the default list and show all matching events (capped at 100).

**Why this priority**: Search is the primary tool for administrators managing a large number of events. Without cross-field, full-database search, admins cannot efficiently locate events — especially older ones that fall outside the 25 most recent.

**Independent Test**: Can be fully tested by typing various search terms (an event ID, a partial event name, an admin email) into the search box and verifying correct results appear regardless of event creation date.

**Acceptance Scenarios**:

1. **Given** the admin is on /system with 100+ events in the database, **When** the admin types a partial event name into the search box, **Then** all events whose name contains that substring are displayed (case-insensitive), including events not in the initial 25.
2. **Given** the admin is on /system, **When** the admin types an event ID into the search box, **Then** the event with that exact or partial ID match is displayed.
3. **Given** the admin is on /system, **When** the admin types an owner email address (or substring) into the search box, **Then** all events whose owner email matches are displayed.
4. **Given** the admin has typed a search query with no matches, **When** results return empty, **Then** a "No events match your search" message is displayed with an option to clear the search.
5. **Given** the admin has an active search, **When** the admin clears the search box, **Then** the default view (25 most recent events) is restored.
6. **Given** a search query matches more than 100 events, **When** results are displayed, **Then** only the first 100 results are shown and a message indicates that results have been capped (e.g., "Showing first 100 of 234 results").

---

### User Story 2 - Default View Shows 25 Most Recent Events (Priority: P2)

When a root administrator navigates to /system, the "All Events" section displays only the 25 most recently created events by default (sorted newest first). A label clearly communicates that only the most recent 25 are shown.

**Why this priority**: Limiting the default view improves page load performance and keeps the interface focused. The label sets clear expectations that the admin is seeing a subset.

**Independent Test**: Can be tested by navigating to /system with more than 25 events in the database and verifying that exactly 25 event cards appear, sorted by creation date descending, with an informational label.

**Acceptance Scenarios**:

1. **Given** the database has more than 25 events, **When** the admin loads /system, **Then** exactly 25 event cards are displayed, sorted by most recently created first.
2. **Given** the database has more than 25 events, **When** the admin views the "All Events" section, **Then** a visible label (e.g., "Showing 25 most recent events") communicates that a subset is displayed.
3. **Given** the database has fewer than 25 events, **When** the admin loads /system, **Then** all events are displayed and no "most recent" label is shown.
4. **Given** the admin is viewing the default 25 events, **When** the admin begins a search, **Then** the default 25-event limit is removed and search results span all events.

---

### User Story 3 - Event Card Displays Event ID and PIN (Priority: P3)

Each event card in the "All Events" list displays the event ID and the event PIN alongside the existing information (event name, state, owner, item count, participant count, rating count, creation date).

**Why this priority**: Showing the event ID and PIN at a glance reduces the number of clicks needed for an admin to locate or share event access details. This is supplementary information that enhances the existing card layout.

**Independent Test**: Can be tested by viewing the event list and verifying that each card shows the event ID and PIN values matching the database.

**Acceptance Scenarios**:

1. **Given** the admin is viewing the event list, **When** event cards are rendered, **Then** each card displays the event ID.
2. **Given** the admin is viewing the event list, **When** event cards are rendered, **Then** each card displays the event PIN.
3. **Given** an event was created before the PIN feature existed and has no PIN, **When** the card is rendered, **Then** the PIN field shows a "No PIN" or equivalent indicator rather than blank or an error.

---

### User Story 4 - Event Details Drawer Shows PIN (Priority: P4)

When a root administrator clicks on an event card, the event details side drawer includes the event PIN in the detail rows alongside the existing information (event ID, owner, state, type of item, max rating, created date, administrators, registered items).

**Why this priority**: The drawer already shows most event details. Adding the PIN here completes the information and provides a consistent experience — the PIN visible on the card is also visible in the full details view.

**Independent Test**: Can be tested by clicking an event card and verifying the PIN appears in the drawer details section.

**Acceptance Scenarios**:

1. **Given** the admin clicks on an event card, **When** the event details drawer opens and loads, **Then** the event PIN is displayed in the details list.
2. **Given** the admin opens details for an event with no PIN, **When** the drawer loads, **Then** the PIN field shows "No PIN" or equivalent rather than blank or an error.

---

### Edge Cases

- What happens when the search query matches hundreds of events? Results are capped at 100 with a message showing total matches.
- What happens if an event has no PIN (legacy events created before PINs)? Cards and drawer should gracefully show a placeholder like "No PIN".
- What happens if the admin types only whitespace in the search box? It should be treated as an empty search, showing the default 25 most recent.
- What happens if the search query is very short (e.g., a single character)? The search should still execute; the debounce prevents excessive requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The default "All Events" view MUST display only the 25 most recently created events, sorted by creation date descending.
- **FR-002**: The "All Events" section MUST display a label indicating that only the 25 most recent events are shown, when the total event count exceeds 25.
- **FR-003**: Each event card MUST display the event ID.
- **FR-004**: Each event card MUST display the event PIN (or a "No PIN" indicator for events without one).
- **FR-005**: The event details drawer MUST display the event PIN (or a "No PIN" indicator for events without one).
- **FR-006**: The search box MUST filter events by event ID (substring match, case-insensitive).
- **FR-007**: The search box MUST filter events by event name (substring match, case-insensitive).
- **FR-008**: The search box MUST filter events by the event owner's email address (substring match, case-insensitive). Co-admin emails are not included in search.
- **FR-009**: The search MUST query the full set of events in the database, not just the events currently displayed in the UI.
- **FR-010**: When search results are displayed, the "25 most recent" restriction MUST NOT apply. Results MUST be capped at 100 events, sorted by most recently created first.
- **FR-010a**: When search results exceed 100, the system MUST display a message indicating the total match count and that results are capped (e.g., "Showing first 100 of N results").
- **FR-011**: Clearing the search MUST restore the default view (25 most recent events).
- **FR-012**: Search input MUST be debounced to avoid excessive requests during typing.
- **FR-013**: The PIN data MUST be included in both the event summary (list) and event details (drawer) responses from the backend.

### Key Entities

- **Event Summary (list card)**: Existing fields (eventId, name, state, ownerEmail, typeOfItem, itemCount, participantCount, ratingCount, createdAt) plus **pin** (6-digit string or null).
- **Event Details (drawer)**: Existing fields plus **pin** (6-digit string or null).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Default page load displays exactly 25 events (or all events if fewer than 25 exist) with a visible label indicating the subset.
- **SC-002**: An administrator can locate any event in the database by searching for its ID, name, or admin email — regardless of whether the event is in the default top 25.
- **SC-003**: Event ID and PIN are visible on every event card without needing to open the details drawer.
- **SC-004**: Event PIN is visible in the event details drawer for every event.
- **SC-005**: Search results appear within 2 seconds of the user finishing typing (including debounce delay).
- **SC-006**: Legacy events without a PIN display a clear "No PIN" indicator on both the card and the drawer, with no errors or blank fields.

## Assumptions

- The search fields (event ID, event name, admin email) are sufficient for admin lookup needs; no additional fields are required.
- The existing 300ms debounce delay is appropriate for the enhanced search.
- The 25-event default limit applies only to the initial/unfiltered view; search results are capped at 100.
- The PIN is already stored on the event configuration in the database as `pin` and can be surfaced by the backend without additional data store changes.
- The "admin email" searched against is the event owner's email address only; co-admin emails are not searched.
