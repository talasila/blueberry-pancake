# Research: Guide Redesign

**Branch**: `038-guide-redesign` | **Date**: 2026-03-20

## R1: Existing Guide Architecture

### Decision: Three drawer components share a common pattern that can be consolidated

**Rationale**: All three drawers (`AdminGuideDrawer`, `WalkthroughDrawer`, `GuideDrawer`) use identical animation patterns (10ms mount delay + 350ms unmount), body scroll lock, backdrop overlay, and `isOpen`/`onClose` prop interface. The new `EventGuideDrawer` can reuse these patterns directly.

**Alternatives considered**:
- Building the new drawer from scratch — rejected because the existing animation and accessibility patterns are proven and consistent with the rest of the app.

### Key findings:

- **AdminGuideDrawer**: Reads `event.state` from `useEventContext()`, loads content via `adminGuideContent[eventState]`. Uses overview mode (table of contents) and detail mode (single step card with prev/next navigation). Has keyboard navigation (Escape, ArrowLeft/Right) and full ARIA support.
- **WalkthroughDrawer**: Structurally identical to AdminGuideDrawer but with static 6-step content. Triggered from AdminGuideDrawer (step 0 CTA) and WelcomeBottomSheet ("How does it work?" button). Has browser back button support.
- **GuideDrawer**: Adds a role selection layer (`GuideRoleSelect`) before showing content. Host path has a CTA button on the last step that navigates to `/create-event`. Guest path has a static message.
- **App.jsx**: Manages `guideOpen` and `adminGuideOpen` state. Uses `guideVariant` memo ('admin' | 'hosting' | null) based on route. Passes `onToggleGuide` to Header.
- **Header.jsx**: Shows BookOpen icon for admin routes, HelpCircle for hosting routes. Falls back to hamburger menu item on narrow viewports.

## R2: Component Reuse Assessment

### Decision: GuideStepCard needs modification; GuideProgress and GuideNavigation do not apply

**Rationale**: The new design is a scrollable list with expand/collapse, not a carousel. The carousel-specific components (dot progress, prev/next navigation with swipe) don't fit the new pattern.

**Component-by-component assessment**:

| Component | Reuse? | Reason |
|-----------|--------|--------|
| GuideStepCard | Modify | Currently always-expanded, no interactive state. Needs expand/collapse toggle and step-type indicator (real-world vs in-app). |
| GuideProgress | No | Dot-based carousel progress (`1 of 8`). New design uses visual states on steps themselves, not a separate progress bar. |
| GuideNavigation | No | Carousel prev/next buttons + swipe gestures. New design is a scrollable list — navigation is native scroll. |
| GuideRoleSelect | Keep | Used by GuideDrawer (which stays). No changes needed. |

**Alternatives considered**:
- Keeping GuideProgress as a summary indicator (e.g., "3 of 17 steps complete") — rejected per spec D7 (no condensed view) and because the done/now/ahead visual states already communicate progress inline.
- Adapting GuideNavigation for scroll-to-section — rejected because native scroll with auto-scroll to "now" section (FR-009a) is simpler and more standard for a list UI.

## R3: "You Are Here" State Mapping Implementation

### Decision: Pure function mapping event state to step ranges

**Rationale**: The mapping is static and deterministic — no computed state needed. A simple lookup from event lifecycle state to step index ranges is the clearest implementation.

**Mapping**:
```
created  → done: 1-6,   now: 7-10,  ahead: 11-17
started  → done: 1-10,  now: 11,    ahead: 12-17
paused   → done: 1-11,  now: 12-16, ahead: 17
completed → done: 1-16, now: 17,    ahead: (none)
```

**Alternatives considered**:
- Computing step state from a combination of event state + individual step completion — rejected per spec D6 (lifecycle state only).
- Storing the mapping in the content data — rejected because it's a display concern, not a content concern.

## R4: Auto-Scroll Behavior

### Decision: Use scrollIntoView on the first "now" step after mount animation completes

**Rationale**: The guide opens with a CSS transition (300ms). Scrolling before the animation completes causes visual jank. Waiting for the mount animation to finish (matching the existing 10ms + animation pattern) ensures smooth scroll.

**Alternatives considered**:
- Scroll immediately on mount — rejected because the drawer hasn't finished its entrance animation yet.
- Use `scrollTo` with absolute position — rejected because `scrollIntoView` handles varying step heights and is simpler.

## R5: Phase Section Headers

### Decision: Phase headers are non-interactive visual dividers in the step list

**Rationale**: Phase headers provide scanning structure for 17 steps. They are purely visual (not expandable, not tappable) — they exist to label groups, not to function as accordion sections.

**Alternatives considered**:
- Collapsible phase groups (accordion) — rejected because the spec requires all steps visible and individual step expand/collapse (FR-004), not group-level collapse.
- Phase tabs — rejected because the spec requires a single scrollable list (D2), not tabbed views.

## R6: WelcomeBottomSheet Update

### Decision: "How does it work?" button should open the new EventGuideDrawer instead of WalkthroughDrawer

**Rationale**: The WalkthroughDrawer is being removed. The EventGuideDrawer serves the same purpose (end-to-end overview) but with richer content. The WelcomeBottomSheet already receives `onOpenAdminGuide` from EventAdminPage — this callback can be reused to open the new guide.

**Alternatives considered**:
- Remove the "How does it work?" button entirely — rejected because first-time admins arriving via the welcome sheet still benefit from a "learn more" entry point.
- Keep the walkthrough as a separate lightweight overlay — rejected per spec D1 (one guide replaces both).

## R7: Test Strategy

### Decision: Rewrite unit tests for new content structure; rewrite E2E tests for new drawer behavior

**Rationale**: The content data structure changes (state-keyed → single array with phases). The E2E tests need to verify the scrollable list with done/now/ahead states instead of the carousel with state-switching.

**Existing test patterns to preserve**:
- Unit tests (Vitest): Data integrity validation — step counts, required fields, icon validation, ID uniqueness
- E2E tests (Playwright): Role=dialog selectors, aria-label patterns, heading content verification, state transition helpers

**What changes**:
- Unit: Test `eventGuideContent` (17 steps, 4 phases, step type field) instead of `adminGuideContent` (20 steps across 4 states)
- E2E: Test scrollable list with visual states instead of carousel navigation. Test auto-scroll behavior. Test phase headers. Remove overview-mode tests (no overview toggle in new design).
