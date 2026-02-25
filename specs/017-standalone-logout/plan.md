# Implementation Plan: Standalone Page Logout Icon

**Branch**: `017-standalone-logout` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-standalone-logout/spec.md`

## Summary

Replace the hamburger dropdown menu on standalone authenticated pages (`/my-events` and `/create-event`) with a standalone logout icon, matching the existing system-route pattern. The hamburger menu on these pages currently shows two useless items ("My Events" — redundant, "Profile" — broken route) and one useful item ("Logout"). A single-action menu is poor UX; a direct logout icon eliminates the 3-step interaction (open menu → scan → tap) in favor of 1 tap.

The implementation extends the existing `isSystemRoute` conditional in `Header.jsx` to also cover a new `isStandalonePage` boolean. The standalone logout icon reuses the same visual block but calls `handleLogout` (redirect to `/`) instead of `handleRootLogout` (redirect to `/system/login`).

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 18, JSX  
**Primary Dependencies**: React Router DOM, Lucide React (icons)  
**Storage**: N/A — no data changes  
**Testing**: Playwright (E2E)  
**Target Platform**: Web browser (responsive)  
**Project Type**: Web application (frontend only for this feature)  
**Performance Goals**: N/A — no measurable performance impact  
**Constraints**: Single-file change (`Header.jsx`); no new dependencies  
**Scale/Scope**: 2 standalone pages affected; ~10 lines of conditional logic changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | PASS | Extends existing well-structured conditional pattern; no new complexity introduced |
| II. DRY | PASS | Reuses existing logout icon JSX block via conditional handler; does not duplicate markup |
| III. Maintainability | PASS | `isStandalonePage` boolean makes standalone routes explicit and easy to extend |
| IV. Testing | PASS | E2E tests will verify standalone logout icon presence and behavior; regression tests for event/system routes |
| V. Security | PASS | No auth flow changes; logout still clears JWT token and bookmarks |
| VI. UX Consistency | PASS | Standalone pages now match the system-route pattern — consistent single-icon logout |
| VII. Performance | PASS | No additional renders, network calls, or dependencies |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/017-standalone-logout/
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal — no unknowns)
├── data-model.md        # Phase 1 output (N/A — no data changes)
├── quickstart.md        # Phase 1 output (verification guide)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── components/
│       └── Header.jsx        # MODIFIED — add isStandalonePage, extend logout icon conditional
└── tests/
    └── e2e/
        └── specs/
            └── my-events.spec.js  # MODIFIED — add/update tests for standalone logout icon
```

**Structure Decision**: Frontend-only change. Single component file modified (`Header.jsx`). Existing E2E test file updated to cover new behavior. No new files created in source code.

## Design

### Change Analysis

The existing `Header.jsx` has three rendering branches for the right side of the header:

1. **System routes** (`isSystemRoute`): Standalone `LogOut` icon → calls `handleRootLogout` (redirects to `/system/login`)
2. **Authenticated non-landing pages** (`!isLandingPage && !isSystemRoute`): Hamburger `DropdownMenu` with contextual items
3. **Landing page / unauthenticated**: Nothing rendered

The problem is that branch 2 applies to *all* non-system authenticated pages, including standalone pages where the menu items are irrelevant. The fix introduces a third category:

1. **System routes**: Standalone `LogOut` icon → `handleRootLogout` (unchanged)
2. **Standalone pages** (`/my-events`, `/create-event`): Standalone `LogOut` icon → `handleLogout` (redirects to `/`)
3. **Event pages**: Hamburger `DropdownMenu` (unchanged)
4. **Landing page / unauthenticated**: Nothing (unchanged)

### Implementation Approach

Add a single `isStandalonePage` boolean derived from `location.pathname`:

```javascript
const isStandalonePage = ['/my-events', '/create-event'].includes(location.pathname);
```

Modify the existing system-route logout icon block to also render for standalone pages, with a conditional click handler:

- If `isSystemRoute` → call `handleRootLogout`
- If `isStandalonePage` → call `handleLogout`

Suppress the hamburger menu when `isStandalonePage` is true by adding it to the dropdown's render condition.

### Dead Code Cleanup

After this change, `handleMyEventsClick` is no longer reachable from any standalone page (it was only in the dropdown menu which is now suppressed on standalone pages). However, it remains reachable from event-page menus (when `authMethod === 'otp'`), so it must be retained.

The `List` import from Lucide React is still used in the dropdown menu for event pages, so it also remains.

No dead code is introduced or exposed by this change.
