# Implementation Plan: Dashboard Summary Redesign

**Branch**: `033-dashboard-summary-redesign` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-dashboard-summary-redesign/spec.md`

## Summary

Redesign the Dashboard Summary tab from a flat 2×2 grid of identical `StatisticsCard` components into a narrative highlight reel with visual hierarchy. Introduce a top-rated bottle hero card, full-width progress bar, global average rating, "Most Divisive" card (renamed from "Most Controversial"), and a personality summary strip. Remove "Least Controversial" and "Ratings per Bottle" cards. Apply color accents to each card for visual interest. Frontend-only changes — no backend modifications.

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 18, Node.js  
**Primary Dependencies**: React, react-router-dom, shadcn/ui (Card, Tabs, Progress), Tailwind CSS v4, lucide-react  
**Storage**: N/A (reads from existing backend API)  
**Testing**: Vitest (unit), Playwright (e2e)  
**Target Platform**: Mobile-first web (responsive)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: No new API calls — all data already fetched by `dashboardService.getDashboardData()`  
**Constraints**: Frontend-only; no changes to `DashboardService.js` or any backend file  
**Scale/Scope**: 1 page (`DashboardPage.jsx`), 1 enhanced component (`StatisticsCard.jsx`), 1 new component (`PersonalitySummaryStrip`), e2e + unit test updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Clean implementation with clear component boundaries |
| II. DRY | PASS | Reuses existing `StatisticsCard` with new `accentColor` prop; personality strip is a new standalone component to avoid bloating `DashboardPage` |
| III. Maintainability | PASS | Dead code from removed cards explicitly cleaned up (FR-010); doc comment updated |
| IV. Testing Standards | PASS | E2e tests updated for new labels/layout; unit tests expanded for new Summary tab features |
| V. Security | PASS | No new data exposure; same access control (admin or completed event) |
| VI. UX Consistency | PASS | Uses theme colors + chart variables; Tailwind utility classes only — no inline styles for colors |
| VII. Performance | PASS | No new API calls; all computation derived from existing `dashboardData` response |

## Project Structure

### Documentation (this feature)

```text
specs/033-dashboard-summary-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (empty — no API changes)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   └── DashboardPage.jsx          # PRIMARY — Summary tab layout rewrite
│   ├── components/
│   │   ├── StatisticsCard.jsx          # MODIFY — add accentColor prop
│   │   └── PersonalitySummaryStrip.jsx # NEW — personality aggregation strip
│   └── utils/
│       └── personalityContent.js       # READ-ONLY — import PERSONALITY_CONTENT for icons
├── tests/
│   ├── e2e/specs/
│   │   └── dashboard.spec.js           # UPDATE — summary stat assertions
│   └── unit/
│       └── DashboardPage.test.jsx      # UPDATE — expand for new Summary tab features

backend/
└── (no changes)
```

**Structure Decision**: Existing web application layout. Changes are concentrated in the frontend; one new component (`PersonalitySummaryStrip.jsx`) and modifications to two existing files (`DashboardPage.jsx`, `StatisticsCard.jsx`).

## Complexity Tracking

No constitution violations — no entries required.
