# Research: Event Progress Stepper

## R-001: Confirmation Dialog Component

**Decision**: Add shadcn/ui `AlertDialog` component via `npx shadcn@latest add alert-dialog`.

**Rationale**: The project already uses shadcn/ui components (`accordion`, `badge`, `button`, `card`, `input`, `label`, `sonner`, `switch`, `tabs`). AlertDialog provides accessible, pre-built confirmation UX with proper focus management and keyboard support.

**Alternatives considered**:
- Custom modal: Rejected — violates Constitution Principle II (leverage battle-tested packages).
- Browser `window.confirm()`: Rejected — not themeable, poor mobile UX.
- Existing Delete*Dialog pattern: These require typed confirmation phrases, which is too heavy for state transitions.

## R-002: Stepper Visual Pattern

**Decision**: Build a custom 4-step horizontal stepper using Tailwind utility classes and existing project conventions (no external stepper library).

**Rationale**: The stepper is simple (4 fixed steps, linear layout, no branching). Adding a stepper library for 4 circles + connectors would be over-engineering. The component is ~80 lines of JSX with Tailwind classes, consistent with the project's component style.

**Alternatives considered**:
- `react-stepper-horizontal`, `@mui/material Stepper`: Rejected — adds a dependency for a trivial layout. Constitution Principle II applies to complex problems, not 4-circle layouts.

## R-003: State Label Migration Scope

**Decision**: Update `STATE_CONFIG` labels in `eventState.jsx` from Created/Started/Paused/Completed to Setup/Tasting/Reveal/Results. Since `StateBadge` and `StateIcon` read from `STATE_CONFIG.label`, this single change propagates to all consumers: Header, MyEventsPage, EventAdminPage, AdminGuideDrawer.

**Rationale**: Centralized label source means one change point. No consumer hardcodes state labels — they all go through `getStateConfig(state).label`.

**Impact analysis**:
- `StateBadge` (MyEventsPage, EventAdminPage): Will show new labels automatically.
- `StateIcon` (Header): Being replaced with a colored dot — label not shown.
- `AdminGuideDrawer`: Uses `getStateConfig` for icon/color. `STATE_LABELS` and `CTA_MESSAGES` are local and reference "state management section" — need update to reference stepper.
- E2e tests: Locators like `/state.*created/i` will break. Must update to new labels.

## R-004: eventStateHelpContent.js Deletion

**Decision**: Delete `frontend/src/data/eventStateHelpContent.js` and its test file `frontend/tests/unit/eventStateHelpContent.test.js`.

**Rationale**: Only imported by `EventAdminPage.jsx` (for the State drawer) and its unit test. The State drawer is being removed. `AdminGuideDrawer` uses `adminGuideContent`, not this file.

## R-005: Header Colored Dot Implementation

**Decision**: Replace `StateIcon` component usage in `Header.jsx` with a small `<span>` element styled as a colored dot using the state's existing color from `getStateConfig`. The dot uses `h-2 w-2 rounded-full` sizing.

**Rationale**: Minimal visual footprint while maintaining ambient state awareness. Color mapping already exists in `STATE_CONFIG`.

## R-006: getValidTransitions Location

**Decision**: Move `getValidTransitions` from `EventAdminPage.jsx` (local function) into `eventState.jsx` as a named export. Enrich it to return objects with `{ targetState, label, isPrimary, requiresConfirmation }` instead of plain state strings.

**Rationale**: The stepper component needs transition metadata (button labels, primary vs secondary, confirmation requirement). Centralizing in `eventState.jsx` keeps all state logic in one place and avoids duplication (also used by `ItemAssignmentPage.jsx`).
