# Feature Specification: Admin Guide

**Feature Branch**: `014-admin-guide`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "The hosting guide feature is very useful - as a generic guide. Should there be a more detailed guide for event admins to guide them through the various settings on the admin page and what exactly they need to do at each step of the event?"

## Clarifications

### Session 2026-02-25

- Q: How should the admin guide entry point coexist with the existing hosting guide floating button on the admin page? → A: The admin guide replaces the hosting guide FAB on admin pages only. The hosting guide remains on all other pages. Admins have already progressed past the generic "how to host" stage.
- Q: Should the admin guide's final-step CTAs actually trigger state transitions, or just explain how? → A: Informational only. CTAs close the guide and explain where to find the relevant setting on the admin page. The guide never performs state transitions directly, to avoid accidental high-impact actions.
- Q: Should the Danger Zone actions (delete users, delete ratings, delete event) be covered in the admin guide? → A: Omit. Danger Zone actions are not included in the guide — they already have in-UI confirmation dialogs with descriptions. Including destructive actions in a walkthrough risks normalizing them as routine steps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access a State-Aware Admin Guide (Priority: P1)

A first-time event administrator lands on the admin page and is unsure where to begin. They see a clear, recognizable entry point that opens a guide tailored to their event's current lifecycle state. The guide immediately shows them what to focus on right now — not a generic overview, but specific actions relevant to where their event is in the setup/running/completion lifecycle.

**Why this priority**: Without a contextual entry point that understands event state, the guide is just another static FAQ. State-awareness is the core differentiator from the existing hosting guide and the reason this feature exists.

**Independent Test**: Can be fully tested by creating an event (state: created), opening the admin guide, confirming it shows setup-relevant content. Then transitioning the event to started and reopening the guide to confirm it shows running-relevant content.

**Acceptance Scenarios**:

1. **Given** an admin on the admin page for a newly created event, **When** they open the admin guide, **Then** they see setup-focused guidance appropriate for the "created" state
2. **Given** an admin on the admin page for a started event, **When** they open the admin guide, **Then** they see running-focused guidance appropriate for the "started" state
3. **Given** an admin on the admin page for a completed event, **When** they open the admin guide, **Then** they see completion-focused guidance appropriate for the "completed" state
4. **Given** an admin on the admin page for a paused event, **When** they open the admin guide, **Then** they see paused-state guidance that explains what can be done during the pause

---

### User Story 2 - Walk Through Event Setup Before Starting (Priority: P1)

An admin has just created their event and needs to configure it properly before inviting guests. The guide walks them through each setup step in the right order: naming the event, configuring items, setting up the rating scale and labels, customizing colors, enabling note suggestions (if applicable), adding co-administrators, and sharing the event PIN/link. The guide highlights that rating configuration is locked once the event starts, ensuring the admin doesn't skip this critical step.

**Why this priority**: Setup is the most confusing phase with the most settings and the highest risk of irreversible mistakes (rating configuration locks permanently after starting). This is where admins need the most hand-holding.

**Independent Test**: Can be fully tested by creating a new event, opening the admin guide, and walking through all setup steps to confirm each references a real admin page setting and explains it clearly.

**Acceptance Scenarios**:

1. **Given** an admin in the setup guide for a "created" event, **When** they view the steps, **Then** each step references a specific setting on the admin page and explains what it does and why it matters
2. **Given** an admin viewing a setup step about rating configuration, **When** they read the step content, **Then** the guide clearly warns that this setting is locked once the event starts
3. **Given** an admin who has finished the setup guide, **When** they reach the final step, **Then** the guide provides a clear call to action to start the event and explains what happens when they do

---

### User Story 3 - Understand What to Do While the Event is Running (Priority: P1)

An admin has started their event and guests are actively rating wines. The guide explains what the admin should be aware of during the running phase: what guests are experiencing, how to pause the event if needed (and why they might want to), how to monitor participation, and when to complete the event.

**Why this priority**: Once an event is live, admins need to know what levers they have (pause, complete) and what they can't change anymore. Confusion during a live event directly impacts the guest experience.

**Independent Test**: Can be fully tested by transitioning an event to "started" state, opening the admin guide, and confirming it shows running-phase content with actionable guidance.

**Acceptance Scenarios**:

1. **Given** an admin viewing the running guide, **When** they read the content, **Then** it explains what guests are currently seeing and doing
2. **Given** an admin viewing the running guide, **When** they see the pause option, **Then** the guide explains when and why to pause (e.g., for item ID assignment) and what happens to guests when paused
3. **Given** an admin viewing the running guide, **When** they see the complete option, **Then** the guide explains what completing the event does and that it can be reversed

