# API Contracts: Event Feature

**Feature**: Event Feature  
**Date**: 2025-01-27  
**Purpose**: Define API contracts for event page access and administration

## Base URL

All endpoints are relative to `/api/events`

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### GET /api/events/:eventId

Retrieve event data by event ID.

**Path Parameters**:
- `eventId` (string, required): 8-character alphanumeric event identifier

**Authentication**: Required (JWT token)

**Request Example**:
```http
GET /api/events/A5ohYrHe HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200 OK):
```json
{
  "eventId": "A5ohYrHe",
  "name": "My second tasting event",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "sreenivas.talasila@gmail.com",
  "createdAt": "2025-12-08T20:56:02.951Z",
  "updatedAt": "2025-12-08T20:56:02.951Z"
}
```

**Error Responses**:

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
  "error": "Failed to retrieve event. Please try again."
}
```

**Response Schema**:
```typescript
interface EventResponse {
  eventId: string;          // 8-character alphanumeric
  name: string;             // 1-100 characters
  typeOfItem: string;       // Currently only "wine"
  state: string;           // "created" | "started" | "paused" | "finished"
  administrator: string;    // Email address
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
}
```

**Business Rules**:
- Event must exist in storage
- Any authenticated user can retrieve any event (no event-specific permissions required)
- Event data is cached for performance
- Case-insensitive email comparison for administrator identification (handled client-side)

**Usage**:
- Called by frontend when user navigates to `/event/:eventId`
- Called periodically for polling event state updates
- Called before user actions to validate current event state

## Error Handling

All errors follow consistent format:

```json
{
  "error": "User-friendly error message"
}
```

**Error Codes**:
- `401`: Authentication required
- `404`: Resource not found
- `500`: Internal server error

## Rate Limiting

No specific rate limiting for event retrieval endpoints. Polling should be reasonable (30-60 second intervals) to avoid excessive load.

## Testing

### Test Cases

1. **Success**: Authenticated user retrieves existing event
   - Status: 200
   - Response contains all event fields

2. **Unauthorized**: Request without JWT token
   - Status: 401
   - Error message indicates authentication required

3. **Not Found**: Request for non-existent event ID
   - Status: 404
   - Error message indicates event not found

4. **Invalid Event ID Format**: Request with invalid event ID format
   - Status: 400 or 404 (implementation decision)
   - Error message indicates invalid format or not found

5. **Expired Token**: Request with expired JWT token
   - Status: 401
   - Error message indicates token expired

## Implementation Notes

- Endpoint extends existing `/api/events` router
- Uses existing `requireAuth` middleware for authentication
- Uses existing `EventService.getEvent()` method (to be implemented)
- Uses existing `FileDataRepository.getEvent()` method
- Response format matches event creation endpoint for consistency
