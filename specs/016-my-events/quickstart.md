# Quickstart: My Events Page

**Feature**: 016-my-events | **Date**: 2026-02-25

## Prerequisites

- Node.js >=22.12.0
- Backend running locally (`npm run dev` in `backend/`)
- Frontend running locally (`npm run dev` in `frontend/`)
- DynamoDB local or configured AWS credentials

## Implementation Order

### Step 1: Backend — Add `authMethod` to JWT token

**Files**: `backend/src/middleware/jwtAuth.js`, `backend/src/api/auth.js`, `backend/src/api/events.js`

1. Modify `generateToken()` in `jwtAuth.js` to include `authMethod` in token payload when provided.
2. Modify `addEventToToken()` in `jwtAuth.js` to preserve `authMethod` from decoded token.
3. Pass `authMethod: 'otp'` in `auth.js` at OTP verify and token refresh call sites.
4. Pass `authMethod: 'pin'` in `events.js` at PIN verify call sites.

**Verify**: Decode a JWT after OTP login and confirm `authMethod: 'otp'` is present. Decode after PIN login and confirm `authMethod: 'pin'`.

### Step 2: Backend — Add `getEventSummariesByAdministrator` method

**File**: `backend/src/services/EventService.js`

1. Add method that reuses existing admin-checking logic but returns event summary objects (`eventId`, `name`, `state`, `createdAt`) instead of just IDs.
2. Sort results by `createdAt` descending.

**Verify**: Unit tests pass — call with known admin email, verify returned summaries match expected events.

### Step 3: Backend — Add `GET /api/events/mine` endpoint

**File**: `backend/src/api/events.js`

1. Add `router.get('/mine', requireAuth, ...)` that calls `getEventSummariesByAdministrator(req.user.email)`.
2. Return `{ events: [...] }` with 200 status.
3. Handle errors with `handleApiError`.

**Verify**: `curl` or integration test — authenticate via OTP, call endpoint, confirm events returned.

### Step 4: Frontend — Add `getMyEvents()` and `getAuthMethod()` to apiClient

**File**: `frontend/src/services/apiClient.js`

1. Add `getMyEvents()` method: `return this.get('/events/mine')`.
2. Add `getAuthMethod()` method: decode JWT payload and return `authMethod` field.

### Step 5: Frontend — Create MyEventsPage component

**File**: `frontend/src/pages/MyEventsPage.jsx` (new)

1. Fetch events via `apiClient.getMyEvents()` on mount.
2. Display list of events using Card components (name, event ID, state badge, created date).
3. Each event links to `/event/{eventId}/admin`.
4. Handle loading state (spinner/skeleton).
5. Handle empty state (message + link to `/create-event`).
6. Handle error state (message + retry button).

### Step 6: Frontend — Add route and navigation entry points

**Files**: `frontend/src/App.jsx`, `frontend/src/pages/LandingPage.jsx`, `frontend/src/components/Header.jsx`

1. Add `/my-events` route in `App.jsx` wrapped in `ProtectedRoute`.
2. Add "My Events" card on `LandingPage.jsx` that navigates to `/auth` with `{ from: { pathname: '/my-events' } }`.
3. Add "My Events" menu item in `Header.jsx` dropdown, conditionally visible when `authMethod === 'otp'`.

### Step 7: Tests

**Files**: `backend/tests/unit/EventService.test.js`, `backend/tests/integration/events.test.js`, `frontend/tests/e2e/specs/my-events.spec.js` (new)

1. Unit tests for `getEventSummariesByAdministrator`.
2. Integration tests for `GET /api/events/mine`.
3. E2E tests for landing page card flow, header menu flow, empty state, and event list display.

## Verification

After all steps:
1. Create an event via OTP auth → verify it appears in My Events list.
2. Log out → click "My Events" on landing page → authenticate → verify event list.
3. From event admin page → open header menu → click "My Events" → verify event list.
4. Authenticate with email that has no events → verify empty state with create link.
5. Authenticate via PIN as participant → verify "My Events" does NOT appear in header menu.
