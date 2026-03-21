# Feature Specification: Guide Redesign

**Feature Branch**: `038-guide-redesign`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: "Unified end-to-end event guide replacing three separate guide systems with a single linear walkthrough covering real-world and in-app actions, with a you-are-here marker based on event lifecycle state."

## Background

The application currently splits host guidance across three separate systems:

1. **Hosting guide** (`guideContent.js` / `GuideDrawer`) — 8 host steps + 4 guest steps covering real-world prep but stopping short of the actual event
2. **Admin guide** (`adminGuideContent.js` / `AdminGuideDrawer`) — 20 steps across 4 lifecycle states covering in-app actions but assuming the host already knows real-world logistics
3. **Walkthrough** (`walkthroughContent.js` / `WalkthroughDrawer`) — 6-step app overview accessible from the create page and welcome sheet

A first-time host must mentally stitch these together and still has gaps. Approximately 5 of the 17 real-world steps in a typical blind tasting aren't covered anywhere, and several others appear in the wrong guide or lack physical-world context (e.g., preparing numbered stickers, collecting bottles at the door, removing bags for the reveal, declaring the winner).

### Decisions

- **D1**: One linear event guide replaces both the admin guide and the walkthrough. It tells one continuous story covering real-world and in-app actions in the order they actually happen.
- **D2**: Drop lifecycle state-switching. The new guide shows all steps at all times with a "you are here" positional marker based on event state. No carousel, no swiping between steps.
- **D3**: Keep the hosting overview as a separate pre-event guide so prospective hosts can learn what hosting involves without creating an event first. Rewrite its host path to align with the real 17-step flow at summary depth.
- **D4**: The guest guide (4-step guest path in `GuideDrawer`) stays as-is.
- **D5**: No deep-link action buttons in guide steps.
- **D6**: Step completion is based purely on event lifecycle state, not actual app state (e.g., whether the admin has named the event).
- **D7**: No condensed view for returning hosts. All users see the same full guide.

## Clarifications

### Session 2026-03-20

- Q: Should the guide auto-scroll to the first "now" step when opened, or always open at the top? → A: Auto-scroll to the first "now" step each time the guide opens.
- Q: Should the four phases (Before the Event, Event Day Setup, During the Tasting, The Reveal) appear as visible section headers in the scrollable list? → A: Yes, show phase names as visible section headers between step groups.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Host Follows the Full Event Guide (Priority: P1)

A first-time host creates an event and opens the event guide on the admin page. They see the complete 17-step journey from "Announce the Event" through "Complete the Event." Steps 1-6 (pre-app real-world prep) are shown as already done since the host is past that stage. Steps 7-10 (app setup) are highlighted as their current focus. Steps 11-17 (tasting, reveal, wrap-up) are visible but muted as future steps. The host reads through the current steps, understands what to configure, and proceeds with confidence.

**Why this priority**: This is the core experience the feature exists to deliver. A first-time host with no blind tasting experience should be able to open this guide and understand the entire flow without external help.

**Independent Test**: Can be fully tested by creating a new event, opening the event guide, and verifying all 17 steps are visible with correct visual states (done/now/ahead) for the "created" lifecycle state.

**Acceptance Scenarios**:

1. **Given** an admin on the admin page for a newly created event, **When** they open the event guide, **Then** they see all 17 steps in a scrollable list
2. **Given** an admin viewing the event guide for a "created" event, **When** they look at steps 1-6, **Then** those steps appear dimmed/checked as completed context
3. **Given** an admin viewing the event guide for a "created" event, **When** they look at steps 7-10, **Then** those steps are highlighted and auto-expanded as current actions
4. **Given** an admin viewing the event guide for a "created" event, **When** they look at steps 11-17, **Then** those steps are visible but muted as future steps
5. **Given** an admin viewing any step, **When** they tap on it, **Then** the step expands or collapses to show or hide its description

---

### User Story 2 - Guide Tracks Progress Across Lifecycle States (Priority: P1)

As the event progresses through its lifecycle (created, started, paused, completed), the guide's "you are here" marker advances to reflect the current state. An admin who opens the guide during the tasting sees steps 1-10 as done, step 11 highlighted, and steps 12-17 ahead. An admin who opens it after pausing sees steps 12-16 highlighted. The guide always reflects where they are in the overall journey.

**Why this priority**: The "you are here" marker is what makes this guide contextual rather than a static document. Without it, the guide is just a long list of instructions with no sense of progress.

**Independent Test**: Can be fully tested by transitioning an event through all four states (created, started, paused, completed) and verifying the guide's visual states update correctly at each transition.

**Acceptance Scenarios**:

