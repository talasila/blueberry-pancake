# Feature Specification: Post-Creation Welcome Bottom Sheet

**Feature Branch**: `020-post-creation-welcome-modal`  
**Created**: 2026-02-27  
**Status**: Draft  
**Input**: User description: "Introduce a post-creation welcome bottom sheet on the admin page to orient new users after event creation, replacing the transient toast with a two-track layout that surfaces pre-configured defaults and provides clear next steps."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Bottom Sheet Appears After Event Creation (Priority: P1)

A user creates a new event and is redirected to the admin page. Instead of seeing only a brief toast, a welcome bottom sheet slides up from the bottom of the screen over the dimmed admin page. The bottom sheet orients the user by confirming the event is ready, displaying the event PIN with a copy action, summarizing what's already configured, and offering clear next steps. The user taps "Got it" to dismiss the bottom sheet and proceed to the admin page.

**Why this priority**: This is the core experience — without the bottom sheet appearing at the right moment with the right content, the feature has no value. It directly addresses the disorienting first impression that is the primary problem.

**Independent Test**: Can be fully tested by creating a new event and verifying the bottom sheet appears with the correct content, PIN, default summary, and dismiss behavior.

**Acceptance Scenarios**:

1. **Given** a user has just created a new event, **When** they are redirected to the admin page, **Then** a welcome bottom sheet slides up from the bottom of the screen, overlaying the dimmed admin page.
2. **Given** the welcome bottom sheet is displayed, **When** the user reads the content, **Then** they see a title ("Your event is ready!"), a reassuring subtitle, the event's actual PIN with a copy button, a note about the Start button location, and a summary of pre-configured defaults (number of items, rating scale, tasting note suggestions).
3. **Given** the welcome bottom sheet is displayed, **When** the user taps the "Got it" button, **Then** the bottom sheet is dismissed and the admin page is fully interactive.
4. **Given** the welcome bottom sheet is displayed, **When** the user taps the copy button next to the PIN, **Then** the PIN is copied to the clipboard and a brief confirmation is shown.
5. **Given** a user navigates to an existing event's admin page (not immediately after creation), **When** the page loads, **Then** no welcome bottom sheet appears.

---

### User Story 2 — Customize Defaults via Bottom Sheet (Priority: P2)

A user creates a new event and sees the welcome bottom sheet. They notice the "Customize first" section showing current defaults with inline badges (e.g., "20 wines", "Scale 1–4", "Just you"). They tap one of the customization rows to adjust a setting. The bottom sheet is dismissed and the corresponding drawer opens on the admin page.

**Why this priority**: This provides the bridge between orientation and action — users who want to customize before starting can jump directly to the relevant setting without hunting through the admin page. It depends on the bottom sheet (P1) existing first.

**Independent Test**: Can be tested by creating a new event, seeing the bottom sheet, tapping each customization row, and verifying the correct drawer opens with the bottom sheet dismissed.

**Acceptance Scenarios**:

1. **Given** the welcome bottom sheet is displayed, **When** the user views the "Customize first" section, **Then** they see three tappable rows: adjust the number of items (showing current count badge), change the rating scale (showing current scale badge), and add a co-host (showing "Just you" badge).
2. **Given** the welcome bottom sheet is displayed, **When** the user taps the "adjust number of items" row, **Then** the bottom sheet is dismissed and the Items drawer opens on the admin page.
3. **Given** the welcome bottom sheet is displayed, **When** the user taps the "change the rating scale" row, **Then** the bottom sheet is dismissed and the Ratings drawer opens on the admin page.
4. **Given** the welcome bottom sheet is displayed, **When** the user taps the "add a co-host" row, **Then** the bottom sheet is dismissed and the Administrators drawer opens on the admin page.
5. **Given** the welcome bottom sheet is displayed, **When** the user views the inline badges, **Then** the badges reflect the actual current default values for the newly created event (not hardcoded placeholder text).

---

### User Story 3 — Access Setup Guide from Bottom Sheet (Priority: P3)