---

### User Story 4 - Wrap Up After Event Completion (Priority: P2)

An admin has completed their event and wants to see results and export data. The guide walks them through accessing the dashboard, understanding the results, exporting data in different formats, and knowing their options if they need to reopen the event.

**Why this priority**: Important for getting value out of the event data, but less urgent than setup and running guidance since the event is already over and there's no time pressure.

**Independent Test**: Can be fully tested by transitioning an event to "completed" state, opening the admin guide, and confirming it shows completion-phase content including export and dashboard guidance.

**Acceptance Scenarios**:

1. **Given** an admin viewing the completion guide, **When** they read the steps, **Then** the guide explains how to view results on the dashboard
2. **Given** an admin viewing the completion guide, **When** they see export options, **Then** the guide explains each export format and what data it contains
3. **Given** an admin viewing the completion guide, **When** they consider reopening, **Then** the guide explains how to transition back to started or paused and when this might be useful

---

### User Story 5 - Understand Paused State and Item Assignment (Priority: P2)

An admin has paused their event (either intentionally or on guidance from the running-phase guide) and needs to understand what they can do during the pause. The guide explains that item ID assignment is only available while paused, walks them through the assignment process, and explains how to resume when ready.

**Why this priority**: Pausing is a niche but important workflow. Item ID assignment being locked to the paused state is a non-obvious restriction that catches admins off guard.

**Independent Test**: Can be fully tested by transitioning an event to "paused" state, opening the admin guide, and confirming it shows pause-specific content including item assignment guidance.

**Acceptance Scenarios**:

1. **Given** an admin viewing the paused guide, **When** they read the content, **Then** it explains that item ID assignment is only available in this state
2. **Given** an admin viewing the paused guide, **When** they see the resume option, **Then** the guide explains what happens when they resume and that assignment will be locked again

---

### User Story 6 - Quick-Reference Any Setting (Priority: P3)

A returning admin who has used the guide before wants to quickly look up what a specific setting does without walking through the full lifecycle guide. They can see an overview of all steps for the current state and jump directly to any one.

**Why this priority**: Useful for repeat admins and reference use, but the primary experience (first-time walkthrough) is more critical.

**Independent Test**: Can be fully tested by opening the admin guide, accessing an overview/table of contents, and tapping a specific step to jump directly to it.

**Acceptance Scenarios**:

1. **Given** an admin in the admin guide, **When** they access the overview, **Then** they see a list of all step titles for the current event state
2. **Given** an admin viewing the overview, **When** they tap a specific step title, **Then** the guide navigates directly to that step

---

### Edge Cases

- What happens when the event state changes while the guide is open (e.g., another admin transitions the event)? The guide should update its content or notify the admin.
- What happens if the admin has a very small screen (320px width)? The guide content should remain readable without overflow.
- What happens when the admin closes the guide and reopens it? The guide should reflect the current event state (fresh start).
- What happens when the admin page is in a loading or error state? The guide should still be accessible and show content for the most recently known state.
- What happens if the admin navigates away from the admin page while the guide is open? The guide should close gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin guide MUST be accessible from the event admin page via a floating action button that replaces the hosting guide button on admin pages
- **FR-001a**: The existing hosting guide floating button MUST be hidden on admin pages and replaced by the admin guide button
- **FR-002**: The admin guide MUST NOT be visible on non-admin pages (it is scoped exclusively to the admin page). The hosting guide continues to appear on all non-admin pages as before.
- **FR-003**: The admin guide MUST detect the current event lifecycle state (created, started, paused, completed) and display content appropriate for that state
- **FR-004**: The admin guide MUST provide step-by-step guidance for the "created" (setup) state, covering: event name, item configuration, rating configuration, note suggestions, administrator management, and sharing the event PIN/link
- **FR-005**: The admin guide MUST provide step-by-step guidance for the "started" (running) state, covering: what guests experience, monitoring participation, pausing the event, and completing the event
- **FR-006**: The admin guide MUST provide step-by-step guidance for the "paused" state, covering: item ID assignment, adjusting configuration, and resuming or completing the event
- **FR-007**: The admin guide MUST provide step-by-step guidance for the "completed" state, covering: viewing the dashboard, exporting data, and reopening the event
- **FR-008**: The admin guide MUST highlight state-dependent restrictions — specifically that rating configuration (max rating, labels, colors, note suggestions) can only be changed in the "created" state and that item ID assignment is only available in the "paused" state
- **FR-009**: Each guide step MUST contain a heading, a short description (maximum 3 sentences), and a visual element
- **FR-010**: Users MUST be able to navigate forward and backward between steps via both swipe gestures and visible navigation buttons
- **FR-011**: The admin guide MUST display a progress indicator showing the current position within the total steps for the active state
- **FR-012**: The admin guide MUST provide an overview or table of contents, allowing admins to jump to any step
- **FR-013**: The admin guide content MUST be written in plain, conversational language suitable for a non-technical audience
- **FR-014**: The admin guide MUST be fully usable on mobile devices with a minimum viewport width of 320px
- **FR-015**: The admin guide MUST be accessible to screen readers and keyboard navigation
- **FR-016**: The final step of each state guide MUST include a contextual call to action relevant to the next lifecycle phase (e.g., setup guide ends with "Start your event", running guide ends with "Complete your event"). The CTA MUST be informational only — it closes the guide and directs the admin to the relevant setting on the admin page. It MUST NOT directly trigger any state transition or configuration change.
- **FR-017**: The admin guide MUST close and return the admin to the admin page without losing page state when dismissed
- **FR-018**: The admin guide MUST re-read the current event state each time it is opened, ensuring content always matches the live event state

