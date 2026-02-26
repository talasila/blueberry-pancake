# API Contract: System Events

**Branch**: `018-admin-event-list` | **Date**: 2026-02-26

## GET /api/system/events

List events for root admin dashboard. Requires authentication + root admin access.

### Request

**Headers**: `Authorization: Bearer <jwt>`

**Query Parameters**:

| Parameter | Type   | Required | Default | Description |
| --------- | ------ | -------- | ------- | ----------- |
| limit     | number | no       | 25      | Max events to return (max: 100) |
| offset    | number | no       | 0       | Number of events to skip |
| search    | string | no       | —       | **NEW** — OR-match across eventId, name, ownerEmail (substring, case-insensitive). When present, `name` and `owner` are ignored. |
| name      | string | no       | —       | Filter by event name substring (retained for backward compat; ignored when `search` is set) |
| owner     | string | no       | —       | Filter by owner email substring (retained for backward compat; ignored when `search` is set) |
| state     | string | no       | —       | Filter by state: `created`, `started`, `paused`, `completed` |

### Response `200 OK`

```json
{
  "events": [
    {
      "eventId": "ABC123XYZ",
      "name": "Wine Tasting 2026",
      "state": "started",
      "ownerEmail": "host@example.com",
      "typeOfItem": "wine",
      "itemCount": 12,
      "participantCount": 8,
      "ratingCount": 42,
      "createdAt": "2026-02-20T10:30:00.000Z",
      "pin": "482910"
    }
  ],
  "total": 87,
  "limit": 25,
  "offset": 0
}
```

**Field changes from current contract**:
- `pin` (string|null) — **added** to each event summary object. `null` for legacy events without a PIN.

**Behavior changes**:
- Default `limit` changed from `50` to `25`.
- New `search` parameter added (OR across eventId, name, ownerEmail).
- When `search` is present, the frontend sends `limit=100`.

### Response `500 Internal Server Error`

```json
{
  "error": "Failed to list events"
}
```

---

## GET /api/system/events/:eventId

Get full event details for root admin drawer. Requires authentication + root admin access.

### Request

**Headers**: `Authorization: Bearer <jwt>`

**Path Parameters**:

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| eventId   | string | Event ID    |

### Response `200 OK`

```json
{
  "eventId": "ABC123XYZ",
  "name": "Wine Tasting 2026",
  "state": "started",
  "ownerEmail": "host@example.com",
  "typeOfItem": "wine",
  "maxRating": 4,
  "ratingPresets": [],
  "itemCount": 12,
  "participantCount": 8,
  "ratingCount": 42,
  "registeredItems": [
    { "itemId": 0, "name": "Chateau Margaux", "ownerEmail": "user@example.com" }
  ],
  "admins": ["host@example.com", "cohost@example.com"],
  "createdAt": "2026-02-20T10:30:00.000Z",
  "pin": "482910"
}
```

**Field changes from current contract**:
- `pin` (string|null) — **added**. `null` for legacy events without a PIN.

### Response `404 Not Found`

```json
{
  "error": "Event not found"
}
```

### Response `500 Internal Server Error`

```json
{
  "error": "Failed to get event details"
}
```
