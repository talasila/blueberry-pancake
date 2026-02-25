# Implementation Plan: Admin Guide

**Branch**: `014-admin-guide` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-admin-guide/spec.md`

## Summary

Add a state-aware admin guide to the event admin page, replacing the global hosting guide FAB with an admin-specific one. The guide detects the event's current lifecycle state (created/started/paused/completed) and shows context-appropriate step-by-step walkthrough content. Reuses existing guide presentation components (GuideStepCard, GuideProgress, GuideNavigation) with a new drawer and data file. Frontend-only — reads event state from the existing EventContext.

## Technical Context

**Language/Version**: JavaScript (ES2022+), Node.js >=22.12.0  
**Primary Dependencies**: React 19.2, react-router-dom 7.10, Tailwind CSS 4.1, lucide-react 0.556, tailwindcss-animate 1.0  
**New Dependency**: None — reuses existing guide components and patterns  
**Storage**: N/A (static content keyed by event state, no persistence)  
**Testing**: Playwright E2E tests (existing pattern in `frontend/tests/e2e/`), component unit tests via Vitest  
**Target Platform**: Mobile-first web app (minimum 320px viewport)  
**Project Type**: Web application (frontend-only change)  
**Performance Goals**: Guide opens in under 300ms; step transitions feel instant (<100ms perceived)  
**Constraints**: Bottom sheet max-height 85vh; each step card must fit without scrolling; event state read from EventContext (no additional API calls)  
**Scale/Scope**: 18 static content cards (7 created + 4 started + 3 paused + 4 completed), 1 FAB (replaces hosting guide FAB on admin pages), 1 bottom sheet component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New AdminGuideDrawer follows GuideDrawer pattern. Reuses existing single-responsibility components (GuideStepCard, GuideProgress, GuideNavigation). |
| II. DRY | PASS | Reuses 3 existing guide components instead of duplicating. Shares FAB pattern with GuideButton. Content data follows same shape as guideContent.js. |
| III. Maintainability | PASS | Admin guide content separated from presentation (new data file). State-to-content mapping is a simple object lookup. Dead code cleanup: N/A (new code only). |
| IV. Testing Standards | PASS | E2E tests for all user stories covering all 4 event states. Unit tests for admin guide content data integrity. |
| V. Security | PASS | No user data handled. Event state read from existing authenticated EventContext. Admin page already requires auth + admin check. |
| VI. UX Consistency | PASS | Same bottom sheet, step card, progress, and navigation patterns as hosting guide. Same Tailwind design system, lucide icons. |
| VII. Performance | PASS | Static content, no API calls. Reuses existing components (already in bundle). No new dependencies. |

**Gate result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/014-admin-guide/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no new data model)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (minimal — no API contracts)
│   └── README.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── guide/
│   │   │   ├── GuideButton.jsx           # Existing (unchanged) — hosting guide FAB (hidden on admin routes via App.jsx)
│   │   │   ├── GuideDrawer.jsx           # Existing (unchanged) — hosting guide drawer
│   │   │   ├── AdminGuideDrawer.jsx      # New: state-aware admin guide drawer
│   │   │   ├── GuideStepCard.jsx         # Existing (unchanged) — reused by admin guide
│   │   │   ├── GuideProgress.jsx         # Existing (unchanged) — reused by admin guide
│   │   │   ├── GuideNavigation.jsx       # Existing (unchanged) — reused by admin guide
│   │   │   └── GuideRoleSelect.jsx       # Existing (unchanged) — hosting guide only
│   │   └── ...existing components
│   ├── data/
│   │   ├── guideContent.js               # Existing (unchanged) — hosting guide content
│   │   └── adminGuideContent.js          # New: state-keyed admin guide content
│   ├── pages/
│   │   └── EventAdminPage.jsx            # Modified: add inline admin guide FAB + AdminGuideDrawer
│   └── App.jsx                           # Modified: hide hosting guide FAB on admin routes
└── tests/
    ├── e2e/
    │   └── specs/
    │       └── admin-guide.spec.js       # New: E2E tests for admin guide
    └── unit/
        └── adminGuideContent.test.js     # New: unit tests for admin guide content
```

**Structure Decision**: Frontend-only. New `AdminGuideDrawer` in the existing `guide/` directory alongside the hosting guide. Admin guide content in a separate `adminGuideContent.js` to keep it independent. The admin guide FAB is rendered inline in `EventAdminPage` (not as a separate component) alongside `AdminGuideDrawer`, since it's scoped to admin pages only. The hosting guide FAB is conditionally hidden on admin routes via App.jsx.

## Complexity Tracking

| Decision | Principle Tension | Justification |
|----------|-------------------|---------------|
| New AdminGuideDrawer instead of extending GuideDrawer | Constitution II (DRY) — could share one drawer | The hosting guide has role selection (host/guest) while the admin guide has state detection (4 states). Merging them into one component would require complex conditional logic that's harder to maintain. Two focused drawers are clearer than one overloaded one. Documented in [research.md](./research.md) §4. |

## Post-Design Constitution Re-check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | AdminGuideDrawer follows established GuideDrawer pattern. Clear separation between content data and presentation. Single-responsibility components. |
| II. DRY | PASS | 3 presentation components reused (GuideStepCard, GuideProgress, GuideNavigation). Content data shape is consistent. Drawer shell duplication justified in Complexity Tracking above. |
| III. Maintainability | PASS | Content in separate data file, easy to update. State-to-content mapping is a simple object lookup. Modular architecture: changing one state's content doesn't affect others. |
| IV. Testing Standards | PASS | Unit tests for content data integrity (all 18 steps, field validation, ID uniqueness, icon validity). E2E tests for all 6 user stories across all 4 event states. |
| V. Security | PASS | No user data handled. Event state read from authenticated context. Admin page already gated by ProtectedRoute + AdminRoute. |
| VI. UX Consistency | PASS | Same bottom sheet, step card, progress, and navigation patterns as hosting guide. Same Tailwind design system, lucide icons. No inline styles. |
| VII. Performance | PASS | Static content, no new API calls. Reuses existing bundled components. No new dependencies. Guide scoped to admin page only (not globally loaded). |

**Post-design gate result**: ALL PASS.
