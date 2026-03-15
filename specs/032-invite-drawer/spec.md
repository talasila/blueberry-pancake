# Feature Specification: Unified Invite Drawer

**Feature Branch**: `032-invite-drawer`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "Consolidate Share & PIN into a Unified Invite Drawer"

## Clarifications

### Session 2026-03-13

- Q: Should the QR code encode only the event URL or include the PIN as a query parameter for auto-fill? → A: Event URL only — the guest must still provide their email on the join screen, so auto-filling the PIN does not eliminate manual input. Keeping the QR content as just the event URL is simpler and avoids re-rendering the QR when the PIN is regenerated.
- Q: Does regenerating the PIN revoke access for currently logged-in guests? → A: No. PIN regeneration only affects new logins. Guests who are already logged in retain access.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invite Drawer with QR Code and PIN (Priority: P1)

As an event host, I want a single "Invite" drawer that shows a scannable QR code and the event PIN together, so guests can join my event by scanning or typing — without me having to navigate to separate places for the link and PIN.

**Why this priority**: This is the core value proposition. A host needs one place to show or share the event access information. The QR code + PIN card is the hero element that makes the drawer immediately useful.

**Independent Test**: Can be tested by opening the Invite drawer and verifying the QR code renders, encodes the correct event URL, is large enough to scan, and the PIN is displayed prominently below it.

**Acceptance Scenarios**:

1. **Given** an admin is on the Settings page, **When** they tap the "Invite" row, **Then** a side drawer opens with the title "Invite" and description "How guests join your event."
2. **Given** the Invite drawer is open, **When** the host views the QR card, **Then** a large QR code (~200×200px) is displayed encoding the event URL, centered within a subtle rounded container.
3. **Given** the Invite drawer is open, **When** the host views the area below the QR code, **Then** the event PIN is displayed in large, spaced-out monospace text (e.g., "7  8  4  2") within the same card.
4. **Given** a guest points their phone camera at the QR code on the host's screen, **When** the camera detects the code, **Then** it resolves to the correct event URL and the guest can navigate to the event.

---

### User Story 2 - Copy and Share Invitation (Priority: P1)

As an event host, I want to copy a formatted invitation message or share it via my phone's share sheet, so I can quickly send event details through messaging apps, email, or social media.

**Why this priority**: Equally critical to US1 — digital sharing is the primary way hosts invite guests before the event. The formatted message removes friction (no assembling link + PIN manually).

**Independent Test**: Can be tested by clicking "Copy Invitation" and verifying the clipboard contains the correctly formatted message, and by clicking "Share" on a mobile device and verifying the OS share sheet opens.

**Acceptance Scenarios**:

1. **Given** the Invite drawer is open, **When** the host taps "Copy Invitation", **Then** the clipboard contains a formatted message including the event name, event URL, and PIN, and a toast confirms "Invitation copied."
2. **Given** the Invite drawer is open on a mobile device that supports `navigator.share()`, **When** the host taps "Share", **Then** the OS share sheet opens with the same formatted invitation text.
3. **Given** the Invite drawer is open on a desktop browser that does not support `navigator.share()`, **When** the drawer renders, **Then** the "Share" button is not visible and "Copy Invitation" spans the full width.
4. **Given** the Invite drawer is open, **When** the host views the action buttons, **Then** "Copy Invitation" and "Share" (if visible) appear side by side at equal width below the QR card.

---

### User Story 3 - Download QR Code as Image (Priority: P2)

As an event host, I want to download the QR code as a PNG image that includes the event name and PIN, so I can print it, email it, or display it at the venue.

**Why this priority**: Important but secondary to the core invite flow. Useful for physical events where the host wants a printable invitation card. Provides the "email invite" use case without requiring backend email infrastructure.

**Independent Test**: Can be tested by clicking "Download QR" and verifying a PNG file is downloaded containing the QR code, event name, and PIN.

**Acceptance Scenarios**:

1. **Given** the Invite drawer is open, **When** the host taps "Download QR", **Then** a PNG image file is downloaded to their device.
2. **Given** the downloaded PNG, **When** the host opens it, **Then** it contains the QR code, the event name, and the PIN as readable text below the QR.
3. **Given** the downloaded PNG, **When** a guest scans the QR code in the image, **Then** it resolves to the correct event URL.

