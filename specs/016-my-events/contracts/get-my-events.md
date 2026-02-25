# API Contract: Get My Events

**Endpoint**: `GET /api/events/mine`
**Authentication**: Required (JWT token via httpOnly cookie or Authorization header)
**Authorization**: Any authenticated user (endpoint returns only events where user is admin)

## Request

No request body or query parameters.

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Cookie: `jwt` | Yes (or Authorization) | JWT token containing user email |
| Authorization: `Bearer <token>` | Yes (or Cookie) | Alternative JWT token delivery |

## Response

### 200 OK — Events found (or empty list)

```json
{
  "events": [
    {
      "eventId": "A3RKT9WP",
      "name": "Friday Wine Night",
      "state": "created",
      "createdAt": "2026-02-25T10:30:00.000Z"
    },
    {
      "eventId": "B7NQM2XY",
      "name": "Anniversary Tasting",
      "state": "completed",
      "createdAt": "2026-02-20T14:00:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `events` | array | List of event summaries (may be empty) |
| `events[].eventId` | string | 8-character Crockford Base32 event ID |
| `events[].name` | string | Event name (1-100 characters) |
| `events[].state` | string | One of: `created`, `started`, `paused`, `completed` |
| `events[].createdAt` | string | ISO 8601 timestamp |

**Sorting**: Events are sorted by `createdAt` descending (most recent first).

**Empty list**: When user has no admin events, returns `{ "events": [] }` with 200 status.

### 401 Unauthorized — No valid authentication

```json
{
  "error": "Authentication required"
}
```

### 500 Internal Server Error — Server failure

```json
{
  "error": "Failed to retrieve events"
}
```

## Notes

- The endpoint extracts the user's email from the JWT token (`req.user.email`).
- Only events where the user is in the `administrators` object are returned.
- Events where the user is only a participant are excluded.
- No pagination — the assumption is small event volumes per administrator (tens, not thousands).
