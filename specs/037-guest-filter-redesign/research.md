# Research: Guest List Filter Redesign

**Feature**: 037-guest-filter-redesign
**Date**: 2026-03-19

## Research Findings

### 1. Item terminology for the filter label

**Decision**: Use `useItemTerminology(event).singular` to build the label: `${singular} registered?`.

**Rationale**: The `useItemTerminology` hook is already imported and used in EventAdminPage.jsx (for the search placeholder). For wine events it returns `singular: "Bottle"`, for other events `singular: "Item"`. This produces "Bottle registered?" for wine and "Item registered?" as the fallback — exactly what the spec requires. No new mapping needed.

**Alternatives considered**:
- Using `typeOfItem` directly (e.g., "Wine registered?"): Rejected — "wine" is the substance, not the physical item being registered. "Bottle" is more accurate.
- Hardcoding "Bottle registered?": Rejected — doesn't scale to non-wine events.

### 2. Layout restructure approach

**Decision**: Move the refresh `<Button>` from the filter `<div>` into the search `<div>`, making it a sibling of the `<Input>` within a flex container. The filter line becomes its own `<div>` with the label and segmented control.

**Rationale**: The current structure has search in one `<div>` and filters + refresh in another. The change is a simple DOM rearrangement — wrap the search `<div>` and refresh button in a new flex container, then give the filter its own line with the label.

**Alternatives considered**:
- Putting the refresh icon inside the search input (as a trailing icon): Rejected — the search input uses a `relative` positioning layout with the search icon; adding a trailing button inside complicates the input layout unnecessarily.

### 3. Filter value mapping

**Decision**: Keep the internal state values as `'all'`, `'registered'`, `'unregistered'` — only change the display labels. The filter logic at lines 988-993 stays untouched.

**Rationale**: The state values are internal and never shown to users. Changing them would require updating the filter logic, the `useMemo` dependencies, and potentially test assertions for no user-facing benefit. Only the rendered labels change.
