# API Contracts: Item Registration and Management

**Feature**: Item Registration and Management  
**Date**: 2025-01-27  
**Purpose**: Define API contracts for item registration and management endpoints

## Base URL

All endpoints are relative to `/api/events/:eventId/items`

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### GET /api/events/:eventId/items

Retrieve items for an event. Returns all items for administrators, or only user's own items for regular users.

**Path Parameters**:
- `eventId` (string, required): 8-character alphanumeric event identifier

**Authentication**: Required (JWT token)

**Query Parameters**: None

**Request Example**:
```http
GET /api/events/A5ohYrHe/items HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200 OK):
```json
[
  {
    "id": "aB3xY9mKpQrS",
    "name": "2018 Cabernet Sauvignon",
    "price": 45.99,
    "description": "Full-bodied red wine from Napa Valley",
    "ownerEmail": "user@example.com",
    "registeredAt": "2025-01-27T10:30:00.000Z",
    "itemId": null
  },
  {
    "id": "xY9mKaB3pQrT",
    "name": "Pinot Noir",
    "price": null,
    "description": null,
    "ownerEmail": "another@example.com",
    "registeredAt": "2025-01-27T11:00:00.000Z",
    "itemId": null
  }
]
```

**Error Responses**:
- **401 Unauthorized**: Missing or invalid JWT token
- **404 Not Found**: Event does not exist
- **500 Internal Server Error**: Server error

---

### POST /api/events/:eventId/items

Register a new item for an event. Only allowed when event is in "created" or "started" state.

**Path Parameters**:
- `eventId` (string, required): 8-character alphanumeric event identifier

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "name": "2018 Cabernet Sauvignon",
  "price": "45.99",
  "description": "Full-bodied red wine from Napa Valley"
}
```

**Request Body Schema**:
- `name` (string, required): Item name, 1-200 characters
- `price` (string/number, optional): Price in various formats ("$50", "50.00", "50"), will be normalized
- `description` (string, optional): Item description, max 1000 characters

**Success Response** (201 Created):
```json
{
  "id": "aB3xY9mKpQrS",
  "name": "2018 Cabernet Sauvignon",
  "price": 45.99,
  "description": "Full-bodied red wine from Napa Valley",
  "ownerEmail": "user@example.com",
  "registeredAt": "2025-01-27T10:30:00.000Z",
  "itemId": null
}
```

**Error Responses**:
- **400 Bad Request**: Invalid item data (missing name, invalid price, etc.)
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Item registration not allowed in current event state
- **404 Not Found**: Event does not exist
- **500 Internal Server Error**: Server error

---

### PATCH /api/events/:eventId/items/:itemId

Update an existing item. Only allowed when event is in "created" or "started" state. User must be item owner.

**Path Parameters**:
- `eventId` (string, required): 8-character alphanumeric event identifier
- `itemId` (string, required): Item ID (nanoid, 12 characters)

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "name": "2018 Cabernet Sauvignon Reserve",
  "price": "49.99",
  "description": "Updated description"
}
```

**Request Body Schema**:
- `name` (string, optional): Item name, 1-200 characters
- `price` (string/number, optional): Price in various formats, will be normalized
- `description` (string, optional): Item description, max 1000 characters

**Success Response** (200 OK):
```json
{
  "id": "aB3xY9mKpQrS",
  "name": "2018 Cabernet Sauvignon Reserve",
  "price": 49.99,
  "description": "Updated description",
  "ownerEmail": "user@example.com",
  "registeredAt": "2025-01-27T10:30:00.000Z",
  "itemId": null
}
```

**Error Responses**:
- **400 Bad Request**: Invalid item data
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User is not item owner, or update not allowed in current event state
- **404 Not Found**: Event or item does not exist
- **500 Internal Server Error**: Server error

---

### DELETE /api/events/:eventId/items/:itemId

Delete an item. Only allowed when event is in "created" or "started" state. User must be item owner.

**Path Parameters**:
- `eventId` (string, required): 8-character alphanumeric event identifier
- `itemId` (string, required): Item ID (nanoid, 12 characters)

**Authentication**: Required (JWT token)

**Success Response** (200 OK):
```json
{
  "message": "Item deleted successfully"
}
```

**Error Responses**:
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User is not item owner, or deletion not allowed in current event state
- **404 Not Found**: Event or item does not exist
- **500 Internal Server Error**: Server error

---

### PATCH /api/events/:eventId/items/:itemId/assign-item-id

Assign an item ID to a registered item. Only allowed when event is in "paused" state. User must be event administrator.

**Path Parameters**:
- `eventId` (string, required): 8-character alphanumeric event identifier
- `itemId` (string, required): Item ID (nanoid, 12 characters)

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "itemId": 5
}
```

**Request Body Schema**:
- `itemId` (integer, required): Item ID to assign, must be between 1 and numberOfItems, not in excludedItemIds, and unique per event

**Success Response** (200 OK):
```json
{
  "id": "aB3xY9mKpQrS",
  "name": "2018 Cabernet Sauvignon",
  "price": 45.99,
  "description": "Full-bodied red wine from Napa Valley",
  "ownerEmail": "user@example.com",
  "registeredAt": "2025-01-27T10:30:00.000Z",
  "itemId": 5
}
```

**Error Responses**:
- **400 Bad Request**: Invalid item ID (out of range, in excludedItemIds, or already assigned)
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User is not administrator, or assignment not allowed in current event state
- **404 Not Found**: Event or item does not exist
- **409 Conflict**: Item ID already assigned to another item
- **500 Internal Server Error**: Server error

---

## Response Schemas

### Item Response

```typescript
interface ItemResponse {
  id: string;                    // nanoid (12 characters, unique within event)
  name: string;                   // 1-200 characters
  price: number | null;          // Decimal number, zero or positive, null if not provided
  description: string | null;     // Max 1000 characters, null if not provided
  ownerEmail: string;             // Email address
  registeredAt: string;           // ISO 8601 timestamp
  itemId: number | null;          // Integer 1 to numberOfItems, null if not assigned
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;                  // Error message
  details?: string;               // Optional additional details
}
```

## Business Rules

1. **Item Registration**:
   - Only allowed when event is in "created" or "started" state
   - Name is required, price and description are optional
   - Owner email is automatically set from authenticated user's JWT token

2. **Item Updates**:
   - Only item owner can update their items
   - Only allowed when event is in "created" or "started" state
   - Cannot change ownerEmail or registeredAt

3. **Item Deletion**:
   - Only item owner can delete their items
   - Only allowed when event is in "created" or "started" state
   - If item has itemId assigned, itemId becomes available for reassignment

4. **Item ID Assignment**:
   - Only event administrators can assign item IDs
   - Only allowed when event is in "paused" state
   - Item ID must be in valid range (1 to numberOfItems)
   - Item ID cannot be in excludedItemIds list
   - Each item ID can only be assigned to one item per event

5. **Item Details View**:
   - Item details (name, price, description, owner) are only revealed when event is in "completed" state
   - All users can view item details after event completion

6. **Item Listing**:
   - Administrators see all items
   - Regular users see only their own items (filtered by ownerEmail)

## Usage Examples

### Register Item (User)
```javascript
const response = await fetch('/api/events/A5ohYrHe/items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '2018 Cabernet Sauvignon',
    price: '45.99',
    description: 'Full-bodied red wine from Napa Valley'
  })
});
```

### Assign Item ID (Admin)
```javascript
const response = await fetch('/api/events/A5ohYrHe/items/aB3xY9mKpQrS/assign-item-id', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    itemId: 5
  })
});
```
