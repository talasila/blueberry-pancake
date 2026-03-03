# API Contract: Membership Enforcement Error Response

**Feature**: 024-enforce-membership-writes  
**Date**: 2026-03-03

## Error Response

All write endpoints for items and ratings will return this error when the requesting user is not a current member of the event.

### HTTP Response

```
HTTP/1.1 403 Forbidden
Content-Type: application/json
```

### Response Body

```json
{
  "error": "User is not registered for this event",
  "code": "EVENT_MEMBERSHIP_REQUIRED"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `error` | String | Human-readable error message |
| `code` | String | Machine-readable error code for frontend routing. Always `"EVENT_MEMBERSHIP_REQUIRED"` for this case. |

### When Returned

This response is returned when ALL of the following are true:
1. The JWT is valid (user is authenticated)
2. The JWT's `events` array includes this eventId (user has event access)
3. The user's email is NOT in `event.users` AND NOT in `event.administrators`
4. The request is a write operation (POST, PATCH, DELETE) on items or ratings

### Frontend Behavior

When `apiClient.js` receives a 403 with `code: "EVENT_MEMBERSHIP_REQUIRED"`:
1. Display a blocking modal: "Your access to this event has been removed"
2. On modal dismissal: call `clearAllAuthState()` → redirect to `/`

## Affected Endpoints

### Items (all require membership)

| Method | Path | Current Auth | Membership Check |
|--------|------|-------------|------------------|
| POST | `/api/events/:eventId/items` | requireAuth | **NEW** |
| PATCH | `/api/events/:eventId/items/:itemId` | requireAuth | **NEW** |
| DELETE | `/api/events/:eventId/items/:itemId` | requireAuth | **NEW** |
| GET | `/api/events/:eventId/items` | requireAuth | Not gated (read-only, out of scope) |
| GET | `/api/events/:eventId/items/by-item-id/:itemId` | requireAuth | Not gated (read-only, out of scope) |
| PATCH | `/api/events/:eventId/items/:itemId/assign-item-id` | requireAuth | Not gated (admin-only operation, admin check happens in service) |

### Ratings (all require membership)

| Method | Path | Current Auth | Membership Check |
|--------|------|-------------|------------------|
| POST | `/api/events/:eventId/ratings` | requireAuth | **NEW** |
| DELETE | `/api/events/:eventId/ratings/:itemId` | requireAuth | **NEW** |
| GET | `/api/events/:eventId/ratings` | requireAuth | Not gated (read-only, out of scope) |
| GET | `/api/events/:eventId/ratings/:itemId` | requireAuth | Not gated (read-only, out of scope) |

## User Deletion Endpoint (existing, updated behavior)

### DELETE `/api/events/:eventId/users/:email`

No contract changes. Existing behavior remains. New internal behavior:
- After deleting ratings, invalidate dashboard cache and similar-users cache for the event.
- Response shape is unchanged:

```json
{
  "success": true,
  "message": "User user@example.com and all associated data deleted successfully",
  "itemsDeleted": 3,
  "ratingsDeleted": 5
}
```
