# Feature Specification: Event Progress Stepper

**Feature Branch**: `031-event-progress-stepper`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "Replace State drawer with inline Event Progress Stepper on Settings page"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host sees event progress at a glance (Priority: P1)

A host opens the Settings page and immediately sees a visual stepper at the top showing the four event phases — Setup, Tasting, Reveal, Results — with the current phase clearly highlighted. Below the stepper, a plain-language sentence describes what's happening now and hints at what comes next. The host instantly understands where their event stands without opening any drawer or reading help documentation.

**Why this priority**: This is the core value proposition. Without visual context, the host has no "you are here" orientation. Every other improvement depends on this foundational element.

**Independent Test**: Can be tested by loading the Settings page for an event in any state and verifying the stepper renders with the correct phase highlighted and the matching context sentence displayed.

**Acceptance Scenarios**:

1. **Given** an event in the "created" state, **When** the host opens the Settings page, **Then** the stepper shows "Setup" as the active phase with past phases empty and future phases (Tasting, Reveal, Results) shown as upcoming, and the context line reads "Configure your event. When you're ready, start the tasting."
2. **Given** an event in the "started" state, **When** the host opens the Settings page, **Then** the stepper shows "Tasting" as the active phase with "Setup" as a completed phase, and the context line reads "Guests are rating. Pause when it's time to reveal."
3. **Given** an event in the "paused" state, **When** the host opens the Settings page, **Then** the stepper shows "Reveal" as the active phase with "Setup" and "Tasting" as completed phases, and the context line reads "Assign bottles to item numbers and prepare the big reveal."
4. **Given** an event in the "completed" state, **When** the host opens the Settings page, **Then** the stepper shows "Results" as the active phase with all previous phases as completed, and the context line reads "The event is over. Everyone can see how the bottles did."
5. **Given** an event of type "item" (not wine), **When** the host opens the Settings page, **Then** the context lines use the correct item terminology (e.g., "items" instead of "bottles").

---

### User Story 2 - Host advances the event with one tap (Priority: P1)

Below the stepper and context line, the host sees clearly labeled action buttons for the valid transitions from the current state. The button labels use friendly, event-themed language (e.g., "Start Tasting" instead of "Start"). Tapping a button transitions the event to the new state, updates the stepper, and confirms the action.

**Why this priority**: This is the primary interaction — advancing the event lifecycle. It must be immediate, clear, and require no extra navigation.

**Independent Test**: Can be tested by loading the Settings page, clicking a transition button, and verifying the event state changes and the stepper updates to reflect the new phase.

**Acceptance Scenarios**:

1. **Given** an event in "created" state, **When** the host taps "Start Tasting", **Then** the event transitions to "started", the stepper updates to show "Tasting" as active, and a toast confirms "Event started."
2. **Given** an event in "started" state, **When** the host taps "Pause for Reveal", **Then** the event transitions to "paused", the stepper updates to show "Reveal" as active, and a toast confirms "Event paused."
3. **Given** an event in "started" state, **When** the host taps "Complete Event", **Then** the event transitions to "completed", the stepper updates to show "Results" as active, and a toast confirms "Event completed."
4. **Given** an event in "paused" state, **When** the host taps "Announce Results", **Then** the event transitions to "completed" and the stepper shows "Results" as active.
5. **Given** an event in "paused" state, **When** the host taps "Resume Tasting", **Then** a confirmation dialog appears. If confirmed, the event transitions to "started" and the stepper shows "Tasting" as active. If cancelled, the event remains in "paused" state.
6. **Given** an event in "completed" state, **When** the host taps "Reopen Tasting", **Then** a confirmation dialog appears. If confirmed, the event transitions to "started" and the stepper shows "Tasting" as active. If cancelled, the event remains in "completed" state.
7. **Given** an event in "completed" state, **When** the host taps "Back to Reveal", **Then** a confirmation dialog appears. If confirmed, the event transitions to "paused" and the stepper shows "Reveal" as active. If cancelled, the event remains in "completed" state.
8. **Given** a transition is in progress, **When** the host looks at the action buttons, **Then** all buttons are disabled and show a loading indicator until the transition completes.
9. **Given** a transition fails (e.g., network error or optimistic locking conflict), **When** the error occurs, **Then** a toast shows the error message and the stepper remains on the current state.

---

### User Story 3 - Host sees a guardrail when item counts don't match (Priority: P2)

