# Feature Specification: Personality Detection Toggle

**Feature Branch**: `040-personality-toggle`
**Created**: 2026-03-21
**Status**: Draft
**Input**: User description: "Add ability for event organizers to disable personality detection for formal or competitive wine tastings where playful personality labels may not suit the audience."

## Background

Personality detection is a wine-only feature that assigns humorous labels to guests based on their rating patterns after they rate at least 50% of items (minimum 4). Labels include names like "The Simon Cowell" for tough critics, "The Golden Retriever" for generous raters, and "The Broken Record" for guests who give everything the same score.

The feature works well for casual social tastings among friends. However, the app is expanding to serve formal wine clubs and competitive tasting events where playful personality labels may feel patronizing or out of place. Event organizers need the ability to disable personality detection to match the tone of their event.

This toggle follows the same pattern as the existing `noteSuggestionsEnabled` toggle — an event-level configuration set by the organizer during setup, stored in the rating configuration, and respected throughout the guest experience.

### Decisions

- **D1**: The toggle is added to the rating configuration section of the admin page, directly below the existing Note Suggestions toggle.
- **D2**: The toggle defaults to enabled, preserving current behavior for existing and new events.
- **D3**: The toggle can only be changed when the event is in the "created" state (same restriction as note suggestions).
- **D4**: The toggle is only visible for wine events (personality detection is already wine-only).
- **D5**: When personality detection is disabled, all personality-specific UI is suppressed. Non-personality features (Similar Tastes, My Progress rating distribution, bookmarks) continue to work normally.
- **D6**: The flag is stored in `ratingConfiguration` alongside `noteSuggestionsEnabled` — no new data model or endpoints are required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organizer Disables Personality Detection for a Formal Event (Priority: P1)

A wine club organizer creates a new wine tasting event. They navigate to the rating configuration section and see the Personality Detection toggle below Note Suggestions. They read the description, understand that it controls playful personality labels, and turn it off because their event is a formal competition. They save the rating configuration.

**Why this priority**: This is the core use case the feature exists to serve. Without the toggle, organizers have no control over whether personality labels appear at their event.

**Independent Test**: Create a wine event, navigate to rating configuration, verify the Personality Detection toggle is visible with a description, toggle it off, save, and confirm the setting persists.

**Acceptance Scenarios**:

1. **Given** an admin on the rating configuration section for a newly created wine event, **When** they look below the Note Suggestions toggle, **Then** they see a Personality Detection toggle with a descriptive explanation
2. **Given** the Personality Detection toggle, **When** the admin reads the description, **Then** they understand what personality labels are, what they look like, and when to disable them
3. **Given** the admin toggles Personality Detection off and saves, **When** they reload the page, **Then** the toggle remains off
4. **Given** the admin toggles Personality Detection off and saves, **When** they toggle it back on and save, **Then** the toggle remains on

---

### User Story 2 - Guest Experience with Personality Detection Disabled (Priority: P1)

A guest at a formal wine event rates enough items to cross the personality threshold. Because the organizer disabled personality detection, the guest does not see the personality reveal bottom sheet, the personality badge does not appear on the My Progress button, and no personality card appears in the My Progress drawer. The guest's rating progress, distribution chart, and all other My Progress content continue to work normally.

**Why this priority**: If the toggle doesn't suppress all personality UI, the feature is broken. Guests must have a seamless experience with no traces of personality detection when it's disabled.

**Independent Test**: Create a wine event with personality detection disabled, simulate a guest rating enough items to cross the threshold, and verify no personality-related UI appears anywhere.

**Acceptance Scenarios**:

1. **Given** personality detection is disabled, **When** a guest crosses the rating threshold, **Then** the personality reveal bottom sheet does not appear
2. **Given** personality detection is disabled, **When** a guest views the My Progress button, **Then** no personality badge dot is shown
3. **Given** personality detection is disabled, **When** a guest opens the My Progress drawer, **Then** no personality card or personality label is displayed
4. **Given** personality detection is disabled, **When** a guest views the dashboard after event completion, **Then** no personality labels appear in the dashboard, summary strip, or ratings table
5. **Given** personality detection is disabled, **When** a guest uses the Similar Tastes feature, **Then** it works normally (unaffected by the toggle)

---

### User Story 3 - Guest Experience with Personality Detection Enabled (Priority: P1)

A guest at a casual social tasting event rates enough items to cross the personality threshold. Because personality detection is enabled (the default), the guest sees the personality reveal bottom sheet, the badge dot on My Progress, and their personality card in the My Progress drawer. The experience is identical to the current behavior.

**Why this priority**: The toggle must not regress existing behavior. When enabled, everything must work exactly as it does today.

**Independent Test**: Create a wine event with personality detection enabled (default), simulate a guest rating enough items, and verify all personality UI appears as expected.

**Acceptance Scenarios**:

1. **Given** personality detection is enabled (default), **When** a guest crosses the rating threshold, **Then** the personality reveal bottom sheet appears (existing behavior preserved)
2. **Given** personality detection is enabled, **When** a guest views My Progress, **Then** the personality badge and card appear as they do today

---

### User Story 4 - Toggle Restricted to Created State (Priority: P2)

An organizer who has already started their event realizes they want to disable personality detection. They navigate to the rating configuration and see the Personality Detection toggle is disabled (greyed out). They cannot change it because the event has progressed past the "created" state.

