# Feature Specification: My Events Page

**Feature Branch**: `016-my-events`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "When an administrator creates an event, they are redirected to the event's admin page. The event ID (an 8-character Crockford Base32 code) is visible in the URL and on the admin page, but there is no dedicated mechanism to help the user remember or recover it. If the administrator logs out or closes their browser, they have no way to find their event again unless they remember the 8-character code. There is no 'My Events' page, no event list, and no recovery flow. The backend already associates events with administrator email addresses and has a getEventsByAdministrator(email) method (used internally during JWT token refresh in auth.js), but this capability is not exposed to users through any UI."

## Clarifications

### Session 2026-02-25

- Q: Who should see the "My Events" menu item in the header dropdown — all authenticated users or only OTP-authenticated administrators? → A: Only users authenticated via OTP (administrators). Hide from PIN-authenticated participants to avoid showing an irrelevant feature during a tasting session.
- Q: Does adding an `authMethod` field to the JWT token payload conflict with "Any changes to authentication mechanisms" being out of scope? → A: No. Out of Scope refers to altering existing OTP/PIN authentication flows. Adding `authMethod` to the JWT payload is a data extension to the token schema — it does not change how users authenticate, only what metadata the token carries.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View My Events After Re-Authentication (Priority: P1)

An administrator who previously created one or more events returns to the application after logging out or closing their browser. They click "My Events" on the landing page, authenticate via the existing OTP email flow, and land on a page listing all events where they are an administrator. Each event displays its name, event ID, state, and creation date. The administrator clicks on an event to go directly to its admin page.

**Why this priority**: This is the core value of the feature — giving administrators a way to recover access to their events without remembering an 8-character code. Without this, the entire feature has no purpose.

**Independent Test**: Can be fully tested by creating an event, logging out, navigating to "My Events" from the landing page, authenticating, and verifying the event appears in the list with correct details and links to the admin page.

**Acceptance Scenarios**:

1. **Given** an administrator who has previously created events is on the landing page (not authenticated), **When** they click the "My Events" card, **Then** they are directed to the authentication flow with the intended destination set to the My Events page.
2. **Given** an administrator has completed OTP authentication from the My Events flow, **When** the My Events page loads, **Then** it displays a list of all events where they are an administrator, showing each event's name, event ID, state, and creation date.
3. **Given** the My Events page is displayed with events, **When** the administrator clicks on an event in the list, **Then** they are navigated to that event's admin page.
4. **Given** the My Events page is displayed with multiple events, **When** the administrator views the list, **Then** the events are ordered with the most recently created event first.

---

### User Story 2 - Access My Events From Header Menu (Priority: P1)

An authenticated administrator who is currently inside an event (or on any non-landing page) wants to see all their events. They open the header dropdown menu and click "My Events" to navigate directly to the My Events page without re-authenticating.

**Why this priority**: This is the second entry point to the same page. Administrators who are already logged in and deep within an event need a way to navigate to the event list without going back to the landing page. This is equally critical because the header menu is the primary navigation mechanism for authenticated users.

**Independent Test**: Can be fully tested by logging in, navigating to an event's admin page, opening the header menu, clicking "My Events", and verifying the events list is displayed.

**Acceptance Scenarios**:

1. **Given** an OTP-authenticated administrator is on any page other than the landing page, **When** they open the header dropdown menu, **Then** a "My Events" menu item is visible.
2. **Given** an OTP-authenticated administrator clicks "My Events" in the header dropdown menu, **When** the page loads, **Then** they see the same event list as when accessing via the landing page.
3. **Given** a PIN-authenticated participant is on an event page, **When** they open the header dropdown menu, **Then** no "My Events" menu item is visible.
4. **Given** an unauthenticated user is on the landing page, **When** they view the header, **Then** no dropdown menu or "My Events" link is visible in the header (existing behavior — menu only shows when authenticated and not on landing page).

---

### User Story 3 - Empty State When No Events Exist (Priority: P2)

A user who has never created an event authenticates and arrives at the My Events page. Instead of a blank page, they see a friendly message indicating they have no events, along with a clear call-to-action to create their first event.

