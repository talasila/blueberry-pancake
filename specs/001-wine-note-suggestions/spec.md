# Feature Specification: Wine Note Suggestions

**Feature Branch**: `001-wine-note-suggestions`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Provide note suggestions when rating wines. 1. This only applies to events of type \"wine\" 2. There are a bunch of quotes in a file called \"quotes.json\" in the root directory. 3. Quotes are off different types - \"snarky\", \"poetic\", etc and each rating level have their own set of quotes. 4. Use this quoates \"database\" and provide \"suggestions\" for notes. For each rating level selected display one of each type of note. When a user selects a suggestion add it to the note text field."

## Clarifications

### Session 2025-01-27

- Q: When appending suggestion text to existing note content, how should spacing be handled? → A: Add a space before the suggestion only if existing text doesn't end with whitespace
- Q: When displaying one suggestion from each quote type for a selected rating level, how should the system choose which specific quote to show? → A: Random selection (different quote shown each time user selects the same rating)
- Q: When a user clicks a suggestion that already exists in the note field, how should the system behave? → A: Allow duplicates - append the suggestion even if it already exists in the note
- Q: When a user clicks a suggestion that would cause the note to exceed the 500-character limit, how should the system respond? → A: Allow partial addition - add as much of the suggestion as fits within the limit
- Q: Should the displayed suggestions be visually labeled with their quote type? → A: Hide labels - show only the suggestion text without type indicators
- Q: When can event administrators change the note suggestions toggle setting? → A: Only editable when event is in "created" state (matches rating config behavior)
- Q: For existing wine events created before this feature, how should the system handle the missing toggle setting? → A: Default to enabled (ON) when setting is missing (treat missing as enabled)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Note Suggestions for Selected Rating (Priority: P1)

When rating a wine item in a wine event, users can see contextual note suggestions based on their selected rating level. The system displays one suggestion from each quote type (e.g., snarky, poetic, haiku) that matches the selected rating level, helping users express their thoughts more creatively and reducing the effort needed to write notes.

**Why this priority**: This is the core functionality - without displaying suggestions, users cannot benefit from the feature. It provides immediate value by showing relevant suggestions as soon as a rating is selected.

**Independent Test**: Can be fully tested by opening a wine event rating form, selecting a rating level, and verifying that one suggestion from each quote type appears for that rating level. This delivers value independently by making suggestions visible to users.

**Acceptance Scenarios**:

1. **Given** a user is rating an item in a wine event with note suggestions enabled, **When** they select a rating level (e.g., rating 1), **Then** the system displays one randomly selected suggestion from each quote type (snarky, poetic, haiku) that corresponds to rating level 1
2. **Given** a user has selected rating level 1, **When** they change their selection to rating level 2, **Then** the system updates the displayed suggestions to show one suggestion from each quote type for rating level 2
3. **Given** a user is rating an item in a non-wine event, **When** they select a rating level, **Then** no note suggestions are displayed
4. **Given** a user is rating an item in a wine event, **When** no rating is selected, **Then** no note suggestions are displayed
5. **Given** a user is rating an item in a wine event with note suggestions disabled, **When** they select a rating level, **Then** no note suggestions are displayed

---

### User Story 2 - Add Suggestion to Note Field (Priority: P1)

Users can click on any displayed suggestion to add it to their note text field, making it easy to incorporate suggested text into their rating notes without manual typing.

**Why this priority**: This is essential for the feature to be useful - displaying suggestions without the ability to use them provides no value. It must work alongside Story 1 to deliver complete functionality.

**Independent Test**: Can be fully tested by clicking a displayed suggestion and verifying it appears in the note text field. This delivers value independently by enabling users to quickly add suggested text to their notes.

**Acceptance Scenarios**:

1. **Given** suggestions are displayed for a selected rating, **When** a user clicks on a suggestion, **Then** the suggestion text is added to the note text field
2. **Given** a note field already contains text, **When** a user clicks on a suggestion, **Then** the suggestion text is appended to the existing note content with appropriate spacing (space added only if existing text doesn't end with whitespace)
3. **Given** a note field is near the character limit, **When** a user clicks on a suggestion that would exceed the limit, **Then** the system adds as much of the suggestion text as fits within the 500-character limit
4. **Given** a user clicks on a suggestion, **When** the note field already contains that exact suggestion text, **Then** the system appends the suggestion again (duplicates are allowed)

---

### User Story 3 - Configure Note Suggestions Toggle (Priority: P1)

Event administrators can enable or disable note suggestions for their wine events through a toggle in the Ratings Configuration section. This allows administrators to control whether participants see suggestion prompts when rating items, with the feature enabled by default for wine events.

**Why this priority**: This is essential for administrator control and must be available before the feature can be used. It provides administrators the ability to customize the rating experience for their events.

**Independent Test**: Can be fully tested by opening Event Admin page for a wine event, navigating to Ratings Configuration, and verifying the toggle exists and can be changed when event is in "created" state. This delivers value independently by giving administrators control over the feature.

**Acceptance Scenarios**:

1. **Given** an administrator is viewing the Ratings Configuration section for a wine event, **When** they view the section, **Then** a toggle for "Note Suggestions" is displayed
2. **Given** the toggle is displayed for a wine event, **When** the event is first created, **Then** the toggle is enabled (ON) by default
3. **Given** an administrator is viewing the toggle for a wine event in "created" state, **When** they toggle it off, **Then** the setting is saved and note suggestions are disabled for that event
4. **Given** an administrator is viewing the toggle for a wine event in "created" state, **When** they toggle it on, **Then** the setting is saved and note suggestions are enabled for that event
5. **Given** an administrator is viewing the toggle for a wine event not in "created" state, **When** they view the toggle, **Then** the toggle is disabled (read-only)
6. **Given** an administrator is viewing the Ratings Configuration section for a non-wine event, **When** they view the section, **Then** the note suggestions toggle is not displayed

---

### Edge Cases

- What happens when a rating level exists in the rating configuration but has no quotes in the quotes database?
- What happens when a quote type exists for one rating level but not another?
- How does the system handle missing or corrupted quotes.json file?
- What happens when a user selects a rating, views suggestions, then clears the rating selection?
- How does the system handle quote types that don't exist for a particular rating level?
- What happens if the note field is near the character limit and adding a suggestion would exceed it?
- How does the system handle rapid rating changes (user quickly switches between rating levels)?
- What happens when quotes.json contains invalid JSON structure?
- What happens when an event administrator disables note suggestions after some participants have already used suggestions in their ratings?
- What happens when the toggle setting is missing or undefined for an existing wine event (migration scenario)? → System treats missing setting as enabled (ON) by default
- What happens if an administrator changes the event type from "wine" to another type after enabling note suggestions?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST only display note suggestions for events where typeOfItem equals "wine" AND the note suggestions feature is enabled for that event
- **FR-002**: System MUST load quotes from the quotes.json file located in the root directory
- **FR-003**: System MUST display one suggestion from each quote type (e.g., snarky, poetic, haiku) when a rating level is selected, randomly selected from available quotes for that rating level and quote type, without displaying quote type labels to users
- **FR-004**: System MUST filter suggestions by the currently selected rating level
- **FR-005**: System MUST update displayed suggestions immediately when the user changes their rating selection
- **FR-006**: System MUST hide all suggestions when no rating is selected
- **FR-007**: System MUST hide all suggestions for non-wine events
- **FR-008**: System MUST allow users to click on any displayed suggestion to add it to the note text field
- **FR-009**: System MUST append suggestion text to existing note content when a suggestion is selected, adding a space before the suggestion only if the existing text doesn't end with whitespace
- **FR-010**: System MUST respect the existing 500 character limit for notes when adding suggestions by adding only as much of the suggestion text as fits within the remaining character limit
- **FR-011**: System MUST handle cases where quotes.json is missing or cannot be loaded gracefully (hide suggestions without breaking the rating form)
- **FR-012**: System MUST handle cases where a rating level has no quotes available (display no suggestions for that rating level)
- **FR-013**: System MUST handle cases where a quote type is missing for a rating level (display suggestions only for available quote types)
- **FR-014**: System MUST provide a toggle control in the Event Admin's Ratings Configuration section to enable/disable note suggestions
- **FR-015**: System MUST display the note suggestions toggle only for events where typeOfItem equals "wine"
- **FR-016**: System MUST set the note suggestions toggle to enabled (ON) by default for new wine events and treat missing toggle setting as enabled (ON) for existing wine events
- **FR-017**: System MUST allow administrators to change the toggle setting only when the event is in "created" state
- **FR-018**: System MUST persist the toggle setting as part of the event's rating configuration
- **FR-019**: System MUST disable the toggle (make it read-only) when the event is not in "created" state

### Key Entities *(include if feature involves data)*

- **Quote Database**: A collection of quotes organized by rating level and quote type. Each quote has an identifier and text content. The database is stored in quotes.json file in the root directory.
- **Note Suggestion**: A selectable text suggestion displayed to users based on their selected rating level and the event type. Suggestions are derived from the quote database and organized by quote type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see relevant note suggestions within 1 second of selecting a rating level in a wine event with note suggestions enabled
- **SC-002**: 90% of users who view suggestions can successfully add a suggestion to their note field on the first click (measured via manual testing with sample users or analytics tracking of click success rate)
- **SC-003**: Note suggestions are displayed correctly for all rating levels that have quotes available in the database when the feature is enabled
- **SC-006**: Administrators can successfully toggle note suggestions on/off in the Ratings Configuration section for wine events in "created" state
- **SC-004**: The rating form remains fully functional even when quotes.json is missing or contains errors (graceful degradation)
- **SC-005**: Users can add suggestions to notes without exceeding the 500 character limit (system adds partial text if needed to stay within limit)

## Assumptions

- Quotes.json file structure follows the pattern: `{ "ratingLevel": { "quoteType": [{ "id": "...", "text": "..." }] } }`
- Quote types are consistent across rating levels (e.g., if rating 1 has "snarky", "poetic", "haiku", other rating levels will have the same types)
- The quotes.json file is accessible from the frontend application
- Event type information (typeOfItem) is available to the rating form component
- Note suggestions toggle setting is stored as part of the event's rating configuration
- The toggle setting defaults to enabled (ON) for wine events (both new events and existing events with missing setting)
- Users may want to add multiple suggestions to their note
- The existing 500 character limit for notes remains in effect
- Quote selection from each type is random (different quote may be shown each time the same rating is selected)

## Dependencies

- Event type information must be available to determine if suggestions should be displayed
- Note suggestions toggle setting must be available to determine if suggestions should be displayed
- Quotes.json file must be accessible and properly formatted
- Rating form component must support displaying suggestions in the UI
- Rating selection state must be available to filter suggestions by rating level
- Event Admin page must support displaying and saving the toggle setting in Ratings Configuration section

## Out of Scope

- Editing or managing the quotes database through the UI
- Custom quote types per event
- User-created custom suggestions
- Suggestion history or favorites
- Multiple language support for suggestions
- Analytics on which suggestions are most used
- A/B testing different suggestion display methods
