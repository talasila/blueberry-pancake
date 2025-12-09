# Data Model: Item Configuration in Event Admin

**Feature**: Item Configuration in Event Admin  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for item configuration

## Entities

### Event (Extended)

Represents a user-created event with item configuration. Extends the Event entity from previous features.

**New Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `itemConfiguration` | object | No | Object with numberOfItems and excludedItemIds | Item configuration settings for the event |

**Item Configuration Object Structure**:
```json
{
  "numberOfItems": 20,
  "excludedItemIds": [5, 10, 15]
}
```

**Item Configuration Object Rules**:
- `numberOfItems`: Integer, range 1-100, default 20 when not configured
- `excludedItemIds`: Array of integers, each in range 1 to numberOfItems, no duplicates
- At least one item must be available (cannot exclude all item IDs)
- Item IDs are numbered sequentially from 1 to numberOfItems
- Excluded item IDs are not displayed on the main event page

**Default Values**:
- When `itemConfiguration` is not present: `{ numberOfItems: 20, excludedItemIds: [] }`
- When `numberOfItems` is not specified: default to 20
- When `excludedItemIds` is not specified: default to empty array `[]`

**Storage**:
- File-based JSON storage: `data/events/{eventId}/config.json`
- Managed via `FileDataRepository` extending `DataRepository` interface
- Part of event configuration object

**Example** (extended Event):
```json
{
  "eventId": "aB3xY9mK",
  "name": "Summer Wine Tasting",
  "typeOfItem": "wine",
  "state": "created",
  "itemConfiguration": {
    "numberOfItems": 25,
    "excludedItemIds": [3, 7, 12]
  },
  "administrators": {
    "owner@example.com": {
      "assignedAt": "2025-01-27T10:30:00.000Z",
      "owner": true
    }
  },
  "users": {
    "owner@example.com": {
      "registeredAt": "2025-01-27T10:30:00.000Z"
    }
  },
  "pin": "456789",
  "pinGeneratedAt": "2025-01-27T10:30:00.000Z",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T11:00:00.000Z"
}
```

### Item Configuration

Represents the configuration settings for items in a blind tasting event. Stored as part of Event entity.

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `numberOfItems` | integer | Yes | Range 1-100, default 20 | Total number of items available for rating |
| `excludedItemIds` | array of integers | Yes | Each in range 1 to numberOfItems, no duplicates, at least one item must remain | Item IDs to exclude from display and rating |

**Item ID Rules**:
- Items are numbered sequentially from 1 to numberOfItems
- Item IDs are integers (1, 2, 3, ..., N where N = numberOfItems)
- Excluded item IDs are not displayed on the main event page
- At least one item must be available (cannot exclude all item IDs)

**Relationships**:
- One-to-one with Event (each event has one item configuration)
- Item configuration determines which item IDs are available for rating

## Validation Rules

### Number of Items Validation

1. **Required**: numberOfItems must be provided when itemConfiguration is present
2. **Type**: Must be an integer
3. **Range**: Must be between 1 and 100 (inclusive)
4. **Default**: If not provided, default to 20

**Validation Logic**:
```javascript
if (numberOfItems === undefined || numberOfItems === null) {
  numberOfItems = 20; // default
}
if (!Number.isInteger(numberOfItems) || numberOfItems < 1 || numberOfItems > 100) {
  throw new Error('Number of items must be an integer between 1 and 100');
}
```

### Excluded Item IDs Validation

1. **Type**: Must be an array of integers
2. **Range**: Each item ID must be between 1 and numberOfItems (inclusive)
3. **Duplicates**: No duplicate item IDs allowed
4. **Availability**: At least one item must remain available (cannot exclude all item IDs)
5. **Normalization**: Leading zeros removed, whitespace trimmed before validation

**Validation Logic**:
```javascript
// Normalize: trim whitespace, remove leading zeros, parse as integers
const normalized = excludedItemIdsString
  .split(',')
  .map(id => id.trim())
  .filter(id => id.length > 0)
  .map(id => parseInt(id.replace(/^0+/, ''), 10))
  .filter(id => !isNaN(id));

// Validate range
const invalidIds = normalized.filter(id => id < 1 || id > numberOfItems);
if (invalidIds.length > 0) {
  throw new Error(`Invalid item IDs: ${invalidIds.join(', ')}. Must be between 1 and ${numberOfItems}`);
}

// Remove duplicates
const unique = [...new Set(normalized)];

// Check at least one item remains
if (unique.length >= numberOfItems) {
  throw new Error('At least one item must be available. Cannot exclude all item IDs');
}
```

