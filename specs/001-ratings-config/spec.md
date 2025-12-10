# Feature Specification: Ratings Configuration

**Feature Branch**: `001-ratings-config`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "As an event admin I would like to configure how an item is rated"

## Clarifications

### Session 2025-01-27

- Q: What color format should be stored and how should validation work? → A: Store as hex codes (e.g., #FF3B30), accept hex/RGB/HSL input and convert to hex
- Q: How should concurrent edit conflicts be resolved when multiple admins update rating configuration? → A: Last write wins with optimistic locking (check event state/version before save, show error if changed)
- Q: What is the maximum character limit for rating labels? → A: 50 characters maximum
- Q: What happens if event state changes from "created" to "started" between loading the page and saving max rating? → A: Server validates event state on save and rejects with error message if not "created"
- Q: When should validation errors be displayed to users? → A: Validate on field blur (when user leaves field) and on submit

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Rating Scale (Priority: P1)

As an event admin, I want to set the maximum rating value (between 2 and 4) so that I can customize the rating scale for my event.

**Why this priority**: This is the foundational setting that determines the entire rating structure. Without this, no other rating configuration is possible.

**Independent Test**: Can be fully tested by navigating to Event Admin → Ratings Configuration section, setting max rating value, saving, and verifying the scale updates correctly. This delivers immediate value by allowing admins to customize their rating scale.

**Acceptance Scenarios**:

1. **Given** I am an event admin viewing the Event Administration page and the event is in "created" state, **When** I navigate to the Ratings Configuration section, **Then** I see the current maximum rating value (default: 4) and can change it to any value between 2 and 4
2. **Given** I have set the maximum rating to 3 and the event is in "created" state, **When** I save the configuration, **Then** the system displays ratings 1, 2, and 3 with their default labels and colors
3. **Given** I attempt to set the maximum rating to 1, **When** I try to save, **Then** the system displays a validation error indicating the value must be between 2 and 4
4. **Given** I attempt to set the maximum rating to 5, **When** I try to save, **Then** the system displays a validation error indicating the value must be between 2 and 4
5. **Given** the event is in "started" state (users can rate), **When** I try to change the maximum rating value, **Then** the system prevents the change and displays a message indicating that max rating can only be changed when the event is in "created" state
6. **Given** the event is in "paused" or "completed" state, **When** I try to change the maximum rating value, **Then** the system prevents the change and displays a message indicating that max rating can only be changed when the event is in "created" state

---

### User Story 2 - Customize Rating Labels (Priority: P2)

As an event admin, I want to customize the label text for each rating level so that the labels match the tone and context of my event.

**Why this priority**: Custom labels allow admins to personalize the rating experience, but the feature can function with default labels. This builds on the scale configuration.

**Independent Test**: Can be fully tested by setting max rating, editing label text for each rating level, saving, and verifying labels persist. This delivers value by allowing personalized rating descriptions.

**Acceptance Scenarios**:

1. **Given** I have configured a rating scale of 1 to 4, **When** I view the Ratings Configuration section, **Then** I see default labels: "1 - What is this crap?", "2 - Meh...", "3 - Not bad...", "4 - Give me more..."
2. **Given** I am viewing rating level 2, **When** I edit its label to "Could be better", **Then** the label field updates immediately and shows my new text
3. **Given** I have customized labels for all rating levels, **When** I save the configuration, **Then** all custom labels are persisted and displayed when users rate items
4. **Given** I have customized a label, **When** I click "Reset to Defaults", **Then** all labels revert to their default values for the current scale

---

### User Story 3 - Customize Rating Colors (Priority: P2)

As an event admin, I want to customize the color for each rating level so that the visual representation matches my event's branding or theme.

**Why this priority**: Custom colors allow visual customization, but default colors provide a functional experience. This enhances the rating configuration feature.

**Independent Test**: Can be fully tested by selecting custom colors for rating levels, saving, and verifying colors are applied in the rating interface. This delivers value through visual customization.

**Acceptance Scenarios**:

1. **Given** I have configured a rating scale of 1 to 4, **When** I view the Ratings Configuration section, **Then** I see default colors: 1 - iOS Red, 2 - iOS Yellow, 3 - iOS light green, 4 - iOS dark green
2. **Given** I am viewing rating level 3, **When** I click the color picker and select a custom color, **Then** the color preview updates immediately to show my selected color
3. **Given** I have customized colors for all rating levels, **When** I save the configuration, **Then** all custom colors are persisted and displayed when users rate items
4. **Given** I have customized a color, **When** I click "Reset to Defaults", **Then** all colors revert to their default iOS colors for the current scale

---

### User Story 4 - Reset to Defaults (Priority: P3)

As an event admin, I want to reset all rating configuration (labels and colors) to their default values so that I can quickly revert changes if needed.

**Why this priority**: This is a convenience feature that improves usability but is not essential for core functionality. Users can manually revert changes if needed.

**Independent Test**: Can be fully tested by customizing labels and colors, clicking "Reset to Defaults", and verifying all values return to defaults. This delivers value through ease of reversion.

**Acceptance Scenarios**:

1. **Given** I have customized labels and colors for a rating scale of 1 to 4, **When** I click "Reset to Defaults", **Then** all labels and colors immediately revert to their default values
2. **Given** I have reset to defaults, **When** I save the configuration, **Then** the default values are persisted
3. **Given** I have a rating scale of 1 to 3, **When** I click "Reset to Defaults", **Then** labels and colors reset to defaults appropriate for a 3-level scale

---

### Edge Cases

- What happens if an admin tries to save an empty label for a rating level? System displays validation error
- What happens if an admin tries to save a label exceeding 50 characters? System displays validation error indicating maximum length
- How does the system validate color values to ensure they are valid color codes?
- What happens when multiple admins try to update rating configuration simultaneously? System uses optimistic locking - checks event state/version before save, shows error if event was modified by another admin, allowing last write to win after refresh
- What happens if an admin attempts to change max rating when the event state changes from "created" to "started" between loading the page and saving? Server validates event state on save and rejects with error message indicating max rating can only be changed when event is in "created" state

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow event administrators to configure the maximum rating value between 2 and 4 (inclusive) only when the event is in "created" state. The client MUST disable max rating input when event is not in "created" state, and the server MUST validate event state on save and reject with error message if event is not in "created" state
- **FR-019**: System MUST display validation errors when user leaves a field (on blur) and when user attempts to submit the form
- **FR-003**: System MUST display a rating scale from 1 (lowest/worst) to the configured maximum (highest/best)
- **FR-004**: System MUST provide default labels for each rating level based on the scale (e.g., for scale 1-4: "1 - What is this crap?", "2 - Meh...", "3 - Not bad...", "4 - Give me more...")
- **FR-005**: System MUST provide default colors for each rating level based on the scale (e.g., for scale 1-4: 1 - iOS Red, 2 - iOS Yellow, 3 - iOS light green, 4 - iOS dark green)
- **FR-006**: System MUST allow event administrators to customize the label text for each rating level
- **FR-007**: System MUST allow event administrators to select a custom color for each rating level
- **FR-008**: System MUST provide a "Reset to Defaults" option that restores all labels and colors to their default values for the current scale
- **FR-009**: System MUST validate that the maximum rating value is between 2 and 4 (inclusive)
- **FR-010**: System MUST persist rating configuration as part of the event configuration
- **FR-011**: System MUST display rating configuration in the Event Administration page
- **FR-012**: System MUST update the rating interface to reflect configured labels and colors when users rate items
- **FR-013**: System MUST validate that label text is not empty and does not exceed 50 characters for each rating level
- **FR-014**: System MUST validate that color values are valid color codes
- **FR-015**: System MUST store color values as hex codes (e.g., #FF3B30) in the rating configuration
- **FR-016**: System MUST accept color input in hex, RGB, or HSL format and convert to hex for storage
- **FR-017**: System MUST use optimistic locking when saving rating configuration (check event state/version before save, reject with error if event was modified by another admin)

### Key Entities *(include if feature involves data)*

- **Rating Configuration**: Represents the configuration settings for how items are rated in an event. Stored as part of Event entity.

  **Attributes**:
  - `maxRating`: integer (2-4, inclusive) - Maximum rating value, determines scale from 1 to maxRating
  - `ratings`: array of rating objects, where each object contains:
    - `value`: integer (1 to maxRating) - The rating value
    - `label`: string (required, non-empty, max 50 characters) - Display text for this rating level
    - `color`: string (required, hex format) - Color code stored as hex format (e.g., #FF3B30). Input may be hex, RGB, or HSL but is converted to hex for storage
    - `isDefault`: boolean (optional) - Indicates if this rating uses default label/color

  **Relationships**:
  - One-to-one with Event (each event has one rating configuration)
  - Rating configuration determines how users can rate items in the event

- **Default Rating Presets**: Predefined rating configurations for different scales

  **Scale 1-2**:
  - 1: label "Poor", color iOS Red
  - 2: label "Good", color iOS dark green

  **Scale 1-3**:
  - 1: label "Poor", color iOS Red
  - 2: label "Average", color iOS Yellow
  - 3: label "Good", color iOS light green

  **Scale 1-4** (default):
  - 1: label "What is this crap?", color iOS Red
  - 2: label "Meh...", color iOS Yellow
  - 3: label "Not bad...", color iOS light green
  - 4: label "Give me more...", color iOS dark green

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Event administrators can configure rating scale (max value 2-4) in under 30 seconds
- **SC-002**: Event administrators can customize all rating labels and colors for a 4-level scale in under 2 minutes
- **SC-003**: 95% of rating configuration saves complete successfully without validation errors
- **SC-004**: Rating configuration changes are reflected in the user rating interface within 5 seconds of saving
- **SC-005**: "Reset to Defaults" operation completes in under 1 second and restores all values correctly
- **SC-006**: Rating configuration persists correctly across page refreshes and event state changes

## Assumptions

- Rating configuration is stored as part of the event configuration object (similar to `itemConfiguration`)
- Rating configuration is accessible only to event administrators
- Default iOS colors are defined as:
  - iOS Red: #FF3B30 (or equivalent RGB/HSL representation)
  - iOS Yellow: #FFCC00 (or equivalent RGB/HSL representation)
  - iOS light green: #34C759 (or equivalent RGB/HSL representation)
  - iOS dark green: #28A745 (or equivalent RGB/HSL representation)
- Color picker accepts input in hex, RGB, or HSL format, but all colors are stored as hex codes (e.g., #FF3B30) for consistency
- Maximum rating value can only be changed when event is in "created" state (before users can rate)
- Labels and colors can be customized at any time, regardless of event state
- The "Poor" label is used as default for scale 1-2 and 1-3 (since user only specified defaults for 1-4 scale)
- The "Good" label is used as default for the highest rating in scales 1-2 and 1-3

## Dependencies

- Event Administration page must be accessible and functional
- Event configuration persistence system must support storing rating configuration
- User rating interface must be able to read and display configured labels and colors (future feature)

## Out of Scope

- Implementation of the actual rating interface that uses this configuration (separate feature)
- Changing maximum rating value after event has started (prevented by design - max rating can only be changed in "created" state)
- Rating analytics or statistics based on configured scales
- Bulk import/export of rating configurations
- Rating configuration templates or presets beyond defaults
