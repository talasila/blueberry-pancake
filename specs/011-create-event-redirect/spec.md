# Feature Specification: Redirect to Admin Page After Event Creation

**Feature Branch**: `011-create-event-redirect`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "Currently when a user creates an event and upon success a modal is displayed with the event-id. This is not very user friendly. Instead of displaying the modal the user should directly be taken to the event's administration or settings page."

## Clarifications

### Session 2026-02-24

- Q: Back button destination after event creation redirect — should it always go to the landing page, or to the previous page in history (which is the landing page in the primary flow but may vary)? → A: Back skips the create form and goes to the previous page in history (landing page in primary flow, but varies by entry point)
- Q: Should the admin page show guidance after event creation, or is a plain toast sufficient? → A: Enhanced toast with next-step hint (e.g., "Event created! Share the PIN with participants to get started") — no admin page layout changes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Redirect to Admin Page After Event Creation (Priority: P1)

An authenticated user fills out the create event form and submits it. Instead of seeing a success modal with the event ID, the system immediately redirects them to the event's administration page where they can begin configuring the event (PIN, items, ratings, etc.). A brief success notification confirms the event was created.

**Why this priority**: This is the core change. The current modal-based flow requires an extra dismissal step and leaves the user on the create-event page with no clear next action. Redirecting to the admin page places the user exactly where they need to be and eliminates a dead-end interaction.

**Independent Test**: Can be fully tested by creating an event through the form and verifying that the user lands on the admin page for that event, with the correct event data loaded and a success notification visible.

**Acceptance Scenarios**:

1. **Given** an authenticated user is on the create event page with a valid event name and type of item, **When** they click "Create Event" and the event is created successfully, **Then** the system redirects them to the event's administration page at `/event/{eventId}/admin`
2. **Given** event creation succeeds and the user is redirected, **When** the admin page loads, **Then** a brief success notification is displayed confirming the event was created and including a next-step hint (e.g., "Event created! Share the PIN with participants to get started")
3. **Given** event creation succeeds and the user is redirected, **When** the admin page loads, **Then** the event name, event ID, PIN, and all admin controls are visible and functional
4. **Given** the user has been redirected to the admin page after creation, **When** they press the browser back button, **Then** they are taken to the previous page in history (skipping the create-event form), which is the landing page in the primary flow but may vary depending on how the user reached the create-event page

---

### User Story 2 - Remove Success Modal (Priority: P1)

The existing success modal that displays the event ID after creation is removed. The event ID and PIN are already prominently displayed on the admin page, so the modal is redundant once the redirect is in place.

**Why this priority**: This is tightly coupled to User Story 1. Keeping the modal would block the redirect or create a confusing two-step flow (dismiss modal, then navigate). Removing it is required for the redirect to feel seamless.

**Independent Test**: Can be tested by creating an event and verifying that no success modal or overlay appears at any point during the creation-to-admin-page transition.

**Acceptance Scenarios**:

1. **Given** an authenticated user submits the create event form successfully, **When** the API returns success, **Then** no modal or overlay is displayed
2. **Given** event creation succeeds, **When** the user is redirected to the admin page, **Then** the event ID and PIN are visible on the admin page itself (no separate popup needed)

---

### User Story 3 - Error Handling Remains on Create Page (Priority: P2)

When event creation fails (validation error, network error, server error), the user remains on the create event page with their form data preserved and a clear error message displayed. No redirect occurs on failure.

**Why this priority**: Error handling must not regress. The current error behavior is already correct and should be preserved. This story ensures the redirect only happens on success.

**Independent Test**: Can be tested by simulating failures (empty name, network error) and verifying the user stays on the create event page with error messages and form data intact.

**Acceptance Scenarios**:

1. **Given** a user submits the create event form with invalid data, **When** validation fails, **Then** the user remains on the create event page with the error message and form data preserved
2. **Given** a user submits the create event form with valid data, **When** the API returns an error, **Then** the user remains on the create event page with the server error message displayed and form data preserved
3. **Given** a network failure occurs during event creation, **When** the request fails, **Then** the user remains on the create event page with an appropriate error message

---

### Edge Cases

- What happens if the user rapidly clicks "Create Event" multiple times? The existing duplicate-submission guard (disabling button during submission) remains in place; only one event is created and one redirect occurs.
- What happens if the redirect to the admin page fails (e.g., the page cannot load)? The event has already been created server-side; the admin page's own error handling and retry mechanisms apply. The user can manually navigate to the event.
- What happens if the user's JWT does not yet contain the new event when the admin page loads? The backend adds the event to the JWT cookie in the create-event API response, so the token is updated before the redirect. If this somehow fails, the admin page redirects to auth (existing behavior), but this is an unlikely edge case since the token update happens in the same response.
- What happens if the user navigates directly to `/create-event` after already creating an event? They see a fresh, empty create event form and can create another event.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST redirect the user to `/event/{eventId}/admin` immediately after successful event creation, where `{eventId}` is the ID of the newly created event
- **FR-002**: System MUST NOT display a success modal or overlay after event creation
- **FR-003**: System MUST display a brief, non-blocking success notification (toast) on the admin page confirming the event was created and including a next-step hint directing the user to share the PIN with participants
- **FR-004**: System MUST replace the create-event page entry in browser history so that the back button from the admin page skips the create-event form and returns to the previous page in history (the landing page in the primary flow)
- **FR-005**: System MUST keep the user on the create event page with form data preserved and error message displayed when event creation fails
- **FR-006**: System MUST continue to prevent duplicate event creation on rapid clicks (existing behavior preserved)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After successful event creation, the user lands on the event administration page within 2 seconds (including network round-trip for creating the event and loading the admin page)
- **SC-002**: 100% of successful event creations result in a redirect to the correct admin page for the newly created event (no stale or wrong event ID)
- **SC-003**: The success notification is visible on the admin page for at least 3 seconds after redirect, confirming the event was created
- **SC-004**: Users who create an event can immediately interact with admin controls (PIN, settings, state transitions) on the admin page without additional authentication steps
- **SC-005**: Zero regressions in error handling: failed event creations keep the user on the create page with form data intact 100% of the time

## Assumptions

- The event administration page (`/event/{eventId}/admin`) is fully functional and already displays event ID, PIN, and all admin controls (feature 007-manage-event-admins and related features)
- The backend `POST /api/events` response includes the `eventId` and updates the JWT cookie with the new event, so the user has admin access when the admin page loads
- Toast notifications are the established pattern for transient success messages in the application (via `sonner` library, already used in the admin page)
- The `ProtectedRoute` and `AdminRoute` guards will pass without re-authentication since the JWT is already valid and contains the new event
- The create event form's existing validation, duplicate-submission prevention, and error handling behavior are correct and only the post-success behavior changes
- Browser history replacement (equivalent to `navigate(..., { replace: true })`) is the appropriate pattern so the completed create form is not left in navigation history

## Dependencies

- Event administration page (`/event/{eventId}/admin`) — must be fully functional and render correctly when navigated to with a freshly created event
- Toast notification system (`sonner`) — already integrated in the application
- Frontend routing (`react-router-dom`) — already provides `useNavigate` for programmatic redirect with `replace` option

## Out of Scope

- Changes to the event administration page layout or content
- Changes to the create event form fields, validation rules, or authentication flow
- Any first-time setup wizard, guided tour, or onboarding UI on the admin page (the enhanced toast with next-step hint is the only post-creation guidance)
- Changes to how the landing page "Create" button or auth flow works
- Adding a "Create another event" shortcut on the admin page