A user creates a new event and sees the welcome bottom sheet. They want a more comprehensive walkthrough before proceeding. They tap the "Show me the setup guide" link in the bottom sheet footer. The bottom sheet is dismissed and the existing Admin Guide drawer opens, showing the state-aware setup steps for a newly created event.

**Why this priority**: This bridges the bottom sheet to the existing guide system, providing a deeper onboarding path for users who want it. It's lower priority because the bottom sheet itself provides sufficient orientation for most users.

**Independent Test**: Can be tested by creating a new event, seeing the bottom sheet, tapping the setup guide link, and verifying the Admin Guide drawer opens with the correct "created" state content.

**Acceptance Scenarios**:

1. **Given** the welcome bottom sheet is displayed, **When** the user taps the "Show me the setup guide" link, **Then** the bottom sheet is dismissed and the Admin Guide drawer opens.
2. **Given** the Admin Guide drawer has opened from the bottom sheet, **When** the user views the guide content, **Then** they see the setup steps for the "created" event state (the existing 7-step guide).

---

### User Story 4 — Toast Notification Removal (Priority: P1)

The existing transient toast notification ("Event created! Share the PIN with participants to get started") that appears after event creation is removed, since the welcome bottom sheet supersedes it entirely.

**Why this priority**: If both the toast and bottom sheet appear simultaneously, the experience is cluttered and redundant. Removing the toast is a prerequisite for a clean bottom sheet experience.

**Independent Test**: Can be tested by creating a new event and verifying that no toast notification appears — only the welcome bottom sheet.

**Acceptance Scenarios**:

1. **Given** a user has just created a new event, **When** they are redirected to the admin page, **Then** no toast notification appears.
2. **Given** the welcome bottom sheet is displayed, **Then** it is the sole onboarding element — no duplicate messaging is shown.

---

### Edge Cases

- What happens if the user presses the browser back button while the bottom sheet is open? The bottom sheet should be dismissed (not navigate away from the admin page).
- What happens if the user taps outside the bottom sheet (on the dimmed overlay above it)? The bottom sheet should be dismissed, same as tapping "Got it."
- What happens if the event data hasn't fully loaded when the bottom sheet renders (slow network)? The bottom sheet should wait for event data (PIN, item count, rating scale) before displaying, or show a brief loading state rather than empty or placeholder values.
- What happens if the user refreshes the admin page immediately after creation? The bottom sheet should not reappear, since the location state is cleared on navigation.
- What happens if a co-administrator navigates to the admin page for the first time? The bottom sheet should not appear — it is only triggered by the event creation redirect, not by first-visit detection.

## Clarifications

### Session 2026-02-27

