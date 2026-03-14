# Feature Specification: Replace Profile Page with "My Bottles" Bottom Sheet

**Feature Branch**: `030-my-bottles-sheet`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "Replace Profile Page with My Bottles Bottom Sheet on Event Page"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Guest Registers a Bottle via Bottom Sheet (Priority: P1)

A guest attending a blind tasting event wants to register the bottle they are bringing. Instead of navigating to a separate Profile page, they open a "My Bottles" bottom sheet directly from the event page. The sheet provides a form to add a bottle (name required, price and description optional). After adding, the bottle appears in a list within the same sheet. The guest can add multiple bottles without leaving the event page.

**Why this priority**: Bottle registration is the core transactional purpose of the old Profile page. Without this, guests have no way to register items. This is the minimum viable replacement.

**Independent Test**: Can be fully tested by logging in as a guest during a `created` or `started` event, opening the "My Bottles" sheet from any entry point, adding a bottle, and verifying it appears in the list. Delivers the primary value of item registration without requiring any other story.

**Acceptance Scenarios**:

1. **Given** a guest is on the event page during a `created` event, **When** they open the "My Bottles" sheet and fill in the bottle name and tap "Add", **Then** the bottle is saved and appears in the list as a ListCard with the bottle name and registration timestamp.
2. **Given** a guest has the "My Bottles" sheet open, **When** they submit the add form without a bottle name, **Then** a validation error is shown and the bottle is not created.
3. **Given** a guest has the "My Bottles" sheet open, **When** they fill in name, price, and description and tap "Add", **Then** all three fields are persisted and displayed on the bottle's ListCard.
4. **Given** the event is in `paused` state, **When** a guest opens the "My Bottles" sheet, **Then** the "Add Bottle" button is not visible and a message reads "Registration is closed while the event is paused."
5. **Given** the event is in `completed` state, **When** a guest opens the "My Bottles" sheet, **Then** the sheet is read-only with a message "The event has ended." Each bottle that was assigned an item number displays it (e.g., "Item #3") so the guest can identify their bottles on the results page.

---

### User Story 2 — Guest Manages Existing Bottles (Priority: P1)

A guest who has already registered bottles wants to edit or delete them before the tasting begins. Within the "My Bottles" bottom sheet, each registered bottle card has edit and delete action buttons. Editing opens an inline form pre-populated with existing values. Deleting shows a confirmation before removal.

**Why this priority**: Edit and delete are tightly coupled to registration and are essential for correcting mistakes before an event starts. Without these, guests are stuck with typos or wrong entries.

**Independent Test**: Can be tested by pre-registering a bottle, opening the sheet, editing the bottle name, and verifying the change persists. Then deleting the bottle and verifying it is removed from the list.

**Acceptance Scenarios**:

1. **Given** a guest has registered bottles and the event is in `created` or `started` state, **When** they tap the edit button on a bottle card, **Then** an inline edit form appears pre-populated with the bottle's current name, price, and description.
2. **Given** a guest is editing a bottle, **When** they change the name and save, **Then** the updated name is persisted and the ListCard reflects the change.
3. **Given** a guest taps the delete button on a bottle card, **When** the action fires, **Then** the bottle is immediately removed from the list and an undo toast appears for a few seconds.
4. **Given** a guest sees the undo toast after deleting a bottle, **When** they tap "Undo" before the toast expires, **Then** the bottle is restored to the list.
5. **Given** a guest sees the undo toast after deleting a bottle, **When** the toast expires without tapping "Undo", **Then** the deletion is finalized.
6. **Given** the event is in `paused` or `completed` state, **When** the guest views their bottles, **Then** no edit or delete buttons are visible on any card.

---

### User Story 3 — Guest Edits Display Name (Priority: P2)

A guest wants to update their display name so that other participants (especially in the Similar Users drawer) see a recognizable name instead of just their email. The name field sits at the top of the "My Bottles" bottom sheet and auto-saves when the field loses focus. A toast confirms the save. There is no explicit Save button and no forced navigation.

**Why this priority**: The name field is a secondary concern — useful for social context but not critical for the core tasting flow. It is included in the same sheet for convenience but is not the primary purpose.

**Independent Test**: Can be tested by opening the sheet, changing the name, tapping outside the field, and verifying a toast confirms the save. Navigating away and returning should show the updated name.

**Acceptance Scenarios**:

1. **Given** a guest opens the "My Bottles" sheet, **When** they see the name field, **Then** it is pre-populated with their current display name (or empty if not set).
2. **Given** a guest changes their name and taps outside the field (blur), **When** the auto-save triggers, **Then** a toast confirms "Name updated" and the name is persisted.
3. **Given** a guest clears the name field and blurs, **When** the auto-save triggers, **Then** the empty value is accepted (name is optional for now) and persisted.
4. **Given** the event is in `paused` or `completed` state, **When** the guest opens the sheet, **Then** the name field is read-only.