1. **Given** a started event, **When** the admin opens the guide, **Then** steps 1-10 are done, step 11 is highlighted, and steps 12-17 are ahead
2. **Given** a paused event, **When** the admin opens the guide, **Then** steps 1-11 are done, steps 12-16 are highlighted, and step 17 is ahead
3. **Given** a completed event, **When** the admin opens the guide, **Then** steps 1-16 are done and step 17 is highlighted
4. **Given** an event that transitions state while the guide is closed, **When** the admin reopens the guide, **Then** the marker reflects the new state

---

### User Story 3 - Prospective Host Browses the Hosting Overview (Priority: P2)

A visitor to the app who hasn't created an event wants to understand what hosting a blind tasting involves. They access the hosting overview from a non-admin page and see a high-level summary of the full hosting journey — from announcing the event through declaring a winner. The overview gives them enough context to decide whether to create an event, without requiring them to commit first.

**Why this priority**: Important for onboarding new users who are browsing, but secondary to the core in-event guide since these users haven't committed to hosting yet.

**Independent Test**: Can be fully tested by navigating to a non-admin page, opening the guide, selecting the host role, and verifying the overview covers the full hosting journey at summary depth.

**Acceptance Scenarios**:

1. **Given** a user on a non-admin page, **When** they open the guide and select the host perspective, **Then** they see a summary of the full hosting journey aligned with the 17-step real-world flow
2. **Given** a user reading the hosting overview, **When** they reach the end, **Then** the content provides a natural path to creating an event
3. **Given** a user on a non-admin page, **When** they open the guide and select the guest perspective, **Then** they see the existing 4-step guest guide unchanged

---

### User Story 4 - Removal of Legacy Guide Systems (Priority: P2)

The three existing guide content files and their dedicated drawer components are consolidated. The admin guide content, walkthrough content, and their respective drawer components are removed and replaced by the new unified event guide. The hosting guide drawer continues to serve the guest path and the rewritten host overview path. Shared components (step card, progress indicator, navigation) are preserved and reused.

**Why this priority**: Necessary cleanup to avoid maintaining parallel guide systems. But it's a refactor with no new user-facing value on its own — it depends on the new event guide being built first.

**Independent Test**: Can be verified by confirming that all references to the removed files are eliminated, no import errors exist, and the existing test suites (updated) pass.

**Acceptance Scenarios**:

1. **Given** the new event guide is in place, **When** the old admin guide content, walkthrough content, and their drawer components are removed, **Then** the app builds without errors
2. **Given** the removal is complete, **When** a user navigates to admin routes, **Then** they see the new event guide (not the old admin guide)
3. **Given** the removal is complete, **When** a user navigates to non-admin routes, **Then** they see the hosting overview and guest guide via the existing guide drawer

---

### Edge Cases

- What happens when the event state changes while the guide is open (e.g., another co-admin transitions the event)? The guide should reflect the updated state the next time it is opened. It does not need to live-update while open.
- What happens on a very small screen (320px width)? The scrollable list of all 17 steps must remain readable without horizontal overflow.
- What happens when the admin closes and reopens the guide? The guide re-reads the current event state and resets the marker position accordingly.
- What happens if no bottles were registered during the event? The "Match bottles to numbers" step still appears but its description should note that matching is only needed if bottles were registered.
- What happens to the WelcomeBottomSheet's two guide buttons ("How does it work?" and "Setup guide") after the walkthrough is removed? Both would open the EventGuideDrawer via the same callback. The two buttons should be consolidated into a single "Event Guide" button to avoid redundant entry points.

## Requirements *(mandatory)*

### Functional Requirements

**Event Guide (admin routes)**

- **FR-001**: The event guide MUST display all 17 steps in a single scrollable list every time it is opened, regardless of event state
- **FR-002**: Each step MUST be displayed in one of three visual states based on the current event lifecycle state: done (dimmed/checked), now (highlighted and auto-expanded), or ahead (visible but muted)
- **FR-003**: The "you are here" mapping MUST follow this scheme: `created` state highlights steps 7-10, `started` highlights step 11, `paused` highlights steps 12-16, `completed` highlights step 17. Steps before the highlighted range are done; steps after are ahead.
- **FR-004**: Users MUST be able to tap any step to expand or collapse its description, regardless of the step's visual state
- **FR-005**: The event guide MUST be accessible from the admin page via the same entry point currently used by the admin guide (guide icon in the header)
- **FR-006**: The event guide MUST NOT appear on non-admin pages
- **FR-007**: The event guide MUST re-read the current event lifecycle state each time it is opened
- **FR-008**: The event guide MUST NOT include deep-link buttons or action triggers within steps — all content is informational only
- **FR-009**: The event guide MUST NOT vary its display based on whether specific app actions have been completed (e.g., whether the event has been named). Step visual state is determined solely by event lifecycle state.
- **FR-009a**: The event guide MUST auto-scroll to the first "now" step each time it is opened, so the admin immediately sees actionable content rather than completed steps

