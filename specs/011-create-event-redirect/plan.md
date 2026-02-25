# Implementation Plan: Redirect to Admin Page After Event Creation

**Branch**: `011-create-event-redirect` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-create-event-redirect/spec.md`

## Summary

Replace the post-creation success modal in `CreateEventPage` with an immediate redirect to `/event/{eventId}/admin` using `react-router-dom`'s `useNavigate` with `replace: true`. Show an enhanced toast (via `sonner`) on the admin page with a next-step hint. Remove all modal-related state and JSX. Update E2E tests to expect the redirect instead of the popup.

## Technical Context

**Language/Version**: JavaScript (ES2022+), Node.js >=22.12.0  
**Primary Dependencies**: React 19, react-router-dom 7, sonner 2, Vite 6, Tailwind CSS 4  
**Storage**: N/A (no backend changes)  
**Testing**: Playwright (E2E), Vitest (unit)  
**Target Platform**: Web (mobile-first, all modern browsers)  
**Project Type**: Web application (frontend-only change)  
**Performance Goals**: Redirect completes within 2 seconds of API response (SC-001)  
**Constraints**: No changes to admin page layout; toast is the only post-creation guidance  
**Scale/Scope**: 2 pages modified, 1 test file updated, ~40 lines removed, ~15 lines added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Removes dead code (modal state + JSX), simplifies component |
| II. DRY | PASS | Uses existing `toast` from sonner (already used in admin page) and `useNavigate` (already in codebase) |
| III. Maintainability | PASS | Removes ~40 lines of modal code; component becomes simpler |
| IV. Testing Standards | PASS | E2E tests updated to verify redirect behavior |
| V. Security | PASS | No security implications; JWT/auth flow unchanged |
| VI. UX Consistency | PASS | Toast pattern matches existing admin page notifications |
| VII. Performance | PASS | Eliminates a user interaction step (modal dismiss); redirect is instantaneous |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/011-create-event-redirect/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (empty — no API changes)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files touched)

```text
frontend/
├── src/
│   └── pages/
│       ├── CreateEventPage.jsx      # MODIFY: replace modal with redirect + toast
│       └── EventAdminPage.jsx       # MODIFY: read location state to trigger toast
└── tests/
    └── e2e/
        └── specs/
            └── create-event.spec.js # MODIFY: update assertions for redirect
```

**Structure Decision**: Frontend-only change touching 3 files. No new files, no new dependencies, no backend changes.
