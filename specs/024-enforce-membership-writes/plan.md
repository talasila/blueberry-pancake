# Implementation Plan: Enforce User Membership on Backend Write Operations

**Branch**: `024-enforce-membership-writes` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-enforce-membership-writes/spec.md`

## Summary

A deleted guest can continue creating items and ratings via their existing browser session because the backend trusts the JWT without verifying the user is still a member of the event. This creates orphaned data and a broken admin experience.

The fix adds a lightweight `requireEventMembership` middleware to all write endpoints on items and ratings, returning a 403 with a machine-readable error code (`EVENT_MEMBERSHIP_REQUIRED`) when the user is no longer in `event.users` or `event.administrators`. The frontend intercepts this code to show a blocking modal and log the user out. Additionally, the user-deletion flow is updated to invalidate cached dashboard and similarity stats so that aggregate scores reflect rating removal immediately.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node.js >= 22.12.0  
**Primary Dependencies**: Express 5.x, AWS SDK v3 (DynamoDB), jsonwebtoken, @codegenie/serverless-express  
**Storage**: DynamoDB (single-table design, PK/SK with GSI1). Dashboard + similarity caches use TTL.  
**Testing**: Vitest (unit + integration with supertest), Playwright (E2E, mobile-first)  
**Target Platform**: AWS Lambda via serverless-express (backend), Vite + React 19 SPA (frontend)  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: Membership check adds zero additional DynamoDB reads (event already loaded). Cache invalidation adds 1-2 delete operations to the user-deletion path.  
**Constraints**: No token blocklisting infrastructure exists (JWT is stateless). Membership enforcement is request-time only.  
**Scale/Scope**: Tasting events with tens of users and items — not high-throughput. Dashboard cache TTL is 30 seconds.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New middleware follows established patterns (`requireAuth`, `jwtAuth`). Single-responsibility: membership check only. |
| II. DRY | PASS | Membership check in middleware, not duplicated per route handler. `isEventMember` consolidates the dual-list check. |
| III. Maintainability | PASS | New middleware file, clear method names, no dead code introduced. |
| IV. Testing Standards | PASS | Unit tests for middleware + `isEventMember`. Integration tests for all affected endpoints. E2E for full flow. |
| V. Security | PASS | This feature IS a security fix — closes the post-deletion write gap. 403 with error code, no sensitive data leaked. |
| VI. UX Consistency | PASS | Blocking modal follows existing dialog pattern (`DeleteUserDialog` visual style). Logout uses existing `clearAllAuthState`. |
| VII. Performance | PASS | Zero extra DB reads for membership check (event reused from middleware via `req.event`). Cache invalidation is 1-2 DynamoDB delete calls. |

**Post-Phase 1 re-check**: All gates still pass. No new entities, no new tables, no new external dependencies. The middleware + cache invalidation approach is the simplest viable solution.

## Project Structure

### Documentation (this feature)

```text
specs/024-enforce-membership-writes/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: design decisions and rationale
├── data-model.md        # Phase 1: entity and data flow documentation
├── quickstart.md        # Phase 1: development setup and testing guide
├── contracts/           # Phase 1: API contracts
│   └── membership-error.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2: implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── middleware/
│   │   ├── requireAuth.js              # Existing: JWT + event access check
│   │   └── requireEventMembership.js   # NEW: membership verification middleware
│   ├── services/
│   │   └── EventService.js             # MODIFIED: add isEventMember(), update deleteUser() cache invalidation
│   ├── api/
│   │   ├── items.js                    # MODIFIED: apply requireEventMembership to write routes
│   │   └── ratings.js                  # MODIFIED: apply requireEventMembership to write routes
│   ├── data/
│   │   ├── DataRepository.js           # MODIFIED: add abstract deleteDashboardCache, deleteAllSimilarUsersCache
│   │   └── DynamoDBRepository.js       # MODIFIED: implement deleteDashboardCache, deleteAllSimilarUsersCache
│   └── utils/
│       └── apiErrorHandler.js          # MODIFIED: add membership error classification
└── tests/
    ├── unit/
    │   ├── EventService.test.js        # MODIFIED: add isEventMember tests
    │   └── requireEventMembership.test.js  # NEW
    └── integration/
        └── membership-enforcement.test.js  # NEW

