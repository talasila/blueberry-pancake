# Feature Specification: Event Rating Page

**Feature Branch**: `009-event-rating-page`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "event page setup

The main event page is where users come in to rate the items. 

1. Items are displayed just as numbers.

2. Users click on a number  a \"Drawer\"  component opens up the content of which depneds on the state of the Event

3. If the event is the \"created\" state, the drawer opens with a message stating that the event has not started yet.

4. If the event is in the \"started\" state, the drawer opens and provides the user the ability to select a rating and, optional, provide a note.

5. If the event is in the \"paused\" state, the drawer opens with a appropriate message.

6. If the event is in the  \"completed\" state, the drawer opens up with a temporary message announcing that the feature is yet to be built.

7. Ratings are to be written to ratings.csv file in the event directory.

8. For each rating record the email, timestamp, item id, rating and note

9. Implement caching to minimize file reads and writes.

10. Once an item has been rated color the button with the appropriate color.

11. The Event page should be very simple with just the buttons displayed. Buttons should look like the iPhone phone app dialpad.

12. When a user is rating an item provide an ability to bookmark the item so that they can come back to it later. Display the bookmark appropriately on the button on the main event page."

## Clarifications

### Session 2025-01-27

- Q: When a user updates an existing rating for an item, what should happen to the previous rating record in the CSV file? → A: Replace the previous rating record with the updated one (single current rating per user/item)
- Q: Where should bookmarks be persisted? → A: User session storage only (not persisted to files)
- Q: What is the maximum character limit for notes? → A: 500 characters maximum
- Q: What format should the ratings.csv file use? → A: Header row with comma delimiter (email,timestamp,itemId,rating,note)
- Q: What format should timestamps use in the ratings.csv file? → A: ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ, e.g., 2025-01-27T14:30:00Z)
- Q: How should notes containing commas, quotes, or newlines be handled in the CSV file? → A: Standard CSV escaping (quotes around field, double quotes for quotes, per RFC 4180)
- Q: When exactly should the cache be invalidated? → A: On event state change, rating submission, and periodic refresh (e.g., every 30 seconds)
- Q: How should the bookmark indicator be displayed on item buttons? → A: Small icon overlay (e.g., star/bookmark icon) in corner

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Access Items for Rating (Priority: P1)

Users need to see all available items as numbered buttons on the event page and open item details by clicking a button.

**Why this priority**: This is the foundational interaction that enables all rating functionality. Without the ability to view and access items, users cannot provide ratings. This must work independently to enable the complete rating experience.

**Independent Test**: Can be fully tested by navigating to an event page and verifying that all available items are displayed as numbered buttons in a dialpad-style layout, and clicking any button opens the drawer component. This delivers immediate value by allowing users to see and access items.

**Acceptance Scenarios**:

1. **Given** a user is on the event page for an event with available items, **When** the page loads, **Then** all available items are displayed as numbered buttons arranged in a dialpad-style layout
2. **Given** a user is viewing the event page, **When** they click on an item number button, **Then** a drawer component opens displaying content appropriate to the current event state
3. **Given** a user has opened the drawer, **When** they close the drawer, **Then** they return to the main event page with all item buttons visible
4. **Given** an event has items configured, **When** a user views the event page, **Then** only available items (not excluded items) are displayed as buttons

---

### User Story 2 - Rate Items When Event is Started (Priority: P1)

Users need to provide ratings and optional notes for items when an event is in the "started" state.

**Why this priority**: This is the core functionality that enables users to provide feedback. Without the ability to rate items, the event page cannot fulfill its primary purpose. This must work independently to enable rating collection.

**Independent Test**: Can be fully tested by opening an item drawer when the event is in "started" state, selecting a rating, optionally adding a note, submitting, and verifying the rating is saved and the button is colored appropriately. This delivers immediate value by allowing users to provide feedback.

**Acceptance Scenarios**:

1. **Given** an event is in "started" state and a user clicks an item button, **When** the drawer opens, **Then** the drawer displays rating options and an optional note field
2. **Given** a user is rating an item in a "started" event, **When** they select a rating value and submit, **Then** the rating is saved with their email, timestamp, item ID, rating value, and note (if provided)
3. **Given** a user has rated an item, **When** they return to the main event page, **Then** the item button is colored with the color corresponding to the rating they provided
4. **Given** a user is rating an item, **When** they submit without selecting a rating, **Then** the system displays a validation error and does not save the rating
5. **Given** a user has previously rated an item, **When** they click the same item button again, **Then** the drawer opens showing their existing rating and note, allowing them to update it

---

### User Story 3 - View Event State Messages (Priority: P2)

Users need to see appropriate messages when events are in states that prevent rating (created, paused, completed).

**Why this priority**: This provides clear feedback about why rating is unavailable, improving user experience and reducing confusion. While not essential for core functionality, it significantly enhances usability.