### Input Parsing (Comma-Separated String)

1. **Split**: Split by comma
2. **Trim**: Remove leading/trailing whitespace from each item
3. **Filter**: Remove empty strings
4. **Normalize**: Remove leading zeros (e.g., "05" → 5)
5. **Parse**: Convert to integers
6. **Validate**: Check each is a valid integer
7. **Deduplicate**: Remove duplicate values

**Example**:
- Input: `"5, 10 , 015, 5, 20"`
- After split: `["5", " 10 ", " 015", " 5", " 20"]`
- After trim: `["5", "10", "015", "5", "20"]`
- After normalize: `[5, 10, 15, 5, 20]`
- After deduplicate: `[5, 10, 15, 20]`

### Automatic Cleanup (When Number Reduced)

When `numberOfItems` is reduced and some `excludedItemIds` are outside the new range:

1. **Identify**: Find excluded item IDs that are > new numberOfItems
2. **Remove**: Remove invalid excluded item IDs from array
3. **Warn**: Return warning message listing removed item IDs
4. **Save**: Save cleaned configuration

**Example**:
- Current: `{ numberOfItems: 20, excludedItemIds: [5, 10, 15, 25] }`
- New: `{ numberOfItems: 12 }`
- Result: `{ numberOfItems: 12, excludedItemIds: [5, 10] }`
- Warning: "Item IDs 15, 25 were removed because they are outside the valid range (1-12)"

## Data Relationships

```
Event (1) ──<has>── (1) Item Configuration
Item Configuration (1) ──<defines>── (*) Item IDs
```

- Each Event has one Item Configuration (optional, defaults applied if missing)
- Item Configuration defines which Item IDs are available (1 to numberOfItems, excluding excludedItemIds)
- Item IDs are virtual (not stored, computed from numberOfItems and excludedItemIds)

## Data Access Patterns

### Get Item Configuration

1. Retrieve event by eventId
2. Extract itemConfiguration object
3. Apply defaults if missing: `{ numberOfItems: 20, excludedItemIds: [] }`
4. Return itemConfiguration object

### Update Item Configuration

1. Validate requester is administrator
2. Retrieve current event
3. Get current itemConfiguration (or defaults)
4. Validate new numberOfItems (1-100)
5. Parse and normalize excludedItemIds from input
6. Validate excludedItemIds (range, duplicates, at least one available)
7. If numberOfItems reduced, remove invalid excludedItemIds and generate warning
8. Update event with new itemConfiguration
9. Save event file atomically
10. Return updated itemConfiguration and any warnings

### Get Available Item IDs

1. Get itemConfiguration (or defaults)
2. Generate array of all item IDs: `[1, 2, 3, ..., numberOfItems]`
3. Filter out excludedItemIds
4. Return filtered array

**Example**:
- numberOfItems: 5
- excludedItemIds: [2, 4]
- Available item IDs: [1, 3, 5]

## Storage Implementation

### Event Data (Extended)

**File Structure** (unchanged):
```
data/
└── events/
    ├── aB3xY9mK/
    │   └── config.json
    ├── xY9mKaB3/
    │   └── config.json
    └── ...
```

**File Format** (modified):
- JSON files, one per event
- Filename: `{eventId}/config.json`
- Content: Event object with optional `itemConfiguration` object

**Backward Compatibility**:
- Events without `itemConfiguration` use defaults (20 items, no exclusions)
- No migration required (lazy defaults on read)

## Security Considerations

**Administrator Authorization**:
- Only administrators can get/update item configuration
- Authorization checked on both frontend and backend
- JWT token provides authenticated user email

**Input Validation**:
- Server-side validation required (client-side for UX only)
- Range validation prevents invalid data
- Normalization prevents injection issues
- Duplicate prevention ensures data integrity

**Atomic Updates**:
- Single file write ensures itemConfiguration updated atomically
- No partial updates possible
- File system provides atomicity at OS level