---

### User Story 4 - Regenerate PIN (Priority: P2)

As an event host, I want the ability to regenerate the event PIN from within the Invite drawer, so I can revoke access if needed without leaving the invitation context.

**Why this priority**: Important for security but rarely used. Must be accessible but visually de-emphasized so it doesn't compete with the primary sharing actions.

**Independent Test**: Can be tested by clicking "Regenerate PIN" and verifying the PIN updates throughout the drawer (QR card, badge) and that the old PIN no longer grants access.

**Acceptance Scenarios**:

1. **Given** the Invite drawer is open, **When** the host scrolls to the bottom, **Then** a "Regenerate PIN" action is visible below a subtle divider, with explanatory text: "Creates a new PIN. Only affects new logins."
2. **Given** the host taps "Regenerate PIN", **When** the regeneration succeeds, **Then** the PIN displayed in the QR card and the SettingsRow badge both update to the new PIN, and a success message is shown.
3. **Given** the host taps "Regenerate PIN", **When** the regeneration is in progress, **Then** the button shows a loading state and is disabled.
4. **Given** the host taps "Regenerate PIN", **When** the regeneration fails, **Then** an error message is displayed and the old PIN remains unchanged.

---

### User Story 5 - Settings Page Cleanup (Priority: P1)

As an event host, I want a clean Settings page where sharing and PIN management are no longer split across multiple places, so the page feels simple and intentional.

**Why this priority**: Integral to the feature — without cleanup, the old UI elements would conflict with the new drawer, creating confusion.

**Independent Test**: Can be tested by verifying the Settings page no longer shows the floating Share button or the PIN SettingsRow, and the Invite row is the first row after the stepper.

**Acceptance Scenarios**:

1. **Given** the admin navigates to the Settings page, **When** the page renders, **Then** there is no floating "Share" button next to the event name.
2. **Given** the admin views the settings rows, **When** they look for PIN, **Then** no "PIN" row exists.
3. **Given** the admin views the settings rows, **When** they see the first row after the stepper card, **Then** it is "Invite" with a UserPlus icon and the PIN displayed as a badge.
4. **Given** the settings rows, **When** the admin views the full list, **Then** the order is: Invite, Mood, Bottles, Ratings, Guests, Administrators.

---

### User Story 6 - Test Coverage (Priority: P1)

As a developer, I want all unit and e2e tests updated to reflect the new Invite drawer and the removal of old Share/PIN UI, so the test suite remains green and trustworthy.

**Why this priority**: Tests must be updated alongside the feature to maintain CI/CD integrity. Stale tests referencing removed elements would fail the suite.

**Independent Test**: Can be verified by running the full unit and e2e test suites and confirming all tests pass.

**Acceptance Scenarios**:

1. **Given** the old PIN drawer and Share button are removed, **When** unit tests run, **Then** no test references the old "PIN" drawer, `handleCopyEventLink`, `linkCopied`, or floating Share button.
2. **Given** the new Invite drawer exists, **When** unit tests run, **Then** there are assertions verifying the Invite SettingsRow renders with the correct label, icon, and PIN badge.
3. **Given** the new Invite drawer exists, **When** e2e tests run, **Then** there is coverage for opening the drawer, verifying QR visibility, and the copy invitation flow.
4. **Given** all changes are complete, **When** the full test suite runs, **Then** all tests pass.

---

### Edge Cases

