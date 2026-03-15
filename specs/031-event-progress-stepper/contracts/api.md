# API Contracts: Event Progress Stepper

No new API endpoints. No backend changes required.

## Existing Endpoint (unchanged)

### PATCH /api/events/:eventId/state

Transitions the event to a new state with optimistic locking.

**Request:**
```json
{
  "state": "started",
  "currentState": "created"
}
```

**Response (200 OK):**
```json
{
  "eventId": "ABC123",
  "state": "started",
  "name": "My Wine Tasting",
  ...
}
```

**Response (409 Conflict — optimistic locking):**
```json
{
  "error": "State has been modified by another user"
}
```

**Frontend call:** `apiClient.transitionEventState(eventId, targetState, currentState)`

No changes to this contract. The stepper component calls the same API through the existing `handleStateTransition` function in `EventAdminPage.jsx`.
