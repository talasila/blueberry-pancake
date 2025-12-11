# Data Model: Item Registration and Management

**Feature**: Item Registration and Management  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for item registration

## Entities

### Item

Represents a physical item brought to the event for rating.

**Storage**: Array of Item objects in event configuration: `data/events/{eventId}/config.json` under `items` property

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `id` | string (nanoid) | Yes | 12-character alphanumeric, unique within event | Unique identifier for the item |
| `name` | string | Yes | 1-200 characters, non-empty | Item name |
| `price` | number (decimal) | No | Zero or positive, null if not provided | Item price (normalized from various input formats) |
| `description` | string | No | Max 1000 characters, null if not provided | Item description |
| `ownerEmail` | string | Yes | Valid email address | Email of user who registered the item |
| `registeredAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when item was registered |
| `itemId` | integer | No | Range 1 to numberOfItems, not in excludedItemIds, unique per event, null if not assigned | Item ID assigned during paused state |

**Item ID Assignment Rules**:
- Item ID can only be assigned when event is in "paused" state
- Item ID must be within valid range (1 to numberOfItems)
- Item ID cannot be in excludedItemIds list
- Each item ID can only be assigned to one item per event
- Item ID becomes available for reassignment if item is deleted

**Example**:
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

**Example (without optional fields)**:
```json
{
  "id": "xY9mKaB3pQrT",
  "name": "Pinot Noir",
  "price": null,
  "description": null,
  "ownerEmail": "another@example.com",
  "registeredAt": "2025-01-27T11:00:00.000Z",
  "itemId": null
}
```

### Event (Extended)

Represents a user-created event that includes item registration. Extends the Event entity from previous features.

**New Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `items` | array of Item objects | No | Array of Item objects, empty array if no items | All registered items for the event |

**Items Array Rules**:
- Items array is initialized as empty array `[]` when event is created
- Items are added when users register items
- Items can be modified (edited/deleted) by their owners when event is in "created" or "started" state
- Items persist throughout event lifecycle
- Item details are revealed to all users when event is in "completed" state

**Storage**:
- File-based JSON storage: `data/events/{eventId}/config.json`
- Managed via `FileDataRepository` extending `DataRepository` interface
- Part of event configuration object

**Example** (extended Event with items):
```json
{
  "eventId": "A5ohYrHe",
  "name": "My tasting event",
  "typeOfItem": "wine",
  "state": "started",
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T11:00:00.000Z",
  "itemConfiguration": {
    "numberOfItems": 20,
    "excludedItemIds": [7, 8]
  },
  "items": [
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
  ],
  "administrators": {
    "admin@example.com": {
      "assignedAt": "2025-01-27T10:00:00.000Z",
      "owner": true
    }
  },
  "users": {
    "user@example.com": {
      "registeredAt": "2025-01-27T10:30:00.000Z"
    },
    "another@example.com": {
      "registeredAt": "2025-01-27T11:00:00.000Z"
    }
  }
}
```

## Data Relationships

```
Event (1) ──<items>── (N) Item
Item (N) ──<ownerEmail>── (1) User (via email)
Item (1) ──<itemId>── (0..1) Item ID (integer, 1 to numberOfItems)
```

- Each Event has zero or more Items (stored in `items` array)
- Each Item belongs to exactly one Event
- Each Item has exactly one owner (identified by email)
- Each Item may have zero or one assigned itemId (assigned during paused state)
- Item IDs are unique per event (each itemId can only be assigned to one item)

## Validation Rules

### Item Registration Validation

1. **Name**: 
   - Required: Must be provided
   - Type: Must be a string
   - Length: Must be between 1 and 200 characters
   - Non-empty: Cannot be whitespace-only

2. **Price**:
   - Optional: May be null or not provided
   - Type: Must be a number (decimal) if provided
   - Range: Must be zero or positive (negative values not allowed)
   - Normalization: Accepts various formats ("$50", "50.00", "50") and normalizes to decimal number

3. **Description**:
   - Optional: May be null or not provided
   - Type: Must be a string if provided
   - Length: Must not exceed 1000 characters

4. **Owner Email**:
   - Required: Must be provided
   - Format: Must be valid email address
   - Source: Extracted from authenticated user's JWT token

5. **Event State**:
   - Item registration only allowed when event is in "created" or "started" state
   - Registration prevented in "paused" or "completed" state

**Validation Logic**:
```javascript
function validateItemRegistration(itemData, eventState) {
  // State check
  if (!['created', 'started'].includes(eventState)) {
    throw new Error('Item registration not allowed in current event state');
  }
  
  // Name validation
  if (!itemData.name || typeof itemData.name !== 'string') {
    throw new Error('Item name is required');
  }
  const trimmedName = itemData.name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 200) {
    throw new Error('Item name must be between 1 and 200 characters');
  }
  
  // Price validation (if provided)
  if (itemData.price !== undefined && itemData.price !== null) {
    const price = normalizePrice(itemData.price);
    if (price < 0) {
      throw new Error('Price must be zero or positive');
    }
  }
  
  // Description validation (if provided)
  if (itemData.description !== undefined && itemData.description !== null) {
    if (typeof itemData.description !== 'string' || itemData.description.length > 1000) {
      throw new Error('Description must not exceed 1000 characters');
    }
  }
}
```

### Item ID Assignment Validation

1. **Event State**: 
   - Item ID assignment only allowed when event is in "paused" state
   - Assignment prevented in other states

2. **Item ID Range**:
   - Must be integer between 1 and numberOfItems (inclusive)
   - Must not be in excludedItemIds list

3. **Uniqueness**:
   - Each item ID can only be assigned to one item per event
   - Duplicate assignments are prevented

4. **Item Existence**:
   - Item must exist in event's items array
   - Item must be registered (have valid id and ownerEmail)

**Validation Logic**:
```javascript
function validateItemIdAssignment(itemId, numberOfItems, excludedItemIds, existingAssignments) {
  // Range check
  if (!Number.isInteger(itemId) || itemId < 1 || itemId > numberOfItems) {
    throw new Error(`Item ID must be between 1 and ${numberOfItems}`);
  }
  
  // Excluded check
  if (excludedItemIds.includes(itemId)) {
    throw new Error(`Item ID ${itemId} is excluded and cannot be assigned`);
  }
  
  // Uniqueness check
  if (existingAssignments.includes(itemId)) {
    throw new Error(`Item ID ${itemId} is already assigned to another item`);
  }
}
```

### numberOfItems Validation (Extended)

**Decision**: Extend existing itemConfiguration validation to check registered items count.

**Validation Rules**:
1. numberOfItems must be >= total number of registered items
2. numberOfItems must be >= highest assigned item ID (if any items have itemId assigned)
3. Validation occurs when updating itemConfiguration

**Validation Logic**:
```javascript
function validateNumberOfItems(newNumberOfItems, registeredItems, assignedItemIds) {
  const registeredCount = registeredItems.length;
  const highestAssignedId = Math.max(...assignedItemIds, 0);
  
  if (newNumberOfItems < registeredCount) {
    throw new Error(`Number of items must be at least ${registeredCount} (registered items count)`);
  }
  if (newNumberOfItems < highestAssignedId) {
    throw new Error(`Number of items must be at least ${highestAssignedId} (highest assigned item ID)`);
  }
}
```

## Data Access Patterns

### Register Item

1. **Validate event state** (must be "created" or "started")
2. **Validate item data** (name required, price/description optional with constraints)
3. **Generate unique ID** (nanoid, 12 characters, unique within event)
4. **Set owner email** (from authenticated user's JWT token)
5. **Set registration timestamp** (current ISO 8601 timestamp)
6. **Add to items array** in event config
7. **Persist event config** via FileDataRepository
8. **Invalidate cache** for event
9. **Return created item**

### Get Items

1. **Get event** from EventService
2. **Filter items**:
   - If user is admin: return all items
   - If user is regular user: return only items where ownerEmail matches user email
3. **Return filtered items array**

### Update Item

1. **Validate event state** (must be "created" or "started")
2. **Get event** and find item by id
3. **Validate ownership** (user must be item owner or admin)
4. **Validate updates** (name, price, description constraints)
5. **Apply updates** to item object
6. **Persist event config** via FileDataRepository
7. **Invalidate cache** for event
8. **Return updated item**

### Delete Item

1. **Validate event state** (must be "created" or "started")
2. **Get event** and find item by id
3. **Validate ownership** (user must be item owner)
4. **Remove item** from items array
5. **If item has itemId assigned**: itemId becomes available for reassignment
6. **Persist event config** via FileDataRepository
7. **Invalidate cache** for event
8. **Return success**

### Assign Item ID

1. **Validate event state** (must be "paused")
2. **Validate administrator** (user must be event administrator)
3. **Get event** and find item by id
4. **Validate item ID assignment** (range, excludedItemIds, uniqueness)
5. **Assign itemId** to item
6. **Persist event config** via FileDataRepository
7. **Invalidate cache** for event
8. **Return updated item**

### Get Item Details (for display after completion)

1. **Validate event state** (must be "completed")
2. **Get event** and find item by itemId
3. **Return item details** (name, price, description, ownerEmail)

## State-Based Access Control

| Event State | Item Registration | Item Edit/Delete | Item ID Assignment | Item Details View |
|-------------|------------------|------------------|-------------------|-------------------|
| created | ✅ Allowed | ✅ Allowed (owner) | ❌ Not allowed | ❌ Not allowed |
| started | ✅ Allowed | ✅ Allowed (owner) | ❌ Not allowed | ❌ Not allowed |
| paused | ❌ Not allowed | ❌ Not allowed | ✅ Allowed (admin) | ❌ Not allowed |
| completed | ❌ Not allowed | ❌ Not allowed | ❌ Not allowed | ✅ Allowed (all users) |

## Migration Considerations

**Existing Events**:
- Events created before this feature will have no `items` property
- System should initialize `items` as empty array `[]` when accessing items for first time
- No data migration required (backward compatible)

**Future Database Migration**:
- Current file-based storage can be migrated to database
- Items array would become separate `items` table with `eventId` foreign key
- ItemService abstraction allows migration without changing business logic
