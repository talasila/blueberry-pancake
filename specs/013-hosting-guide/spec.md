# Feature Specification: Hosting Guide

**Feature Branch**: `013-hosting-guide`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "I want to provide a 'how to host a blind wine tasting party' help guide that is accessible from all 'pages' - authenticated and un-authenticated. This should be easy to understand, visually interesting and be targeted towards a non technical audience. The app is also primarily intended for use on a mobile device so a long list of instructions with a lot of detailed text is not friendly."

## Clarifications

### Session 2026-02-25

- Q: Should the guide be a single undifferentiated guide or provide role-specific content for hosts vs. guests? → A: One guide with distinct sections/tabs for each role (e.g., "I'm Hosting" / "I'm a Guest") so users self-select their path.
- Q: Should the guide behave differently on the landing page (e.g., add a "What is Blind Tasting?" intro)? → A: Same guide everywhere — the role selection screen naturally serves as the entry point regardless of page context. No page-specific variations.
- Q: How should the guide entry point be presented — floating button, header menu item, or something else? → A: Always-visible floating button (e.g., a "?" or book icon fixed on screen) for maximum discoverability.
- Q: Should the guide track user interactions (opens, step views, completions) to measure success criteria? → A: No tracking. Success criteria will be validated through manual testing and user observation only.
- Q: What overlay presentation style should the guide use on mobile? → A: Bottom sheet drawer — slides up from the bottom, partial screen coverage, user still sees the page behind it. Consistent with existing drawer patterns in the app.
- Q: How should users navigate between steps — swipe, buttons, or both? → A: Both — swipe left/right gestures plus visible "Next" / "Back" buttons for discoverability and accessibility.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access the Guide from Any Page (Priority: P1)

A visitor or logged-in user sees a persistent, recognizable entry point to the guide on every page in the app. Tapping it opens the guide immediately without navigating away from their current page. This ensures the guide is always discoverable regardless of where the user is in the app or whether they have an account.

**Why this priority**: The guide has zero value if users can't find it. A globally visible entry point is the foundational requirement that everything else depends on.

**Independent Test**: Can be fully tested by visiting any page (landing page, auth page, event page, admin page) and confirming the guide entry point is visible and opens the guide.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on the landing page, **When** they tap the guide entry point, **Then** the guide opens as an overlay on the current page
2. **Given** an authenticated user on the create event page, **When** they tap the guide entry point, **Then** the guide opens as an overlay on the current page
3. **Given** a user viewing an event page (via PIN access), **When** they tap the guide entry point, **Then** the guide opens as an overlay on the current page
4. **Given** a user with the guide open, **When** they close the guide, **Then** they return to the exact page and scroll position they were on before

---

### User Story 2 - Self-Select a Role Path (Priority: P1)

When the guide opens, the user is presented with a clear choice between two paths: "I'm Hosting" and "I'm a Guest." Each path leads to role-specific content tailored to what that persona needs to know. This prevents hosts from wading through guest instructions and vice versa.

**Why this priority**: Without role selection, the guide shows irrelevant content to at least one persona, undermining the core goal of being easy to understand and targeted.

**Independent Test**: Can be fully tested by opening the guide, selecting each role path in turn, and confirming each leads to distinct, role-appropriate content.

**Acceptance Scenarios**:

1. **Given** a user opens the guide, **When** the guide loads, **Then** they see a role selection screen with two clear options: "I'm Hosting" and "I'm a Guest"
2. **Given** a user is on the role selection screen, **When** they tap "I'm Hosting", **Then** they enter the host guide path with host-specific steps
3. **Given** a user is on the role selection screen, **When** they tap "I'm a Guest", **Then** they enter the guest guide path with guest-specific steps
4. **Given** a user is partway through one role path, **When** they want to switch roles, **Then** they can navigate back to the role selection screen and choose the other path

---

### User Story 3 - Browse the Host Guide as Bite-Sized Visual Steps (Priority: P1)

A host opens the "I'm Hosting" path and sees the content presented as a series of short, visually engaging steps — not a wall of text. Each step focuses on one concept with a clear heading, a brief description, and a supporting visual element. The steps walk them through everything from choosing wines to revealing results.

