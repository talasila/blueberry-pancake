# Feature Specification: Event State Management Help Guide

**Feature Branch**: `021-event-state-help-guide`  
**Created**: 2026-03-02  
**Status**: Draft  
**Input**: User description: "In the event admin/settings area there is a section to manage the state of the event. The user can go here to switch the state of the event. There is no help information here to guide user about the lifecycle of an event, what each state represents in terms of what an admin or guest can do, etc. Provide a proper/detailed help guide. Note that this app is primarily for use on a mobile device."

## Clarifications

### Session 2026-03-02

- Q: How is the help presented when the user opens it (inline expandable vs overlay/drawer/modal)? → A: Inline expandable — help expands and collapses inside the state management section; no overlay.
- Q: When the event state changes while the help is open, should the help update in place or close? → A: Update in place — help content refreshes to show the new current state and transitions.
- Q: Is 320px the required minimum viewport width for the help, or something else? → A: Match app minimum — use whatever minimum width the rest of the app already supports; that value should be documented for acceptance testing.
- Q: When the event is still loading or failed to load, should the help entry point be visible, hidden, or disabled? → A: Visible — help entry point is always shown; help content is general (lifecycle + states). Current-state indicator shows "—" or "Loading…" until event is loaded.
- Q: Should the inline help have explicit accessibility requirements (e.g. focus management, screen reader announcement)? → A: Same as rest of app — no extra requirements; rely on existing patterns for the state management section.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand Event Lifecycle (Priority: P1)

An event administrator opens the event state management section in admin/settings and is unsure when to start, pause, or complete the event. They need a clear explanation of the event lifecycle: the order of states (e.g. created → started → paused or completed) and when each transition is appropriate, so they can make confident decisions without guessing.

**Why this priority**: Without understanding the lifecycle, admins may start too early, pause at the wrong time, or complete before guests have finished. Lifecycle clarity is the foundation for correct use of the state controls.

**Independent Test**: Can be fully tested by opening the state management section, accessing the help, and confirming that the lifecycle is explained in order with allowed transitions and typical use for each step.

**Acceptance Scenarios**:

1. **Given** an admin viewing the event state management section, **When** they open or view the help content, **Then** they see the event lifecycle described in a clear order (created → started → paused / completed, and optional reopening from completed).
2. **Given** an admin reading the lifecycle help, **When** they view each state, **Then** they see which transitions are possible from that state (e.g. from created only "Start"; from started "Pause" or "Complete").
3. **Given** an admin reading the help, **When** they view the lifecycle, **Then** they understand when it is appropriate to use each transition (e.g. pause for a break or item ID assignment; complete when tasting is finished).

---

### User Story 2 - Understand What Each State Means for Admin and Guest (Priority: P1)

An event administrator needs to know what they can do in each state (e.g. edit rating config only in created; assign item IDs only when paused) and what guests can do (e.g. rate only when started). They should get this from the same help in the state management section, so they do not have to hunt elsewhere or trial-and-error.

**Why this priority**: State-dependent capabilities (locked settings, guest abilities) are the main source of confusion. Explicit "admin can / guest can" guidance reduces mistakes and support questions.

**Independent Test**: Can be fully tested by opening the help and verifying that for each of the four states (created, started, paused, completed) the content states what the admin can and cannot do and what the guest can and cannot do.

**Acceptance Scenarios**:

1. **Given** an admin viewing the state help, **When** they read about the "created" state, **Then** they see that guests cannot provide feedback and that admin can configure event settings (and that some settings lock after starting).
2. **Given** an admin viewing the state help, **When** they read about the "started" state, **Then** they see that guests can provide feedback and ratings and that admin can pause or complete the event.
3. **Given** an admin viewing the state help, **When** they read about the "paused" state, **Then** they see that guests cannot provide feedback and that admin can assign item IDs and then resume or complete.
4. **Given** an admin viewing the state help, **When** they read about the "completed" state, **Then** they see that guests cannot provide feedback, results are available, and admin can view dashboard, export data, or reopen the event.

---

### User Story 3 - Access Help From the State Management Section (Priority: P2)

An event administrator in the admin/settings area finds the section where they manage event state (where they can start, pause, or complete). They see a clear, obvious way to open or expand the help (e.g. link, icon, or expandable panel) so they can read the lifecycle and state descriptions without leaving that section.

**Why this priority**: Help must be discoverable where the user is taking the action. If it is buried or on another page, adoption will be low.

**Independent Test**: Can be fully tested by navigating to the event admin/settings area, locating the event state management section, and confirming a dedicated help entry point exists and opens or reveals the help content.

**Acceptance Scenarios**:

1. **Given** an admin on the event admin/settings page, **When** they scroll to or open the event state management section, **Then** they see a visible, labeled way to open or view the help (e.g. "Learn about event states" or help icon).
2. **Given** an admin who has opened the help, **When** they dismiss or close it, **Then** they return to the same state management section without losing context.

---

### User Story 4 - Use Help Comfortably on a Mobile Device (Priority: P2)

The application is primarily used on mobile devices. An event administrator on a phone or small tablet can read the full help (lifecycle and state descriptions) without horizontal scrolling, with text and controls that are readable and tappable, and without needing to pinch-zoom to understand the content.

**Why this priority**: If the help is hard to read or use on mobile, the primary user base will not benefit.

**Independent Test**: Can be fully tested by opening the help on a device or viewport representative of the minimum supported mobile size and confirming all help content is readable and accessible (e.g. no overflow, adequate touch targets).

**Acceptance Scenarios**:

