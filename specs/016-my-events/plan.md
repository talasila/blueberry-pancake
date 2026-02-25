# Implementation Plan: My Events Page

**Branch**: `016-my-events` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/016-my-events/spec.md`

## Summary

Add a "My Events" page that lists all events where the authenticated user is an administrator, accessible from both the landing page (via auth flow) and the header dropdown menu (for already-authenticated admins). Requires a new backend endpoint to return event summaries by administrator email, a new frontend page component, two navigation entry points, and a mechanism to distinguish OTP-authenticated administrators from PIN-authenticated participants in the JWT token.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >=22.12.0 (local), nodejs22.x (Lambda)
**Primary Dependencies**: Express 5.2, React 19.2, react-router-dom 7.10, Vite 6.0, Tailwind CSS 4.1, lucide-react
**Storage**: AWS DynamoDB (single-table design with GSI1)
**Testing**: Vitest 1.6 (unit/integration), Playwright 1.57 (E2E)
**Target Platform**: AWS Lambda + API Gateway (backend), S3 + CloudFront (frontend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Event list loads within 2 seconds after authentication
**Constraints**: No pagination needed — event volumes per administrator are small (tens, not thousands)
**Scale/Scope**: Pre-production — small user base, low event volume per administrator

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New endpoint, page, and navigation follow established patterns |
| II. DRY | PASS | Reuses existing `getEventsByAdministrator` logic; new `getMyEvents` apiClient method follows existing pattern |
| III. Maintainability | PASS | New page follows established page pattern; auth method distinction is explicit via JWT field |
| IV. Testing Standards | PASS | Unit tests for new service method, integration tests for new endpoint, E2E tests for full user flows |
| V. Security | PASS | Endpoint requires authentication; only returns events where user is admin; OTP/PIN distinction prevents participant access to admin-oriented feature |
| VI. UX Consistency | PASS | Landing page card follows existing card pattern; header menu item follows existing dropdown pattern; page uses established Card components |
| VII. Performance | PASS | Leverages existing `getEventsByAdministrator` with minimal additional data fetching; no pagination needed at current scale |

No gate violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-my-events/
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
│   │   ├── events.js           # CHANGE: Add GET /mine endpoint
│   │   └── auth.js             # CHANGE: Add authMethod: 'otp' to JWT payload
│   ├── middleware/
│   │   └── jwtAuth.js          # CHANGE: Include authMethod in token payload
│   └── services/
│       └── EventService.js     # CHANGE: Add getEventSummariesByAdministrator()
└── tests/
    ├── unit/
    │   └── EventService.test.js    # CHANGE: Tests for new method
    └── integration/
        └── events.test.js          # CHANGE: Tests for GET /mine endpoint

frontend/
├── src/
│   ├── App.jsx                     # CHANGE: Add /my-events route
│   ├── components/
│   │   └── Header.jsx              # CHANGE: Add "My Events" menu item (OTP-only)
│   ├── pages/
│   │   ├── LandingPage.jsx         # CHANGE: Add "My Events" card
│   │   └── MyEventsPage.jsx        # NEW: My Events page component
│   └── services/
│       └── apiClient.js            # CHANGE: Add getMyEvents() method
└── tests/
    └── e2e/
        └── specs/
            └── my-events.spec.js   # NEW: E2E tests for My Events feature
```

**Structure Decision**: Existing web application structure (frontend + backend) is preserved. Changes touch existing files plus two new files (MyEventsPage.jsx and my-events.spec.js).

## Impact Analysis

### Files Requiring Changes (10 existing + 2 new = 12 total)

| File | Change Type | Scope |
|------|-------------|-------|
| `backend/src/middleware/jwtAuth.js` | Modify | Include `authMethod` in token payload when provided |
| `backend/src/api/auth.js` | Modify | Pass `authMethod: 'otp'` to `generateToken` (2 call sites: OTP verify + token refresh) |
| `backend/src/api/events.js` | Modify | Pass `authMethod: 'pin'` to `generateToken` (PIN verify) + add `GET /mine` endpoint |
| `backend/src/services/EventService.js` | Modify | Add `getEventSummariesByAdministrator(email)` method |
| `backend/tests/unit/EventService.test.js` | Modify | Tests for `getEventSummariesByAdministrator` |
| `backend/tests/integration/events.test.js` | Modify | Tests for `GET /api/events/mine` endpoint |
| `frontend/src/App.jsx` | Modify | Add `/my-events` protected route |
| `frontend/src/pages/LandingPage.jsx` | Modify | Add "My Events" card |
| `frontend/src/components/Header.jsx` | Modify | Add "My Events" menu item, conditionally visible for OTP-auth users |
| `frontend/src/services/apiClient.js` | Modify | Add `getMyEvents()` and `getAuthMethod()` methods |
| `frontend/src/pages/MyEventsPage.jsx` | **New** | My Events page component with list, empty state, error state |
| `frontend/tests/e2e/specs/my-events.spec.js` | **New** | E2E tests for full My Events user flows |

### Files NOT Requiring Changes

- `backend/src/api/index.js` — Events router already mounted; new route is within `events.js`
- `frontend/src/components/ProtectedRoute.jsx` — Already handles redirect to `/auth` with `from` state; no changes needed
- `frontend/src/pages/AuthPage.jsx` — Already reads `location.state.from` for post-auth redirect; no changes needed

### Key Design Decision: OTP vs PIN Distinction

The JWT token currently contains only `email` and `events`. To implement FR-002 (show "My Events" only to OTP-authenticated admins), an `authMethod` field (`'otp'` or `'pin'`) is added to the JWT payload. This is a minimal, explicit approach that avoids fragile inference heuristics.

- `generateToken` in `jwtAuth.js` includes `authMethod` when provided in the payload
- `addEventToToken` preserves `authMethod` from the decoded token
- Frontend reads `authMethod` from the decoded JWT to conditionally render the menu item
- Token refresh in `auth.js` preserves `authMethod: 'otp'`

## Complexity Tracking

No constitution violations — this section is intentionally empty.
