# API Contracts: My Bottles Bottom Sheet

**Feature**: 030-my-bottles-sheet  
**Date**: 2026-03-13

No new API endpoints are required. This feature uses existing endpoints only.

## Existing Endpoints Used

### GET /events/:eventId/items?ownItemsOnly=true

**Purpose**: Fetch the current user's registered items for the event.  
**Used by**: MyBottlesSheet on open.  
**Frontend service**: `itemService.getItems(eventId, true)`

**Response** (200):
```json
[
  {
    "id": "uuid-string",
    "name": "Chateau Margaux 2015",
    "price": "85",
    "description": "Bordeaux blend, medium body",
    "createdAt": "2026-03-13T10:30:00Z",
    "itemId": 3,
    "userId": "user-uuid"
  }
]
```

**Notes**: `itemId` is `null` when the item has not been assigned a number by the host. It is set during the paused state via the assign endpoint. The sheet displays `itemId` only during `completed` state.

---

### POST /events/:eventId/items

**Purpose**: Register a new item (bottle).  
**Used by**: MyBottlesSheet add form.  
**Frontend service**: `itemService.registerItem(eventId, itemData)`

**Request body**:
```json
{
  "name": "Chateau Margaux 2015",
  "price": "85",
  "description": "Bordeaux blend"
}
```

**Response** (201): The created item object.

---

### PATCH /events/:eventId/items/:itemId

**Purpose**: Update an existing item's details.  
**Used by**: MyBottlesSheet edit form.  
**Frontend service**: `itemService.updateItem(eventId, itemId, updates)`

**Request body**:
```json
{
  "name": "Updated Name",
  "price": "90",
  "description": "Updated description"
}
```

**Response** (200): The updated item object.

---

### DELETE /events/:eventId/items/:itemId

**Purpose**: Delete a registered item.  
**Used by**: MyBottlesSheet undo toast flow (called after toast timeout).  
**Frontend service**: `itemService.deleteItem(eventId, itemId)`

**Response** (200): Success confirmation.

**Note**: With the undo toast pattern, this endpoint is called after the toast expires (not immediately on user tap). If the user taps "Undo", the delete API call is never made.

---

### GET /events/:eventId/profile

**Purpose**: Fetch the current user's profile (name, email).  
**Used by**: MyBottlesSheet on open (to populate the name field).  
**Frontend service**: `apiClient.getUserProfile(eventId)`

**Response** (200):
```json
{
  "email": "guest@example.com",
  "name": "Jane Doe"
}
```

---

### PUT /events/:eventId/profile

**Purpose**: Update the user's display name.  
**Used by**: MyBottlesSheet name field auto-save on blur.  
**Frontend service**: `apiClient.updateUserProfile(eventId, name)`

**Request body**:
```json
{
  "name": "Jane Doe"
}
```

**Response** (200): Updated profile object.
