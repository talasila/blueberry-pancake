# Implementation Plan: Codebase Refactoring & Simplification

**Branch**: `034-codebase-refactor` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-codebase-refactor/spec.md`

## Summary

Systematic refactoring across the blueberry-pancake frontend (React) and backend (Express) to eliminate code duplication, remove unnecessary abstractions, and standardize patterns. The work is phased into 3 strict tiers: P1 (backend utility extraction + frontend wrapper removal), P2 (component consolidation + error handling standardization), P3 (large file splits). No user-visible behavior changes. Unit tests required for all newly extracted utilities.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0
**Primary Dependencies**: React 19.2.1, Express 5.2.1, Radix UI, Tailwind CSS 4.1.17
**Storage**: AWS DynamoDB (single-table design) — no schema changes
**Testing**: Vitest (unit), Playwright (E2E), React Testing Library
**Target Platform**: Web application (AWS Lambda + S3/CloudFront)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: No regressions — refactoring only
**Constraints**: Strict phase gates (P1 → P2 → P3), no user-visible behavior changes
**Scale/Scope**: ~86 frontend files, ~40 backend files; 14 refactoring items across 3 phases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Refactoring directly improves code clarity and adherence to patterns |
| II. DRY | PASS | Primary goal: eliminate duplication (12+ email normalizations, 4 delete dialogs, 4 rate limit blocks, 3 cookie clearing blocks) |
| III. Maintainability | PASS | Reducing 2,146-line EventService.js, removing dead wrappers, consolidating validation |
| IV. Testing Standards | PASS | FR-017 requires tests for all new utilities; existing tests must pass (FR-015) |
| V. Security | PASS | No security changes; cookie handling consolidation preserves httpOnly/secure/sameSite settings |
| VI. UX Consistency | PASS | FR-016 requires no visible behavior changes; delete dialog consolidation preserves exact UI |
| VII. Performance | PASS | No performance-sensitive changes; utility extraction has negligible overhead |

**Post-Phase 1 Re-check**: All gates remain PASS. Design decisions maintain existing security posture and data access patterns. No new dependencies introduced.

## Project Structure

### Documentation (this feature)

```text
specs/034-codebase-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output - research findings
├── data-model.md        # Phase 1 output - affected code entities
├── quickstart.md        # Phase 1 output - development setup
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── auth.js              # P1: use clearAuthCookies, formatRateLimitResponse, handleApiError
│   │   ├── events.js            # P1: use formatRateLimitResponse, normalizeEmail
│   │   ├── quotes.js            # P2: add handleApiError
│   │   └── system.js            # P2: add handleApiError
│   ├── middleware/
│   │   └── jwtAuth.js           # P1: add clearAuthCookies() utility
│   ├── services/
│   │   ├── EventService.js      # P1: normalizeEmail, timestamps → P3: split into 3
│   │   ├── EventAdminService.js # P3: new (admin CRUD, PIN, user deletion)
│   │   ├── EventConfigService.js# P3: new (rating/item config, theme, bookmarks)
│   │   ├── ItemService.js       # P1: normalizeEmail, timestamps
│   │   ├── DashboardService.js  # P1: normalizeEmail
│   │   ├── RatingService.js     # P1: timestamps
│   │   └── EmailService.js      # P1: remove isValidEmail wrapper
│   └── utils/
│       ├── apiErrorHandler.js   # P1: add formatRateLimitResponse
│       ├── emailUtils.js        # P1: (source of truth, no changes)
│       └── timestamps.js        # P1: new - getCurrentTimestamp()
└── tests/
    └── unit/                    # P1+: tests for new utilities

frontend/
├── src/
│   ├── components/
│   │   ├── DestructiveActionDialog.jsx  # P2: new consolidated dialog
│   │   ├── RouteGuard.jsx               # P2: new shared route protection
│   │   ├── Header.jsx                   # P2: refactor with useDarkMode + data-driven menu
│   │   ├── RatingForm.jsx               # P2: extract retry + char limit utilities
│   │   ├── ItemDetailsDrawer.jsx        # P3: extract calculations + sorting hook
│   │   ├── ProtectedRoute.jsx           # P2: refactor to use RouteGuard
│   │   ├── AdminRoute.jsx               # P2: refactor to use RouteGuard
│   │   └── DashboardRoute.jsx           # P2: refactor to use RouteGuard
│   ├── hooks/
│   │   ├── useDarkMode.js               # P2: new - MutationObserver dark mode hook
│   │   └── useColumnSort.js             # P3: new - generic sorting state hook
│   ├── services/
│   │   └── ratingService.js             # P1: use consolidated eventIdValidation
│   └── utils/
│       ├── eventIdValidation.js         # P1: (source of truth, no changes)
│       ├── serviceValidation.js         # P1: remove validateEventId (keep validateItemId)
│       ├── retryWithBackoff.js          # P2: new - generic retry utility
│       ├── appendWithCharLimit.js       # P2: new - text append with limit
│       └── itemCalculations.js          # P3: new - rating distribution, ranking, progression
└── tests/
    └── unit/                            # P1+: tests for new utilities
```

**Structure Decision**: Existing web application structure (frontend + backend) preserved. No new top-level directories. New files are added to existing directories following established conventions. Files marked for removal are deleted after all consumers are updated.

## Complexity Tracking

No constitution violations. All changes reduce complexity — no justification needed.
