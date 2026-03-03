# Research: Enforce User Membership on Backend Write Operations

**Feature**: 024-enforce-membership-writes  
**Date**: 2026-03-03

## R-001: Membership Check Placement

**Decision**: Add an `requireEventMembership` middleware that runs after `requireAuth` but before route handlers on write endpoints for items and ratings.

**Rationale**: The codebase already follows a middleware pattern (`requireAuth` → route handler → service). A new middleware keeps the check DRY across all affected endpoints without modifying individual service methods. The event object is already loaded in services, but the middleware approach catches requests earlier — before any business logic runs.

**Alternatives considered**:
- **Service-level check** (inside `ItemService.registerItem`, `RatingService.submitRating`, etc.): Would require modifying each service method individually, duplicating the check. Rejected because it violates DRY.
- **Extend `requireAuth` middleware**: Would couple membership logic with JWT/event-access logic. Rejected because `requireAuth` handles authentication (JWT validity + event claim), while membership is authorization (is the user still a member of this specific event).

## R-002: Membership Verification Logic

**Decision**: Check `event.users[normalizedEmail]` OR `event.administrators[normalizedEmail]`. If neither exists, reject with 403.

**Rationale**: `event.users` is an object keyed by normalized email. `event.administrators` is a separate object keyed by normalized email. Both are properties of the event document already loaded from DynamoDB. The `EventService.isAdministrator(event, email)` method already exists and handles normalization + migration of the legacy `administrator` field.

**Alternatives considered**:
- **Only check `event.users`**: Would block administrators who aren't also in the users list. Rejected because admins must always have access.
- **Create a new `EventService.isEventMember(event, email)` method**: A cleaner API that combines both checks. Chosen — wraps the dual-check into a single reusable method.

## R-003: Error Response Format

**Decision**: Return `{ error: "User is not registered for this event", code: "EVENT_MEMBERSHIP_REQUIRED" }` with HTTP 403.

**Rationale**: The codebase already uses `{ error: string }` as the standard error format. One precedent for a `code` field exists: `EVENT_ACCESS_DENIED` in `requireAuth.js`. Using the same pattern ensures frontend consistency. The `apiClient.js` already checks `errorData.code` for `EVENT_ACCESS_DENIED`, so adding a check for `EVENT_MEMBERSHIP_REQUIRED` follows the established pattern.

**Alternatives considered**:
- **Custom HTTP status code (409, 422)**: Non-standard usage of these codes. 403 is semantically correct (authenticated but not authorized). Rejected.
- **Error message matching only**: Fragile — messages can change. The `code` field provides a stable contract. Rejected.

## R-004: Dashboard Cache Invalidation on User Deletion

**Decision**: Add a `deleteDashboardCache(eventId)` method to `DynamoDBRepository` and call it in `EventService.deleteUser()` after ratings are removed. Also delete the similar-users cache for all users.

**Rationale**: Dashboard data is cached with 30-second TTL. After user deletion (with ratings removed), the cached dashboard contains stale data (wrong averages, wrong rating counts). Explicit cache invalidation ensures the next dashboard request computes fresh data. The spec requires synchronous accuracy — a 30-second stale window is unacceptable.

**Alternatives considered**:
- **Recompute dashboard data during deletion**: More synchronous but adds computation cost to the delete request and tightly couples deletion with dashboard logic. Rejected — cache deletion is simpler and achieves the same result since dashboard is recomputed on next request.
- **Reduce TTL to 0 seconds**: Would affect all dashboard requests, not just post-deletion. Rejected.
- **Do nothing (rely on TTL expiry)**: Up to 30 seconds of stale data. Rejected per FR-009.

## R-005: Frontend Error Handling for Membership Rejection

**Decision**: Add a handler for `EVENT_MEMBERSHIP_REQUIRED` in `apiClient.js`'s 403 handling block, following the existing `EVENT_ACCESS_DENIED` pattern. Display a blocking modal, then call `clearAllAuthState()` and redirect.

**Rationale**: The `apiClient.request()` method already handles 403 responses with specific code checks. Adding another code check fits naturally. The existing dialog pattern (`DeleteUserDialog`, `DeleteEventDialog`) uses `fixed inset-0 z-[110]` with backdrop blur — the membership modal should follow the same visual pattern.

**Alternatives considered**:
- **Handle in each component's catch block**: Would require changes in 30+ catch blocks across pages. Rejected — violates DRY and risks inconsistency.
- **Use toast notification (Sonner)**: Toasts are dismissible and non-blocking — spec requires blocking modal with logout. Rejected.

## R-006: Testing Strategy

**Decision**: Unit tests for the new middleware and `isEventMember` method. Integration tests for each affected endpoint (items POST/PATCH/DELETE, ratings POST/DELETE). E2E test for the full flow (admin deletes guest → guest's next action fails → modal → logout).

**Rationale**: The codebase uses Vitest for unit/integration tests and Playwright for E2E. Integration tests in `tests/integration/` use `supertest(app)` with mocked services. E2E tests in `frontend/tests/e2e/specs/` use the `testEvent` fixture for event lifecycle.

**Alternatives considered**:
- **Only E2E tests**: Too slow for iterating on the middleware logic. Rejected.
- **Only unit tests**: Wouldn't catch integration issues between middleware, routes, and services. Rejected.
