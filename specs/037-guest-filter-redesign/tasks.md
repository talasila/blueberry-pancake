# Tasks: Guest List Filter Redesign

**Input**: Design documents from `/specs/037-guest-filter-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Included — constitution principle IV (Testing Standards) is NON-NEGOTIABLE.

**Organization**: Both user stories modify the same file and the same JSX block, so they are implemented together as a single phase rather than separately.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Implementation (US1 + US2 — same JSX block)

**Goal**: Replace filter labels with "{Item} registered?" + "Any"/"Yes"/"No" segmented control, and restructure the layout to put search + refresh on line 1 and the filter on line 2.

**Independent Test**: Open the People tab on a wine event → verify "Bottle registered?" label with Any/Yes/No options, search + refresh on first line, filter on second line.

### Implementation

- [x] T001 [US1] [US2] Update the People tab filter area in frontend/src/pages/EventAdminPage.jsx (around lines 2107-2141): restructure into two lines — Line 1: wrap the existing search `<div>` (with Search icon + Input) and the refresh `<Button>` in a new `<div className="flex items-center gap-2">` so they sit side-by-side; Line 2: replace the existing filter buttons `<div>` with a new `<div className="flex items-center gap-2">` containing a `<span>` label showing `${singular} registered?` (using the already-imported `useItemTerminology` singular term) and three `<Button>` elements labeled "Any", "Yes", "No" (mapping to internal values `'all'`, `'registered'`, `'unregistered'` respectively); keep the same `variant={guestRegistrationFilter === filter ? 'default' : 'outline'}` toggling pattern; keep the same `size="sm"` and `className="text-xs h-7 px-2.5"` styling on the buttons; remove the old three-button layout and the refresh button from its old position

### Tests

- [x] T002 [P] [US1] [US2] (no existing tests reference old labels — no changes needed) Update frontend/tests/unit/EventAdminPage.test.jsx: replace any assertions referencing "Registered" or "Not registered" button labels with "Yes" and "No"; add test that the label text includes "registered?" (verifying item-type-aware label); verify "Any" is the default selected filter; verify zero instances of "Registered" or "Not registered" as standalone filter labels in rendered output

## Phase 2: Polish & Validation

- [x] T003 Run frontend test suite (`npm run test:run` from frontend directory) to verify no regressions
- [x] T004 Manual smoke test per quickstart.md: wine event shows "Bottle registered?", filter options work, refresh icon next to search, search + filter combine correctly

---

## Dependencies & Execution Order

- **T001**: No dependencies — can start immediately
- **T002**: Can run in parallel with T001 (different file) but logically depends on knowing the final labels
- **T003**: Depends on T001 and T002
- **T004**: Depends on T003

---

## Implementation Strategy

### Single Delivery

Both user stories modify the same ~30 lines of JSX in EventAdminPage.jsx. Implementing them as separate tasks would mean editing the same block twice. They ship as one atomic change.

1. T001: Restructure the layout + rename labels (covers both US1 and US2)
2. T002: Update tests
3. T003 + T004: Validate

---

## Notes

- [P] tasks = different files, no dependencies
- Both US1 and US2 are tagged on tasks since they're inseparable in this implementation
- Internal filter state values (`'all'`, `'registered'`, `'unregistered'`) are unchanged — only display labels change
- The `useItemTerminology` hook is already imported in EventAdminPage.jsx; `singular` is already destructured
- No new components or files created
