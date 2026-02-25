# Research: Admin Guide

**Feature**: 014-admin-guide  
**Date**: 2026-02-25

## Research Items

### 1. Reuse of Existing Guide Presentation Components

**Context**: The admin guide needs the same visual pattern as the hosting guide (bottom sheet drawer, step cards, progress indicator, swipe navigation). The existing codebase has `GuideStepCard`, `GuideProgress`, and `GuideNavigation` components.

**Decision**: Reuse all three presentation components without modification

**Rationale**: These components are already generic — they accept step data (heading, description, icon) and navigation state (currentStep, totalSteps, callbacks) as props. They have no hosting-guide-specific logic. Duplicating them would violate Constitution Principle II (DRY).

**Components reused**:
| Component | Props | Admin Guide Usage |
|-----------|-------|-------------------|
| `GuideStepCard` | `{ step: { id, heading, description, icon } }` | Identical — admin content uses the same shape |
| `GuideProgress` | `{ currentStep, totalSteps }` | Identical |
| `GuideNavigation` | `{ currentStep, totalSteps, onPrev, onNext, children }` | Identical — includes swipe handling |

**Not reused**:
- `GuideRoleSelect` — hosting guide concept (host/guest), not applicable to admin guide
- `GuideDrawer` — too tightly coupled to hosting guide logic (role selection, auth-based CTAs)

### 2. Event State Access Pattern

**Context**: The admin guide must detect the event's lifecycle state to show appropriate content. FR-003 and FR-018 require reading the current state each time the guide opens.

**Decision**: Read event state from the existing `useEventContext()` hook

**Rationale**: The `EventAdminPage` already consumes `useEventContext()` to access `event.state`. The event data is kept fresh via polling in `EventContextProviderForRoute` (App.jsx). No additional API calls are needed — the guide simply reads `event.state` from the context that's already available on admin pages.

**State values**: `created` | `started` | `paused` | `completed` (from `eventState.jsx`)

**Edge case — state change while guide is open**: Since the EventContext updates via polling, `event.state` will reflect the latest server state. The admin guide should react to state changes by re-reading `event.state` at render time (not caching it at open time). If the state changes while the guide is open, the content should update to match the new state.

### 3. FAB Coexistence Strategy

**Context**: The hosting guide has a global FAB rendered in App.jsx's `AppLayout`. The admin guide FAB must replace it on admin pages only (FR-001, FR-001a, FR-002).

**Decision**: Conditionally hide the hosting guide FAB on admin routes, and render the admin guide FAB inside `EventAdminPage`

**Rationale**: Two options were evaluated:

| Approach | Pros | Cons |
|----------|------|------|
| **A: Pass route-aware flag to GuideButton in App.jsx** | Centralized FAB logic | App.jsx needs route-matching logic, couples App to admin guide feature |
| **B: Hide hosting FAB on admin routes via location check, render admin FAB in EventAdminPage** | Clean separation; admin guide fully self-contained | Two render locations for FABs |

**Chosen: Approach B**. The hosting guide FAB in App.jsx gets a `useLocation()` check to hide itself when the path matches `/event/:id/admin`. The admin guide FAB and drawer are rendered inside `EventAdminPage.jsx`, where `useEventContext()` is already available. This keeps the admin guide feature fully encapsulated within the admin page.

**Implementation**:
- `App.jsx`: Add `isAdminRoute` check based on `location.pathname` ending with `/admin`. Pass it to `GuideButton` as a hide signal (or conditionally render).
- `EventAdminPage.jsx`: Add `AdminGuideButton` + `AdminGuideDrawer` state management (same pattern as App.jsx uses for hosting guide).

### 4. AdminGuideDrawer vs Extending GuideDrawer

**Context**: The hosting `GuideDrawer` manages role selection, step navigation, overview, and auth-based CTAs. The admin guide needs event-state detection instead of role selection, and informational CTAs instead of navigation CTAs.

**Decision**: Create a new `AdminGuideDrawer` component rather than extending `GuideDrawer`

**Rationale**: The two drawers share the same *visual shell* (backdrop, slide-up animation, header, close button, overview, keyboard navigation) but differ in *domain logic*:

| Aspect | GuideDrawer | AdminGuideDrawer |
|--------|-------------|------------------|
| Content selection | Role (host/guest) | Event state (4 states) |
| Data source | `guideContent` | `adminGuideContent` |
| Initial view | Role selection screen | Direct to steps (state is auto-detected) |
| CTA behavior | Navigate to create-event or auth | Informational — close guide, explain where to find the setting |
| Context dependency | `apiClient.isAuthenticated()` | `useEventContext()` |
| Scope | Global (all pages) | Admin page only |

Merging these into one component would require significant conditional branching that reduces clarity. Two focused components (~200 lines each) are more maintainable than one complex component (~350+ lines with interleaved conditionals).

The visual shell (mount/unmount lifecycle, backdrop, animation, keyboard navigation, overview) will be duplicated, but this is a deliberate choice: the lifecycle logic is tightly coupled to each drawer's domain state, and extracting a "base drawer" abstraction adds indirection without meaningful reuse benefit for just two consumers.

### 5. Admin Guide Content Data Structure

**Context**: The admin guide needs 18 steps across 4 event states. Each step needs the same shape as the hosting guide content (to reuse `GuideStepCard`).

**Decision**: New `adminGuideContent.js` file with state-keyed content

**Rationale**: Follows the same pattern as `guideContent.js` but keyed by event state instead of role. The step shape is identical (`{ id, heading, description, icon }`), ensuring `GuideStepCard` works without modification.

**Data shape**:
```javascript
export const adminGuideContent = {
  created: [
    { id: 'created-1', heading: '...', description: '...', icon: 'Edit3' },
    // ...7 steps
  ],
  started: [
    { id: 'started-1', heading: '...', description: '...', icon: 'PlayCircle' },
    // ...4 steps
  ],
  paused: [
    { id: 'paused-1', heading: '...', description: '...', icon: 'PauseCircle' },
    // ...3 steps
  ],
  completed: [
    { id: 'completed-1', heading: '...', description: '...', icon: 'CheckCircle2' },
    // ...4 steps
  ],
};
```

**Step counts**: 7 (created) + 4 (started) + 3 (paused) + 4 (completed) = 18 total, matching the spec's "Guide Content Steps" section.

### 6. CTA Behavior on Final Steps

**Context**: FR-016 specifies that the final step of each state guide includes a contextual CTA that is informational only — it closes the guide and directs the admin to the relevant setting on the admin page. It must not trigger state transitions.

**Decision**: Final-step CTAs are text-only informational messages, not action buttons

**Rationale**: The spec explicitly states CTAs "MUST NOT directly trigger any state transition or configuration change." This means:
- Setup guide final CTA: "Look for the Start Event button in the state management section below"
- Running guide final CTA: "Look for the Complete Event button in the state management section below"
- Paused guide final CTA: "Use Resume or Complete in the state management section below"
- Completed guide final CTA: "You can reopen via the state management section, or export your data"

These are rendered as styled text blocks (like the guest CTA in the hosting guide), not as action buttons. Closing the guide returns focus to the admin page where the admin can find the referenced controls.
