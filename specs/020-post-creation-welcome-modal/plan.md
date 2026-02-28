# Implementation Plan: Post-Creation Welcome Bottom Sheet

**Branch**: `020-post-creation-welcome-modal` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-post-creation-welcome-modal/spec.md`

## Summary

Replace the transient toast notification that appears after event creation with a welcome bottom sheet that orients the user by surfacing the event PIN, pre-configured defaults, and shortcuts to customize settings or open the admin guide. This is a frontend-only feature — no backend changes required. The bottom sheet reuses existing animation patterns (`AdminGuideDrawer`), clipboard patterns (PIN copy), and drawer state management (`setOpenDrawer`).

## Technical Context

**Language/Version**: JavaScript (React 19.2.1 with JSX)  
**Primary Dependencies**: React Router DOM 7.10.1, Tailwind CSS 4.1.17, lucide-react 0.556.0, sonner 2.0.7 (toast being removed)  
**Storage**: N/A (reads existing in-memory event state; no new persistence)  
**Testing**: Vitest (unit, @testing-library/react), Playwright (E2E)  
**Target Platform**: Mobile web browser (mobile-primary experience)  
**Project Type**: Web application (frontend only for this feature)  
**Performance Goals**: Bottom sheet visible within 300ms of admin page render (animation duration)  
**Constraints**: No new npm dependencies; reuse existing patterns  
**Scale/Scope**: Single new component (~150-200 LOC), modifications to 2 existing files, 3 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New component follows established patterns; clear props interface |
| II. DRY | PASS | Reuses AdminGuideDrawer animation, existing clipboard copy pattern, existing drawer state management |
| III. Maintainability | PASS | Single-purpose component with clear separation; no dead code introduced |
| IV. Testing | PASS | Unit tests for new component, updated unit tests for admin page, new E2E test for full flow |
| V. Security | PASS | No new security surface; read-only display of existing event data |
| VI. UX Consistency | PASS | Uses same bottom sheet pattern as AdminGuideDrawer; same clipboard feedback; Tailwind classes only |
| VII. Performance | PASS | No API calls; renders from already-loaded event data; animation uses CSS transforms (GPU-accelerated) |

**Post-Phase 1 re-check**: All gates still pass. No new dependencies, no architectural changes, no complexity beyond what's documented.

## Project Structure

### Documentation (this feature)

```text
specs/020-post-creation-welcome-modal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── README.md        # No new API contracts (frontend-only)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── WelcomeBottomSheet.jsx    # NEW — bottom sheet component
│   ├── pages/
│   │   └── EventAdminPage.jsx        # MODIFIED — remove toast, add bottom sheet
│   └── App.jsx                       # MODIFIED — pass onOpenAdminGuide prop
└── tests/
    ├── unit/
    │   ├── WelcomeBottomSheet.test.jsx   # NEW — component unit tests
    │   └── EventAdminPage.test.jsx       # MODIFIED — toast → bottom sheet tests
    └── e2e/
        └── specs/
            └── welcome-bottom-sheet.spec.js  # NEW — E2E test
```

**Structure Decision**: Frontend-only change within the existing web application structure. No new directories needed beyond the spec folder. The new component lives in `frontend/src/components/` alongside existing components like `SideDrawer.jsx`.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