When the event is in "created" state and the number of registered items doesn't match the available rating slots, a concise note appears above the action buttons alerting the host. The note is brief and scannable — not a paragraph of explanation. The guardrail does not appear in other states to keep the UI clean.

**Why this priority**: Prevents the host from starting the event with a misconfigured item count, but is a supporting feature — the stepper and transitions work independently of this.

**Independent Test**: Can be tested by setting up an event with mismatched registered items vs. rating slots and verifying the appropriate note appears on the Settings page.

**Acceptance Scenarios**:

1. **Given** an event in "created" state with 3 bottles registered and 10 rating slots, **When** the host views the stepper, **Then** a note reads "3 bottles registered, 10 slots available — you can still start, bottles can be registered later."
2. **Given** an event in "created" state with 5 bottles registered and 3 rating slots, **When** the host views the stepper, **Then** a warning note reads "5 bottles registered but only 3 slots available — adjust your item count in Items settings."
3. **Given** an event in "created" state with 0 bottles registered, **When** the host views the stepper, **Then** a note reads "No bottles registered yet — you can still start, bottles can be registered later."
4. **Given** an event in "created" state with 5 bottles registered and 5 rating slots, **When** the host views the stepper, **Then** no guardrail note appears (counts match).
5. **Given** an event in "started", "paused", or "completed" state with mismatched counts, **When** the host views the stepper, **Then** no guardrail note appears (guardrails only apply in the "created" state).
6. **Given** an event with item type "item" (not wine), **When** the guardrail note appears, **Then** it uses the correct terminology (e.g., "items" instead of "bottles").

---

### User Story 4 - State drawer and related help content are removed (Priority: P2)

The State row is removed from the settings list. The State side drawer (with its permissions matrix, collapsible "What each state means" section, and inline help text) is deleted. The stepper component replaces all of this functionality in a more user-friendly way.

**Why this priority**: Cleanup is essential to avoid confusing dual paths to the same functionality, but the stepper must be built first.

**Independent Test**: Can be tested by navigating the Settings page and confirming there is no "State" row in the settings list and no State drawer can be opened.

**Acceptance Scenarios**:

1. **Given** the Settings page is loaded, **When** the host looks at the settings rows, **Then** there is no "State" row in any section.
2. **Given** the Settings page is loaded, **When** the host interacts with the page, **Then** no State side drawer can be opened.
3. **Given** the "What each state means" collapsible section previously existed, **When** the host views the stepper area, **Then** no such collapsible section exists anywhere on the page.

---

### Edge Cases

- What happens when a state transition fails due to an optimistic locking conflict (another admin changed state simultaneously)? The event data should be refreshed and a toast should inform the host to try again.
- What happens if the event data is still loading when the Settings page opens? The stepper should show a loading/skeleton state rather than an empty or broken layout.
- What happens when the stepper is viewed on a very narrow mobile screen (< 320px)? The phase labels and connectors should remain legible without horizontal scrolling.
- What happens when the host uses the browser back button after a state transition? The stepper should reflect the current server-side state, not a cached previous state.
- What happens when the event type changes the item terminology? All stepper text (context lines, guardrail notes) should dynamically use the correct terminology.

## Clarifications

### Session 2026-03-13