**Why this priority**: While secondary to the core listing functionality, the empty state is essential for a complete user experience. Without it, first-time users who land on My Events would see a confusing blank page.

**Independent Test**: Can be fully tested by authenticating with an email address that has no associated events and verifying the empty state message and create-event link are displayed.

**Acceptance Scenarios**:

1. **Given** an authenticated user with no events navigates to the My Events page, **When** the page loads, **Then** a message is displayed indicating they have no events (e.g., "You haven't created any events yet").
2. **Given** the empty state is displayed, **When** the user clicks the create event link or button, **Then** they are navigated to the create event page.

---

### Edge Cases

- What happens if the administrator's events cannot be loaded due to a network or server error? The page displays an appropriate error message and allows the user to retry.
- What happens if an event in the list has been deleted by another administrator since the page loaded? The list reflects the current state at time of load; navigating to a deleted event's admin page is handled by the existing event-not-found behavior.
- What happens if the administrator has a very large number of events? The list displays all events. Pagination or infinite scroll is not needed at this stage given the expected event volumes.
- What happens if the user navigates directly to `/my-events` without authenticating? The protected route redirects them to the authentication flow, then returns them to `/my-events` after successful authentication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "My Events" card on the landing page that initiates the authentication flow with the My Events page as the post-authentication destination.
- **FR-002**: System MUST provide a "My Events" menu item in the header dropdown menu for OTP-authenticated administrators on non-landing pages. The menu item MUST NOT appear for PIN-authenticated participants.
- **FR-003**: System MUST display a list of all events where the authenticated user is an administrator, showing each event's name, event ID, state, and creation date.
- **FR-004**: System MUST order the event list by creation date, most recent first.
- **FR-005**: System MUST link each event in the list to its administration page.
- **FR-006**: System MUST require authentication to access the My Events page, using the same protection mechanism as the create event page.
- **FR-007**: System MUST display a meaningful empty state message with a link to the create event flow when the user has no events.
- **FR-008**: System MUST display an error message with a retry option when the event list fails to load.

### Key Entities

- **Event Summary**: A lightweight representation of an event for display in the list, containing the event ID, name, state (created, started, paused, completed), and creation date. This is a read-only view derived from the full event data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can find and access any of their previously created events within 30 seconds of arriving at the landing page (including authentication time).
- **SC-002**: 100% of events where the user is an administrator appear in the My Events list.
- **SC-003**: The My Events page is accessible from both the landing page and the header dropdown menu, providing two distinct navigation paths.
- **SC-004**: Users with no events see the empty state with a clear path to event creation, resulting in zero dead-end pages.
- **SC-005**: Administrators no longer need to remember event IDs to regain access to their events.

## Assumptions

- The existing OTP email authentication flow supports arbitrary post-authentication redirect destinations (the create event flow already demonstrates this pattern with `{ from: { pathname: '/create-event' } }`).
- The existing `getEventsByAdministrator(email)` method in the backend correctly returns all event IDs where the user is an administrator.
- Event volumes per administrator are small enough (tens, not thousands) that loading all events at once without pagination is acceptable.
- The header dropdown menu pattern (used for Profile, Dashboard, Settings, Logout) is the established navigation mechanism for authenticated users and can be extended with additional items.
- The landing page card layout (used for "Join an event" and "Create an event") can accommodate a third card without degrading the user experience.

## Dependencies

- OTP email authentication flow — must support redirect to `/my-events` after authentication (already supports arbitrary redirects via navigation state).
- Event administration page — must be functional when navigated to from the My Events list (already exists).
- Header dropdown menu — must be extensible with new menu items (already supports dynamic items based on context).

## Out of Scope

- Pagination or infinite scroll for the event list.
- Search or filtering within the event list.
- Displaying events where the user is a participant (non-administrator).
- Editing or deleting events from the My Events page (these actions are available on each event's admin page).
- Any changes to the event creation flow, admin page, or authentication mechanisms.
- Email notifications containing event IDs or recovery links.
