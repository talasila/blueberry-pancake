# Implementation Plan: Guest List Filter Redesign

**Branch**: `037-guest-filter-redesign` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/037-guest-filter-redesign/spec.md`

## Summary

Replace the ambiguous "All" / "Registered" / "Not registered" filter buttons on the admin People tab with a labeled segmented control: "{Item} registered?" with "Any" / "Yes" / "No" options. Move the refresh icon from the filter line to the search field line. Pure frontend change — single file modification plus test updates.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0
**Primary Dependencies**: React 19.2.1, Radix UI, Tailwind CSS 4.1.17
**Storage**: N/A — no backend changes
**Testing**: Vitest + @testing-library/react
**Target Platform**: Web (browser)
**Project Type**: Web application (React SPA)
**Performance Goals**: N/A — trivial UI relabeling
**Constraints**: Must use existing `useItemTerminology` hook for item-type-aware label
**Scale/Scope**: 1 file modified (EventAdminPage.jsx), 1 test file updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Small, focused change within existing component |
| II. DRY | PASS | Reuses existing `useItemTerminology` hook — no new abstractions |
| III. Maintainability | PASS | Replaces confusing labels with self-documenting ones |
| IV. Testing Standards | PASS | Existing EventAdminPage tests updated for new labels |
| V. Security | PASS | No security surface — frontend label change only |
| VI. UX Consistency | PASS | Segmented control uses existing Button components; label follows question pattern |
| VII. Performance | PASS | No performance impact — same number of renders, same filter logic |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/037-guest-filter-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── pages/
│       └── EventAdminPage.jsx      # MODIFY: filter labels, layout restructure
└── tests/
    └── unit/
        └── EventAdminPage.test.jsx # UPDATE: test new filter labels and layout
```

**Structure Decision**: Single file modification. No new files, no new components, no backend changes. The `useItemTerminology` hook is already imported in EventAdminPage.jsx. No data-model.md or contracts/ needed — this is a pure UI relabeling.