**Why this priority**: The core value proposition is a guide that is easy to digest on mobile. If the content is presented as a long scrolling document, it fails the primary user need.

**Independent Test**: Can be fully tested by selecting "I'm Hosting" and navigating through all host steps, confirming each step is concise, visually distinct, and readable on a mobile screen without scrolling within a single step.

**Acceptance Scenarios**:

1. **Given** a user selects the host path, **When** the first step loads, **Then** they see a clear heading, short description (no more than 2-3 sentences), and a visual element
2. **Given** a user is viewing a host step, **When** they advance to the next step, **Then** the next step appears with a smooth transition and the user can tell which step they are on (progress indication)
3. **Given** a user is on a middle host step, **When** they want to go back, **Then** they can navigate to the previous step
4. **Given** a user is on the last host step, **When** they reach the end, **Then** they see a clear completion state with a contextual call to action

---

### User Story 4 - Browse the Guest Guide as Bite-Sized Visual Steps (Priority: P1)

A guest opens the "I'm a Guest" path and sees a shorter series of steps explaining how to join an event, taste wines, submit ratings, and view results. The content is tailored to someone who was invited, not someone organizing the party.

**Why this priority**: Guests are the majority of users in any tasting event. If they don't understand how to participate, the host's event fails.

**Independent Test**: Can be fully tested by selecting "I'm a Guest" and navigating through all guest steps, confirming each is concise and relevant to a participant (not a host).

**Acceptance Scenarios**:

1. **Given** a user selects the guest path, **When** the first step loads, **Then** they see guest-relevant content (not host setup instructions)
2. **Given** a user is viewing a guest step, **When** they advance through all steps, **Then** they complete the guest path and see a completion state with a contextual call to action
3. **Given** a user completes the guest path, **When** they see the final step, **Then** the call to action is relevant to guests (e.g., "Ready to taste? Join your event!" rather than "Create your event!")

---

### User Story 5 - Quick-Scan the Full Guide (Priority: P2)

A returning user who has seen the guide before wants to quickly reference a specific step without navigating through every card. After selecting their role path, they can see an overview of all steps and jump directly to any one.

**Why this priority**: Important for repeat visitors and reference use, but the primary experience (first-time walkthrough) is more critical.

**Independent Test**: Can be fully tested by opening the guide, selecting a role, accessing the overview/table of contents, and tapping a specific step to jump directly to it.

**Acceptance Scenarios**:

1. **Given** a user is in a role path, **When** they access the overview, **Then** they see a list of all step titles for that role
2. **Given** a user is viewing the overview, **When** they tap a specific step title, **Then** the guide navigates directly to that step

---

### Edge Cases