**Independent Test**: Can be fully tested by opening item drawers when events are in different states (created, paused, completed) and verifying appropriate messages are displayed. This delivers value by providing clear communication about event status.

**Acceptance Scenarios**:

1. **Given** an event is in "created" state and a user clicks an item button, **When** the drawer opens, **Then** the drawer displays a message stating that the event has not started yet
2. **Given** an event is in "paused" state and a user clicks an item button, **When** the drawer opens, **Then** the drawer displays an appropriate message indicating the event is paused
3. **Given** an event is in "completed" state and a user clicks an item button, **When** the drawer opens, **Then** the drawer displays a temporary message announcing that the feature is yet to be built
4. **Given** a user views a message in the drawer, **When** they close the drawer, **Then** they return to the main event page

---

### User Story 4 - Bookmark Items for Later Review (Priority: P2)

Users need to bookmark items while rating so they can easily return to them later.

**Why this priority**: This enhances user experience by allowing users to mark items of interest for later review. While not essential for core rating functionality, it significantly improves usability for users who want to revisit specific items.

**Independent Test**: Can be fully tested by bookmarking an item during rating, closing the drawer, and verifying the bookmark indicator appears on the item button. This delivers value by enabling users to track items of interest.

**Acceptance Scenarios**:

1. **Given** a user is rating an item in a "started" event, **When** they bookmark the item, **Then** the bookmark is saved in their user session storage (session-only, does not persist across sessions)
2. **Given** a user has bookmarked an item, **When** they view the main event page, **Then** the item button displays a bookmark indicator
3. **Given** a user has bookmarked an item, **When** they click the item button again, **Then** the drawer opens and the bookmark option reflects the bookmarked state
4. **Given** a user has bookmarked an item, **When** they unbookmark the item, **Then** the bookmark indicator is removed from the button

---

### Edge Cases

- What happens when a user clicks multiple item buttons in rapid succession? System should handle multiple drawer opens/closes gracefully, ensuring only one drawer is open at a time
- How does the system handle rating submission when the event state changes from "started" to "paused" between opening the drawer and submitting? System should validate event state on submission and reject with appropriate message if event is no longer in "started" state
- What happens when a user attempts to rate an item that has been excluded from the event configuration? System should not display excluded items as buttons on the main page
- How does the system handle concurrent rating submissions from the same user for the same item? System should handle concurrent submissions gracefully, ensuring data consistency (last write wins strategy, replacing previous rating with the most recent submission)
- What happens when the ratings file cannot be written (disk full, permissions error)? System should display an error message to the user and allow retry without losing the rating data
- How does the system handle very long notes? System should enforce a maximum character limit of 500 characters and display validation errors when notes exceed this limit
- What happens when a user's email is not available in their session? System should require email authentication before allowing rating submission
- How does the system handle bookmark data when a user's session expires? Bookmarks are stored in session storage only, so bookmarks are lost when the user session expires or ends (bookmarks do not persist across sessions)
- What happens when the cache becomes stale (event state changes, ratings updated by other users)? System should invalidate cache when event state changes, when ratings are submitted, and periodically (e.g., every 30 seconds) to ensure data consistency
- How does the system handle rating display when multiple users rate the same item? System should display each user's own rating on their button, not aggregate ratings from all users

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all available items as numbered buttons on the main event page in a dialpad-style layout
- **FR-002**: System MUST open a drawer component when a user clicks an item number button
- **FR-003**: System MUST display drawer content based on the current event state (created, started, paused, completed)
- **FR-004**: When event is in "created" state, System MUST display a message in the drawer stating that the event has not started yet
- **FR-005**: When event is in "started" state, System MUST display rating options and an optional note field in the drawer
- **FR-006**: When event is in "paused" state, System MUST display an appropriate message in the drawer indicating the event is paused
- **FR-007**: When event is in "completed" state, System MUST display a temporary message in the drawer announcing that the feature is yet to be built
- **FR-008**: System MUST save ratings to a ratings file (ratings.csv) in the event directory
- **FR-009**: System MUST record the following data for each rating: user email, timestamp, item ID, rating value, and note (if provided). The CSV file MUST include a header row with columns: email,timestamp,itemId,rating,note and use comma as the delimiter. Timestamps MUST be recorded in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ, e.g., 2025-01-27T14:30:00Z). Notes containing commas, quotes, or newlines MUST be escaped using standard CSV escaping rules (RFC 4180): fields containing special characters must be enclosed in double quotes, and double quotes within fields must be escaped by doubling them
- **FR-010**: System MUST implement caching to minimize file read and write operations
- **FR-011**: System MUST color item buttons with the appropriate color corresponding to the user's rating after they have rated an item
- **FR-012**: System MUST provide a bookmark feature that allows users to mark items for later review
- **FR-013**: System MUST display bookmark indicators on item buttons when items are bookmarked. The indicator MUST be displayed as a small icon overlay (e.g., star/bookmark icon) in the corner of the button
- **FR-014**: System MUST validate that a rating is selected before allowing rating submission
- **FR-015**: System MUST require user email authentication before allowing rating submission
- **FR-022**: System MUST enforce a maximum character limit of 500 characters for notes and display validation errors when notes exceed this limit
- **FR-016**: System MUST allow users to update existing ratings for items they have previously rated. When a user updates a rating, System MUST replace the previous rating record in the ratings file with the updated rating (ensuring only one current rating exists per user/item combination)
- **FR-017**: System MUST only display items that are available according to the event's item configuration (exclude excluded items)
- **FR-018**: System MUST validate event state on rating submission and reject submissions if event is not in "started" state
- **FR-019**: System MUST ensure only one drawer is open at a time (closing previous drawer when opening a new one)
- **FR-020**: System MUST store bookmarks in user session storage (bookmarks are session-only and do not persist across user sessions)
- **FR-021**: System MUST invalidate cache when event state changes, when a rating is submitted, and periodically (e.g., every 30 seconds) to ensure data consistency

