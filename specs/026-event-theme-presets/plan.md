# Implementation Plan: Event Theme Presets

**Branch**: `026-event-theme-presets` | **Date**: 2026-03-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-event-theme-presets/spec.md`

## Summary

Allow event administrators to select a visual theme preset when creating an event, giving each event a distinctive look. Presets are a curated set of mood-based palettes stored as a single string identifier on the event. The frontend defines preset visuals (colors, emoji, gradients) and applies them via scoped CSS custom properties with fallbacks to current design tokens. The backend stores and validates the theme identifier, enforcing a state-based lock (editable only in "created" state).

## Technical Context

**Language/Version**: Node.js 20+ (backend), React 19.2 JSX (frontend)  
**Primary Dependencies**: Express, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, nanoid (backend); React, react-router-dom 7.10, Tailwind CSS 4, Radix UI, lucide-react, class-variance-authority, clsx, tailwind-merge (frontend)  
**Storage**: DynamoDB single-table design — events stored as `PK=EVENT#{eventId}, SK=CONFIG`  
**Testing**: Vitest 1.6 with @testing-library/react (unit), Supertest (integration), Playwright (e2e)  
**Target Platform**: Web (mobile-first), AWS Lambda + API Gateway (backend), Vite (frontend)  
**Project Type**: Web application — `backend/` + `frontend/` structure  
**Performance Goals**: Theme application is purely CSS — zero runtime computation, no additional API calls for preset data  
**Constraints**: Backward compatible — events without `theme` field default to "classic" at read time. No data migration required.  
**Scale/Scope**: 6 theme presets (expandable), single string field per event, ~12 frontend components touched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ Pass | Well-scoped feature. Single data field, one constants module, CSS-based propagation. |
| II. DRY | ✅ Pass | Theme presets defined once in `frontend/src/utils/themePresets.js`. Valid IDs mirrored once in `EventService.js`. CSS vars consumed by components — no duplication. |
| III. Maintainability | ✅ Pass | Adding/removing presets requires editing one frontend file + one backend allowlist. No cascading changes. |
| IV. Testing Standards | ✅ Pass | Unit tests for validation (backend), preset mapping (frontend). Integration tests for API endpoints. E2E tests for theme selection and visual application. |
| V. Security | ✅ Pass | Backend validates theme ID against allowlist. Server-side enforcement of state lock (FR-020). No user-supplied color values — presets are curated. |
| VI. UX Consistency | ✅ Pass | Themes applied via centralized CSS custom properties with design-token fallbacks. No inline styles for theme colors. Self-styled picker cards use same system. |
| VII. Performance | ✅ Pass | Purely CSS — no runtime computation, no additional API calls, no image assets. Preset data is ~2KB in the frontend bundle. |

No violations. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/026-event-theme-presets/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── README.md        # Theme API contract changes
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── services/
│   │   └── EventService.js        # Add theme validation, VALID_THEMES allowlist
│   ├── api/
│   │   └── events.js              # Add PATCH /events/:eventId/theme endpoint
│   └── data/
│       └── DynamoDBRepository.js  # No changes (uses existing writeEventConfig)
└── tests/
    ├── unit/
    │   └── EventService.test.js   # Theme validation tests
    └── integration/
        └── events.test.js         # Theme API endpoint tests

frontend/
├── src/
│   ├── utils/
│   │   └── themePresets.js        # NEW: preset definitions + helper functions
│   ├── components/
│   │   ├── EventThemeProvider.jsx  # NEW: scoped CSS var wrapper
│   │   ├── ThemePicker.jsx         # NEW: self-styled preset card grid
│   │   ├── Header.jsx              # Consume theme vars (header bg, emoji)
│   │   ├── ItemButton.jsx          # Consume theme vars (unrated surface)
│   │   ├── GuestWelcomeBottomSheet.jsx  # Consume theme vars (surface)
│   │   └── WelcomeBottomSheet.jsx       # Consume theme vars (surface, accent)
│   ├── pages/
│   │   ├── CreateEventPage.jsx    # Add ThemePicker
│   │   ├── EventAdminPage.jsx     # Add theme section with ThemePicker
│   │   └── MyEventsPage.jsx       # Themed event cards
│   ├── services/
│   │   └── apiClient.js           # Add updateTheme method
│   ├── contexts/
│   │   └── EventContext.jsx       # No changes (theme comes via event object)
│   └── App.jsx                    # Wrap event routes with EventThemeProvider
└── tests/
    ├── unit/
    │   ├── themePresets.test.js    # Preset definition tests
    │   ├── ThemePicker.test.jsx   # Picker component tests
    │   └── EventThemeProvider.test.jsx  # CSS var injection tests
    └── e2e/
        └── specs/
            └── theme-presets.spec.js  # E2E theme selection + visual tests
```

**Structure Decision**: Web application pattern (backend/ + frontend/) — matches existing project structure exactly. No new projects or architectural changes.
