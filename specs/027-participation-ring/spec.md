# Feature Specification: Live Participation Ring on Item Buttons

**Feature Branch**: `027-participation-ring`  
**Created**: 2026-03-11  
**Status**: Implemented  
**Input**: User description: "Live Participation Ring on Item Buttons"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ambient Participation Awareness During Live Tasting (Priority: P1)

As a tasting participant during an active event, I see a subtle participation ring around each item button that fills as more people rate that item. This gives me an at-a-glance sense of the room's collective progress without requiring me to open any drawer or read any numbers.

**Why this priority**: This is the core feature. Without the ring itself, nothing else delivers value. It transforms the static item grid into a living representation of the room's activity.

**Independent Test**: Can be fully tested by having multiple users rate items during a `started` event and observing the ring fill progression on any participant's screen. Delivers the core value of ambient participation awareness.

**Acceptance Scenarios**:

1. **Given** an event in `started` state with 8 participants, **When** 3 participants have rated item 5, **Then** the ring around item 5 is approximately 37.5% filled (clockwise from 12 o'clock)
2. **Given** an event in `started` state, **When** no one has rated item 2 yet, **Then** only a faint track ring is visible around item 2 (no filled progress arc)
3. **Given** an event in `started` state with 8 participants, **When** all 8 have rated item 3, **Then** the ring around item 3 is a complete circle, visually resembling a thin border
4. **Given** an event in `started` state, **When** participation data has not loaded yet, **Then** no ring is rendered (no empty ring flash or layout shift)
5. **Given** an event in `started` state, **When** 30 seconds pass, **Then** the ring values update to reflect any new ratings submitted by other participants

---

### User Story 2 - Ring Color Follows the Button's Own Color (Priority: P1)

As a participant, the participation ring uses a slightly darker shade of the button's current color so the ring feels like a natural part of the button — not a separate indicator layered on top.

**Why this priority**: Co-equal with P1 because the ring's subtlety depends entirely on the color treatment. A ring in a contrasting or theme-accent color would feel like a different UI element competing for attention, defeating the purpose.

**Independent Test**: Can be tested by rating an item (which changes the button to a color fill) and verifying the ring color darkens to match. Compare a rated (colored) button and an unrated (gray) button side-by-side — each ring should feel intrinsic to its own button.

**Acceptance Scenarios**:

1. **Given** a rated item with a green button color, **When** the ring is displayed, **Then** the progress arc is a darker green derived from the button's own color
2. **Given** a rated item with a red button color, **When** the ring is displayed, **Then** the progress arc is a darker red derived from the button's own color
3. **Given** an unrated item (gray button), **When** the ring is displayed, **Then** the progress arc uses a slightly darker gray consistent with the button's background
4. **Given** an unrated item in dark mode, **When** the ring is displayed, **Then** the ring colors are appropriate for the dark mode button background
5. **Given** a browser that does not support the CSS color derivation method, **When** the ring would normally render, **Then** the ring is invisible and the button functions normally with no broken layout

---

### User Story 3 - Ring Only Visible During Active Tasting (Priority: P2)

As a participant, I only see the participation rings when the event is in the `started` state. In all other states (`created`, `paused`, `completed`), the rings are hidden so they don't add noise when there's nothing to track.

**Why this priority**: Important for polish and preventing confusion, but the core ring rendering (P1) must work first. This is a visibility gate on an already-working feature.

**Independent Test**: Can be tested by transitioning an event through all four states (`created` → `started` → `paused` → `completed`) and verifying ring visibility at each step.

**Acceptance Scenarios**:

1. **Given** an event in `created` state, **When** viewing the item grid, **Then** no participation rings are displayed on any item button
2. **Given** an event in `started` state, **When** viewing the item grid, **Then** participation rings are displayed on all item buttons
3. **Given** an event in `paused` state, **When** viewing the item grid, **Then** no participation rings are displayed
4. **Given** an event in `completed` state, **When** viewing the item grid, **Then** no participation rings are displayed (the winner ring occupies this visual space)
5. **Given** an event that transitions from `started` to `paused`, **When** the state change is detected, **Then** the participation rings disappear

---

### User Story 4 - Participation Count in Rating Drawer (Priority: P2)

As a participant, when I tap an item button to open the rating drawer, I see a text line stating how many people have rated this item (e.g., "6 of 8 tasters have rated this item"). The grid provides the shape; the drawer provides the specifics.

**Why this priority**: Complements the ring with precise numbers for users who want detail. Lower priority because the ring alone delivers the core awareness; this is progressive disclosure.

**Independent Test**: Can be tested by tapping any item button during a `started` event and verifying the participation text appears in the drawer with accurate counts.

**Acceptance Scenarios**:

1. **Given** an event with 8 participants where 6 have rated item 3, **When** I tap item 3 to open the rating drawer, **Then** I see "6 of 8 tasters have rated this item" near the top of the drawer
2. **Given** an event where no one has rated item 1 yet, **When** I tap item 1, **Then** I see "0 of 8 tasters have rated this item"
3. **Given** an event where all participants have rated item 5, **When** I tap item 5, **Then** I see "8 of 8 tasters have rated this item"
4. **Given** an event in `created` state (no participation data), **When** I tap an item, **Then** no participation count line is displayed in the drawer

---

### User Story 5 - Accessible Participation Information (Priority: P2)

As a participant using a screen reader, I hear the participation count announced as part of the button's accessible label, so I have the same awareness as sighted users without relying on the visual ring.

**Why this priority**: Accessibility is essential but depends on the participation data being available (P1). Grouped as P2 because it layers on top of an already-working data pipeline.

**Independent Test**: Can be tested by navigating the item grid with a screen reader and verifying the announced label includes participation count.

**Acceptance Scenarios**:

1. **Given** an event with 8 participants where 6 have rated item 3, **When** a screen reader focuses on item 3, **Then** the announced label includes "6 of 8 rated"
2. **Given** a bookmarked item where 4 of 8 have rated, **When** a screen reader focuses on it, **Then** the announced label includes both the bookmark status and "4 of 8 rated"
3. **Given** an event not in `started` state, **When** a screen reader focuses on an item, **Then** no participation count is announced (existing labels remain unchanged)

---

### Edge Cases

- What happens when the event has only 1 participant? The ring renders but may show 0% or 100% per item; no special handling needed since the math holds.
- What happens when a participant joins mid-event (new user added to `event.users`)? The `totalParticipants` denominator increases on the next poll cycle; existing rings adjust proportionally.
- What happens when an admin removes a participant who had submitted ratings? The ratings persist but the user count drops; rings may show >100% momentarily until ratings are cleaned up. The ring should clamp at 100% visually.
- What happens with the maximum number of items (e.g., 20 items in a 7-column layout)? The 68px SVG within the 24px grid gap must not cause overflow. Verify at maximum item count.
- What happens on a very slow connection? The ring simply doesn't render until participation data loads. No loading skeleton or placeholder ring.
- What happens when the same user re-rates an item? The count stays the same (unique raters, not total rating submissions). The ring does not double-count.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a circular participation ring around each item button when the event is in `started` state
- **FR-002**: The ring MUST fill clockwise from the 12 o'clock position, representing the ratio of unique raters to total participants for that item
- **FR-003**: The ring color MUST be a darker shade of the button's own color (the button's `ratingColor` for rated items, or the button's gray background for unrated items)
- **FR-004**: The ring track (unfilled portion) MUST be a faint version of the button's own color
- **FR-005**: The ring MUST NOT be visible when the event state is `created`, `paused`, or `completed`
- **FR-006**: The ring MUST NOT render when participation data has not loaded, or when total participants is zero
- **FR-007**: The ring progress MUST be capped at 100% visually (never exceed a full circle even if data anomalies occur)
- **FR-008**: The ring MUST update approximately every 30 seconds during a live event, matching the existing event polling cadence
- **FR-009**: Progress changes MUST animate smoothly (not jump instantly to new values)
- **FR-010**: The ring MUST NOT interfere with existing button interactions (tap to rate, bookmark indicator, winner ring in completed state)
- **FR-011**: The ring MUST be invisible and cause no layout breakage on browsers that do not support the CSS color derivation method
- **FR-012**: The rating drawer MUST display a text line with the exact participation count (e.g., "6 of 8 tasters have rated this item") when the event is in `started` state
- **FR-013**: Each item button's accessible label MUST include the participation count (e.g., "6 of 8 rated") when the event is in `started` state
- **FR-014**: The ring SVG MUST not accept pointer events (clicks pass through to the button beneath)
- **FR-015**: No new backend endpoints or data models are required; all data MUST be derived from existing API responses

### Key Entities

- **Participation Count (per item)**: The number of unique participants who have submitted a rating for a given item. Derived by counting distinct user identifiers in the existing ratings data for that item.
- **Total Participants**: The total number of users registered for the event. Already available from the event data returned by the existing event polling endpoint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: During a `started` event, every item button displays a participation ring that accurately reflects the ratio of unique raters to total participants within one polling cycle (~30 seconds) of a rating being submitted
- **SC-002**: The ring is perceived as part of the button (not a separate element) — validated by the ring using a color derived from the button's own fill rather than an external theme color
- **SC-003**: The ring introduces no additional layout shift, overflow, or visual jank in the item grid at any item count up to the system maximum
- **SC-004**: The ring is invisible in `created`, `paused`, and `completed` states with zero residual visual artifacts
- **SC-005**: The participation count text in the rating drawer is accurate to within one polling cycle of real-time data
- **SC-006**: Screen reader users can access the same participation count information as sighted users via the button's accessible label
- **SC-007**: No new API endpoints are introduced; the feature operates entirely on data already provided by existing endpoints
- **SC-008**: The feature adds no perceptible latency to page load or interaction responsiveness on the event page

---

## Post-Implementation Changelog

The following refinements were made during implementation and UI review after the original spec was written. The spec above reflects the v1 design intent; this changelog records what shipped and why.

### Visual Design Changes

| Area | v1 Spec | Shipped | Rationale |
|------|---------|---------|-----------|
| Ring position | Outside the button (68×68px SVG centered on 60px button, 4px breathing room) | Inside the button (60×60px SVG, ring inset 4px from edge) | Eliminates visual separation between ring and button. Ring feels like an intrinsic layer of the button rather than a floating overlay. |
| Ring size | 68×68px | 60×60px (matches button) | Consequence of moving the ring inside. No grid layout impact. |
| Track color (rated) | `color-mix(in srgb, ratingColor 25%, transparent)` — faint tint | `ratingColor` — exact same color as button background | Track blends seamlessly into the button surface. Only the progress arc is visually distinct. |
| Progress color (rated) | `color-mix(in srgb, ratingColor 70%, black)` — darker shade | `color-mix(in srgb, ratingColor 40%, white)` — lighter shade | A lighter fill that "lights up" against the button felt more natural than a darker ring darkening the edge. |
| Track color (unrated) | `stroke-gray-300 dark:stroke-gray-600` at 20% opacity | `stroke-gray-100 dark:stroke-gray-800` — matches button bg | Same rationale as rated: track disappears into button. |
| Progress color (unrated) | `stroke-gray-400 dark:stroke-gray-500` at 60% opacity | `stroke-gray-300 dark:stroke-gray-600` | Lighter fill consistent with the rated item treatment. |
| Button shadow | `shadow-md hover:shadow-lg` (pre-existing) | `shadow-none` | Removed to create a flatter, cleaner look with the inset ring. |

### Drawer Participation Display (US4)

| Area | v1 Spec | Shipped | Rationale |
|------|---------|---------|-----------|
| Display format | Text line below drawer header: "6 of 8 tasters have rated this item" | Subtitle in drawer header: "3 of 8 guests rated this wine" | Progress bar below the header was confusing without context and easy to ignore. Inline header text is immediately visible. |
| Terminology | "tasters have rated this item" | "guests rated this {singular}" | Uses event-specific item terminology (e.g., "wine", "bottle") via `useItemTerminology` for consistency. |
| Text size | `text-sm` | `text-xs` | Smaller to stay subordinate to the title. |

### Performance Optimizations (not in original spec)

These were added to eliminate UI flicker during the 30-second polling cycle:

| Optimization | Description |
|--------------|-------------|
| Loading spinner suppressed on refresh | `ratingsLoadedOnceRef` tracks first load. Subsequent poll-triggered fetches skip `setRatingsLoading(true)`, preventing the spinner from flashing every 30 seconds. |
| Bail-out state updates | `setItemRaterCounts` and `setRatings` compare previous and next values, returning the same reference if unchanged. Prevents unnecessary re-renders when no new ratings were submitted. |
| `React.memo` on ItemButton | Only the specific button(s) whose `ratedCount` changed re-render — not the entire grid. |
| `useCallback` on `handleItemClick` | Stabilizes the click handler reference so `React.memo` can skip re-renders effectively. |
| ItemButton receives `itemId` via `onClick(itemId)` | Eliminates per-button arrow function closures (`() => handleItemClick(id)`) that would defeat memoization. |

### Requirements Impact

- **FR-003** updated: progress arc uses a *lighter* shade, not darker. Track matches button color exactly.
- **FR-004** updated: track is the button's own color (not a "faint version").
- **FR-012** updated: count displayed as header subtitle text, not a separate text line below the header. Uses event-specific terminology.
- Edge case about 68px SVG within grid gap is no longer relevant — ring is inside the 60px button.
