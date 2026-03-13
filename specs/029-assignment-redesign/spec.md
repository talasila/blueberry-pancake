# Feature Specification: Assignment Tab Redesign (Number-First Grid)

**Feature Branch**: `029-assignment-redesign`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "Redesign the Bottles/Items Assignment tab from a bottle-first expandable list to a number-first grid that matches the host's physical workflow during blind tasting reveal. The host unwraps bottles by number and needs to record which registered bottle corresponds to each number."

## Context

The Assignment tab is used by the host after a blind tasting event is paused. At this point, the host has a table of unwrapped bottles, each still bearing the physical number tag placed on them before the tasting began. The host picks up bottle #3, reads the label, and needs to record in the app: "#3 = Sarah's Cabernet Sauvignon." The current UI presents this task backwards — it lists registered bottles and asks the host to select a number for each one, requiring 3-4 taps per assignment inside an expandable accordion.

### Physical Workflow Being Supported

1. Guest attends event and may or may not register their bottle in the app
2. Guest hands the bottle to the host
3. Host wraps/covers all bottles
4. Host randomly places number tags on the wrapped bottles
5. Guests taste the numbered bottles and submit ratings
6. Host pauses the event (no more ratings)
7. Host unwraps bottles one by one
8. For each unwrapped bottle, host matches its physical number tag to the registered bottle in the app
9. After assignment, host reviews the dashboard and makes the dramatic reveal of the winner
10. Event is completed; all guests get access to the full dashboard
11. When guests tap a bottle ID, the bottle details drawer shows the name if an assignment was done

## Clarifications

### Session 2026-03-13

- Q: Should the assignment grid reuse the circular button pattern from the rating page (`ItemButton`) or use a different tile shape? → A: Reuse the same circular button pattern (same shape/size as the rating page `ItemButton`), color-coded by assignment state. This provides visual consistency — the host has been looking at these circles all evening.
- Q: How should assigned buttons be visually distinguished from unassigned ones on a 60px circle? → A: Color fill change only — unassigned = gray, assigned = green or event accent color, excluded = faint/strikethrough. Mirrors how the rating page uses color fills for rated vs unrated.
- Q: What should happen to the bottom sheet after a successful assignment? → A: Close immediately on success. The button turns green and the host moves to the next number. Keeps the rapid-fire data-entry rhythm smooth.
- Q: Should the assignment grid use the same 3-column layout as the rating page, or adapt based on item count? → A: Fixed 3 columns, matching the rating page exactly. Reinforces visual consistency and the host is already trained on this layout.
- Q: Should excluded IDs be shown as dimmed tiles in the assignment grid? → A: No. Excluded IDs are not shown on the rating page (they are filtered out entirely). The assignment grid should be consistent — excluded IDs simply do not appear. The host never placed physical number tags for excluded IDs either.
- Q: Should there be instructional text above the grid? → A: Yes. Clear, concise instructions above the grid must direct the host on what to do, following the same pattern as the rating page (e.g., "Tap a number to rate"). The instruction should adapt to the current state (paused = actionable instruction, other states = explanation of why assignment is unavailable).
- Q: Should there be a count of registered bottles still unassigned? → A: Yes, integrated into the progress indicator alongside the slot count (e.g., "7 of 10 assigned · 2 bottles remaining"). This gives the host both signals — how many number slots are filled AND how many registered bottles still need matching — without adding a separate UI element.
- Q: Should there be a bottle-centric list view showing all registered bottles and their assignment status? → A: Yes, as a collapsible section below the grid (e.g., "Registered Bottles" disclosure). Tapping expands a compact list showing bottle name, owner, and assigned number or "unassigned". This serves as a verification tool after assigning — the host can check "did I miss Sarah's bottle?" — while the number grid remains the primary assignment interface.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Number Grid as Primary View (Priority: P1)

As a host who just unwrapped bottles after a blind tasting, I open the Assignment tab and immediately see a grid of circular buttons for each available number — the same numbers that appear on the rating page. Each button clearly shows whether it has been assigned or not. I can see at a glance which numbers still need attention without scrolling through a list reading badges.