**Guide Content**

- **FR-010**: The event guide MUST cover 17 steps organized into four phases, mixing real-world and in-app actions in chronological order:
  - Before the Event (steps 1-3): Announce the event, tell guests to bring wine, prepare supplies
  - Event Day Setup (steps 4-10): Collect bottles, cover bottles, number bottles randomly, create event in app, configure items in app, share PIN via app, start event in app
  - During the Tasting (steps 11-12): Guests taste and rate, pause the event in app
  - The Reveal (steps 13-17): Remove bags, match bottles to numbers in app, check dashboard in app, declare the winner, complete event in app
- **FR-010a**: The event guide MUST display phase names (Before the Event, Event Day Setup, During the Tasting, The Reveal) as visible section headers separating the step groups in the scrollable list
- **FR-011**: Each step MUST clearly indicate whether it is a real-world action or an in-app action
- **FR-012**: Each step MUST contain a heading, a short description (maximum 3 sentences), and an icon
- **FR-013**: All guide content MUST be written in plain, conversational language suitable for a non-technical audience who may have never hosted a blind tasting before

**Hosting Overview (non-admin routes)**

- **FR-014**: The host path in the existing guide drawer MUST be rewritten to summarize the same 17-step real-world flow at a higher level (fewer steps, shorter descriptions)
- **FR-015**: The rewritten host path MUST give prospective hosts enough context to understand the full hosting experience without creating an event
- **FR-016**: The guest path in the existing guide drawer MUST remain unchanged

**Component Consolidation**

- **FR-017**: The admin guide content file, walkthrough content file, admin guide drawer component, and walkthrough drawer component MUST be removed and replaced by the new event guide
- **FR-018**: The existing guide drawer MUST continue to serve the guest path and the rewritten host overview path on non-admin routes
- **FR-019**: Shared components (step card, progress indicator, navigation) MUST be evaluated for reuse and preserved where applicable

**Accessibility and Usability**

- **FR-020**: The event guide MUST be fully usable on mobile devices with a minimum viewport width of 320px
- **FR-021**: The event guide MUST be accessible to screen readers and support full keyboard navigation
- **FR-022**: The event guide MUST close and return the admin to the admin page without losing page state when dismissed

### Key Entities

- **Guide Step**: A single step in the event guide. Attributes: id, heading, description, icon, phase (before-event / event-day-setup / during-tasting / the-reveal), step type (real-world or in-app), position in sequence (1-17)
- **Step Visual State**: The display state of a step relative to the current event lifecycle. One of: done, now, ahead. Derived from the event lifecycle state and the step's position in the "you are here" mapping.
- **Event Lifecycle State**: The existing event state (created, started, paused, completed) that drives the "you are here" marker position.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time host who opens the event guide can identify what they should do next within 10 seconds, based on the highlighted "now" steps
- **SC-002**: The event guide correctly displays the appropriate done/now/ahead visual states for all four event lifecycle states (created, started, paused, completed)
- **SC-003**: All 17 steps are visible and scrollable on a single screen at 320px minimum viewport width without horizontal overflow
- **SC-004**: An admin can read through the entire 17-step guide in under 5 minutes
- **SC-005**: A prospective host can read the hosting overview and understand the full hosting experience without creating an event (validated via manual walkthrough)
- **SC-006**: The guest guide on non-admin routes remains functionally identical to its pre-redesign behavior
- **SC-007**: The application builds and all updated tests pass after the legacy admin guide, walkthrough content, and their drawer components are removed

## Assumptions

- The event guide appears only on admin routes and uses the same entry point (header guide icon) as the current admin guide.
- The existing guide drawer continues to handle non-admin routes with the rewritten host overview and unchanged guest path.
- Guide content is static — it does not personalize based on which settings the admin has configured. Content updates require a code change.
- Visual elements for each step use lucide-react icons, consistent with existing guide components.
- No new backend endpoints are required. The event guide reads the event lifecycle state from existing event data available on the admin page.
- No analytics or tracking is included. Success criteria are validated through manual testing.
- `GuideStepCard` is reused with modifications (expand/collapse + step type indicator). `GuideProgress` and `GuideNavigation` are not used by the new EventGuideDrawer (they are carousel-specific), but are kept unchanged for the existing GuideDrawer.
- The welcome bottom sheet's reference to the walkthrough drawer will need to be updated to reference the new event guide.
