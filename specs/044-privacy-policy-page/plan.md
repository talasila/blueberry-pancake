# Implementation Plan: Privacy Policy Page

**Branch**: `044-privacy-policy-page` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/044-privacy-policy-page/spec.md`

## Summary

Add a publicly accessible `/privacy` route that renders the agreed-upon privacy policy text in a Card layout consistent with the rest of the app. Add informational privacy policy links below the forms on `EmailEntryPage` and `AuthPage` — the two pages where email addresses are collected.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1
**Primary Dependencies**: React Router v6, Radix UI, Tailwind CSS 4.1.17, lucide-react
**Storage**: N/A — no backend or database changes
**Testing**: Playwright (E2E), Vitest (unit)
**Target Platform**: Web (mobile + desktop responsive)
**Project Type**: Web application (frontend-only change)
**Performance Goals**: N/A — static content page
**Constraints**: Must work without authentication; must support dark mode via existing CSS variable system
**Scale/Scope**: 1 new page, 2 modified pages, 1 route addition

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-purpose page component; clear, minimal code |
| II. DRY | PASS | Privacy link pattern reused across both form pages; policy text lives in one component |
| III. Maintainability | PASS | Policy text centralized in one file; future edits require changing one component |
| IV. Testing Standards | PASS | E2E tests will verify page renders, links work, and accessibility from form pages |
| V. Security | PASS | Public page with no PII collection; no auth bypass concerns |
| VI. UX Consistency | PASS | Uses same Card layout, typography, and responsive patterns as existing pages |
| VII. Performance | PASS | Static content, no API calls, no data fetching |

**Post-Phase 1 Re-check**: All gates still PASS. No new dependencies, no data model, no API contracts.

## Project Structure

### Documentation (this feature)

```text
specs/044-privacy-policy-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (no entities)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── App.jsx                        # MODIFY: Add /privacy route
│   ├── pages/
│   │   ├── PrivacyPolicyPage.jsx      # CREATE: Privacy policy page component
│   │   ├── EmailEntryPage.jsx         # MODIFY: Add privacy link below Card
│   │   └── AuthPage.jsx              # MODIFY: Add privacy link below Card
│   └── components/ui/                 # EXISTING: Card, Button (link variant)
└── tests/
    ├── e2e/specs/
    │   └── privacy-policy.spec.js     # CREATE: E2E tests
    └── unit/
        └── PrivacyPolicyPage.test.jsx # CREATE: Unit tests
```

**Structure Decision**: Frontend-only changes following the existing page/component pattern. One new page in `pages/`, route added in `App.jsx`, and two small modifications to existing form pages.