1. **Given** an admin on a mobile device (or narrow viewport), **When** they open the help, **Then** the full help content is visible and readable without horizontal scrolling.
2. **Given** an admin on a mobile device, **When** they interact with the help (e.g. expand sections or scroll), **Then** controls are large enough to tap reliably and content does not require zooming to read.
3. **Given** an admin on a mobile device, **When** they read the help, **Then** the amount of text per screen or section is appropriate for a small screen (e.g. concise blocks, optional progressive disclosure if content is long).

---

### User Story 5 - See Help in Context of Current State (Priority: P3)

An event administrator has the event in a specific state (e.g. "started"). When they open the help, they can quickly see which state they are in within the lifecycle and what they can do next, so they don't have to scan the entire guide every time.

**Why this priority**: Improves efficiency for returning users and reinforces the connection between the current state and the available actions.

**Independent Test**: Can be fully tested by setting the event to a given state, opening the help, and confirming the current state is indicated and the next possible transitions are clear.

**Acceptance Scenarios**:

1. **Given** the event is in a known state (e.g. started), **When** the admin opens the help, **Then** the current state is clearly indicated in the lifecycle or summary.
2. **Given** the admin is viewing the help while the event is in "started", **When** they look for what to do next, **Then** they can see that they can pause or complete the event without reading about created or paused first.

---

### Edge Cases

- What happens when the event state changes (e.g. by another admin) while the help is open? The help updates in place to show the new current state and available transitions; it does not close.
- What happens when the admin has a very small screen (at the app’s minimum supported width)? Help content must remain readable and usable; no critical information may be cut off or require horizontal scroll.
- What happens when the admin opens the help from the state section and then navigates away (e.g. scrolling to another section, closing the state drawer, or leaving the admin page)? The help should close or dismiss without leaving the app in a confusing state.
- What happens when the event is in an error or unknown state? Help should still be openable and should describe the four normal states; current state may be shown as "unknown" or equivalent with a suggestion to refresh.
- What happens when the event is still loading or failed to load? The help entry point remains visible; the admin can open the help and read the general lifecycle and state descriptions. The current-state indicator shows a neutral placeholder (e.g. "—" or "Loading…") until the event is available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The event state management section in event admin/settings MUST offer a dedicated way to open or view help content (e.g. link or button that expands/collapses the help) that is visible when the section is in view, including when the event is still loading or failed to load.
- **FR-001a**: The help content MUST be displayed inline within the state management section (expandable/collapsible panel); it MUST NOT be presented in an overlay, drawer, or modal.
- **FR-002**: The help content MUST explain the event lifecycle: the four states (created, started, paused, completed), the allowed transitions between them, and when each transition is typically used.
- **FR-003**: The help content MUST describe, for each of the four states, what the administrator can and cannot do (e.g. edit rating config only in created; assign item IDs only in paused; pause or complete only when started).
- **FR-004**: The help content MUST describe, for each of the four states, what the guest can and cannot do (e.g. cannot rate in created, paused, or completed; can rate only when event is started; results available when completed).
- **FR-005**: The help content MUST be written in plain language suitable for a non-technical event administrator.
- **FR-006**: The help MUST be fully readable and usable on mobile devices at the same minimum viewport width as the rest of the application (that minimum MUST be documented so the help can be acceptance-tested at that width); no horizontal scrolling required for the help content; touch targets and text size adequate for mobile use (per the application's design system or existing mobile UX standards).
- **FR-007**: When the help is open or expanded, the current event state MUST be indicated so the admin can relate the help to their current situation (e.g. "You are here: Started" in the lifecycle or a short summary of current state and available transitions). When the event is not yet loaded or has failed to load, the current-state indicator MUST show a neutral placeholder (e.g. "—" or "Loading…"); the rest of the help (lifecycle and state descriptions) remains available.
- **FR-008**: Dismissing or closing the help MUST return the user to the event state management section without navigating away or losing the current page context.
- **FR-009**: If the event state changes while the help is open (e.g. by another admin), the help MUST update in place to show the new current state and available transitions; it MUST NOT close automatically.

### Key Entities

- **Event state**: One of created, started, paused, or completed. Determines what admins and guests can do and which transitions are allowed.
- **Event state management section**: The area in event admin/settings where the administrator can change the event state (e.g. Start, Pause, Complete). This is where the new help is provided.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can open the help from the event state management section in one tap or click from the time they are viewing that section.
- **SC-002**: The help content covers all four event states with both admin and guest capabilities described for each state; this can be verified by a checklist walkthrough.
- **SC-003**: The full lifecycle (states and allowed transitions) is explained in the help and can be read in under 2 minutes on a mobile device.
- **SC-004**: At the application’s documented minimum viewport width, the help displays without horizontal scrolling and with readable text and tappable controls (validated via manual testing).
- **SC-005**: An admin who reads the help can correctly answer what they and guests can do in each state and when to use each transition (validated via a short manual quiz or walkthrough).
- **SC-006**: When the event is in a given state, the help clearly indicates the current state and the next available transitions (validated by checking at least two different states).

## Assumptions

- The event state model remains as today: four states (created, started, paused, completed) with the same allowed transitions (created→started; started→paused, started→completed; paused→started, paused→completed; completed→started, completed→paused). This feature adds help only; it does not change state semantics.
- The event state management section remains in the event admin/settings area; the help is scoped to that section and does not replace or duplicate the existing admin guide (feature 014) or hosting guide; it is contextual help for state management only.
- Help content is static (keyed by state and lifecycle); it does not require new backend endpoints or personalized content. Updates to wording or structure are done via content/code changes.
- The application’s primary use is on mobile devices; therefore the help is designed mobile-first. Desktop use is supported but not the primary design target.
- No analytics or tracking is required for this feature; success is validated through manual testing and checklist verification.
- Accessibility for the help (expand/collapse, keyboard, screen readers) follows the same standards as the rest of the state management section; no additional or explicit accessibility requirements are defined for the inline help beyond readability and usability on mobile.