**Why this priority**: Prevents mid-event configuration changes that could lead to inconsistent guest experiences (some guests see personality, others don't).

**Independent Test**: Create a wine event, start it, navigate to rating configuration, and verify the toggle is non-interactive.

**Acceptance Scenarios**:

1. **Given** a wine event in "started" state, **When** the admin views the Personality Detection toggle, **Then** it is disabled and cannot be changed
2. **Given** a wine event in "paused" state, **When** the admin views the Personality Detection toggle, **Then** it is disabled and cannot be changed
3. **Given** a wine event in "completed" state, **When** the admin views the Personality Detection toggle, **Then** it is disabled and cannot be changed

---

### User Story 5 - Toggle Not Visible for Non-Wine Events (Priority: P2)

An organizer creates a non-wine tasting event (e.g., generic items). They navigate to the rating configuration section. The Personality Detection toggle is not visible because personality detection only applies to wine events.

**Why this priority**: Prevents confusion for organizers of non-wine events who would see a toggle for a feature that doesn't apply to them.

**Independent Test**: Create a non-wine event, navigate to rating configuration, and verify the Personality Detection toggle is not rendered.

**Acceptance Scenarios**:

1. **Given** a non-wine event, **When** the admin views the rating configuration section, **Then** the Personality Detection toggle is not visible

---

### Edge Cases

- What happens to events created before this feature is deployed? They should behave as if personality detection is enabled (the default), since the flag will be undefined and the system should treat undefined as enabled.
- What happens if the organizer disables both note suggestions and personality detection? The rating experience becomes purely functional — rate, optional free-text note, submit. No quotes, no personality labels.
- What happens if a guest has already seen the personality reveal before the organizer disables it? Not applicable — the toggle is locked once the event starts, so all guests within an event have a consistent experience.

## Requirements *(mandatory)*

### Functional Requirements

**Admin Configuration**

- **FR-001**: The admin page MUST display a Personality Detection toggle in the rating configuration section, positioned directly below the Note Suggestions toggle
- **FR-002**: The Personality Detection toggle MUST only be visible for wine events
- **FR-003**: The toggle MUST include a description that explains what personality labels are, gives examples of label names, and advises when to disable the feature
- **FR-004**: The toggle MUST default to enabled for new events
- **FR-005**: The toggle MUST only be editable when the event is in the "created" state
- **FR-006**: The toggle value MUST persist when the rating configuration is saved and the page is reloaded

**Data Storage**

- **FR-007**: The personality detection setting MUST be stored as a `personalityEnabled` boolean field in the event's rating configuration
- **FR-008**: The system MUST treat an undefined or missing `personalityEnabled` value as enabled (backward compatibility with existing events)
- **FR-009**: The system MUST validate that `personalityEnabled` is a boolean when provided
- **FR-010**: The system MUST reject changes to `personalityEnabled` when the event is not in the "created" state
- **FR-011**: The system MUST reject `personalityEnabled` for non-wine events

**Guest Experience — Personality Suppression**

- **FR-012**: When personality detection is disabled, the one-time personality reveal bottom sheet MUST NOT trigger after a guest crosses the rating threshold
- **FR-013**: When personality detection is disabled, the personality badge dot MUST NOT appear on the My Progress button
- **FR-014**: When personality detection is disabled, the personality card MUST NOT appear in the My Progress / User Details drawer
- **FR-015**: When personality detection is disabled, personality labels MUST NOT appear in the dashboard view
- **FR-016**: When personality detection is disabled, personality labels MUST NOT appear in the personality summary strip
- **FR-017**: When personality detection is disabled, personality labels MUST NOT appear in the user ratings table

**Guest Experience — Unaffected Features**

- **FR-018**: The Similar Tastes feature MUST continue to work normally regardless of the personality detection setting
- **FR-019**: The My Progress rating distribution and progress tracking MUST continue to work normally regardless of the personality detection setting
- **FR-020**: Bookmarks MUST continue to work normally regardless of the personality detection setting
- **FR-021**: Note suggestions MUST continue to work according to their own toggle, independent of the personality detection setting

### Key Entities

- **Rating Configuration**: The existing configuration object for an event. Gains a new optional boolean field `personalityEnabled` alongside the existing `noteSuggestionsEnabled`, `maxRating`, and `ratings` fields.
- **Event Lifecycle State**: The existing event state (created, started, paused, completed) that determines whether the toggle is editable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An organizer can find and understand the Personality Detection toggle within the rating configuration section without external guidance
- **SC-002**: When personality detection is disabled, zero personality-related UI elements appear anywhere in the guest experience (reveal sheet, badge, card, dashboard labels, summary strip, ratings table)
- **SC-003**: When personality detection is enabled (or defaulted), the guest experience is identical to the current production behavior — no regressions
- **SC-004**: Existing events created before this feature is deployed continue to function with personality detection enabled by default, with no data migration required
- **SC-005**: The toggle description clearly communicates the feature's tone and helps organizers make an informed decision about whether to enable or disable it
- **SC-006**: The toggle is non-interactive for events that have progressed past the "created" state, preventing mid-event configuration changes

## Assumptions

- The toggle follows the exact same implementation pattern as `noteSuggestionsEnabled`: stored in rating configuration, validated as boolean, restricted to wine events, locked after "created" state.
- No new endpoints are needed. The existing rating configuration GET and PUT endpoints carry the new field.
- The `personalityEnabled` flag is passed to frontend components via the existing rating configuration data flow. Components that currently show personality UI will check this flag and conditionally render.
- Backward compatibility is handled by treating undefined/missing `personalityEnabled` as `true` (enabled). No data migration is needed for existing events.
- The toggle description uses the copy discussed and agreed upon: references "The Simon Cowell" and "The Golden Retriever" as example labels, recommends disabling for formal/competitive events.
- Personality detection on the backend continues to compute personalities regardless of the toggle. The suppression is purely frontend — keeping the architecture simple.