---

### User Story 4 — Opening the Sheet from Multiple Entry Points (Priority: P2)

The "My Bottles" bottom sheet is accessible from three existing UI elements. No new persistent elements are added to the event page. All three entry points open the same sheet component.

**Why this priority**: Discoverability is critical — if guests cannot find the registration flow, the feature fails regardless of how well the sheet works. Multiple entry points ensure guests encounter it naturally.

**Independent Test**: Can be tested by verifying each of the three entry points (hamburger menu, welcome sheet CTA, inline registration prompt) opens the "My Bottles" sheet. Each can be verified independently.

**Acceptance Scenarios**:

1. **Given** a guest is on the event page, **When** they open the hamburger menu and tap "My Bottles", **Then** the "My Bottles" bottom sheet opens.
2. **Given** the guest welcome bottom sheet is visible during a `created` event, **When** the guest taps the "Register My Bottle" CTA, **Then** the welcome sheet dismisses and the "My Bottles" bottom sheet opens.
3. **Given** a guest is on the event page during a `created` event and sees the inline registration prompt, **When** they tap the registration link, **Then** the "My Bottles" bottom sheet opens.
4. **Given** a guest has already registered 1+ bottles, **When** the guest welcome sheet is displayed, **Then** the CTA text reads "View My Bottles" instead of "Register My Bottle".

---

### User Story 5 — Profile Page Removal and Dead Code Cleanup (Priority: P2)

The old Profile page, its route, and all navigation references are removed from the application. The hamburger menu "Profile" item is replaced with "My Bottles" (using dynamic item terminology). All orphaned imports, state variables, and helper functions that only served the Profile page are deleted.

**Why this priority**: Leaving dead code and broken routes degrades maintainability. This cleanup must happen alongside the new sheet to avoid a broken intermediate state.

**Independent Test**: Can be tested by verifying that navigating to `/event/:eventId/profile` shows a 404 or redirects, that no menu item references "Profile", and that the codebase contains no imports of `ProfilePage`.

**Acceptance Scenarios**:

1. **Given** the new "My Bottles" sheet is in place, **When** a user navigates directly to `/event/:eventId/profile`, **Then** the route does not resolve (404 or redirect to event page).
2. **Given** a guest opens the hamburger menu, **When** they look for profile-related items, **Then** they see "My Bottles" (or "My Items" for generic events) instead of "Profile".
3. **Given** the codebase is searched for references to ProfilePage or the `/profile` route, **When** the search completes, **Then** zero references are found outside of git history.

---

### User Story 6 — Test Suite Updates (Priority: P2)

All unit and e2e tests are updated to reflect the new architecture. Tests that reference Profile page navigation are rewritten to use the "My Bottles" bottom sheet. New tests are added for the sheet component. No test references stale routes or deleted components.

**Why this priority**: Test coverage ensures the feature works as specified and prevents regressions. Tests must be updated alongside the code to keep the suite green.

**Independent Test**: Can be tested by running the full unit and e2e test suites and verifying all pass. Additionally, verify no test file contains references to `/profile` or `ProfilePage`.

**Acceptance Scenarios**:

1. **Given** the full unit test suite is run, **When** all tests complete, **Then** there are zero failures related to profile navigation or missing components.
2. **Given** the full e2e test suite is run, **When** all tests complete, **Then** all assertions pass without references to the `/profile` URL.
3. **Given** a new unit test file exists for the "My Bottles" sheet, **When** the tests run, **Then** they validate: rendering, name auto-save, bottle CRUD, state-based read-only mode, empty state, dynamic terminology, and delete confirmation.

---

### Edge Cases

- What happens when a guest opens the "My Bottles" sheet but has no network connectivity? The sheet should show the last known state and display an error toast if a save operation fails.
- What happens if the event state changes (e.g., host pauses) while the sheet is open? The sheet should transition to read-only mode without crashing. A re-fetch of event state on sheet open or a reactive listener handles this.
- What happens if a guest tries to register a bottle with a name that is extremely long? Standard input length limits (enforced by existing validation) should apply.
- What happens if two guests register bottles with the same name? This is allowed — bottle names are not unique identifiers.
- What happens when the guest welcome sheet's CTA is tapped but the event has just transitioned to `paused`? The "My Bottles" sheet opens in read-only mode with the paused message.
- What happens if the hamburger menu "My Bottles" item is tapped while the sheet is already open? The action should be a no-op (sheet remains open) or ignored gracefully.

## Clarifications

### Session 2026-03-13