- What happens when the event has no PIN yet (newly created, before PIN generation)? The Invite row should still be visible but the badge and QR card PIN area should handle a missing PIN gracefully (e.g., show a placeholder or prompt).
- What happens when clipboard access is denied by the browser? The "Copy Invitation" button should show a toast error indicating the copy failed.
- What happens when `navigator.share()` is available but the share action is cancelled by the user? No error should be shown — cancellation is a normal user action.
- What happens on very small screens where the QR code might be too small to scan? The QR code should maintain its minimum size and the card should scroll if needed rather than shrinking the QR.
- What happens when the PIN is regenerated while the drawer is open? The QR card PIN display and the SettingsRow badge should both update reactively.
- What if the downloaded QR PNG is very large or the event name is very long? The event name in the PNG should be truncated if it exceeds a reasonable length to keep the image clean.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the floating "Share" button and the "PIN" SettingsRow with a single "Invite" SettingsRow.
- **FR-002**: The "Invite" SettingsRow MUST use a UserPlus icon and display the current PIN as a badge.
- **FR-003**: The "Invite" SettingsRow MUST be the first row in the settings list (after the stepper card).
- **FR-004**: Tapping the "Invite" row MUST open a side drawer titled "Invite" with description "How guests join your event."
- **FR-005**: The drawer MUST display a QR code at approximately 200×200px, encoding the full event URL, centered in a subtle rounded container.
- **FR-006**: The QR code MUST be large enough to be scannable directly from another phone's camera pointed at the host's screen.
- **FR-007**: Below the QR code, within the same container, the PIN MUST be displayed in large, spaced-out monospace text.
- **FR-008**: The drawer MUST include a "Copy Invitation" button that copies a formatted message (event name, URL, and PIN) to the clipboard and shows a toast confirmation.
- **FR-009**: The drawer MUST include a "Share" button that invokes `navigator.share()` with the formatted invitation text on supported devices.
- **FR-010**: The "Share" button MUST be hidden on devices/browsers where `navigator.share()` is not available.
- **FR-011**: When both buttons are visible, "Copy Invitation" and "Share" MUST appear side by side at equal width.
- **FR-012**: When the "Share" button is hidden, "Copy Invitation" MUST span the full width.
- **FR-013**: The drawer MUST include a "Download QR" button that exports a PNG image containing the QR code, event name, and PIN.
- **FR-014**: The drawer MUST include a "Regenerate PIN" action below a visual divider, with explanatory text clarifying it only affects new logins (currently logged-in guests retain access).
- **FR-015**: PIN regeneration MUST preserve existing behavior: loading state, error/success feedback, and reactive event state update.
- **FR-016**: The QR code MUST be generated entirely client-side with no backend changes.
- **FR-017**: All removed UI elements (floating Share button, PIN SettingsRow, PIN SideDrawer) and their associated dead code (state, handlers, imports) MUST be cleaned up.
- **FR-018**: All existing unit and e2e tests MUST be updated to remove references to deleted UI and add coverage for the new Invite drawer.

### Key Entities

- **Invite Drawer**: The unified side drawer consolidating QR code display, PIN display, invitation sharing (copy/share), QR download, and PIN regeneration.
- **QR Card**: The visual container within the drawer holding the QR code and PIN, serving as a self-contained scannable/readable invite.
- **Formatted Invitation**: The text message assembled from the event name, event URL, and PIN, used for clipboard copy and native share.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Host can open the Invite drawer and have a guest scan the QR code to join the event in under 10 seconds.
- **SC-002**: Host can copy a formatted invitation and paste it into a messaging app in under 5 seconds (2 taps: open drawer, copy invitation).
- **SC-003**: Host can download a printable QR image in under 3 taps (open drawer, download QR).
- **SC-004**: The Settings page has one fewer row (PIN removed) and no floating buttons, reducing visual clutter.
- **SC-005**: All sharing and access-management actions are accessible from a single drawer — zero navigation between separate features.
- **SC-006**: The full test suite (unit + e2e) passes with no regressions after the change.

## Assumptions

- The event always has a PIN assigned by the time the admin reaches the Settings page. If not, the Invite row still renders but the PIN badge shows a fallback.
- The host's device has sufficient screen resolution to display a ~200×200px QR code that is scannable by modern smartphone cameras.
- `qrcode.react` (or equivalent) is the client-side QR library — lightweight, no backend dependency.
- The formatted invitation message uses a fixed template; it is not customizable by the host.
- The "Download QR" PNG includes only the QR code, event name, and PIN — no additional branding or styling.
- The native Share API (`navigator.share()`) is used opportunistically; its absence does not degrade the core experience.