### Guide Content Steps

The guide should cover these topics per state (exact wording to be refined during implementation):

**Created (Setup) State**:

1. **Name Your Event** — Give your event a name guests will recognize
2. **Set Up Your Items** — Choose how many items to include and exclude any you don't need
3. **Configure Ratings** — Pick your rating scale and customize the labels and colors (this is your only chance — it locks when you start!)
4. **Enable Note Suggestions** — Turn on tasting note hints so guests get helpful prompts while rating (wine events only)
5. **Add Co-Administrators** — Invite others to help manage the event
6. **Share the PIN** — Copy the event PIN or link and send it to your guests
7. **Ready to Go!** — Start the event when everyone's arrived and you're ready for the first pour

**Started (Running) State**:

1. **Your Event is Live** — Guests can now rate items on their phones
2. **What Guests See** — Each guest sees a number grid and taps to rate each item
3. **Need a Break?** — Pause the event to temporarily stop ratings (useful for assigning item IDs or taking a break between rounds)
4. **Time to Wrap Up** — Complete the event when all items have been tasted and rated

**Paused State**:

1. **Event is Paused** — Ratings are temporarily disabled for your guests
2. **Assign Item IDs** — This is the only time you can assign real item identifiers to the numbered items
3. **Resume or Finish** — Resume to continue tasting, or complete the event if you're done

**Completed State**:

1. **It's a Wrap!** — Your event is complete and results are in
2. **View the Dashboard** — See how everyone rated each item and which ones came out on top
3. **Export Your Data** — Download ratings, user data, and item details as spreadsheets
4. **Want to Reopen?** — You can restart or pause the event again if you need to

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The admin guide entry point is visible on 100% of admin page views
- **SC-002**: The admin guide correctly displays state-appropriate content for all four event states (created, started, paused, completed)
- **SC-003**: An admin can read through the complete guide for any single state in under 2 minutes
- **SC-004**: Each individual step fits on a single mobile screen (no scrolling within a step) at 320px minimum width
- **SC-005**: An admin who follows the setup guide can successfully configure and start an event without consulting external help (validated via manual walkthrough testing)
- **SC-006**: The guide's state-dependent warnings (locked settings) are visible and comprehensible before the admin transitions out of the "created" state (validated via manual testing)
- **SC-007**: The guide achieves a passing accessibility audit: zero critical ARIA violations when validated manually (correct `role`, `aria-modal`, `aria-label`, `aria-hidden` attributes; full keyboard navigability via Escape, ArrowLeft, ArrowRight)

## Assumptions

- The admin guide is scoped exclusively to the event admin page and does not appear on any other page in the application.
- The existing hosting guide (feature 013) remains unchanged and continues to serve its role as a global, pre-event conceptual guide. The admin guide is a separate, complementary feature.
- Guide content is static per state (not personalized based on which settings the admin has already configured). Content updates require a code change.
- Visual elements for each step will use icons or simple illustrations, consistent with the existing hosting guide pattern.
- The admin guide does not require any new backend endpoints — it reads the event state from the existing event data already available on the admin page.
- The event state is the sole determinant of which content path the guide displays. There are no sub-paths within a state.
- No analytics or event tracking is included in this feature. Success criteria are validated through manual testing and observation.
- The admin guide pattern should be consistent with the existing hosting guide (bottom sheet drawer, step cards, swipe navigation) to maintain UX consistency across the application.
- The Danger Zone settings (delete users, delete ratings, delete event) are intentionally excluded from the admin guide. These actions already have in-UI confirmation dialogs and should not be presented as routine walkthrough steps.