### Key Entities *(include if feature involves data)*

- **Rating**: Represents a user's rating for a specific item in an event. Key attributes include: user email (identifier), timestamp (when rating was submitted, in ISO 8601 format YYYY-MM-DDTHH:MM:SSZ), item ID (which item was rated), rating value (the selected rating), and note (optional text comment, max 500 characters). Ratings are persisted to a file in the event directory and associated with both the user and the item. Each user can have only one current rating per item (updates replace previous ratings).

- **Bookmark**: Represents a user's bookmark for a specific item in an event. Key attributes include: user email (identifier), item ID (which item is bookmarked), and timestamp (when bookmark was created). Bookmarks are stored in user session storage only and do not persist across sessions (bookmarks are lost when the user session ends).

- **Item Button State**: Represents the visual and interactive state of an item button on the main event page. Key attributes include: item ID, rating color (if rated), bookmark indicator (if bookmarked, displayed as a small icon overlay in the corner), and availability status. The button state reflects the user's interaction history with the item.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view all available items and open item drawers within 1 second of page load
- **SC-002**: Users can complete a rating submission (select rating, optionally add note, submit) in under 30 seconds
- **SC-003**: Rating submissions are saved successfully 95% of the time without errors
- **SC-004**: Item buttons display correct rating colors within 2 seconds of rating submission
- **SC-005**: Bookmark indicators appear on item buttons within 1 second of bookmarking
- **SC-006**: Cache reduces file read operations by at least 70% compared to reading from file on every request
- **SC-007**: Drawer opens and displays appropriate content based on event state within 500 milliseconds of button click
- **SC-008**: Users can bookmark and unbookmark items with 100% success rate
- **SC-009**: Event state messages are displayed correctly 100% of the time when drawers open for non-started events

## Assumptions

- User email is available in the user's session/authentication context
- Event state is available and can be queried in real-time
- Item configuration (number of items, excluded items) is available from the event data
- Rating configuration (rating scale, colors, labels) is available from the event data (from ratings configuration feature)
- The ratings file format is CSV with a header row containing columns: email,timestamp,itemId,rating,note, using comma as the delimiter. Timestamps are stored in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ). Notes are escaped using standard CSV escaping rules (RFC 4180) when they contain commas, quotes, or newlines
- Caching strategy can be implemented using in-memory cache or similar mechanism. Cache is invalidated when event state changes, when ratings are submitted, and periodically (e.g., every 30 seconds) to ensure data consistency
- Bookmark data is stored in user session storage only (not persisted to files, bookmarks are lost when session ends)
- The drawer component can be implemented as a slide-out panel or modal overlay
- iPhone dialpad-style layout refers to a grid of circular or rounded buttons arranged in rows
- Rating colors correspond to the rating configuration colors defined in the ratings configuration feature
- The main event page is a simple, minimal interface focused on item buttons
- Users can only rate items when authenticated and when the event is in "started" state
- Multiple users can rate the same item, and each user sees their own rating reflected on their button
- Bookmark data is user-specific (each user has their own bookmarks)

## Dependencies

- Event state management (feature 001-event-state-management) - to determine current event state
- Ratings configuration (feature 001-ratings-config) - to get rating scale, colors, and labels
- Item configuration (feature 008-item-configuration) - to determine available items
- User authentication - to get user email for rating submissions
- Event data access - to read event configuration and state
- File system or storage mechanism - to persist ratings to CSV file

## Out of Scope

- Displaying aggregate ratings or statistics for items
- Rating analytics or reporting
- Sharing ratings with other users
- Rating history or timeline
- Bulk rating operations
- Rating export functionality beyond CSV file storage
- Advanced bookmark organization (folders, tags, etc.)
- Bookmark sharing or collaboration
- Real-time rating updates from other users (users only see their own ratings)
- Rating moderation or approval workflows
- Rating deletion or removal
- Results announcement or display (mentioned as future feature for completed state)
