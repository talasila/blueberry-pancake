# Research: Hosting Guide

**Feature**: 013-hosting-guide  
**Date**: 2026-02-25

## Research Items

### 1. Swipe Gesture Handling for Step Navigation

**Context**: FR-006 requires swipe left/right gestures plus visible buttons for step navigation within the bottom sheet drawer. The existing codebase has no gesture library.

**Decision**: Custom touch event handling with CSS transitions

**Rationale**: The swipe detection needed is minimal — horizontal left/right on a set of fixed-width cards, with a threshold to distinguish swipe from scroll. This is a ~30-line implementation using `touchstart`/`touchmove`/`touchend` events with a configurable distance threshold. The existing app uses no gesture libraries and follows a pattern of inline touch handling (e.g., `touch-manipulation` CSS class, `touchstart` in `DropdownMenu.jsx`). Adding a full gesture library for this use case violates YAGNI (highest priority principle).

**Alternatives considered**:

| Library | Bundle Size | Verdict |
|---------|-------------|---------|
| `@use-gesture/react` | ~14KB gzipped | Comprehensive but overkill for left/right swipe only |
| `react-swipeable` | ~3KB gzipped | Swipe detection only, still need to build card transitions |
| `embla-carousel-react` | ~5KB gzipped | Full carousel — powerful but adds complexity for a simple stepper |
| Custom touch events | 0KB (no dependency) | Minimal, follows existing codebase patterns, easily testable |

**Implementation approach**:
- Track `touchstart` X position
- On `touchend`, calculate delta X
- If delta exceeds threshold (50px), trigger step change in the corresponding direction
- Card transitions via CSS `transform: translateX()` with `transition-transform duration-300 ease-out`
- Prevent vertical scroll interference with `touch-action: pan-y` on the swipe container

### 2. Bottom Sheet Drawer Pattern

**Context**: FR-002 requires a bottom sheet drawer. The app already has `RatingDrawer.jsx` as a proven pattern.

**Decision**: Adapt the existing `RatingDrawer` pattern for the guide drawer

**Rationale**: The `RatingDrawer` implements exactly the pattern needed: backdrop with fade animation, slide-up from bottom with `translate-y` transition, `max-h-[75vh]`, `z-40`/`z-50` layering, proper ARIA attributes, and a close-on-backdrop-click behavior. Reusing this pattern ensures visual and behavioral consistency (Constitution Principle VI).

**Adaptations needed**:
- Content area: Replace form/message content with step card carousel
- Header: Replace item title with guide title + back-to-role-selection button
- Height: May need to increase to ~85vh to fit step card content (heading + description + visual + navigation controls)
- Body scroll prevention: Add `document.body.style.overflow = 'hidden'` (like SideDrawer)

### 3. Floating Action Button Placement

**Context**: FR-001 requires an always-visible floating button on every page.

**Decision**: Fixed-position button in the bottom-right corner, injected at the `AppLayout` level in `App.jsx`

**Rationale**: Bottom-right is the standard mobile FAB position (reachable by right thumb, doesn't conflict with header). Injecting in `AppLayout` (sibling to `<Header />`) ensures visibility on every page regardless of route or auth state. Z-index should be above page content but below the guide drawer and header (`z-30`).

**Positioning details**:
- Position: `fixed bottom-6 right-6` (24px from edges)
- Size: 48px × 48px (meets 44px minimum touch target)
- Z-index: `z-30` (below drawer backdrop `z-40`, below header `z-[9999]`)
- Hidden when guide drawer is open (avoid stacking)

### 4. Auth State for Contextual CTAs

**Context**: FR-012 and FR-013 require contextual CTAs based on authentication state.

**Decision**: Use existing `apiClient.isAuthenticated()` method

**Rationale**: The app already has a proven auth check pattern. The guide component imports `apiClient` and calls `isAuthenticated()` to determine which CTA to show. This is a read-only check with no security implications (the CTA simply changes the navigation target, not access control).

**CTA routing**:
- Host path, unauthenticated → Navigate to `/auth`
- Host path, authenticated → Navigate to `/create-event`
- Guest path → No navigation (informational "ask your host for the link" message)

### 5. Guide Content Data Structure

**Context**: The guide needs 8 host steps and 4 guest steps, each with a heading, description, and visual element reference.

**Decision**: Static JavaScript data file at `frontend/src/data/guideContent.js`

**Rationale**: Keeps content separate from presentation components. Easy to update, easy to test. No backend dependency. A plain JS object with arrays of step objects is the simplest structure.

**Data shape**:
```javascript
export const guideContent = {
  host: [
    { id: 'host-1', heading: '...', description: '...', icon: 'Wine' },
    // ...8 steps
  ],
  guest: [
    { id: 'guest-1', heading: '...', description: '...', icon: 'PartyPopper' },
    // ...4 steps
  ],
};
```

The `icon` field references a lucide-react icon name, resolved at render time. This avoids importing all icons upfront and keeps the data serializable.
