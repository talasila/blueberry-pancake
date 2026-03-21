# Implementation Plan: Guide Redesign

**Branch**: `038-guide-redesign` | **Date**: 2026-03-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/038-guide-redesign/spec.md`

## Summary

Replace three separate guide systems (admin guide, walkthrough, hosting guide host path) with a single unified event guide. The new guide presents all 17 steps of the blind tasting experience in a scrollable list with phase section headers and a "you are here" marker derived from event lifecycle state. Steps display in three visual states (done/now/ahead) and support expand/collapse. The guide auto-scrolls to the first "now" step on open. The hosting overview is rewritten to summarize the same flow for prospective hosts. The guest guide is unchanged.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1
**Primary Dependencies**: React 19.2.1, Radix UI, Tailwind CSS 4.1.17, lucide-react
**Storage**: N/A (static frontend content, reads existing event state from context)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Mobile-first web app, minimum 320px viewport
**Project Type**: Web application (frontend-only changes for this feature)
**Performance Goals**: Guide opens and scrolls to current step within 500ms. No backend calls.
**Constraints**: All 17 steps must render without horizontal overflow at 320px. Must preserve existing accessibility patterns (ARIA, keyboard nav).
**Scale/Scope**: 17 static guide steps, 4 phases. No dynamic data. Frontend only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | Pass | New components follow existing patterns. Shared step card modified, not duplicated. |
| II. DRY / Reuse | Pass | Three overlapping content files consolidated into one. GuideStepCard reused with expand/collapse added. Drawer animation pattern reused from existing drawers. |
| III. Maintainability | Pass | Dead code (AdminGuideDrawer, WalkthroughDrawer, adminGuideContent, walkthroughContent) is deleted. Single content source replaces three. |
| IV. Testing | Pass | Unit tests rewritten for new content structure. E2E tests rewritten for new drawer behavior. Existing test patterns (Vitest data validation, Playwright role-based selectors) preserved. |
| V. Security | Pass | No user input, no backend changes, no auth changes. Static content only. |
| VI. UX Consistency | Pass | New drawer uses same animation, backdrop, scroll-lock, and accessibility patterns as existing drawers. Tailwind classes for styling (no inline styles). |
| VII. Performance | Pass | Static content, no API calls. Auto-scroll uses native `scrollIntoView`. No performance regression expected. |

**Post-Phase 1 re-check**: All gates still pass. No new violations introduced by data model or component design.

## Project Structure

### Documentation (this feature)

```text
specs/038-guide-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A — no external interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── guide/
│   │   │   ├── EventGuideDrawer.jsx     # NEW — replaces AdminGuideDrawer + WalkthroughDrawer
│   │   │   ├── GuideStepCard.jsx        # MODIFIED — add expand/collapse + step type indicator
│   │   │   ├── GuideDrawer.jsx          # UNCHANGED — continues serving host overview + guest path
│   │   │   ├── GuideRoleSelect.jsx      # UNCHANGED
│   │   │   ├── GuideProgress.jsx        # UNUSED by new guide (carousel-specific), kept for GuideDrawer
│   │   │   └── GuideNavigation.jsx      # UNUSED by new guide (carousel-specific), kept for GuideDrawer
│   │   ├── Header.jsx                   # UNCHANGED — toggle callback and icon work as-is with EventGuideDrawer
│   │   └── WelcomeBottomSheet.jsx       # MODIFIED — replace walkthrough reference, consolidate dual buttons
│   ├── data/
│   │   ├── eventGuideContent.js         # NEW — 17 steps, 4 phases, step types
│   │   └── guideContent.js              # MODIFIED — host path rewritten, guest path unchanged
│   └── pages/
│       └── EventAdminPage.jsx           # MINOR — callback name update if applicable
├── tests/
│   ├── unit/
│   │   ├── eventGuideContent.test.js    # NEW — replaces adminGuideContent.test.js
│   │   └── guideContent.test.js         # MODIFIED — update expected host step count/content
│   └── e2e/
│       └── specs/
│           ├── admin-guide.spec.js      # REWRITTEN — test EventGuideDrawer behavior
│           └── hosting-guide.spec.js    # MODIFIED — update host path expectations
```

**Structure Decision**: Frontend-only changes. No backend modifications. The existing web application structure (`frontend/src/`) is used. New files are added alongside existing guide components; removed files are deleted (not deprecated).

### Files Removed

- `frontend/src/data/adminGuideContent.js` — replaced by `eventGuideContent.js`
- `frontend/src/data/walkthroughContent.js` — absorbed into `eventGuideContent.js`
- `frontend/src/components/guide/AdminGuideDrawer.jsx` — replaced by `EventGuideDrawer.jsx`
- `frontend/src/components/guide/WalkthroughDrawer.jsx` — replaced by `EventGuideDrawer.jsx`
- `frontend/tests/unit/adminGuideContent.test.js` — replaced by `eventGuideContent.test.js`

## Complexity Tracking

No constitution violations. Table intentionally empty.
