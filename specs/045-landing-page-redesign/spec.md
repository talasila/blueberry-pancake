# Feature Specification: Landing Page Redesign

**Feature Branch**: `045-landing-page-redesign`
**Created**: 2026-03-24
**Status**: Draft
**Input**: Replace the current utilitarian landing page with a warm, inviting front door that communicates what the app is, visually engages first-time visitors, and guides hosts toward the primary action of creating a tasting event.

## Background & Motivation

The current landing page centers on a "Join an event" card with a manual event ID input field. In practice, guests never use this — they arrive via direct links, QR codes, or shared PINs that bypass the landing page entirely. The people who actually land on the home page are:

1. **First-time visitors** discovering the app
2. **Returning hosts** wanting to create or manage events
3. **Logged-out users** returning after a session expires

The current page fails all three audiences: it doesn't explain what the app does, buries the high-value actions (create/manage events) as small utility buttons, and presents a stark black-and-white form that lacks the warmth and personality the app's event pages already deliver through their theme system.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Visitor Understands the App (Priority: P1)

A person visits the home page for the first time with no prior knowledge of the product. They immediately see a warm, visually appealing page with a bold headline ("Blind tastings, scored together."), a concise subtitle explaining the concept, and a three-step visual strip (Cover, Taste, Reveal) that communicates the core experience at a glance. Without scrolling or clicking anything, they understand what the app does and feel invited to try it.

**Why this priority**: If first-time visitors don't understand what the app is within seconds, nothing else on the page matters. This is the foundation for all other actions.

**Independent Test**: Can be verified by loading the home page in an unauthenticated browser and confirming the headline, subtitle, and three-step visual strip are visible without scrolling.

**Acceptance Scenarios**:

1. **Given** a user visits the home page for the first time, **When** the page loads, **Then** they see a bold headline ("Blind tastings, scored together."), a supporting subtitle, and three visual icons representing the tasting flow (Cover, Taste, Reveal) — all above the fold on a standard mobile device.
2. **Given** a user visits the home page, **When** they view the page, **Then** a soft, warm gradient background wash is visible behind the hero area, giving the page visual warmth distinct from the rest of the app's default black-and-white palette.
3. **Given** a user visits the home page, **When** they view the three-step strip, **Then** each step has a distinctly colored circular icon background (warm brown for Cover, amber/gold for Taste, rose/pink for Reveal) with a white icon and a short label below it.

---

### User Story 2 - Host Creates a New Event (Priority: P1)

A returning host (or first-time user ready to try the app) wants to create a tasting event. The primary call-to-action button ("Host a Tasting") is prominently displayed with a warm accent color, making it the most visually dominant interactive element on the page. Clicking it takes the user to the event creation flow (through authentication if needed).

**Why this priority**: Hosts are the most valuable audience for the home page. Making event creation the obvious next step directly drives app engagement.

**Independent Test**: Can be verified by clicking the "Host a Tasting" button and confirming navigation to the create-event page (or auth flow if unauthenticated).

**Acceptance Scenarios**:

1. **Given** a user is on the home page, **When** they look below the three-step strip, **Then** they see a full-width "Host a Tasting" button with a warm accent fill color (not the default black/white).
2. **Given** an authenticated user clicks "Host a Tasting", **When** the button is clicked, **Then** they are navigated directly to the event creation page.
3. **Given** an unauthenticated user clicks "Host a Tasting", **When** the button is clicked, **Then** they are navigated to the authentication flow with a redirect back to event creation upon completion.

---

### User Story 3 - Returning User Accesses Their Events (Priority: P2)

A returning user who has previously created or participated in events wants to see their event list. A secondary "My Events" button is displayed below the primary CTA, providing clear access to event management without competing with the primary action.

**Why this priority**: Important for returning users but secondary to the primary "host" action. These users already know the app and need wayfinding, not persuasion.

**Independent Test**: Can be verified by clicking the "My Events" button and confirming navigation to the events list (or auth flow if unauthenticated).

**Acceptance Scenarios**:

1. **Given** a user is on the home page, **When** they look below the "Host a Tasting" button, **Then** they see a full-width "My Events" button in an outline/secondary style.
2. **Given** an authenticated user clicks "My Events", **When** the button is clicked, **Then** they are navigated to their events list.
3. **Given** an unauthenticated user clicks "My Events", **When** the button is clicked, **Then** they are navigated to the authentication flow with a redirect back to the events list upon completion.

---

### User Story 4 - User Joins via Event Code (Priority: P3)

A user has been verbally told an event code (rare scenario) and needs to join manually. A subtle "Have an event code?" text link is available below the CTAs. Clicking it reveals a compact inline input field where they can type the code and navigate to the event.

**Why this priority**: This is an edge case — the vast majority of guests arrive via direct link or QR code. The feature is preserved for completeness but intentionally demoted to avoid cluttering the page.

**Independent Test**: Can be verified by clicking "Have an event code?", entering a code in the revealed input, and confirming navigation to the correct event page.

**Acceptance Scenarios**:

1. **Given** a user is on the home page, **When** they look below the CTA buttons, **Then** they see a subtle "Have an event code?" text link in muted styling.
2. **Given** a user clicks "Have an event code?", **When** the link is clicked, **Then** an inline input field with a submit button is revealed directly below the link text.
3. **Given** a user enters a valid event code in the revealed input, **When** they submit (via button click or Enter key), **Then** they are navigated to the corresponding event page.
4. **Given** the event code input is revealed, **When** it becomes visible, **Then** it is automatically focused for immediate typing.

---

### User Story 5 - Dark Mode Visual Consistency (Priority: P2)

