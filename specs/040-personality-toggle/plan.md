# Implementation Plan: Personality Detection Toggle

**Branch**: `040-personality-toggle` | **Date**: 2026-03-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/040-personality-toggle/spec.md`

## Summary

Add a `personalityEnabled` boolean to the event's rating configuration, with an admin toggle on the event setup page. When disabled, all personality-specific UI (reveal sheet, badge, card, dashboard labels) is suppressed for guests. Mirrors the existing `noteSuggestionsEnabled` pattern exactly — same storage, validation, state restrictions, and frontend prop flow.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0 + React 19.2.1
**Primary Dependencies**: Express 5.2.1, Radix UI, Tailwind CSS 4.1.17, lucide-react
**Storage**: DynamoDB (single-table design, nested `ratingConfiguration` object in event CONFIG item)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (mobile-first responsive)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: N/A — boolean check, no performance impact
**Constraints**: Toggle locked after event leaves "created" state; wine events only
**Scale/Scope**: Single boolean field added to existing data model; 7 frontend files + 1 backend service modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Mirrors proven pattern (`noteSuggestionsEnabled`), clear purpose |
| II. DRY | PASS | Reuses existing config flow; no new abstractions needed; validation logic follows existing pattern |
| III. Maintainability | PASS | Consistent with existing codebase patterns; no dead code introduced |
| IV. Testing Standards | PASS | Unit tests for backend validation, frontend suppression; E2E for enabled/disabled flows |
| V. Security | PASS | Uses existing auth middleware; validated as boolean; state-restricted |
| VI. UX Consistency | PASS | Toggle follows same layout pattern as Note Suggestions; uses same Switch component |
| VII. Performance | PASS | Single boolean check per component render; no measurable impact |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/040-personality-toggle/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── services/
│       └── EventConfigService.js    # Add personalityEnabled to config logic
└── tests/
    └── unit/
        └── EventConfigService.test.js  # Add personalityEnabled tests

frontend/
├── src/
│   ├── components/
│   │   ├── UserDetailsDrawer.jsx         # Gate personality card
│   │   ├── PersonalitySummaryStrip.jsx   # Receive flag, conditional render
│   │   └── UserRatingsTable.jsx          # Receive flag, conditional render
│   └── pages/
│       ├── EventAdminPage.jsx            # Add toggle UI + state
│       ├── EventPage.jsx                 # Gate reveal, badge, threshold
│       └── DashboardPage.jsx             # Gate personality in results
└── tests/
    ├── unit/
    │   ├── UserDetailsDrawer.test.jsx    # Suppression tests
    │   └── DashboardPage.test.jsx        # Suppression tests
    └── e2e/
        └── specs/
            ├── personality-reveal.spec.js  # Disabled scenario
            └── personality-card.spec.js    # Disabled scenario
```

**Structure Decision**: Existing web application structure (backend + frontend). No new files created — all changes are modifications to existing files.
