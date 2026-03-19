# Feature Specification: Themed Event Entry Pages

**Feature Branch**: `036-themed-entry-pages`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Themed event entry pages with public event info and improved auth copy"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Event-Branded Email Entry Page (Priority: P1)

A guest receives a link to a tasting event and taps it. Instead of a generic "Access Event" form, they see the event's name (e.g., "Join Sarah's Wine Night"), a contextual description based on what's being tasted (e.g., "Enter your details to join the wine tasting"), and the event host's chosen color theme applied to the page. The page immediately feels like an invitation to a specific event, not a generic login form.

**Why this priority**: The email entry page is the very first screen every guest and admin sees. A branded, welcoming first impression sets the tone for the entire experience and signals that this is a curated event, not a generic app.

**Independent Test**: Can be fully tested by navigating to an event's email entry URL and verifying the event name, contextual description, and theme colors are displayed correctly.

**Acceptance Scenarios**:

1. **Given** a guest navigating to an event's entry page, **When** the page loads, **Then** the page title displays the event name (e.g., "Join Sarah's Wine Night") instead of the generic "Access Event".
2. **Given** an event configured with the "cellar" theme, **When** a guest loads the entry page, **Then** the page's accent colors, button colors, and card styling reflect the cellar theme palette.
3. **Given** an event with typeOfItem set to "wine", **When** a guest loads the entry page, **Then** the description reads "Enter your details to join the wine tasting" (incorporating the item type).
4. **Given** a guest navigating to a non-existent event ID, **When** the page loads, **Then** a friendly "Event not found" message is displayed instead of the entry form.
5. **Given** an event in the "completed" state, **When** a guest loads the entry page, **Then** a message indicates the event has ended, while still allowing access (guests may want to view results).

---

### User Story 2 - Themed PIN and OTP Entry Pages (Priority: P1)

After submitting their name and email, the guest proceeds to the PIN entry page (or OTP entry page for admins). These pages carry forward the same event theme and event name, creating a consistent branded experience across the entire entry flow — from first page load through to the event itself.

**Why this priority**: A themed email entry page that drops into a generic PIN page breaks the immersion. The entire entry flow must feel cohesive.

**Independent Test**: Can be fully tested by completing the email entry step and verifying the PIN/OTP page displays the same event name and theme colors.

**Acceptance Scenarios**:

1. **Given** a guest who submitted the email form for a "cellar"-themed event, **When** the PIN entry page loads, **Then** the page displays the event name and applies the same cellar theme colors.
2. **Given** an admin who submitted the email form, **When** the OTP entry page loads, **Then** the page displays the event name and applies the event's theme colors.
3. **Given** a guest who navigates directly to the PIN page (without going through email entry first), **When** the page loads, **Then** the event info is still fetched and the theme is applied (not dependent on the previous page passing data).

---

### User Story 3 - Friendly Auth Page Copy (Priority: P2)

An admin navigating to the sign-in page (`/auth`) sees warm, jargon-free copy. The title says "Welcome back" instead of "Sign In". The email field has a visible label. Buttons read "Send verification code" and "Sign in" instead of "Request OTP" and "Verify OTP". The description reads "We'll send a verification code to your email" instead of "Enter your email address to receive an OTP code".

**Why this priority**: The auth page is seen by every admin on every session. Removing jargon makes it accessible to non-technical users. This is a UX polish item that can be delivered independently of the theming work.

**Independent Test**: Can be fully tested by navigating to `/auth` and verifying all copy matches the updated wording.

**Acceptance Scenarios**:

1. **Given** an unauthenticated admin navigating to `/auth`, **When** the page loads, **Then** the title reads "Welcome back" and the description reads "We'll send a verification code to your email".
2. **Given** an admin on the auth page, **When** viewing the email step, **Then** a visible label "Email Address" appears above the email input (not screen-reader only).
3. **Given** an admin on the email step, **When** viewing the submit button, **Then** it reads "Send verification code" (not "Request OTP").
4. **Given** an admin on the OTP verification step, **When** viewing the submit button, **Then** it reads "Sign in" (not "Verify OTP").
5. **Given** an admin on the verification step, **When** viewing the description, **Then** it reads "Enter the verification code sent to your email" (not "Enter the 6-digit OTP code sent to your email").

---

### Edge Cases

