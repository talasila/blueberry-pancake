# Research: Post-Creation Welcome Bottom Sheet

**Feature**: Post-Creation Welcome Bottom Sheet  
**Date**: 2026-02-27  
**Purpose**: Resolve technical unknowns and document design decisions

## Decision 1: Bottom Sheet Implementation Pattern

**Decision**: Reuse the existing `AdminGuideDrawer` animation and backdrop pattern rather than introducing a new library.

**Rationale**: The `AdminGuideDrawer` component already implements a mobile-friendly bottom sheet with the exact behavior we need: slides up from the bottom with `translate-y-full` → `translate-y-0`, dimmed backdrop at `bg-black/50`, body scroll prevention, and `max-h-[85vh]` height constraint. Building a new `WelcomeBottomSheet` component using the same CSS/animation approach ensures visual consistency and avoids adding a dependency.

**Alternatives considered**:
- **Radix UI Dialog**: Already in the project but styled as centered modals, not bottom sheets. Would require significant style overrides to get bottom-sheet behavior.
- **Third-party bottom sheet library** (e.g., `react-spring-bottom-sheet`, `vaul`): Adds a new dependency for a single-use component. The existing pattern is sufficient.

## Decision 2: Drawer State Integration

**Decision**: The `WelcomeBottomSheet` component will live inside `EventAdminPage` and receive `setOpenDrawer` directly, since it's already local state on that page (line 128: `const [openDrawer, setOpenDrawer] = useState(null)`).

**Rationale**: The bottom sheet's customization rows need to open the Items (`'items'`), Ratings (`'ratings-configuration'`), and Administrators (`'administrators'`) drawers. Since `openDrawer` state is local to `EventAdminPage`, the simplest approach is to render the bottom sheet within that component and pass `setOpenDrawer` as a prop. No context or state lifting is needed.

**Alternatives considered**:
- **Lifting drawer state to a context**: Overengineered for a single consumer. The bottom sheet is only used on the admin page.
- **Emitting custom events**: Fragile and harder to test than passing a callback.

## Decision 3: Admin Guide Drawer Integration

**Decision**: Pass an `onOpenAdminGuide` callback from `App.jsx` through to `EventAdminPage`, mirroring how `onToggleGuide` is already passed to the `Header` component.

**Rationale**: The `AdminGuideDrawer` open/close state lives in `App.jsx` (`adminGuideOpen`). The Header already receives `onToggleGuide` to control this. To let the bottom sheet's "Show me the setup guide" link open the guide, `EventAdminPage` needs the same callback. The cleanest approach is to pass it as a prop through the route hierarchy.

**Alternatives considered**:
- **Programmatically clicking the guide icon**: Fragile, depends on DOM structure, and breaks test isolation.
- **Shared context for guide state**: Possible, but adds indirection for a simple prop-pass. The existing pattern (prop from App.jsx → child) is already used for the Header.

## Decision 4: Clipboard Copy Pattern

**Decision**: Reuse the existing clipboard copy pattern from the PIN management drawer: `navigator.clipboard.writeText()` + local boolean state + 2-second auto-reset.

**Rationale**: This pattern is already used in two places on the admin page (event link copy and PIN copy). Using the same approach for the bottom sheet's PIN copy button ensures consistent behavior and visual feedback.

**Alternatives considered**: None — the existing pattern is well-established in the codebase.

## Decision 5: Location State Consumption

**Decision**: Replace the existing toast `useEffect` (lines 197-204 in `EventAdminPage.jsx`) with bottom sheet visibility state. The same `location.state?.eventCreated` flag triggers the bottom sheet instead of the toast. The `window.history.replaceState` call moves to the bottom sheet's dismiss handler to clear the flag.

**Rationale**: The location state mechanism is already proven and tested. The only change is what it triggers — a bottom sheet instead of a toast. Moving `replaceState` to the dismiss handler ensures the flag is cleared when the user interacts with the bottom sheet, not when the page loads.

**Alternatives considered**:
- **New location state key**: Unnecessary — `eventCreated` is already the right semantic flag.
- **sessionStorage persistence**: Would cause the bottom sheet to reappear on refresh, which contradicts the spec edge case requirement.
