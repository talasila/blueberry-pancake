# Feature Specification: Guest Item Registration Nudge

**Feature Branch**: `025-guest-registration-nudge`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "When a guest logs in to an event via PIN, they are shown a one-time welcome bottom sheet that orients them to the event and introduces item registration. Additionally, when the event is in 'created' state, the main event page supplements the 'Event has not started yet' message with an inline prompt encouraging guests to register items while they wait."

## Clarifications

### Session 2026-03-03

- Q: Should the inline registration prompt hide or adapt when the guest has already registered items? → A: Always show the prompt in "created" state regardless of whether the guest has registered items. The prompt serves as a general reminder that the feature exists, and guests can register multiple items.
- Q: Should the welcome bottom sheet show again on repeat PIN logins (e.g., after session expiry)? → A: Yes, show on every fresh PIN login. Each new PIN verification triggers the bottom sheet. No cross-session persistence is needed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Welcome Bottom Sheet Appears After Guest Login (Priority: P1)

A guest enters the event PIN and is navigated to the main event page. A welcome bottom sheet slides up from the bottom of the screen, greeting the guest by event name and introducing item registration. The bottom sheet communicates five key points:

1. **Registration is optional** — guests can participate fully by rating without registering anything.
2. **Why register** — registered items can be mapped to tasting numbers when the host pauses the event. When results are announced, registered items are revealed with their name, description, price, and who brought them. Without registration, a tasting number is just a number.
3. **Multiple items allowed** — there is no limit on how many items a single guest can register.
4. **One person per group** — if a party or couple is bringing a single item, only one person from that group needs to register it.
5. **Registration stays open** — items can be registered at any time while the event is in "created" or "started" state. Registration closes when the host pauses the event.

The bottom sheet provides a primary action ("Register My [Item]") that navigates to the profile page where items are registered, and a dismiss action ("Skip for now") that closes the sheet. The "[Item]" label adapts to the event's item terminology (e.g., "Bottle" for wine events, "Item" for generic events).

The bottom sheet appears only once — on the first navigation after PIN verification — and does not reappear on page refresh or subsequent visits.

**Why this priority**: Item registration is a core feature that goes completely undiscovered by guests today. The main event page has no mention of it, and it is only accessible through the hamburger menu → Profile. Guests who don't register items create a gap at reveal time — tasting numbers without names, owners, or details. The welcome bottom sheet is the first-impression moment and the highest-leverage point to close this awareness gap.

**Independent Test**: Can be fully tested by logging in as a guest via PIN, verifying the welcome bottom sheet appears with all five content points, tapping "Register My [Item]" to verify navigation to the profile page, re-logging in to verify the sheet does not reappear, and testing the dismiss action.

**Acceptance Scenarios**:

1. **Given** a guest has just verified their PIN and the event is in "created" or "started" state, **When** they are navigated to the event page for the first time, **Then** a welcome bottom sheet slides up from the bottom of the screen over the dimmed event page.
2. **Given** the welcome bottom sheet is displayed, **When** the guest reads the content, **Then** they see the event name and a message that registration is optional — they can rate without registering anything.
3. **Given** the welcome bottom sheet is displayed, **When** the guest reads the content, **Then** they see an explanation of why registering is worthwhile: registered items are revealed with their name, description, price, and who brought them when results are announced.
4. **Given** the welcome bottom sheet is displayed, **When** the guest reads the content, **Then** they see that they can register more than one item.
5. **Given** the welcome bottom sheet is displayed, **When** the guest reads the content, **Then** they see that if a group brought one item, only one person needs to register it.
6. **Given** the welcome bottom sheet is displayed, **When** the guest reads the content, **Then** they see that registration is available at any time until the host pauses the event.
7. **Given** the welcome bottom sheet is displayed, **When** the guest taps the "Register My [Item]" button, **Then** the bottom sheet is dismissed and the guest is navigated to the profile page (item registration section).
8. **Given** the welcome bottom sheet is displayed, **When** the guest taps "Skip for now," **Then** the bottom sheet is dismissed and the event page is fully interactive.
9. **Given** a guest has previously dismissed the welcome bottom sheet (via skip, register, overlay tap, or browser back), **When** they refresh the page or navigate back to the event page within the same session, **Then** the welcome bottom sheet does not reappear.
10. **Given** a guest's session has expired and the event is in "created" or "started" state, **When** the guest re-enters the PIN and is navigated to the event page, **Then** the welcome bottom sheet appears again (each fresh PIN login triggers it).
11. **Given** the event is in "paused" or "completed" state, **When** a guest logs in via PIN, **Then** the welcome bottom sheet does not appear (registration is closed, so nudging is not relevant).
12. **Given** the "Register My [Item]" button label, **When** the event's item type is "wine," **Then** the label reads "Register My Bottle" (consistent with existing app terminology); **When** the item type is generic, **Then** the label reads "Register My Item."

