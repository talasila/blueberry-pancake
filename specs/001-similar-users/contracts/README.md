# API Contracts: Similar Users Discovery

**Feature**: 001-similar-users  
**Date**: 2025-01-27  
**Purpose**: Define API contracts for similar users discovery functionality

## Base URL

All endpoints are relative to `/api/events/:eventId`

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### GET /api/events/:eventId/similar-users

Retrieve list of users with similar taste preferences to the current authenticated user.

**Path Parameters**:
- `eventId` (string, required): 8-character alphanumeric event identifier

**Authentication**: Required (JWT token)

**Request Example**:
```http
GET /api/events/aB3xY9mK/similar-users HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200 OK):
```json
{
  "similarUsers": [
    {
      "email": "alice@example.com",
      "name": "Alice Smith",
      "similarityScore": 0.87,
      "commonItemsCount": 12,
      "commonItems": [
        { "itemId": 1, "userRating": 4, "similarUserRating": 4 },
        { "itemId": 3, "userRating": 5, "similarUserRating": 5 },
        { "itemId": 7, "userRating": 3, "similarUserRating": 2 }
      ]
    },
    {
      "email": "bob@example.com",
      "name": null,
      "similarityScore": 0.72,
      "commonItemsCount": 8,
      "commonItems": [
        { "itemId": 1, "userRating": 4, "similarUserRating": 3 },
        { "itemId": 5, "userRating": 5, "similarUserRating": 5 }
      ]
    }
  ],
  "currentUserEmail": "user@example.com",
  "eventId": "aB3xY9mK"
}
```

**Error Responses**:

- **400 Bad Request**: Current user has rated fewer than 3 items
```json
{
  "error": "You need to rate at least 3 items before similar users can be found"
}
```

- **401 Unauthorized**: Missing or invalid JWT token
```json
{
  "error": "Authentication required"
}
```

- **404 Not Found**: Event does not exist
```json
{
  "error": "Event not found"
}
```

- **500 Internal Server Error**: Server error
```json
{
  "error": "Failed to retrieve similar users. Please try again."
}
```

**Response Schema**:
```typescript
interface SimilarUsersResponse {
  similarUsers: SimilarUser[];
  currentUserEmail: string;
  eventId: string;
}

interface SimilarUser {
  email: string;
  name: string | null;
  similarityScore: number;  // -1.0 to 1.0
  commonItemsCount: number; // >= 3
  commonItems: CommonItemRating[];
}

interface CommonItemRating {
  itemId: number;
  userRating: number;        // Current user's rating
  similarUserRating: number; // Similar user's rating
}
```

**Business Rules**:
- Current user must have rated at least 3 items (FR-002, FR-008)
- Only users with at least 3 common rated items are considered (FR-002)
- Maximum 5 similar users returned (FR-003)
- Users sorted by similarity score (descending), then by common items count (descending), then alphabetically
- Users with null similarity scores (calculation failures) are excluded silently (FR-001)
- Empty array returned if no similar users found (FR-007)
- Feature only available during active events (FR-010)

**Performance**:
- Response time target: <2 seconds (SC-001)
- Results cached for 30 seconds
- Cache invalidated on rating submission

**Usage**:
- Called by frontend when user clicks "Find Similar Tastes" button
- Button only visible when user has rated 3+ items (FR-004, FR-008)

**Event State Validation**:
- Feature only available when event state is 'started' or 'paused' (FR-010)
- Returns 400 Bad Request if event is in 'created' or 'completed' state

**Cache Behavior**:
- Results are cached per user per event with 30-second TTL
- Cache key format: `similarUsers:{eventId}:{userEmail}`
- Cache automatically invalidated when any user submits a rating (pattern: `similarUsers:{eventId}:*`)
- Cache hit returns immediately without recalculation