- Q: Should backward/state-reversing transitions require a confirmation dialog? → A: Yes, confirmation dialog only for backward transitions (Completed→Started, Completed→Paused, Paused→Started).
- Q: Should the friendly labels (Setup, Tasting, Reveal, Results) replace original labels app-wide or only in the stepper? → A: App-wide — replace labels in StateBadge, StateIcon, Header, and everywhere the host sees state names.
- Q: Should the guardrail note appear in "completed" state or only in "created" state? → A: Created only — guardrail appears only in "created" state, keeping "completed" clean and conclusive.
- Q: Should the state icon/badge in the Header be kept, simplified, or removed? → A: Replace with a subtle colored dot (no label, no badge border) next to the event name. The stepper is the primary state indicator; the dot provides ambient awareness on other pages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a horizontal progress stepper on the Settings page showing four phases: Setup, Tasting, Reveal, Results — with the current phase visually distinguished from completed and upcoming phases.
- **FR-002**: System MUST display a plain-language context sentence below the stepper that describes the current phase and hints at the next step, using dynamic item terminology based on event type.
- **FR-003**: System MUST display contextual action buttons below the context line for all valid state transitions from the current state, using friendly labels: "Start Tasting", "Pause for Reveal", "Complete Event", "Resume Tasting", "Announce Results", "Reopen Tasting", "Back to Reveal".
- **FR-004**: When there are two valid transitions, the system MUST visually emphasize the primary/expected action over the secondary/less-common action (e.g., from Tasting: "Pause for Reveal" is primary, "Complete Event" is secondary).
- **FR-005**: System MUST show a confirmation dialog before executing backward transitions: Completed→Started ("Reopen Tasting"), Completed→Paused ("Back to Reveal"), and Paused→Started ("Resume Tasting"). Forward transitions (Created→Started, Started→Paused, Started→Completed, Paused→Completed) execute immediately on tap with no confirmation.
- **FR-006**: System MUST disable all action buttons and show a loading indicator during a state transition.
- **FR-007**: System MUST confirm successful state transitions via a toast notification and update the stepper to reflect the new state.
- **FR-008**: System MUST show transition errors via a toast notification and keep the stepper on the current state.
- **FR-009**: System MUST handle optimistic locking conflicts by refreshing event data and informing the host to try again.
- **FR-010**: System MUST display a concise guardrail note above the action buttons when the event is in "created" state and the registered item count does not match available rating slots.
- **FR-011**: System MUST NOT display the guardrail note when registered item count matches available slots, or when the event is in "started", "paused", or "completed" state.
- **FR-012**: System MUST remove the "State" settings row from the settings list.
- **FR-013**: System MUST remove the State side drawer and all its contents (permissions matrix, collapsible help section, inline help text).
- **FR-014**: System MUST remove the "What each state means" collapsible help section entirely.
- **FR-015**: The stepper MUST be positioned between the event name section and the first settings section ("Event Setup") on the Settings page.
- **FR-016**: The stepper MUST be responsive and render correctly on mobile screen widths down to 320px without horizontal scrolling.
- **FR-017**: User-facing state labels MUST use the friendly terminology (Setup, Tasting, Reveal, Results) across the entire application — including the stepper, StateBadge, Header, and any other component that displays event state to the host. Internal state values remain unchanged (created, started, paused, completed).
- **FR-018**: The Header MUST replace the current StateIcon badge with a small colored dot (no label, no border) next to the event name, using the state's theme color. The dot provides ambient state awareness without visual noise. The dot is visible only to admins.
- **FR-019**: The stepper MUST render a loading/skeleton placeholder while event data is being fetched, rather than showing an empty or broken layout. Once event data is available, the stepper MUST render immediately with the correct phase highlighted.

### Key Entities

- **Event Phase**: A user-facing representation of event state. Maps internal state names to friendly labels and contextual descriptions. Attributes: internal state name, display label, context sentence, valid transitions with friendly button labels.
- **Stepper Step**: A visual element in the progress indicator. Attributes: label, status (completed, active, upcoming), position in sequence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Host can advance the event from any state in 1 tap (down from 4 taps: Settings → scroll → State row → drawer → button).
- **SC-002**: Host can determine the current event phase within 2 seconds of opening the Settings page, without reading any help text.
- **SC-003**: All state transitions available in the previous State drawer remain accessible through the stepper action buttons with no loss of functionality.
- **SC-004**: Guardrail messages are no longer than one sentence (under 120 characters) while conveying the same key information as the previous multi-sentence messages.
- **SC-005**: The Settings page contains no references to the removed State drawer, "What each state means" section, or permissions matrix (Host can/cannot, Guest can/cannot).
- **SC-006**: All existing e2e state transition tests pass with updated locators targeting the stepper buttons.
- **SC-007**: The stepper renders correctly on screens as narrow as 320px without horizontal overflow.

### Assumptions

- The friendly state labels (Setup, Tasting, Reveal, Results) replace the original labels (Created, Started, Paused, Completed) across the entire application wherever event state is displayed to the host. Components affected include StateBadge, StateIcon, Header, and the Event page. Internal state values passed to the API remain unchanged.
- The `eventStateHelpContent.js` file is only used by the State drawer in `EventAdminPage.jsx` (confirmed — `AdminGuideDrawer` uses `adminGuideContent`, not `eventStateHelpContent`). It will be deleted along with its unit test.
- The `getValidTransitions` function logic is reused by the stepper component (either moved into it or kept as a shared utility), not duplicated.
- Toast notifications for state transitions will use the existing `sonner` toast library, consistent with the rest of the application.