---

### User Story 2 — Pre-Start Inline Registration Prompt (Priority: P1)

When the event is in "created" state (not yet started), the main event page supplements the existing "Event has not started yet" message with an inline prompt encouraging guests to register items while they wait. The prompt includes a brief message and a button to navigate to the profile page for item registration.

This provides a persistent, contextual nudge for guests who dismissed the welcome bottom sheet, or who return to the event page before the event has started. The prompt is visible on every visit while the event remains in "created" state — it is not a one-time element.

**Why this priority**: The "created" state is dead time for guests — the numbered item buttons are visible but not actionable for rating. This is the highest-intent moment to direct guests toward registration because they literally have nothing else to do. It also serves as a safety net for guests who dismissed the welcome bottom sheet without acting on it.

**Independent Test**: Can be fully tested by navigating to the event page as a guest when the event is in "created" state, verifying the inline prompt appears below the "Event has not started yet" text, tapping the registration button to verify navigation, and then verifying the prompt disappears when the event transitions to "started" state.

**Acceptance Scenarios**:

1. **Given** a guest is on the event page and the event is in "created" state, **When** they view the page, **Then** they see an inline prompt below "Event has not started yet" encouraging them to register items while they wait, with a button to navigate to the profile page.
2. **Given** a guest is on the event page and the event transitions from "created" to "started," **When** the page updates, **Then** the inline registration prompt is no longer shown and the page displays "Tap a number to rate" instead.
3. **Given** a guest is on the event page and the event is in "started" state, **When** they view the page, **Then** no inline registration prompt is shown.
4. **Given** a guest is on the event page and the event is in "paused" or "completed" state, **When** they view the page, **Then** no inline registration prompt is shown (registration is closed).
5. **Given** the inline prompt is displayed, **When** the guest taps the registration button, **Then** they are navigated to the profile page (item registration section).
6. **Given** the inline prompt button label, **When** the event's item type is "wine," **Then** the label adapts accordingly (e.g., "Register My Bottle"); **When** the item type is generic, **Then** the label reads "Register My Item."

---

### User Story 3 — Admin Exclusion (Priority: P1)

Administrators viewing the event page are not shown the guest welcome bottom sheet or the pre-start inline registration prompt. Admins have their own onboarding flow (the post-creation welcome bottom sheet and admin guide) on the admin page.

**Why this priority**: Showing guest-facing nudges to admins would be confusing and redundant, since admins manage item registration through the admin items section. This must be enforced from the start to avoid a broken admin experience.

**Independent Test**: Can be tested by logging in as an admin, navigating to the event page, and verifying that neither the welcome bottom sheet nor the pre-start inline prompt appears in any event state.

**Acceptance Scenarios**:

1. **Given** an admin is on the event page and the event is in "created" state, **When** the page loads, **Then** neither the welcome bottom sheet nor the pre-start registration prompt is shown.
2. **Given** an admin is on the event page and the event is in "started" state, **When** the page loads, **Then** the welcome bottom sheet is not shown.
3. **Given** a user who is both an admin and a guest for the same event navigates to the event page, **When** the page loads, **Then** the guest nudges are suppressed because the user has admin privileges.

---

### Edge Cases