- What happens when the public event info request is slow or fails? The entry page renders immediately with a graceful fallback (generic title, no theme) and applies the theme once data arrives, without blocking the form.
- What happens when the event has the default "classic" theme? The page renders with the standard app styling — no visual difference from today, which is correct since "classic" is the base theme.
- What happens when the browser has dark mode enabled? The themed entry pages respect dark mode, using the dark palette variant of the event's theme (same as the existing theme system behavior).
- What happens when a guest bookmarks the PIN page URL directly and returns later? The PIN page fetches event info independently on load, so the theme and name display correctly regardless of how the user arrived.
- What happens when the event name is very long? The name is truncated or wrapped gracefully within the card header, consistent with how long names are handled elsewhere in the app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a way to retrieve basic event information (name, type of item, theme, state) for a given event ID without requiring authentication.
- **FR-002**: The public event info MUST only expose the event name, type of item, theme identifier, and event state. It MUST NOT expose participant data, PINs, administrator emails, ratings, or any other sensitive information.
- **FR-003**: The email entry page MUST display the event name in the page title area (e.g., "Join [Event Name]") when event info is available.
- **FR-004**: The email entry page MUST apply the event's theme colors (accent, surface, header background) when event info is available, using the existing theme preset system.
- **FR-005**: The email entry page MUST display a contextual description incorporating the type of item (e.g., "Enter your details to join the wine tasting") when event info is available.
- **FR-006**: The PIN entry page and OTP entry page MUST also display the event name and apply the event's theme colors, creating a consistent branded flow across all entry pages.
- **FR-007**: If the event info cannot be loaded (network error, slow response), the entry pages MUST still render immediately with the generic fallback copy and default styling, then apply the theme when data arrives. The form MUST NOT be blocked by the info request.
- **FR-008**: If the event ID does not correspond to a valid event, the entry page MUST display a friendly "Event not found" message.
- **FR-009**: If the event is in a "completed" state, the entry page MUST display a message indicating the event has ended, while still allowing the user to proceed (to view results).
- **FR-010**: The auth page (`/auth`) MUST NOT be themed — it is not event-scoped and uses the default app styling.
- **FR-011**: The auth page title MUST read "Welcome back" (replacing "Sign In").
- **FR-012**: The auth page email input MUST have a visible label ("Email Address") instead of a screen-reader-only label.
- **FR-013**: The auth page submit button MUST read "Send verification code" on the email step (replacing "Request OTP") and "Sign in" on the verification step (replacing "Verify OTP").
- **FR-014**: The auth page descriptions MUST read "We'll send a verification code to your email" on the email step and "Enter the verification code sent to your email" on the verification step.
- **FR-015**: The public event info endpoint MUST be rate-limited to prevent abuse (consistent with existing public endpoint protections).
- **FR-016**: The themed entry pages MUST support dark mode, using the dark palette variant of the event's theme.

### Key Entities

- **Public Event Info**: A minimal, read-only projection of an event containing only the name, type of item, theme identifier, and state. This is the only data exposed without authentication. It is not a new entity — it is a restricted view of the existing event record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of event entry pages display the event name and theme colors within 2 seconds of page load (assuming normal network conditions).
- **SC-002**: Guests can identify which event they are joining from the entry page alone, without needing to check the URL or ask the host.
- **SC-003**: The visual theme is consistent across all three entry pages (email, PIN, OTP) for the same event — no style breaks between steps.
- **SC-004**: The auth page contains zero instances of the term "OTP" in user-visible text.
- **SC-005**: Entry pages for non-existent events display a clear "not found" message instead of an empty or broken form.

## Assumptions

- The event name set by the host is suitable for public display. Since the host chose the name, displaying it to guests on the entry page is expected behavior.
- Exposing the event name, type of item, theme, and state to anyone with the event ID is acceptable. The event ID is already shared openly via links and QR codes, and no participant data is exposed.
- The existing theme preset system (10 presets with light/dark palettes) is sufficient for entry page theming. No new presets or custom theme capabilities are needed.
- Standard per-IP rate limiting on the public info endpoint is sufficient protection against abuse. No additional authentication or Turnstile verification is required for this read-only endpoint.
- The "classic" theme is the default and produces no visual difference from the current unthemed entry pages, providing a seamless baseline.

## Scope Boundaries

### In Scope

- New public endpoint returning event name, typeOfItem, theme, and state
- Applying event theme to EmailEntryPage, PINEntryPage, and EventOTPEntryPage
- Displaying event name and contextual copy on all three entry pages
- Handling event-not-found and event-ended states on entry pages
- Updating AuthPage copy to remove OTP jargon and improve warmth
- Adding visible email label to AuthPage
- Dark mode support for themed entry pages

### Out of Scope

- Theming the AuthPage (`/auth`) — it is not event-scoped
- Adding new theme presets or custom color capabilities
- Changing the theme selection UI or admin theme management
- Modifying the LandingPage or any other non-entry pages
- Caching or service worker strategies for the public event info
- Showing event images, logos, or host profile pictures on entry pages