**Why this priority**: This replaces the current bottle-first list with the correct mental model. Without the number grid, every other improvement is built on the wrong foundation. The host thinks in numbers (they're looking at physical number tags), not in bottle names.

**Independent Test**: Can be tested by opening the Assignment tab for a paused event with 12 configured items (2 excluded) and verifying exactly 10 buttons are displayed in a grid — excluded IDs do not appear, matching the rating page.

**Acceptance Scenarios**:

1. **Given** an event configured with `numberOfItems: 12` and `excludedItemIds: [5, 11]`, **When** the host opens the Assignment tab, **Then** exactly 10 buttons are displayed (#1-#4, #6-#10, #12) — excluded IDs #5 and #11 do not appear, consistent with the rating page
2. **Given** an event where items #2 and #7 have been assigned to registered bottles, **When** the host views the grid, **Then** buttons #2 and #7 show a colored fill (green or event accent) while unassigned buttons remain gray
3. **Given** an event with no assignments yet, **When** the host opens the Assignment tab, **Then** all non-excluded tiles show an unassigned state and are tappable
4. **Given** a small event with `numberOfItems: 6`, **When** the grid renders on a mobile screen, **Then** all tiles are visible without horizontal scrolling and have tap targets large enough for comfortable one-handed use (minimum ~44px)
5. **Given** a larger event with `numberOfItems: 20`, **When** the grid renders, **Then** all tiles fit in a scrollable grid layout without horizontal overflow
6. **Given** an event in `paused` state, **When** the host opens the Assignment tab, **Then** instructional text above the grid clearly directs the host (e.g., "Tap a number to assign a bottle"), following the same pattern as the rating page's "Tap a number to rate"
7. **Given** an event in `started` state, **When** the host opens the Assignment tab, **Then** instructional text above the grid explains that the event must be paused before assignment can begin

---

### User Story 2 - Assign a Bottle to a Number via Bottom Sheet (Priority: P1)

As a host holding an unwrapped bottle with number tag #3, I tap the #3 tile on the grid. A bottom sheet slides up showing only the unassigned registered bottles. I tap "Cabernet Sauvignon — Sarah M." and the assignment is saved. Two taps total: tap the number, tap the bottle.

**Why this priority**: This is the core interaction — the assignment itself. Co-equal with P1 because the grid (US1) without the ability to assign is useless.

**Independent Test**: Can be tested by tapping an unassigned number tile, selecting a registered bottle from the bottom sheet, and verifying the tile updates to assigned state and the backend reflects the assignment.

**Acceptance Scenarios**:

1. **Given** a paused event with 5 registered bottles (3 unassigned), **When** the host taps unassigned tile #3, **Then** a bottom sheet slides up showing only the 3 unassigned registered bottles with their name and owner
2. **Given** the bottom sheet is open for #3, **When** the host taps "Cabernet Sauvignon — Sarah M.", **Then** the assignment is saved, the bottom sheet closes immediately, and button #3 updates to show assigned color fill
3. **Given** the bottom sheet is open, **When** the host swipes down or taps the backdrop, **Then** the bottom sheet closes without making an assignment
4. **Given** 10+ registered bottles in the bottom sheet, **When** the host types in a search field at the top of the sheet, **Then** the list filters by bottle name or owner name in real time
5. **Given** only 1 unassigned bottle remains, **When** the host taps the next unassigned tile, **Then** the bottom sheet shows just that one bottle (no search needed)
6. **Given** no unassigned registered bottles remain, **When** the host taps an unassigned tile, **Then** the bottom sheet shows an empty state: "All registered bottles have been assigned"
7. **Given** an assignment API call fails, **When** the error is returned, **Then** a toast error is shown, the bottom sheet remains open, and the tile stays in unassigned state

---

### User Story 3 - Review and Change an Existing Assignment (Priority: P1)

As a host who realizes I assigned the wrong bottle to #3, I tap the #3 tile (which shows it's already assigned) and see which bottle is currently linked. I can change it to a different bottle or clear the assignment entirely.

**Why this priority**: Mistakes happen during a fast-paced reveal. The host must be able to correct assignments without a cumbersome workflow.

**Independent Test**: Can be tested by tapping an assigned tile, verifying the current assignment is displayed, then changing or clearing it and verifying the update persists.

**Acceptance Scenarios**:

1. **Given** tile #3 is assigned to "Cabernet Sauvignon — Sarah M.", **When** the host taps #3, **Then** a bottom sheet or detail view shows the current assignment with "Change" and "Clear" actions
2. **Given** the host taps "Change" on an assigned tile, **When** the bottle picker appears, **Then** it shows all unassigned bottles (the currently assigned bottle is not in the list since it would be freed by the reassignment — or is shown separately as "current")
3. **Given** the host taps "Clear", **When** confirmed, **Then** the assignment is removed (itemId set to null), tile #3 returns to unassigned state, and the previously assigned bottle returns to the unassigned pool
4. **Given** the host clears tile #3 and then taps tile #3 again, **When** the bottle picker opens, **Then** the previously assigned bottle appears in the list of available bottles

---

### User Story 4 - Assignment Progress Indicator (Priority: P1)

As a host working through the reveal, I see a progress bar at the top of the Assignment tab showing how many numbers have been assigned out of the total assignable slots. This tells me at a glance whether I'm done or how much is left.

**Why this priority**: The host needs a clear "am I done?" signal before moving to the dashboard for the reveal. Without this, they'd have to visually scan every tile.

**Independent Test**: Can be tested by assigning bottles one at a time and verifying the progress bar updates after each assignment.

**Acceptance Scenarios**:

1. **Given** 10 available buttons (12 configured minus 2 excluded) with 0 assigned and 8 registered bottles, **When** the host views the Assignment tab, **Then** the progress indicator shows "0 of 10 assigned · 8 bottles remaining"
2. **Given** 7 of 10 available buttons are assigned, **When** the host views the progress indicator, **Then** it shows "7 of 10 assigned · 1 bottle remaining" (reflecting that 7 of the 8 registered bottles have been matched)
3. **Given** all 8 registered bottles have been assigned (out of 10 available slots), **When** the host views the progress, **Then** it shows "8 of 10 assigned · 0 bottles remaining" — the host knows all registered bottles are matched even though 2 number slots are empty (those were unregistered bottles)
4. **Given** all 10 of 10 are assigned, **When** the host views the progress, **Then** a completion state is shown (e.g., "All assigned" with a success visual)

---

### User Story 5 - Inline Pause CTA When Event Is Not Paused (Priority: P2)

As a host who navigated to the Assignment tab while the event is still running, I see a clear call-to-action to pause the event rather than just a warning message. I can pause directly from this tab without navigating away.

**Why this priority**: Removes a multi-step navigation detour (close drawer → find State card → pause → reopen drawer → switch to Assignment tab). Important for usability but not blocking the core assignment flow.

**Independent Test**: Can be tested by opening the Assignment tab while the event is in `started` state and verifying a "Pause Event" button is displayed and functional.

**Acceptance Scenarios**:

1. **Given** an event in `started` state, **When** the host opens the Assignment tab, **Then** instructional text explains the event must be paused, the number grid is visible but disabled/dimmed, and a prominent "Pause Event to Begin Assignment" button is displayed
2. **Given** the host taps "Pause Event to Begin Assignment", **When** the event state changes to `paused`, **Then** the grid becomes interactive, the pause CTA disappears, and the host can begin assigning
3. **Given** an event already in `paused` state, **When** the host opens the Assignment tab, **Then** no pause CTA is displayed; the grid is immediately interactive
4. **Given** an event in `created` or `completed` state, **When** the host opens the Assignment tab, **Then** the grid is disabled with an appropriate message explaining that assignment is only available in paused state (no pause CTA offered for these states)

---

### User Story 6 - Registered Bottles Verification List (Priority: P2)

As a host who has finished assigning most bottles, I expand a "Registered Bottles" section below the grid to verify that every registered bottle has been matched. I see a compact list of all registered bottles with their name, owner, and assigned number (or "unassigned"). This lets me answer "did I miss Sarah's bottle?" without tapping through individual number buttons.

**Why this priority**: The number grid and progress indicator handle the primary assignment flow (P1). This list is a secondary verification tool — useful for catching missed bottles, but not blocking the core workflow.

**Independent Test**: Can be tested by registering 8 bottles, assigning 6 of them, expanding the Registered Bottles section, and verifying all 8 appear with correct assignment status (6 showing their assigned number, 2 showing "unassigned").

**Acceptance Scenarios**:

1. **Given** 8 registered bottles (6 assigned, 2 unassigned), **When** the host expands the "Registered Bottles" section below the grid, **Then** all 8 bottles are listed with their name, owner, and assigned number (or "unassigned")
2. **Given** the section is collapsed by default, **When** the host taps the disclosure control, **Then** the section expands to show the bottle list
3. **Given** a bottle is assigned to #3, **When** the host views the list, **Then** that bottle's row shows "#3" as its assigned number
4. **Given** a bottle has not been assigned, **When** the host views the list, **Then** that bottle's row shows "unassigned" or equivalent indicator
5. **Given** the host assigns a bottle via the number grid while the list is expanded, **When** the assignment completes, **Then** the list updates in real time to reflect the new assignment

---

### User Story 7 - Eliminate Duplicated Assignment Code (Priority: P2)

As a developer maintaining this codebase, the assignment UI exists as a single shared component rather than being duplicated across `EventAdminPage.jsx` (drawer) and `ItemAssignmentPage.jsx` (standalone page). Changes to assignment behavior are made in one place.

**Why this priority**: The current ~200 lines of duplicated UI and logic between the two files is a maintenance burden. This is a code-health story that should be addressed as part of the redesign rather than carried forward.

**Independent Test**: Can be verified by inspecting the codebase and confirming that the assignment UI is defined in a single component file, imported by both the drawer in `EventAdminPage` and the standalone `ItemAssignmentPage`.

**Acceptance Scenarios**:

1. **Given** the redesigned assignment UI, **When** rendered inside the `EventAdminPage` Items drawer, **Then** it uses the shared component and behaves identically to the standalone page
2. **Given** the shared component, **When** a bug fix or feature change is made, **Then** it applies to both the drawer and standalone page without separate modifications
3. **Given** the standalone `ItemAssignmentPage` route (`/event/:eventId/admin/items/assign`), **When** navigated to directly, **Then** it renders the same shared component in a full-page layout

---

### Edge Cases

- What happens with excluded IDs? They do not appear in the grid at all, consistent with the rating page. The host never placed a physical number tag for an excluded ID.
- What happens when there are more registered bottles than available numbers? The extra registered bottles appear in the bottom sheet picker but there are no buttons for them. The progress bar denominator is the number of available buttons, not the number of registered bottles.
- What happens when there are fewer registered bottles than available numbers? Some buttons will remain unassigned. This is expected — those bottles weren't registered in the app. The progress bar reflects assigned count vs total available buttons, and the host understands some bottles were never registered.
- What happens when the host assigns, then unpauses the event (back to started), then re-pauses? Existing assignments persist across state changes. The grid shows the current state of assignments when re-entering paused state.
- What happens when two admins are assigning simultaneously? The backend enforces uniqueness — if admin A assigns bottle X to #3 and admin B tries to assign bottle Y to #3, the second request fails with an error. The bottom sheet should refresh the available bottles list after each assignment to stay current.
- What happens on very small screens (320px width)? The fixed 3-column grid with 60px buttons and gap-6 (24px) totals 228px. Fits comfortably within 320px. No adaptation needed.
- What happens when `numberOfItems` is very large (e.g., 100)? The grid scrolls vertically. This is an unusual case but should not break layout.
- What happens when the assignment API call is slow? The bottom sheet closes immediately on tap (optimistic). If the API call subsequently fails, the button reverts to unassigned state and an error toast is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Assignment tab MUST display a grid of circular buttons matching the rating page's `ItemButton` pattern (same shape, size, and grid layout), showing only available item IDs (excluded IDs are omitted entirely, consistent with the rating page)
- **FR-002**: Each button MUST clearly indicate one of two states via color fill: unassigned (gray, tappable) or assigned (green or event accent color, tappable to review)
- **FR-003**: Tapping an unassigned tile MUST open a bottom sheet displaying all registered bottles that have not yet been assigned to any number
- **FR-004**: The bottom sheet MUST display each bottle's name and owner (resolved to display name from `event.users` when available, falling back to email)
- **FR-005**: Tapping a bottle in the bottom sheet MUST close the sheet immediately, optimistically update the button to assigned state, and save the assignment. If the save fails, the button MUST revert to unassigned and an error toast MUST be shown
- **FR-006**: Tapping an assigned tile MUST show the current assignment with options to change or clear
- **FR-007**: Clearing an assignment MUST set the item's `itemId` to null and return the tile to unassigned state
- **FR-008**: The bottom sheet MUST include a search/filter input when the number of unassigned registered bottles exceeds a reasonable threshold (e.g., 6+)
- **FR-009**: A progress indicator MUST be displayed showing both the count of assigned buttons versus total available buttons AND the number of registered bottles still unassigned (e.g., "7 of 10 assigned · 2 bottles remaining"). When all registered bottles have been assigned, the remaining count reaches 0 regardless of how many number slots are still empty
- **FR-010**: Instructional text MUST appear above the grid, adapted to the current event state: when paused, a clear action prompt (e.g., "Tap a number to assign a bottle"); when not paused, an explanation of why assignment is unavailable. This follows the same pattern as the rating page's contextual instructions.
- **FR-011**: When the event is not in `paused` state, the grid MUST be visible but non-interactive, with the instructional text explaining the requirement
- **FR-012**: When the event is in `started` state, a "Pause Event" action MUST be available directly on the Assignment tab
- **FR-013**: The assignment UI MUST be implemented as a single shared component used by both the `EventAdminPage` drawer and the standalone `ItemAssignmentPage`
- **FR-014**: No new backend endpoints are required — the redesign MUST use the existing assignment and item retrieval endpoints
- **FR-015**: Bottles that were not registered by guests are handled by the host simply not assigning that number — no new registration flow is introduced
- **FR-016**: The grid MUST use a fixed 3-column layout matching the rating page's `ItemButton` grid, ensuring visual consistency across the app
- **FR-017**: A collapsible "Registered Bottles" section MUST appear below the grid, collapsed by default, showing all registered bottles with their name, owner, and assigned number (or "unassigned"). This serves as a verification view for the host to confirm all registered bottles have been matched
- **FR-018**: The current bottle-first expandable list UI and all associated code (accordion, inline dropdowns, expand/collapse state) MUST be removed and replaced by the number grid

### Key Entities

- **Number Button**: A circular button matching the rating page's `ItemButton` visual pattern, representing a single available item ID (excluded IDs are omitted). Has two visual states differentiated by color: unassigned (gray) or assigned (green/accent). Maps to the `itemId` integer field on the item data model.
- **Registered Bottle**: An existing item record created by a guest during the `created` or `started` state. Has an `id` (nanoid), `name`, `price`, `description`, `ownerEmail`, and `itemId` (null until assigned). No changes to this entity.
- **Bottom Sheet Bottle Picker**: A slide-up panel showing unassigned registered bottles. The host taps one to create the assignment. Replaces the current dropdown inside the accordion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A host can complete a full assignment of N bottles in 2×N taps (one tap to select the number, one tap to select the bottle) — down from 3-4×N taps in the current accordion + dropdown design
- **SC-002**: The host can see the full assignment state (which numbers are done, which remain) without scrolling on a typical mobile screen for events with up to 12 items
- **SC-003**: The assignment UI direction matches the host's physical workflow — the host looks up by number (not by bottle name) as the primary entry point
- **SC-004**: The progress indicator accurately reflects both the number-slot assignment count and the unassigned-bottle count within one successful response of any change
- **SC-005**: The Registered Bottles verification list accurately reflects assignment status for every registered bottle, updating in real time as assignments are made via the number grid
- **SC-006**: The shared component eliminates all duplicated assignment logic — verified by confirming the assignment UI is defined in exactly one component file
- **SC-007**: No new backend endpoints or data model changes are introduced
- **SC-008**: The redesigned 3-column circular button grid and bottom sheet introduce no layout overflow, horizontal scrolling, or broken tap targets on screens 320px wide and above
- **SC-009**: Assignment errors (uniqueness conflicts, state validation) are surfaced to the host via toast messages without corrupting the grid state
