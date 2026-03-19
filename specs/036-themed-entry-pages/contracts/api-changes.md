# API Contract Changes: Themed Event Entry Pages

**Feature**: 036-themed-entry-pages
**Date**: 2026-03-19

## New Endpoint

### GET /api/events/:eventId/public-info

**Purpose**: Return minimal public event information for display on unauthenticated entry pages.

**Authentication**: None required. This is a public endpoint.

**Rate limiting**: Global rate limit + per-IP rate limit in production (same as check-admin).

**Request**: No body or query parameters.

**Response (200)**:
```json
{
  "name": "Sarah's Wine Night",
  "typeOfItem": "wine",
  "theme": "cellar",
  "state": "started"
}
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | Event display name |
| typeOfItem | string | Type of item being tasted |
| theme | string | Theme preset identifier |
| state | string | Event lifecycle state |

**Response (404)**:
```json
{
  "error": "Event not found"
}
```

**Response (400)**:
```json
{
  "error": "Invalid event ID format"
}
```

**Response (429)**:
```json
{
  "error": "Too many requests"
}
```

**Security notes**:
- MUST NOT return: administrators, users, pin, pinGeneratedAt, ratingConfiguration, itemConfiguration, createdAt, updatedAt
- Only the four fields listed above are returned
- Event ID format is validated before database access

---

## Unchanged Endpoints

All existing endpoints remain unchanged. No modifications to check-admin, verify-pin, verify-otp, or any authenticated endpoints.

---

## Frontend API Client Addition

### apiClient.getEventPublicInfo(eventId)

**Method**: `GET /events/${eventId}/public-info`

**Returns**: `{ data, notFound }` where:
- **200**: `{ data: { name, typeOfItem, theme, state }, notFound: false }`
- **404**: `{ data: null, notFound: true }`
- **Other errors** (429, network): `{ data: null, notFound: false }`

**Error handling**: Never throws. The `notFound` flag allows the caller to distinguish "event doesn't exist" from "request failed" — enabling different UI states (not-found message vs graceful fallback).
