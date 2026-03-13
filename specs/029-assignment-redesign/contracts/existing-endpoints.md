# API Contracts: Assignment Tab Redesign

**Branch**: `029-assignment-redesign` | **Date**: 2026-03-13

## No New Endpoints

This feature introduces no new backend endpoints (FR-014). All interactions use existing APIs.

## Existing Endpoints Used

### 1. Assign Item ID

```
PATCH /api/events/:eventId/items/:itemId/assign-item-id
```

**Auth**: JWT required, caller must be event administrator  
**Constraint**: Event must be in `paused` state

**Request Body**:
```json
{ "itemId": 3 }
```
Or to clear:
```json
{ "itemId": null }
```

**Response (200)**:
```json
{
  "id": "abc123def456",
  "name": "Cabernet Sauvignon",
  "price": 24.99,
  "description": "Full-bodied red",
  "ownerEmail": "sarah@example.com",
  "registeredAt": "2026-03-13T18:30:00.000Z",
  "itemId": 3
}
```

**Error Responses**:
- `400`: Invalid item ID, excluded ID, or already assigned
- `403`: Not an administrator
- `404`: Item not found
- `409`: Event state conflict (not paused)

### 2. Get Items

```
GET /api/events/:eventId/items
```

**Auth**: JWT required  
**Behavior**: Returns all items for administrators, own items only for guests

**Response (200)**:
```json
[
  {
    "id": "abc123def456",
    "name": "Cabernet Sauvignon",
    "price": 24.99,
    "description": "Full-bodied red",
    "ownerEmail": "sarah@example.com",
    "registeredAt": "2026-03-13T18:30:00.000Z",
    "itemId": 3
  },
  {
    "id": "xyz789uvw012",
    "name": "Pinot Noir",
    "price": null,
    "description": null,
    "ownerEmail": "mike@example.com",
    "registeredAt": "2026-03-13T18:35:00.000Z",
    "itemId": null
  }
]
```

### 3. Transition Event State

```
PATCH /api/events/:eventId/state
```

**Auth**: JWT required, caller must be event administrator

**Request Body**:
```json
{
  "state": "paused",
  "currentState": "started"
}
```

**Response (200)**: Updated event object  
**Error Responses**:
- `400`: Invalid state transition
- `409`: Optimistic locking conflict (state changed since last read)
