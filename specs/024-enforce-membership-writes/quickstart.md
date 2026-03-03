# Quickstart: Enforce User Membership on Backend Write Operations

**Feature**: 024-enforce-membership-writes  
**Date**: 2026-03-03

## Prerequisites

- Node.js >= 22.12.0
- Docker (for DynamoDB Local)
- Backend running locally (`npm run dev` in `backend/`)
- Frontend running locally (`npm run dev` in `frontend/`)

## Local Development Setup

```bash
# Start DynamoDB Local
cd backend && docker compose up -d

# Setup tables (if not already done)
node scripts/setup-dynamodb-local.js

# Start backend
npm run dev

# In another terminal, start frontend
cd frontend && npm run dev
```

## Files to Modify

### Backend

| File | Change |
|------|--------|
| `backend/src/services/EventService.js` | Add `isEventMember(event, email)` method |
| `backend/src/middleware/requireEventMembership.js` | **NEW** — Middleware that checks event membership |
| `backend/src/api/items.js` | Apply `requireEventMembership` to POST, PATCH, DELETE routes |
| `backend/src/api/ratings.js` | Apply `requireEventMembership` to POST, DELETE routes |
| `backend/src/utils/apiErrorHandler.js` | Add `EVENT_MEMBERSHIP_REQUIRED` code to `handleApiError` for membership errors |
| `backend/src/data/DataRepository.js` | Add abstract `deleteDashboardCache`, `deleteAllSimilarUsersCache` |
| `backend/src/data/DynamoDBRepository.js` | Implement `deleteDashboardCache`, `deleteAllSimilarUsersCache` |
| `backend/src/services/EventService.js` | Update `deleteUser()` to invalidate caches after rating deletion |

### Frontend

| File | Change |
|------|--------|
| `frontend/src/services/apiClient.js` | Handle `EVENT_MEMBERSHIP_REQUIRED` in 403 block |
| `frontend/src/components/MembershipRevokedDialog.jsx` | **NEW** — Blocking modal for membership rejection |

### Tests

| File | Change |
|------|--------|
| `backend/tests/unit/EventService.test.js` | Tests for `isEventMember` |
| `backend/tests/unit/requireEventMembership.test.js` | **NEW** — Middleware unit tests |
| `backend/tests/integration/membership-enforcement.test.js` | **NEW** — Integration tests for all affected endpoints |
| `frontend/tests/unit/MembershipRevokedDialog.test.jsx` | **NEW** — Dialog component test |
| `frontend/tests/e2e/specs/membership-enforcement.spec.js` | **NEW** — E2E flow test |

## Running Tests

```bash
# Backend unit + integration tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# E2E tests
cd frontend && npx playwright test tests/e2e/specs/membership-enforcement.spec.js
```

## Manual Testing Flow

1. Open two browser windows (or use incognito for the guest)
2. **Window 1 (Admin)**: Log in as event administrator
3. **Window 2 (Guest)**: Log in as a guest to the same event, register a bottle
4. **Window 1**: Delete the guest via the Guests drawer
5. **Window 2**: Attempt to register another bottle
6. **Expected**: Blocking modal appears → "Your access to this event has been removed" → dismiss → logged out