- What happens when the user rotates their device while the guide is open? The guide should adapt to the new orientation without losing the user's current step or role selection.
- What happens if the user has a very small screen (320px width)? The guide content, visuals, and role selection buttons should remain readable and not overflow.
- What happens when the user opens the guide, selects a role, navigates to step 3, closes it, and reopens it later in the same session? The guide should reopen at the role selection screen (fresh start) since the guide is short enough to re-browse.
- What happens when accessibility tools (screen readers) are active? The guide content, role selection, navigation controls, and step indicators must be accessible.
- What happens when the floating button overlaps with page content (e.g., a form submit button at the bottom of the screen)? The button should be positioned to avoid blocking critical interactive elements, and the underlying page should account for the button's presence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The guide entry point MUST be an always-visible floating button on every page of the application, regardless of authentication state
- **FR-001a**: The floating button MUST NOT obscure critical page content or interactive elements (e.g., form submit buttons, navigation controls)
- **FR-002**: The guide MUST open as a bottom sheet drawer that slides up from the bottom of the screen, so the user does not lose their current context
- **FR-002a**: The bottom sheet MUST be tall enough to display a full step (heading, description, visual, and navigation controls) without internal scrolling, while still indicating it is an overlay on the current page
- **FR-003**: The guide MUST present a role selection screen as its first view, offering two distinct paths: "I'm Hosting" and "I'm a Guest"
- **FR-004**: Each role path MUST contain its own set of discrete, sequential steps (host path: minimum 5, maximum 10 steps; guest path: minimum 3, maximum 6 steps)
- **FR-005**: Each step MUST contain a heading, a short description (maximum 3 sentences), and a visual element (icon, illustration, or graphic)
- **FR-006**: Users MUST be able to navigate forward and backward between steps via both swipe gestures (left/right) and visible "Next" / "Back" buttons
- **FR-007**: The guide MUST display a progress indicator showing the user's current position within the total number of steps for their selected role
- **FR-008**: Users MUST be able to navigate back to the role selection screen from any point within a role path
- **FR-009**: The guide MUST include a way to close it and return to the underlying page
- **FR-010**: The guide MUST be fully usable on mobile devices with a minimum viewport width of 320px
- **FR-011**: The guide MUST provide an overview or table of contents within each role path, allowing users to jump to any step
- **FR-012**: The final step of the host path MUST include a contextual call-to-action (if unauthenticated: guide toward signing up; if authenticated: guide toward creating an event)
- **FR-013**: The final step of the guest path MUST include a contextual call-to-action relevant to joining or participating in an event
- **FR-014**: The guide content MUST be written in plain, conversational language suitable for a non-technical audience with no wine expertise assumed
- **FR-015**: The guide MUST be accessible to screen readers and keyboard navigation
- **FR-016**: The guide MUST present identical content and behavior regardless of which page it is opened from (no page-specific variations)

### Guide Content Steps

The guide should cover these topics (exact wording to be refined during implementation):

**Host Path — "I'm Hosting"**:

1. **Pick Your Wines** — Choose 4-6 wines with variety (mix of reds, whites, or a theme)
2. **Cover the Bottles** — Use bags, foil, or socks to hide labels; number each bottle
3. **Set Up Your Space** — Prepare glasses, water, palate cleansers, and tasting sheets
4. **Invite Your Guests** — Send invites and let people know what to expect
5. **Create Your Event in the App** — Set up a tasting event so guests can rate wines
6. **Share the Event Link** — Give guests easy access via PIN or link
7. **Taste & Rate** — Walk guests through tasting each wine and rating in the app
8. **Reveal & Compare** — Unveil the wines and see everyone's ratings on the dashboard

**Guest Path — "I'm a Guest"**:

1. **You're Invited!** — What to expect at a blind wine tasting party
2. **Join the Event** — Use the PIN or link your host shared to get into the app
3. **Taste & Rate** — Try each wine and submit your ratings in the app
4. **See the Results** — View the dashboard to see how everyone rated and which wines won

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The guide entry point is visible and functional on 100% of application pages (authenticated and unauthenticated)
- **SC-002**: Users can complete reading either role path in under 3 minutes
- **SC-003**: Each individual step fits on a single mobile screen (no scrolling within a step) at 320px minimum width
- **SC-004**: A user who opens the guide can navigate from role selection through all steps to the final CTA without confusion, dead ends, or unintended exits (validated via manual walkthrough testing)
- **SC-005**: The guide's final CTA successfully directs users toward the intended action (sign up for unauthenticated, create event for authenticated hosts, join event for guests) — validated via manual testing
- **SC-006**: The guide achieves a passing accessibility audit score for screen reader compatibility and keyboard navigation

## Assumptions

- The guide content is static (not personalized or dynamic based on user behavior). Content updates would require a code change.
- Visual elements for each step will use icons or simple illustrations rather than photographs, to keep the design lightweight and fast-loading on mobile. Visual elements must be sized to fit comfortably within the bottom sheet's constrained vertical space.
- The guide does not require any backend/server interaction — it is entirely client-side content.
- The host path CTA ("create your event") is the primary conversion goal for the guide.
- Users are assumed to be wine-curious social hosts or their invited guests, not sommeliers — the tone should be fun and approachable.
- The role selection screen is lightweight (two prominent options), not a complex form.
- No analytics or event tracking is included in this feature. Success criteria are validated through manual testing and observation. Analytics may be added in a future iteration.
