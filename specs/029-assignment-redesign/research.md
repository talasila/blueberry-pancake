# Research: Assignment Tab Redesign

**Branch**: `029-assignment-redesign` | **Date**: 2026-03-13

## R1: Bottom Sheet Component Pattern

**Decision**: Create a dedicated `BottomSheetPicker` component reusing the existing slide-up pattern from `ItemDetailsDrawer` and `WelcomeBottomSheet`.

**Rationale**: The codebase has no shared BottomSheet component, but the same pattern (fixed bottom, translate-y transition, backdrop) is repeated in `ItemDetailsDrawer`, `WelcomeBottomSheet`, `GuestWelcomeBottomSheet`, and `PersonalityRevealSheet`. Extracting a reusable component aligns with Constitution Principle II (DRY) and gives the assignment feature a proper bottom sheet without adding external dependencies.

**Alternatives considered**:
- **Use a Radix Dialog**: The project already uses Radix primitives, but Radix Dialog renders as a centered modal, not a bottom sheet. Would require significant CSS overrides.
- **Install a bottom sheet library** (e.g., `react-spring-bottom-sheet`): Adds a dependency for a pattern already implemented 4+ times in the codebase. Violates the "leverage existing patterns" approach.
- **Inline the sheet in AssignmentGrid**: Works but misses the opportunity to consolidate existing duplication. The BottomSheetPicker can be used as a reusable primitive.

## R2: Assignment Button vs ItemButton Reuse

**Decision**: Create a thin wrapper `AssignmentButton` that reuses `ItemButton`'s visual style (60px circle, 28px font, 3-col grid with gap-6) but simplifies the props to just `itemId`, `isAssigned`, `isDisabled`, and `onClick`.

**Rationale**: `ItemButton` has props specific to rating (ratingColor, isBookmarked, isWinner, showRing, ratedCount, totalParticipants) that don't apply to assignment. A wrapper passes the relevant visual props (a static color for assigned state) while hiding the rating-specific interface. This avoids polluting `ItemButton` with assignment-specific logic.

**Alternatives considered**:
- **Use ItemButton directly with conditional props**: Technically possible (pass `ratingColor` for assigned state, ignore other props) but makes the calling code harder to read and couples assignment behavior to rating component internals.
- **Fork ItemButton**: Creates duplication. If the button visual changes (e.g., size), it would need updating in two places.

## R3: Shared Component Architecture

**Decision**: Create `AssignmentView` as the single shared component that encapsulates the entire assignment UI (grid, bottom sheet, progress indicator, instructional text, registered bottles list). It accepts `event`, `items`, and callback props.

**Rationale**: The spec requires eliminating ~200 lines of duplication between `EventAdminPage` and `ItemAssignmentPage` (FR-013, US7). A single component with well-defined props can be rendered in both the SideDrawer (EventAdminPage) and the full-page layout (ItemAssignmentPage).

**Alternatives considered**:
- **Custom hook only** (extract logic, keep separate UIs): Reduces logic duplication but not UI duplication. Both pages would still maintain identical JSX.
- **Multiple small components without a parent**: Would require both pages to compose the same set of components in the same order, still creating duplication at the composition level.

## R4: Optimistic UI for Assignment

**Decision**: Close the bottom sheet immediately on tap, optimistically update the button color, and revert on API failure.

**Rationale**: The host is doing rapid-fire data entry (unwrapping bottles in sequence). Waiting for each API round-trip before proceeding would create noticeable friction. The existing `handleAssignItemId` pattern already uses optimistic local state updates followed by error handling.

**Alternatives considered**:
- **Wait for API response before closing sheet**: Safer but introduces a visible delay per assignment. For 10+ bottles, this adds significant friction.
- **Batch assignments locally, save all at once**: Would require a new backend endpoint (violates FR-014). Also riskier — if the batch save fails, all assignments are lost.

## R5: Event Pause from Assignment Tab

**Decision**: Reuse the existing `apiClient.transitionEventState(eventId, 'paused', event.state)` call directly from the `AssignmentView` component when the host taps "Pause Event to Begin Assignment."

**Rationale**: The `EventAdminPage` already has `handleStateTransition` which calls this API. The shared component can accept an `onPauseEvent` callback prop, letting the parent page handle the state transition and event refresh. This keeps the shared component stateless regarding event management.

**Alternatives considered**:
- **Duplicate the transition logic in AssignmentView**: Violates DRY and creates a separate code path for the same operation.
- **Navigate to the State drawer**: Defeats the purpose of the inline pause CTA (US5).
