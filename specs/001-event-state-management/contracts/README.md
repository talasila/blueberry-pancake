# API Contracts: Manage Event State

**Feature**: Manage Event State  
**Date**: 2025-01-27  
**Purpose**: API contract definitions for event state management

## Contracts

### State Management API

**File**: `state-api.yaml`

**Endpoint**: `PATCH /api/events/:eventId/state`

**Description**: Transitions an event to a new state. Only administrators can perform state transitions. Uses optimistic locking to prevent concurrent modification conflicts.

**Authentication**: Required (JWT token via Bearer authentication)

**Authorization**: User must be an event administrator

**Request Body**:
```json
{
  "state": "started",
  "currentState": "created"
}
```

**Response Codes**:
- `200`: State transition successful
- `400`: Bad request (invalid state or transition)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (user is not an administrator)
- `404`: Event not found
- `409`: Conflict (state has changed - optimistic locking failure)
- `500`: Internal server error

**Valid State Transitions**:
- `created` → `started`
- `started` → `paused`, `completed`
- `paused` → `started`, `completed`
- `completed` → `started`, `paused`

**Optimistic Locking**:
- Client must provide `currentState` in request body
- Server verifies current state matches `currentState` before applying transition
- If state has changed, returns `409 Conflict` with current state
- Client should refresh and retry with updated state

**Example Request**:
```bash
curl -X PATCH http://localhost:3000/api/events/aB3xY9mK/state \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "started",
    "currentState": "created"
  }'
```

**Example Response (Success)**:
```json
{
  "eventId": "aB3xY9mK",
  "name": "My tasting event",
  "typeOfItem": "wine",
  "state": "started",
  "administrators": {
    "admin@example.com": {
      "assignedAt": "2025-01-27T10:30:00.000Z",
      "owner": true
    }
  },
  "users": {
    "admin@example.com": {
      "registeredAt": "2025-01-27T10:30:00.000Z"
    }
  },
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T11:15:00.000Z"
}
```

**Example Response (Conflict)**:
```json
{
  "error": "Event state has changed. Please refresh the page and try again.",
  "currentState": "started"
}
```

## Integration Notes

### Frontend Integration

1. **Get Current State**: Use existing `GET /api/events/:eventId` endpoint to retrieve current state
2. **Compute Valid Transitions**: Client-side logic determines valid transitions based on current state
3. **Transition State**: Call `PATCH /api/events/:eventId/state` with target state and current state
4. **Handle Conflicts**: On `409 Conflict`, refresh event data and retry if needed

### Error Handling

- **400 Bad Request**: Invalid state or transition - show error message, prevent retry
- **401 Unauthorized**: Redirect to authentication
- **403 Forbidden**: Show error message indicating user is not an administrator
- **404 Not Found**: Show error message indicating event not found
- **409 Conflict**: Refresh event data, show message, allow retry with updated state
- **500 Internal Server Error**: Show generic error message, allow retry

### Caching Considerations

- State transitions invalidate event cache
- Frontend should refresh event data after successful state transition
- Polling mechanism should detect state changes

## Testing

### Contract Tests

- Verify all valid transitions return `200`
- Verify invalid transitions return `400`
- Verify unauthorized requests return `401`
- Verify non-administrator requests return `403`
- Verify optimistic locking conflicts return `409`
- Verify state validation and error messages

### Integration Tests

- Test complete state transition flows
- Test concurrent state transitions (optimistic locking)
- Test legacy state migration
- Test authorization checks
- Test error handling and recovery
