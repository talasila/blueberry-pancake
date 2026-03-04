# Implementation Plan: Guest Item Registration Nudge

**Branch**: `025-guest-registration-nudge` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/025-guest-registration-nudge/spec.md`

## Summary

Guests currently land on the event rating page after PIN login with no indication that they can register items. This feature adds two frontend-only components to close the awareness gap: (1) a one-time welcome bottom sheet after PIN verification introducing item registration, and (2) a persistent inline prompt on the event page when the event hasn't started yet. No backend changes are required — all data is already available from the event context.

## Technical Context

**Language/Version**: JavaScript (Node.js >=22.12.0), React 19  
**Primary Dependencies**: React Router DOM 7.10, Tailwind CSS 4.1, Radix UI, lucide-react, sonner  
**Storage**: N/A — no new persistent data. Trigger uses ephemeral `location.state` from React Router.  
**Testing**: Vitest (unit, @testing-library/react) + Playwright (E2E, mobile iPhone 12 viewport)  
**Target Platform**: Mobile-first web (responsive, primarily mobile Safari/Chrome)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: N/A — no new API calls or data fetching. Bottom sheet animation should be smooth (60fps CSS transitions, matching existing pattern).  
**Constraints**: Frontend-only change. Must reuse existing animation/overlay pattern for consistency. Must not affect admin flows.  
**Scale/Scope**: 1 new component, 2 modified files, ~150 lines of new code.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | New component follows established patterns (WelcomeBottomSheet). Clear purpose, single responsibility. |
| II. DRY | ✅ PASS | Animation pattern is reused conceptually from WelcomeBottomSheet. Not extracted into a shared base because content structure differs significantly (see research.md R3). Extraction warranted if a 3rd bottom sheet variant appears. |
| III. Maintainability | ✅ PASS | Modular component with clear props interface. Terminology adapts via existing hook. State-driven visibility with no magic. |
| IV. Testing Standards | ✅ PASS | Unit tests for component rendering, dismiss behavior, admin suppression. E2E tests for full login → bottom sheet → navigation flow. |
| V. Security | ✅ PASS | No new data collected, no new API endpoints, no authentication changes. Admin suppression uses existing role check. |
| VI. UX Consistency | ✅ PASS | Bottom sheet matches existing slide-up + dimmed backdrop pattern. Tailwind classes only — no inline styles. |
| VII. Performance | ✅ PASS | No new API calls. CSS transitions for animation. Deferred rendering until event data is loaded. |

**Gate result**: All principles pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/025-guest-registration-nudge/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Data sources and state transitions
├── quickstart.md        # Development quickstart guide
├── contracts/           # Component contracts (no API contracts)
│   └── README.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── WelcomeBottomSheet.jsx          # EXISTING — reference pattern
│   │   └── GuestWelcomeBottomSheet.jsx     # NEW — guest welcome sheet
│   ├── pages/
│   │   ├── PINEntryPage.jsx                # MODIFY — add location.state
│   │   └── EventPage.jsx                   # MODIFY — wire sheet + inline prompt
│   └── utils/
│       └── itemTerminology.js              # EXISTING — useItemTerminology hook
└── tests/
    ├── unit/
    │   └── components/
    │       └── GuestWelcomeBottomSheet.test.jsx  # NEW — unit tests
    └── e2e/
        └── specs/
            └── guest-registration-nudge.spec.js  # NEW — E2E tests
```

**Structure Decision**: Web application structure. All changes are in `frontend/` — no backend modifications. New component in `components/`, tests in corresponding `tests/unit/` and `tests/e2e/` directories matching existing conventions.

## Implementation Design

### Component 1: GuestWelcomeBottomSheet

**File**: `frontend/src/components/GuestWelcomeBottomSheet.jsx`

**Props**:
- `isOpen: boolean` — controls visibility
- `onDismiss: () => void` — called on skip, overlay tap, or browser back
- `onRegister: () => void` — called on "Register My [Item]" tap
- `event: object` — event object (name, state, typeOfItem)

**Behavior**:
- Reuses the same animation pattern as `WelcomeBottomSheet`: `isMounted`/`isAnimating` state, body scroll lock, `history.pushState`/`popstate` for browser back dismissal.
- Renders event name in heading via `event.name`.
- Uses `useItemTerminology(event)` to get `singular` for the register button label ("Register My Bottle" / "Register My Item").
- Content: five informational bullet points (FR-005 through FR-009) under two sections ("Why register?" and "Good to know").
- Footer: primary `Button` ("Register My [Singular]") + text link ("Skip for now").
- Guards: `if (!isMounted) return null; if (!event) return null;` — defers rendering until event data is available (FR-016).

### Component 2: Inline Registration Prompt (in EventPage)

**Location**: `frontend/src/pages/EventPage.jsx`, within the `event?.state === 'created'` conditional block (currently lines 559-562).

**Behavior**:
- Below the existing "Event has not started yet" `<p>` tag, add a card-style prompt when `!isAdmin`.
- Brief message: "Brought a [singularLower]? Register it so the host can include it in the lineup."
- Button: "Register My [Singular]" → `navigate(`/event/${eventId}/profile`)`.
- Uses `useItemTerminology` (already imported on EventPage) for terminology.
- Visibility: only when `event.state === 'created' && !isAdmin`. Naturally disappears when state changes because the entire conditional block is state-driven.

### Modification: PINEntryPage Navigate

**File**: `frontend/src/pages/PINEntryPage.jsx`

**Change**: In the post-PIN-verification navigate call, add location state:

```
// Before:
navigate(`/event/${eventId}`, { replace: true });

// After:
navigate(`/event/${eventId}`, { state: { guestJustLoggedIn: true }, replace: true });
```

This is a one-line change. The `guestJustLoggedIn` flag is consumed by `EventPage` to trigger the bottom sheet.

### Wiring: EventPage

**File**: `frontend/src/pages/EventPage.jsx`

**Changes**:
1. Import `useLocation` from `react-router-dom` and `GuestWelcomeBottomSheet`.
2. Read `location.state?.guestJustLoggedIn` to initialize `showGuestWelcome` state.
3. Guard with `!isAdmin` and event state (`created` or `started`).
4. Render `GuestWelcomeBottomSheet` at the bottom of the JSX (after existing drawers).
5. On dismiss: set `showGuestWelcome = false`, call `window.history.replaceState({}, document.title)` to clear location state.
6. On register: set `showGuestWelcome = false`, navigate to `/event/${eventId}/profile`.

### Test Plan

**Unit tests** (`GuestWelcomeBottomSheet.test.jsx`):
- Renders with all five content points when `isOpen=true` and event provided
- Does not render when `isOpen=false`
- Does not render when event is null (deferred rendering)
- Calls `onDismiss` when "Skip for now" is clicked
- Calls `onRegister` when register button is clicked
- Register button label adapts to event typeOfItem ("Bottle" vs "Item")
- Displays event name in heading

**E2E tests** (`guest-registration-nudge.spec.js`):
- Guest logs in via PIN → bottom sheet appears with correct content
- Guest taps "Register My Bottle" → navigated to profile page
- Guest taps "Skip for now" → sheet dismissed, event page interactive
- Guest refreshes page → bottom sheet does not reappear
- Admin logs in → no bottom sheet or inline prompt shown
- Event in "created" state → inline prompt visible below status text
- Event in "started" state → no inline prompt
- Guest taps inline prompt button → navigated to profile page

## Complexity Tracking

No constitution violations to justify. All principles pass.