- What happens if the guest presses the browser back button while the bottom sheet is open? The bottom sheet should be dismissed without navigating away from the event page (consistent with the existing admin welcome bottom sheet pattern).
- What happens if the guest taps outside the bottom sheet (on the dimmed overlay)? The bottom sheet should be dismissed, same as tapping "Skip for now."
- What happens if the event data hasn't loaded when the bottom sheet would render? The bottom sheet should defer rendering until event data is available, so it can display the event name and use the correct item terminology.
- What happens if a guest logs in and sees the bottom sheet, then the event transitions to "paused" before they act on the registration prompt? The pre-start CTA disappears because the event is no longer in "created" state. If the guest navigates to the profile page, the registration form is disabled with the existing state-based message. No special handling is needed — existing state guards cover this.
- What happens if the guest dismisses the bottom sheet and later the event returns to "created" state (e.g., from "completed" back to a new cycle)? The bottom sheet does not reappear (it is tied to the initial PIN login navigation). However, the pre-start inline prompt appears as usual whenever the event is in "created" state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a welcome bottom sheet to non-admin guests on the event page when they arrive via PIN verification and the event is in "created" or "started" state.
- **FR-002**: System MUST NOT display the welcome bottom sheet when the event is in "paused" or "completed" state.
- **FR-003**: System MUST NOT display the welcome bottom sheet to users with admin privileges for the event.
- **FR-004**: The welcome bottom sheet MUST display the event name.
- **FR-005**: The welcome bottom sheet MUST communicate that item registration is optional and that guests can participate fully by rating alone.
- **FR-006**: The welcome bottom sheet MUST explain the advantage of registering: registered items are revealed with their name, description, price, and who brought them when results are announced.
- **FR-007**: The welcome bottom sheet MUST state that guests can register more than one item.
- **FR-008**: The welcome bottom sheet MUST state that if a group brought one item, only one person needs to register it.
- **FR-009**: The welcome bottom sheet MUST state that registration is available at any time until the host pauses the event.
- **FR-010**: The welcome bottom sheet MUST include a primary action button ("Register My [Item]") that dismisses the sheet and navigates the guest to the profile page for item registration.
- **FR-011**: The welcome bottom sheet MUST include a dismiss action ("Skip for now") that closes the sheet without navigation.
- **FR-012**: The welcome bottom sheet MUST adapt its item terminology (e.g., "Wine" vs. "Item") based on the event's configured item type.
- **FR-013**: The welcome bottom sheet MUST appear once per PIN login — on the first navigation after PIN verification. It MUST NOT reappear on page refresh or subsequent in-session visits to the event page. If the guest's session expires and they re-enter the PIN (a new login), the bottom sheet MUST appear again. No cross-session persistence is required.
- **FR-014**: The welcome bottom sheet MUST be dismissible by tapping outside the sheet (on the dimmed overlay) or pressing the browser back button, in addition to the explicit dismiss and register actions.
- **FR-015**: The welcome bottom sheet MUST slide up from the bottom of the screen with a dimmed backdrop, consistent with the existing bottom sheet pattern used elsewhere in the application.
- **FR-016**: The welcome bottom sheet MUST defer rendering until event data (name, item type, state) is available.
- **FR-017**: System MUST display an inline registration prompt on the event page when the event is in "created" state and the user is a non-admin guest.
- **FR-018**: The inline registration prompt MUST appear below the existing "Event has not started yet" message.
- **FR-019**: The inline registration prompt MUST include a message encouraging item registration while waiting and a button to navigate to the profile page.
- **FR-020**: The inline registration prompt MUST adapt its item terminology based on the event's configured item type.
- **FR-021**: The inline registration prompt MUST NOT appear when the event is in "started," "paused," or "completed" state.
- **FR-022**: The inline registration prompt MUST NOT appear for users with admin privileges.
- **FR-023**: The inline registration prompt MUST be persistent — it appears on every visit while the event is in "created" state, not just once.
- **FR-024**: The inline registration prompt MUST be shown regardless of whether the guest has already registered items. The prompt is not conditional on the guest's registration history.

### Key Entities

- **Guest Welcome Bottom Sheet**: A transient overlay component displayed once after guest PIN verification. Contains event name, five informational points about item registration, a primary registration action, and a dismiss action. Appearance is controlled by navigation state passed from PIN verification — not persisted. Adapts terminology based on event item type.

- **Pre-Start Inline Prompt**: A persistent informational element shown on the event page when the event is in "created" state. Contains a brief message and a navigation action to the profile page. Visibility is controlled by event state and user role — no persistence needed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After PIN verification with the event in "created" or "started" state, 100% of non-admin guests see the welcome bottom sheet as their first interaction on the event page (zero false negatives).
- **SC-002**: The welcome bottom sheet never appears for admin users, for repeat visits, or when the event is in "paused" or "completed" state (zero false positives).
- **SC-003**: Guests can navigate from the welcome bottom sheet to the item registration page in a single tap.
- **SC-004**: When the event is in "created" state, 100% of non-admin guests see the inline registration prompt on the event page.
- **SC-005**: The inline registration prompt disappears immediately when the event transitions out of "created" state, with no stale content shown.
- **SC-006**: All item terminology in both the bottom sheet and inline prompt correctly reflects the event's configured item type (e.g., "Wine" for wine events).

## Assumptions

- The PIN verification flow already navigates the guest to the event page, and navigation state can be passed along to trigger the one-time bottom sheet display. No additional persistence mechanism is needed.
- The event page already displays the "Event has not started yet" message in "created" state, providing a natural insertion point for the inline prompt.
- The event's item type and name are available from the event context by the time the event page renders, since the event context provider already fetches this data.
- The existing bottom sheet animation and overlay pattern (used by the admin welcome bottom sheet) can be reused or adapted for the guest version.
- Item registration on the profile page already handles state-based access control (blocking registration in "paused" and "completed" states), so no additional guards are needed when the guest navigates there from the bottom sheet or inline prompt.
- The admin role check is already available on the event page (via the event context), so suppressing guest nudges for admins requires no additional data fetching.