frontend/
├── src/
│   ├── services/
│   │   └── apiClient.js               # MODIFIED: handle EVENT_MEMBERSHIP_REQUIRED in 403 block
│   └── components/
│       └── MembershipRevokedDialog.jsx # NEW: blocking modal
└── tests/
    ├── unit/
    │   └── MembershipRevokedDialog.test.jsx  # NEW
    └── e2e/
        └── specs/
            └── membership-enforcement.spec.js  # NEW
```

**Structure Decision**: Web application (backend + frontend). No new projects or packages. All changes are within the existing `backend/` and `frontend/` directories.

## Implementation Design

### 1. Backend Middleware: `requireEventMembership`

New file: `backend/src/middleware/requireEventMembership.js`

**Behavior**:
1. Extract `eventId` from `req.params` and `email` from `req.user`
2. Load the event via `eventService.getEvent(eventId)`
3. Call `eventService.isEventMember(event, email)`
4. If member: attach `req.event = event` (required — route handlers pass this to services to avoid redundant `getEvent()` DynamoDB read per FR-008) and call `next()`
5. If not member: return 403 with `{ error: "User is not registered for this event", code: "EVENT_MEMBERSHIP_REQUIRED" }`

**Applied to**: Only write routes (POST, PATCH, DELETE) on items and ratings. Read routes (GET) are not gated per spec.

### 2. EventService: `isEventMember`

New method on `EventService`:

```javascript
isEventMember(event, email) {
  if (!event || !email) return false;
  const normalizedEmail = this.normalizeEmail(email);
  const isUser = event.users && event.users[normalizedEmail] !== undefined;
  const isAdmin = this.isAdministrator(event, normalizedEmail);
  return isUser || isAdmin;
}
```

### 3. Cache Invalidation in `deleteUser`

After ratings are deleted in `EventService.deleteUser()`:
1. Call `dataRepository.deleteDashboardCache(eventId)`
2. Call `dataRepository.deleteAllSimilarUsersCache(eventId)`

This ensures the next dashboard or similar-users request computes fresh data with the deleted user's ratings excluded.

### 4. DynamoDBRepository: Cache Deletion Methods

**`deleteDashboardCache(eventId)`**: Delete the item with `PK: EVENT#<eventId>`, `SK: DASHBOARD`.

**`deleteAllSimilarUsersCache(eventId)`**: Query all items with `PK: EVENT#<eventId>`, `SK begins_with("SIMILAR#")`, then batch-delete them.

### 5. Frontend: `apiClient.js` 403 Handling

In the existing 403 block (after CSRF retry, after `EVENT_ACCESS_DENIED` check), add:

```javascript
if (errorData.code === 'EVENT_MEMBERSHIP_REQUIRED') {
  // Dispatch custom event for the modal to listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('membership-revoked', {
      detail: { message: errorData.error }
    }));
  }
  return Promise.reject(new Error('Event membership revoked'));
}
```

### 6. Frontend: `MembershipRevokedDialog`

New component following the existing dialog pattern (`DeleteUserDialog`):
- Listens for the `membership-revoked` custom event
- Renders a blocking modal with backdrop (`fixed inset-0 z-[110]`)
- Message: "Your access to this event has been removed"
- Single button: "OK" → calls `apiClient.clearJWTToken()` → `window.location.href = '/'`
- Rendered at the app level in `frontend/src/App.jsx` (inside `<Router>`, alongside `<Toaster />`) so it's always available

### 7. Error Classification in `handleApiError`

Add a new pattern match in `apiErrorHandler.js`'s `handleApiError` function for membership errors thrown from services (if any service-level code also needs to throw membership errors):

```javascript
if (message.includes('not registered for this event')) {
  return res.status(403).json({ error: message, code: 'EVENT_MEMBERSHIP_REQUIRED' });
}
```

## Complexity Tracking

No constitution violations. No complexity justifications needed.
