# Implementation Plan: Crockford Base32 Event IDs

**Branch**: `012-crockford-event-ids` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-crockford-event-ids/spec.md`

## Summary

Replace the 62-character alphanumeric alphabet used for event ID generation with the 32-character Crockford Base32 alphabet (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), keeping the 8-character length. Update all validation and URL-handling code to normalize input to uppercase and redirect non-uppercase event URLs to their canonical form. Consolidate duplicated validation logic as a DRY improvement.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >=22.12.0 (local), nodejs20.x (Lambda)
**Primary Dependencies**: Express 5.2, React 19.2, nanoid 5.1, Vite 6.0, Tailwind CSS 4.1
**Storage**: AWS DynamoDB (single-table design with GSI1)
**Testing**: Vitest 1.6 (unit/integration), Playwright 1.57 (E2E)
**Target Platform**: AWS Lambda + API Gateway (backend), S3 + CloudFront (frontend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: No change — nanoid character alphabet swap has negligible performance impact
**Constraints**: 8-character IDs, 32-char alphabet yields ~40 bits of entropy (~1 trillion possible IDs)
**Scale/Scope**: Pre-production — no existing event data to migrate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Targeted alphabet and regex changes; clear purpose |
| II. DRY | PASS (with action) | Pre-existing violation: event ID regex duplicated ~8× in ProfilePage.jsx and `validateEventId()` duplicated between validators.js and EventService.js. Plan includes consolidation. |
| III. Maintainability | PASS | Consolidation reduces maintenance burden; dead duplicate removed |
| IV. Testing Standards | PASS | Existing unit, integration, and E2E tests updated; new tests for Crockford alphabet, case normalization, and URL redirect |
| V. Security | PASS | Event IDs are public identifiers; no security implications |
| VI. UX Consistency | PASS | All event ID displays normalized to uppercase |
| VII. Performance | PASS | No measurable performance impact |

No gate violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-crockford-event-ids/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── events.js           # Uses validateEventId — no change (calls shared validator)
│   │   ├── items.js            # Uses validateEventId — no change
│   │   ├── ratings.js          # Uses validateEventId — no change
│   │   ├── similarUsers.js     # Uses validateEventId — no change
│   │   └── dashboard.js        # Uses validateEventId — no change
│   ├── services/
│   │   └── EventService.js     # CHANGE: customAlphabet alphabet, remove duplicate validateEventId
│   └── utils/
│       └── validators.js       # CHANGE: add uppercase normalization, update error messages
└── tests/
    ├── unit/
    │   └── EventService.test.js    # CHANGE: test Crockford alphabet output
    └── integration/
        └── events.test.js          # CHANGE: use uppercase test IDs

frontend/
├── src/
│   ├── App.jsx                     # CHANGE: add uppercase redirect logic for eventId routes
│   ├── components/
│   │   └── Header.jsx              # CHANGE: update URL regex (accept any case, normalize)
│   ├── pages/
│   │   ├── LandingPage.jsx         # CHANGE: normalize input to uppercase before navigation
│   │   ├── ProfilePage.jsx         # CHANGE: consolidate 8× duplicated regex into shared util
│   │   ├── EventPage.jsx           # No change (uses useParams)
│   │   └── EventAdminPage.jsx      # No change (uses useParams)
│   └── services/
│       └── apiClient.js            # CHANGE: update event ID extraction regex
└── tests/
    └── e2e/
        └── specs/
            └── create-event.spec.js    # CHANGE: update URL assertions for uppercase
```

**Structure Decision**: Existing web application structure (frontend + backend) is preserved. Changes touch existing files only — no new source directories needed.

## Impact Analysis

### Files Requiring Changes (11 files)

| File | Change Type | Scope |
|------|-------------|-------|
| `backend/src/services/EventService.js` | Modify | Alphabet string, remove duplicate `validateEventId` |
| `backend/src/utils/validators.js` | Modify | Add whitespace trimming, return normalized ID |
| `backend/src/api/index.js` | Modify | Add `router.param('eventId', ...)` middleware for uppercase normalization |
| `frontend/src/App.jsx` | Modify | Add redirect for non-uppercase event ID URLs |
| `frontend/src/components/Header.jsx` | Modify | URL regex accepts any case |
| `frontend/src/pages/LandingPage.jsx` | Modify | Uppercase normalize before navigate |
| `frontend/src/pages/ProfilePage.jsx` | Modify | Consolidate 8× duplicated regex into shared call |
| `frontend/src/services/apiClient.js` | Modify | Update event ID extraction regex |
| `backend/tests/unit/EventService.test.js` | Modify | Test Crockford alphabet, uppercase output |
| `backend/tests/integration/events.test.js` | Modify | Use uppercase test event IDs |
| `frontend/tests/e2e/specs/create-event.spec.js` | Modify | Update URL pattern assertions |

### Files NOT Requiring Changes

All backend API route files (`events.js`, `items.js`, `ratings.js`, `similarUsers.js`, `dashboard.js`) receive an already-normalized `req.params.eventId` via the `router.param()` middleware in `index.js`. No individual route file needs modification for normalization.

## Complexity Tracking

No constitution violations — this section is intentionally empty.