A user who has dark mode enabled visits the home page. All visual elements — the gradient background, tinted icon circles, and warm CTA button — adapt to dark mode with appropriate color shifts. The page feels like a candlelit version of the light page: deep burgundy gradient glow, slightly luminous icon circles, and a warm CTA with adequate contrast.

**Why this priority**: Dark mode is a first-class feature of the app. The landing page's new visual elements must not break or look washed out in dark mode.

**Independent Test**: Can be verified by toggling dark mode and confirming all visual elements render with appropriate dark variants and maintain readability.

**Acceptance Scenarios**:

1. **Given** a user has dark mode enabled, **When** the home page loads, **Then** the gradient background uses deep wine/burgundy tones instead of rose/peach tones.
2. **Given** a user has dark mode enabled, **When** they view the three-step icons, **Then** the icon circle background colors shift to their higher-lightness dark-mode equivalents while maintaining the same hue families.
3. **Given** a user has dark mode enabled, **When** they view the "Host a Tasting" button, **Then** the warm accent color adjusts for dark-mode readability while remaining visually warm.
4. **Given** either light or dark mode, **When** the page is displayed, **Then** all text and interactive elements meet WCAG AA contrast ratios.

---

### Edge Cases

- What happens when a user submits an empty event code? The submit action should be disabled or do nothing when the input is empty.
- What happens when a success message is passed via navigation state (e.g., after deleting an event)? The message must still display above the hero content, preserving existing behavior.
- What happens when the page is viewed on a very narrow screen (< 320px)? The three-step icon strip should remain horizontal and not wrap awkwardly; the icons may scale slightly but must stay in a single row.
- What happens when the gradient CSS properties are not supported by the browser? The page should fall back gracefully to the standard background color with no visual breakage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST display a bold headline ("Blind tastings, scored together.") and a single supporting subtitle sentence.
- **FR-002**: The home page MUST display a three-step visual strip with three icons (Cover, Taste, Reveal) in distinctly colored circular backgrounds with labels below each.
- **FR-003**: The home page MUST display a warm gradient background wash behind the hero area — rose/peach tones in light mode, deep wine/burgundy tones in dark mode.
- **FR-004**: The home page MUST display a full-width "Host a Tasting" primary button with a warm accent fill color (not the default black/white theme color).
- **FR-005**: The "Host a Tasting" button MUST navigate authenticated users to the event creation page and unauthenticated users to the authentication flow with a redirect to event creation.
- **FR-006**: The home page MUST display a full-width "My Events" secondary button in outline style below the primary CTA.
- **FR-007**: The "My Events" button MUST navigate authenticated users to the events list and unauthenticated users to the authentication flow with a redirect to the events list.
- **FR-008**: The home page MUST display a "Have an event code?" text link below the CTAs that reveals an inline input field with a submit action when clicked.
- **FR-009**: The revealed event code input MUST auto-focus when shown and navigate to the event page for the entered code on submission.
- **FR-010**: The event code submit action MUST be disabled or inert when the input is empty.
- **FR-011**: The existing "Join an event" card with its input field and button MUST be removed from the home page.
- **FR-012**: The existing success message display (from navigation state) MUST continue to function, appearing above the hero content.
- **FR-013**: All new visual elements (gradient, icon circles, CTA button color) MUST have dark-mode variants that maintain visual warmth and WCAG AA contrast compliance.
- **FR-014**: The warm accent color used for the CTA button MUST be scoped to the home page only and MUST NOT alter the global theme or affect any other page.
- **FR-015**: The home page MUST NOT introduce any new external dependencies, assets, images, or fonts.
- **FR-016**: The layout MUST remain mobile-first within the existing maximum content width container, with the three-step icon strip staying horizontal on all supported screen widths.

## Assumptions

- The three theme preset color families (cellar/warm-brown, golden/amber, rose/pink) are appropriate choices for the icon circles and CTA accent. These can be adjusted during implementation if visual testing reveals better combinations.
- The headline copy ("Blind tastings, scored together.") and subtitle copy are final as specified. Minor copy tweaks may be made during implementation if user testing suggests improvements.
- The gradient is purely decorative and will degrade gracefully in older browsers by falling back to the solid background color.
- "Have an event code?" is the correct phrasing for the demoted join feature. The app currently uses "event ID" internally but "event code" is more user-friendly.

## Scope

### In Scope

- Complete visual redesign of the home page layout and content hierarchy
- New hero section with gradient background, headline, and tagline
- Three-step visual strip with tinted icon circles
- Reordered CTAs with warm accent primary button
- Demoted event code join as collapsible text link
- Dark mode support for all new visual elements
- Responsive behavior within existing container constraints

### Out of Scope

- Changes to the header component
- Changes to global CSS variables or the theme system
- Changes to any page other than the home page
- Authentication flow changes
- New animations or transitions beyond standard framework utilities
- A/B testing or analytics instrumentation
- Backend or API changes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify what the app does (blind tasting events) within 5 seconds of the page loading, without scrolling or clicking.
- **SC-002**: The "Host a Tasting" button is the most visually prominent interactive element on the page, identifiable as the primary action within 2 seconds.
- **SC-003**: All hero content (headline, subtitle, three-step strip, primary CTA) is visible above the fold on a standard mobile device (375px width) without scrolling.
- **SC-004**: The page passes WCAG AA contrast checks for all text and interactive elements in both light and dark modes.
- **SC-005**: The existing event code join functionality remains accessible (within one click) for users who need it.
- **SC-006**: No new external dependencies, assets, or network requests are introduced — the page loads with the same resource footprint as before.
- **SC-007**: The page renders correctly and maintains visual warmth in both light and dark modes with no visual breakage or fallback artifacts.
