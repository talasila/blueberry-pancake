# Implementation Plan: Themed Event Entry Pages

**Branch**: `036-themed-entry-pages` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/036-themed-entry-pages/spec.md`

## Summary

Add a lightweight public API endpoint (`GET /api/events/:eventId/public-info`) that returns event name, typeOfItem, theme, and state without authentication. Use this data on EmailEntryPage, PINEntryPage, and EventOTPEntryPage to display the event name, apply theme colors via the existing CSS variable system, and show contextual copy. Also update AuthPage copy to replace OTP jargon with friendly language.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0
**Primary Dependencies**: React 19.2.1, Express 5.2.1, Radix UI, Tailwind CSS 4.1.17
**Storage**: DynamoDB (via DynamoDBRepository) — read-only access for public info
**Testing**: Vitest + @testing-library/react (frontend), Vitest (backend)
**Target Platform**: Web (browser + Node.js server)
**Project Type**: Web application (React SPA + Express API)
**Performance Goals**: Event info must load and theme must apply within 2 seconds (SC-001); form must not be blocked by the info fetch
**Constraints**: No new dependencies; public endpoint must not expose sensitive data; rate limiting required
**Scale/Scope**: 1 new backend endpoint, 3 frontend pages themed, 1 frontend page copy update, 1 shared hook

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Small, focused changes; new hook follows established patterns |
| II. DRY | PASS | Shared `useEventPublicInfo` hook eliminates duplication across 3 entry pages; reuses existing `getThemeVars` |
| III. Maintainability | PASS | Theme application uses same pattern as EventThemeProvider; new endpoint follows existing public endpoint conventions |
| IV. Testing Standards | PASS | Integration tests for new endpoint; unit tests for hook and page changes |
| V. Security | PASS | Public endpoint returns only name/typeOfItem/theme/state (FR-002); rate limited (FR-015); no participant data, PINs, or admin info exposed |
| VI. UX Consistency | PASS | Entry pages use same theme CSS variables as the rest of the app; AuthPage gets visible labels matching other forms |
| VII. Performance | PASS | Non-blocking fetch — form renders immediately, theme applied async; single lightweight DB read |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/036-themed-entry-pages/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── api/
│       └── events.js               # MODIFY: add GET /:eventId/public-info endpoint
└── tests/
    └── integration/
        └── api.test.js             # UPDATE: add public-info endpoint tests

frontend/
├── src/
│   ├── hooks/
│   │   ├── useEventPublicInfo.js   # ADD: shared hook for fetching public event info
│   │   └── useDarkMode.js          # ADD: shared hook for dark mode detection (DRY extraction)
│   ├── pages/
│   │   ├── EmailEntryPage.jsx      # MODIFY: use hook, display event name, apply theme, contextual copy
│   │   ├── PINEntryPage.jsx        # MODIFY: use hook, display event name, apply theme
│   │   ├── EventOTPEntryPage.jsx   # MODIFY: use hook, display event name, apply theme
│   │   └── AuthPage.jsx            # MODIFY: update copy, visible label, friendly button text
│   └── services/
│       └── apiClient.js            # MODIFY: add getEventPublicInfo method
└── tests/
    └── unit/
        ├── useEventPublicInfo.test.js  # ADD: hook unit tests
        ├── EmailEntryPage.test.jsx     # UPDATE: test themed rendering and event name
        └── AuthPage.test.jsx           # ADD: test updated copy
```

**Structure Decision**: Existing web application structure. One new backend endpoint, one new shared frontend hook, modifications to 4 frontend pages. No new architectural patterns introduced.
