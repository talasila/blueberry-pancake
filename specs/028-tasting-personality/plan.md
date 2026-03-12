# Implementation Plan: Tasting Personality Card

**Branch**: `028-tasting-personality` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-tasting-personality/spec.md`

## Summary

Analyze each guest's rating patterns during a blind tasting event and assign them a humorous "tasting personality" (e.g., "The Simon Cowell," "The Golden Retriever"). A pure detection function evaluates 11 prioritized rules against rating data. Personalities surface on three existing UI surfaces — My Progress drawer, Similar Users drawer, and Dashboard Summary tab — with no new API endpoints or database entities. Quote content follows the same voice as the existing suggested wine notes.

## Technical Context

**Language/Version**: JavaScript (Node.js 22+ / ES Modules), React 19
**Primary Dependencies**: React 19, Vite 6, Tailwind CSS 4, Radix UI, Lucide icons, Express 5, DynamoDB (via @aws-sdk v3)
**Storage**: No new DynamoDB entities. Personality is computed at query time from existing rating records.
**Testing**: Vitest (unit — both frontend and backend), Playwright (e2e)
**Target Platform**: Mobile-first web (modern browsers: Chrome 111+, Safari 16.2+, Firefox 113+)
**Project Type**: Web application (frontend + backend monorepo)
**Performance Goals**: Personality detection adds no perceptible delay to existing drawer load or API response times. Detection function runs in < 1ms for typical event sizes (≤ 20 items, ≤ 30 users).
**Constraints**: No new API endpoints (FR-025). No new database entities (FR-026). Wine events only for initial release (FR-021). Content gated on `event.typeOfItem === "wine"`.
**Scale/Scope**: Events with up to 20 items and dozens of participants. Backend changes to 2 existing services. Frontend changes to 3 existing components + 3 new utility/content files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Personality detection is a pure function — deterministic, side-effect-free, independently testable. Content is separated from logic. Template interpolation is a small shared utility. |
| II. DRY | PASS (with justified exception) | Single detection function shared by DashboardService and SimilarityService on backend. Single content map shared across all 3 frontend surfaces. **Exception**: detection logic is duplicated across backend and frontend (~80 lines) — justified in Complexity Tracking below. |
| III. Maintainability | PASS | Detection rules are data-driven (priority-ordered array), not a chain of if/else. Adding or reordering personalities requires editing the array, not restructuring logic. Content is in a dedicated file, easy to update independently. |
| IV. Testing Standards | PASS | Pure detection function is ideal for unit testing — one test per personality type + edge cases. Frontend rendering tests for each surface. Backend service tests for the new fields in responses. |
| V. Security | PASS | No new endpoints. Personality data is derived from rating data already accessible to authenticated event participants. No PII exposed beyond what existing endpoints already return. |
| VI. UX Consistency | PASS | Personality card uses existing Tailwind utility classes and the app's established card/drawer patterns. No inline styles needed. Typography and spacing follow existing component conventions. |
| VII. Performance | PASS | Detection is O(n) where n = user's ratings (typically ≤ 20). Computed server-side as a side-effect during existing service calls — no additional DB queries. Frontend content map is ~3KB, loaded once. |

**Gate Result**: ALL PASS — proceed to Phase 0.

**Post-Phase 1 Re-check**: ALL PASS — no violations introduced by design decisions.

## Project Structure

### Documentation (this feature)

```text
specs/028-tasting-personality/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── README.md        # Contract documentation
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── services/
│   │   ├── DashboardService.js    # MODIFY: Add noteCount + personality to user summaries, preserve timestamps for speed calc
│   │   ├── SimilarityService.js   # MODIFY: Compute personality for each similar user, add to response
│   │   └── PersonalityService.js  # NEW: Pure detection function + supporting helpers (std dev, speed, threshold)
│   └── utils/
│       └── (no new utils — detection logic lives in PersonalityService)
└── tests/
    └── unit/
        ├── PersonalityService.test.js    # NEW: Detection rules, edge cases, threshold logic
        ├── DashboardService.test.js      # MODIFY: Assert personality + noteCount in user summaries
        └── SimilarityService.test.js     # MODIFY: Assert personality in similar user response

frontend/
├── src/
│   ├── components/
│   │   ├── UserDetailsDrawer.jsx      # MODIFY: Render personality card at top, shift detection via sessionStorage
│   │   ├── SimilarUsersDrawer.jsx     # MODIFY: Show personality subtitle per user row, quote in detail view
│   │   └── PersonalityCard.jsx        # NEW: Reusable card component (name, quote, "Previously" line)
│   ├── pages/
│   │   ├── EventPage.jsx              # MODIFY: Add dot badge on My Progress button, track personality availability
│   │   └── DashboardPage.jsx          # MODIFY: Add "Tasting Personalities" section in Summary tab
│   ├── utils/
│   │   ├── personalityContent.js      # NEW: Personality type map { id → { name, quotes[] } } + template interpolation
│   │   └── personalityDetection.js    # NEW: Frontend detection function (mirrors backend) for current user's own personality
│   └── data/
│       └── (content embedded in personalityContent.js — small enough ~50 lines)
└── tests/
    └── unit/
        ├── personalityDetection.test.js  # NEW: Frontend detection logic tests
        ├── personalityContent.test.js    # NEW: Template interpolation, content integrity
        ├── PersonalityCard.test.jsx      # NEW: Card rendering, shift display, accessibility
        ├── UserDetailsDrawer.test.jsx    # NEW: Personality card integration in drawer
        ├── SimilarUsersDrawer.test.jsx   # MODIFY: Personality subtitle rendering
        ├── EventPage.test.jsx            # MODIFY: Dot badge visibility logic
        └── DashboardPage.test.jsx        # MODIFY: Tasting Personalities section rendering
```

**Structure Decision**: Web application (frontend + backend). Backend gets 1 new service file (PersonalityService) housing the pure detection function, imported by both DashboardService and SimilarityService. Frontend gets 1 new component (PersonalityCard), 2 new utility files (detection + content), and modifications to 3 existing components and 2 existing pages.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Dual detection function — same ~80-line pure function in backend (`PersonalityService.js`) and frontend (`personalityDetection.js`) | Frontend needs detection for the current user without an API call (no endpoint returns current user's personality during `started`/`paused` states). Backend needs detection for other users (Similar Users, Dashboard) where full rating data including notes and timestamps is only available server-side. | A shared npm package would eliminate duplication but adds monorepo build tooling, a publish/link step, and cross-project version management — disproportionate complexity for ~80 lines of deterministic, unit-tested pure logic. Both implementations are tested with shared test case data to guarantee parity. |

The feature adds:
- 1 new backend service file (pure function, ~120 lines)
- 1 new frontend component (presentation, ~60 lines)
- 2 new frontend utility files (detection ~80 lines, content ~100 lines)
- Modifications to 2 backend services and 5 frontend components/pages
- 8 new/modified test files

All within existing architectural patterns. No new dependencies, endpoints, or DB entities.
