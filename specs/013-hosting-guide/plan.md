# Implementation Plan: Hosting Guide

**Branch**: `013-hosting-guide` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-hosting-guide/spec.md`

## Summary

Add a globally accessible "How to Host a Blind Wine Tasting Party" help guide, presented as a bottom sheet drawer triggered by a floating action button visible on every page. The guide provides two role-specific paths ("I'm Hosting" / "I'm a Guest") with swipeable, bite-sized visual step cards. This is a frontend-only feature with no backend changes — all content is static and bundled with the app.

## Technical Context

**Language/Version**: JavaScript (ES2022+), Node.js >=22.12.0  
**Primary Dependencies**: React 19.2, react-router-dom 7.10, Tailwind CSS 4.1, lucide-react 0.556, tailwindcss-animate 1.0  
**New Dependency**: None — swipe handled via custom touch events (see [research.md](./research.md))  
**Storage**: N/A (static content, no persistence)  
**Testing**: Playwright E2E tests (existing pattern in `frontend/tests/e2e/`), component unit tests via Vitest  
**Target Platform**: Mobile-first web app (minimum 320px viewport)  
**Project Type**: Web application (frontend-only change)  
**Performance Goals**: Guide opens in under 300ms; step transitions feel instant (<100ms perceived)  
**Constraints**: Bottom sheet max-height 85vh (sized for guide content readability — see [research.md](./research.md)); each step card must fit without scrolling  
**Scale/Scope**: 12 static content cards (8 host + 4 guest), 1 floating button, 1 bottom sheet component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New components follow existing patterns (drawer, button, overlay). Single-responsibility components. |
| II. DRY | PASS | Reuses existing drawer animation pattern, icon library, auth check. Guide content stored as a single data structure, not duplicated across components. |
| III. Maintainability | PASS | Guide content separated from presentation logic. Step data is a declarative array, easy to update. Dead code cleanup: N/A (new code only). |
| IV. Testing Standards | PASS | E2E tests for all user stories. Unit tests for guide step data and navigation logic. |
| V. Security | PASS | No user data handled. Auth state checked for CTA routing only (read-only check via existing `apiClient.isAuthenticated()`). |
| VI. UX Consistency | PASS | Uses existing Tailwind design system, lucide icons, bottom sheet pattern matching RatingDrawer. No inline styles. |
| VII. Performance | PASS | Static content, no API calls. No new dependencies. Lazy-loadable component. Icons from existing bundle. |

**Gate result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/013-hosting-guide/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no data model)
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
│   │   │   ├── GuideButton.jsx        # Floating action button (entry point)
│   │   │   ├── GuideDrawer.jsx        # Bottom sheet drawer (overlay container)
│   │   │   ├── GuideRoleSelect.jsx    # Role selection screen ("I'm Hosting" / "I'm a Guest")
│   │   │   ├── GuideStepCard.jsx      # Individual step card (heading, description, visual)
│   │   │   ├── GuideProgress.jsx      # Progress indicator (dots/step counter)
│   │   │   └── GuideNavigation.jsx    # Next/Back buttons + swipe handler
│   │   └── ...existing components
│   ├── data/
│   │   └── guideContent.js            # Static step data for host and guest paths
│   └── App.jsx                        # Modified: add GuideButton globally
└── tests/
    └── e2e/
        └── specs/
            └── hosting-guide.spec.js  # E2E tests for guide feature
```

**Structure Decision**: Frontend-only, new `guide/` component directory follows the existing component organization pattern. Static content in `data/` keeps content separate from presentation. GuideButton is injected in `App.jsx` at the AppLayout level (sibling to Header) for global visibility.

## Complexity Tracking

| Decision | Principle Tension | Justification |
|----------|-------------------|---------------|
| Custom touch event swipe handler instead of `@use-gesture/react` or similar | Constitution II (DRY) prefers battle-tested packages | YAGNI: only horizontal swipe with a 50px threshold is needed. ~15 lines of `touchstart`/`touchend` vs adding a dependency. Documented in [research.md](./research.md). |
