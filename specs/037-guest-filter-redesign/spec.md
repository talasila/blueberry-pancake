# Feature Specification: Guest List Filter Redesign

**Feature Branch**: `037-guest-filter-redesign`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Improve guest list filters and layout on People tab"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clearer Guest Filter Labels (Priority: P1)

An event administrator opens the People tab to check which guests have registered their bottle in the app. Instead of the ambiguous "Registered" / "Not registered" buttons, they see a clear question label — "{Item} registered?" — followed by a segmented control with "Any", "Yes", and "No" options. The label uses the event's item type (e.g., "Bottle registered?" for wine events, "Whiskey registered?" for whiskey events), making the filter's purpose immediately obvious.

**Why this priority**: This is the core problem — the current labels mislead admins into thinking "Registered" means event registration rather than item registration. Fixing the labels eliminates the confusion.

**Independent Test**: Can be fully tested by opening the People tab on an event and verifying the filter label and options display correctly.

**Acceptance Scenarios**:

1. **Given** an admin viewing the People tab of a wine event, **When** the tab loads, **Then** they see a label "Bottle registered?" with a segmented control offering "Any", "Yes", and "No".
2. **Given** an admin viewing the People tab, **When** "Any" is selected (default), **Then** all guests are shown regardless of item registration status.
3. **Given** an admin viewing the People tab, **When** they select "Yes", **Then** only guests who have registered at least one item in the app are shown.
4. **Given** an admin viewing the People tab, **When** they select "No", **Then** only guests who have not registered any items in the app are shown.
5. **Given** a whiskey tasting event, **When** the admin opens the People tab, **Then** the label reads "Whiskey registered?" (using the event's item type).

---

### User Story 2 - Reorganized Layout (Priority: P1)

The admin sees a clean two-line layout on the People tab. The first line has the search field with the refresh icon beside it. The second line has the filter label and segmented control. This groups data-fetching controls (search + refresh) on one line and view-filtering controls (the segmented filter) on the next, eliminating the visual confusion of a refresh icon next to filter buttons.

**Why this priority**: The layout change is tightly coupled with the filter redesign — shipping new filter labels in the old layout would still leave the refresh icon ambiguously placed next to them.

**Independent Test**: Can be fully tested by opening the People tab and verifying the refresh icon appears next to the search field, and the filter controls appear on a separate line below.

**Acceptance Scenarios**:

1. **Given** an admin viewing the People tab, **When** the tab loads, **Then** the search field and refresh icon appear together on the first line.
2. **Given** an admin viewing the People tab, **When** the tab loads, **Then** the "Bottle registered?" label and segmented control appear on a second line below the search.
3. **Given** an admin who taps the refresh icon, **When** the refresh completes, **Then** the guest list updates with fresh data (same behavior as before, just new position).

---

### Edge Cases

- What happens when the event's item type is not set or is empty? Fall back to a generic label: "Item registered?"
- What happens when the filter is set to "Yes" or "No" and the guest list is empty for that filter? The existing empty state behavior applies — no special handling needed.
- What happens when search text is active and the filter is changed? Both filters apply simultaneously (same as current behavior — search narrows within the filtered set).
- What happens when the admin switches away from the People tab and returns? The filter should reset to "Any" (default) on tab re-entry, consistent with current behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The People tab MUST display a question label that incorporates the event's item type, formatted as "{Item type} registered?" (e.g., "Bottle registered?", "Whiskey registered?"). If the item type is unavailable, the fallback label MUST be "Item registered?".
- **FR-002**: The People tab MUST display a segmented control with exactly three options: "Any" (default), "Yes", and "No".
- **FR-003**: When "Any" is selected, the guest list MUST show all guests regardless of item registration status.
- **FR-004**: When "Yes" is selected, the guest list MUST show only guests who have registered at least one item in the app.
- **FR-005**: When "No" is selected, the guest list MUST show only guests who have not registered any items in the app.
- **FR-006**: The search field and refresh icon MUST appear together on the first line of the People tab controls.
- **FR-007**: The filter label and segmented control MUST appear on a second line below the search line.
- **FR-008**: The refresh icon MUST retain its existing functionality (re-fetches event data, items, and administrators) and visual behavior (spinning animation during refresh).
- **FR-009**: The search field MUST continue to work in combination with the filter — both constraints apply simultaneously.
- **FR-010**: The terms "Registered" and "Not registered" MUST NOT appear as filter labels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of filter labels on the People tab use the event's item type in the question format, with zero instances of "Registered" or "Not registered" as standalone filter labels.
- **SC-002**: Admins can identify which guests have not registered their item within 5 seconds of opening the People tab (select "No" on the segmented control).
- **SC-003**: The search and filter controls occupy exactly two lines — search + refresh on line one, filter label + segmented control on line two.
- **SC-004**: Existing filter functionality (the underlying data filtering) produces identical results as before the redesign.

## Assumptions

- The event's item type (e.g., "wine", "whiskey") is available and maps to a user-friendly singular noun (e.g., "Bottle", "Whiskey") via the existing item terminology system in the app.
- The segmented control is a visual redesign of the same three-state filter — no new filter states are introduced.
- The refresh icon needs no label — its placement next to the search field provides sufficient context for its purpose.
- The default filter state on tab open is "Any", consistent with the current "All" default.

## Scope Boundaries

### In Scope

- Renaming filter labels from "All" / "Registered" / "Not registered" to "Any" / "Yes" / "No" with a question label
- Making the question label item-type-aware using the event's item terminology
- Moving the refresh icon from the filter line to the search field line
- Restructuring the two-line layout (search + refresh, then filter label + control)

### Out of Scope

- Changing the underlying filter logic (itemsCount > 0 / === 0)
- Adding new filter states or filter types
- Changing search behavior or search field design
- Changing refresh functionality or adding auto-refresh/polling
- Modifying the guest list rendering, sorting, or card design
- Changes to any other admin tabs