- Q: Delete confirmation pattern — styled dialog or undo toast? → A: Undo toast. Bottle is deleted immediately, a sonner toast with "Undo" appears for a few seconds allowing reversal.
- Q: Should the "My Bottles" menu item be visible to admins/hosts as well as guests? → A: Yes, visible to all logged-in users. Hosts can and will register their own bottles too.
- Q: When should the assigned item number appear on each bottle card? → A: Only during `completed` state. Keep it hidden during `paused` to avoid influencing guest behavior during the tasting.
- Q: During `paused` state, should the sheet show any indication that assignment is in progress? → A: No, keep the current neutral message: "Registration is closed while the event is paused."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a "My Bottles" bottom sheet component that contains a name field, a registered bottles list, and an add-bottle form.
- **FR-002**: The name field MUST auto-save on blur and display a toast confirmation during `created` and `started` states. The field MUST be read-only during `paused` and `completed` states. No explicit Save button or forced navigation.
- **FR-003**: The registered bottles list MUST render each bottle using the ListCard component, showing bottle name, optional price, optional description, and registration date as relative time.
- **FR-004**: Users MUST be able to add a bottle with a required name field and optional price and description fields during `created` and `started` event states.
- **FR-005**: Users MUST be able to edit an existing bottle's details during `created` and `started` event states via an inline edit form.
- **FR-006**: Users MUST be able to delete a bottle during `created` and `started` states. Deletion is immediate, with an undo toast (via sonner) that allows reversal for a few seconds. This replaces the old `window.confirm` pattern.
- **FR-007**: The sheet MUST be read-only during `paused` state, displaying "Registration is closed while the event is paused."
- **FR-008**: The sheet MUST be read-only during `completed` state, displaying "The event has ended."
- **FR-008a**: During `completed` state, each bottle card that has been assigned an item number MUST display the assigned item number (e.g., "Item #3") alongside the bottle name. This helps the guest identify which item on the results/dashboard page belongs to them. Bottles without an assignment show no item number.
- **FR-009**: The sheet MUST show an empty state message ("You haven't registered any [bottles/items] yet") with a prominent "Add [Bottle/Item]" CTA when no bottles are registered and registration is available.
- **FR-010**: All user-facing text in the sheet MUST use dynamic item terminology (e.g., "bottles" vs. "items") via the existing `useItemTerminology` hook.
- **FR-011**: The "My Bottles" sheet MUST be openable from the hamburger menu (replacing the "Profile" item), the guest welcome sheet CTA, and the inline registration prompt on the event page.
- **FR-012**: The hamburger menu item MUST display "My [Bottles/Items]" using dynamic terminology, MUST be visible to all logged-in users (guests and admins/hosts alike), and MUST open the sheet instead of navigating to a route.
- **FR-013**: The guest welcome bottom sheet CTA text MUST be contextual: "Register My [Bottle/Item]" when the guest has no registered items, "View My [Bottles/Items]" when they have 1+ items.
- **FR-014**: The guest welcome sheet MUST continue to appear on every login during `created` and `started` event states.
- **FR-015**: The application MUST remove the `/event/:eventId/profile` route, the `ProfilePage` component, and all navigation references to the profile route.
- **FR-016**: Form validation logic for add/edit bottle forms MUST be extracted into a shared utility and reused across both flows.
- **FR-017**: The add and edit forms MUST share a single reusable form component or render path differentiated by an editing flag.
- **FR-018**: All unit tests for the new sheet and updated components MUST pass. A new test file for the "My Bottles" sheet MUST be created.
- **FR-019**: All e2e tests that previously navigated to the Profile page MUST be rewritten to use the "My Bottles" sheet flow.
- **FR-020**: All dead code associated with the Profile page (orphaned imports, unused state variables, helper functions) MUST be removed.

### Key Entities

- **Bottle (Item)**: A guest's registered tasting entry. Key attributes: name (required), price (optional), description (optional), registration date, assigned item number (set by host during paused state, displayed to guest only during completed state). Belongs to a guest within an event.
- **Guest**: A participant in a blind tasting event. Has a display name (optional, editable), email, and zero or more registered bottles.
- **Event**: A blind tasting event with states (`created`, `started`, `paused`, `completed`) that gate bottle registration and editing capabilities.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Guests can register a bottle in under 30 seconds from any entry point, without leaving the event page.
- **SC-002**: 100% of bottle registration, editing, and deletion actions are performed within the bottom sheet — zero navigations to a separate page.
- **SC-003**: The event page layout is unchanged — no new persistent UI elements are introduced.
- **SC-004**: All existing unit and e2e tests pass after the migration, with zero references to the deleted Profile page.
- **SC-005**: The codebase contains zero dead code artifacts from the Profile page (no orphaned imports, routes, or navigation references).
- **SC-006**: Bottle deletion uses an undo toast pattern (immediate delete with reversal option), with zero instances of `window.confirm` in the bottle management flow.
- **SC-007**: All user-facing text in the sheet adapts to event-specific terminology (bottles vs. items) — zero hardcoded "bottle" strings.
- **SC-008**: Guest task completion rate for bottle registration remains the same or improves compared to the old Profile page flow, measured by successful registrations per event.