- Q: Should the modal include keyboard focus trapping, Escape key dismissal, and screen reader announcements? → A: Minimal — no keyboard or screen reader enhancements beyond what the dismiss button provides, since this is primarily a mobile-only experience.
- Q: Should the welcome overlay be a centered modal or a bottom sheet on mobile? → A: Bottom sheet — slides up from the bottom of the screen with a dimmed backdrop, more natural for mobile thumb interaction.
- Q: Should the post-creation redirect go to the admin page or the rating page? → A: Admin page — the rating page shows "Event has not started yet" in `created` state, making it a dead end. The admin page is where all setup actions (configure, share PIN, start event) live.
- Q: Should the bottom sheet help the admin navigate to the rating page? → A: Out of scope — the rating page is empty in `created` state. The admin's next steps are all on the admin page. Existing header navigation (logo tap, "Back to Event" menu item) covers navigation to the rating page after the event is started.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a welcome bottom sheet on the admin page when the user arrives via the event creation redirect (i.e., `location.state.eventCreated` is true).
- **FR-002**: System MUST NOT display the welcome bottom sheet on any subsequent visit to the admin page, or when a user arrives by any means other than the creation redirect.
- **FR-003**: The bottom sheet MUST display a title ("Your event is ready!") and a subtitle communicating that defaults are pre-configured and the event can be started immediately or customized first.
- **FR-004**: The bottom sheet MUST display the event's actual PIN with a functional copy-to-clipboard button, and show a brief confirmation when the PIN is copied.
- **FR-005**: The bottom sheet MUST display a summary of the event's pre-configured defaults: the number of active items, the rating scale range, and the tasting note suggestions status.
- **FR-006**: The bottom sheet MUST include a "Customize first" section with three tappable rows linking to the Items drawer, the Ratings drawer, and the Administrators drawer respectively.
- **FR-007**: Each customization row MUST display the current default value as an inline badge (e.g., the actual item count, the actual rating scale range, and the current administrator count or "Just you").
- **FR-008**: Tapping a customization row MUST dismiss the bottom sheet and open the corresponding drawer on the admin page.
- **FR-009**: The bottom sheet MUST include a primary dismiss button ("Got it") that closes the bottom sheet without additional side effects.
- **FR-010**: The bottom sheet MUST include a secondary "Show me the setup guide" action that dismisses the bottom sheet and opens the existing Admin Guide drawer.
- **FR-011**: The bottom sheet MUST be dismissible by tapping outside the bottom sheet (on the dimmed overlay above it) or pressing the browser back button, in addition to the explicit dismiss actions. No keyboard focus trapping, Escape key handling, or screen reader announcements are required — this is a mobile-primary experience.
- **FR-012**: The existing toast notification ("Event created! Share the PIN with participants to get started") MUST be removed.
- **FR-013**: The bottom sheet MUST slide up from the bottom of the screen with a dimmed backdrop above it, leaving the top of the admin page partially visible behind the overlay.
- **FR-014**: The bottom sheet MUST NOT include references to Export Data, Danger Zone, or State management, as these are irrelevant at event creation time.
- **FR-015**: The bottom sheet content (PIN, item count, rating scale) MUST reflect actual event data, not hardcoded placeholder values. If data is still loading, the bottom sheet MUST defer rendering or display a loading indicator rather than showing empty or incorrect values.

### Key Entities

- **Welcome Bottom Sheet**: A transient overlay component that slides up from the bottom of the screen, displayed once after event creation. Contains event PIN, default configuration summary, customization shortcuts, and dismiss/guide actions. Not persisted — appearance is controlled solely by the presence of the `eventCreated` flag in navigation state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After event creation, 100% of users see the welcome bottom sheet as their first interaction on the admin page (no users see only a toast).
- **SC-002**: Users can copy the event PIN directly from the bottom sheet within 2 seconds of it appearing, without navigating to a separate section.
- **SC-003**: Users who dismiss the bottom sheet can identify and begin their next action (start the event, customize a setting, or share the PIN) within 10 seconds — demonstrating effective orientation.
- **SC-004**: The welcome bottom sheet never appears on non-creation visits to the admin page (zero false triggers).
- **SC-005**: Users can reach any of the three customization drawers (Items, Ratings, Administrators) in a single tap from the bottom sheet.

## Assumptions

- The existing `location.state.eventCreated` flag passed during the post-creation redirect is a reliable and sufficient trigger for showing the bottom sheet. No additional persistence or first-visit tracking is needed.
- The event data (PIN, item configuration, rating configuration) is available by the time the admin page renders, since it is already fetched as part of the admin page's existing data loading. If there is a brief loading period, the bottom sheet can defer to the same loading state the admin page already uses.
- The existing Admin Guide drawer can be programmatically opened from the bottom sheet component without architectural changes.
- The existing side drawers (Items, Ratings, Administrators) can be programmatically opened by setting the appropriate drawer state, as the admin page already supports this pattern.
- Default values at event creation time are: 20 items (none excluded), 1–4 rating scale, tasting note suggestions enabled (for wine events), and one administrator (the creator). If these defaults change in the future, the bottom sheet will automatically reflect the new values because it reads from actual event data (FR-015), not hardcoded text.
