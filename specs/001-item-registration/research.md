# Research: Item Registration and Management

**Feature**: Item Registration and Management  
**Date**: 2025-01-27  
**Purpose**: Document technical decisions and research findings

## Technical Decisions

### Data Storage Structure

**Decision**: Store items as an `items` array in the event configuration JSON file (`data/events/{eventId}/config.json`).

**Rationale**: 
- Follows existing event configuration pattern (similar to `administrators`, `users`, `itemConfiguration`)
- Centralized storage simplifies data access and consistency
- No need for separate files or database tables
- Items are event-scoped, so storing in event config is natural
- File-based storage is sufficient for current scale (up to 50 items per event)

**Alternatives Considered**:
- Separate items file (`data/events/{eventId}/items.json`) - Rejected: adds complexity, event config is already centralized
- Database table - Rejected: project uses file-based storage, migration would be overkill
- CSV file for items - Rejected: JSON is more flexible for nested item data (price, description, owner)

### Item Unique Identifier

**Decision**: Use nanoid (12 characters) generated via `nanoid` package for item unique identifiers. Items only need to be unique within an event, not globally.

**Rationale**:
- Items are event-scoped, so uniqueness within event is sufficient
- nanoid is already used in the project (for event IDs), maintaining consistency
- Shorter than UUID (12 chars vs 36 chars), more readable and efficient
- Collision probability is negligible for event-scoped items (even with 1000 items per event)
- No external dependency needed (nanoid already in project)

**Alternatives Considered**:
- UUID (v4) - Rejected: unnecessarily long for event-scoped items, overkill for uniqueness requirement
- Sequential integer IDs - Rejected: requires coordination, not suitable for concurrent registration
- Timestamp-based IDs - Rejected: risk of collisions, less standard

### Price Data Normalization

**Decision**: Normalize price input to decimal number format, accepting various formats ("$50", "50.00", "50") and storing as number.

**Rationale**:
- Consistent data format enables calculations and comparisons
- User-friendly: accepts common input formats
- Decimal number type is appropriate for prices
- Validation ensures zero or positive values only (no negative prices)

**Implementation Pattern**:
```javascript
function normalizePrice(input) {
  if (!input || input.trim() === '') return null; // Optional field
  // Remove currency symbols, whitespace
  const cleaned = input.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Price must be zero or positive');
  }
  return parsed;
}
```

**Alternatives Considered**:
- Store as string - Rejected: loses type safety, harder to validate and format
- Store as integer (cents) - Rejected: unnecessary complexity for this use case, decimal is clearer

### Item ID Assignment Interface

**Decision**: Simple table/list interface with input fields for item ID assignment (no drag-and-drop).

**Rationale**:
- Simpler to implement and maintain
- Works well on mobile devices
- Faster for administrators (direct input vs drag)
- Follows spec requirement (FR-020: "simple table or list interface")

**Alternatives Considered**:
- Drag-and-drop interface - Rejected: more complex, not mobile-friendly, not required by spec
- Auto-assignment - Rejected: spec requires manual assignment by admin (FR-016)

### Item Details Display Component

**Decision**: Create reusable drawer component similar to existing `RatingDrawer` and `SimilarUsersDrawer` patterns.

**Rationale**:
- Follows existing UI patterns (constitution principle VI: User Experience Consistency)
- Reuses established drawer component structure
- Consistent user experience across features
- DRY principle: don't duplicate drawer implementation

**Alternatives Considered**:
- Modal dialog - Rejected: drawer is more mobile-friendly and matches existing patterns
- Inline expansion - Rejected: drawer provides better focus and matches existing patterns

### Validation Strategy

**Decision**: Validate on both client and server, with server as source of truth. Client validation provides immediate feedback, server validation ensures security.

**Rationale**:
- Client-side validation improves UX with immediate feedback
- Server-side validation is required for security and data integrity
- Follows existing validation patterns in codebase (e.g., event name, email validation)
- Prevents invalid data from reaching storage

**Validation Rules**:
- Name: Required, max 200 characters
- Price: Optional, decimal number, zero or positive only
- Description: Optional, max 1000 characters
- Item ID assignment: Integer, range 1 to numberOfItems, not in excludedItemIds, unique per event

**Alternatives Considered**:
- Client-only validation - Rejected: security risk, no guarantee of data integrity
- Server-only validation - Rejected: poor UX, users must submit to see errors

### State-Based Access Control

**Decision**: Enforce state-based access control using existing EventService state management.

**Rationale**:
- Item registration: allowed in "created" or "started" states only
- Item ID assignment: allowed in "paused" state only
- Item details reveal: allowed in "completed" state only
- Follows existing state transition patterns
- Critical for blind tasting integrity (admin shouldn't know item details during active tasting)

**Implementation Pattern**:
```javascript
async registerItem(eventId, itemData, userEmail) {
  const event = await eventService.getEvent(eventId);
  if (!['created', 'started'].includes(event.state)) {
    throw new Error('Item registration not allowed in current event state');
  }
  // ... register item
}
```

**Alternatives Considered**:
- Allow registration in all states - Rejected: violates blind tasting integrity requirements
- Different state rules - Rejected: spec clearly defines state-based access control

### Concurrent Update Handling

**Decision**: Use optimistic locking pattern similar to existing EventService state transitions.

**Rationale**:
- Prevents lost updates from concurrent modifications
- File-based storage requires explicit concurrency control
- Matches existing codebase patterns (event state transitions use optimistic locking)
- Simple and effective for low-concurrency use case

**Implementation Pattern**:
```javascript
async updateItem(eventId, itemId, updates, expectedUpdatedAt) {
  const event = await eventService.getEvent(eventId);
  // Optimistic lock check
  if (event.updatedAt !== expectedUpdatedAt) {
    throw new Error('Event was modified. Please refresh and try again.');
  }
  // ... update item
}
```

**Alternatives Considered**:
- Pessimistic locking - Rejected: would require file locking mechanism, adds complexity
- No locking - Rejected: risk of lost updates and data corruption

### Item ID Validation with excludedItemIds

**Decision**: Prevent assignment of item IDs that are in the excludedItemIds list.

**Rationale**:
- Maintains intentional gaps for randomness in blind tasting
- Preserves blind tasting integrity
- Clear validation rule: item ID must be in range 1 to numberOfItems AND not in excludedItemIds

**Implementation Pattern**:
```javascript
function validateItemIdAssignment(itemId, numberOfItems, excludedItemIds) {
  if (itemId < 1 || itemId > numberOfItems) {
    throw new Error(`Item ID must be between 1 and ${numberOfItems}`);
  }
  if (excludedItemIds.includes(itemId)) {
    throw new Error(`Item ID ${itemId} is excluded and cannot be assigned`);
  }
}
```

**Alternatives Considered**:
- Allow assignment to excluded IDs - Rejected: violates blind tasting integrity, defeats purpose of exclusions

### numberOfItems Validation

**Decision**: Validate that numberOfItems cannot be set below the total number of registered items.

**Rationale**:
- Ensures data integrity (all registered items can be assigned item IDs)
- Prevents impossible states
- Validation must check both registered items count and highest assigned item ID

**Implementation Pattern**:
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

**Alternatives Considered**:
- Allow reducing below registered count - Rejected: would create impossible state where items can't be assigned IDs
- Auto-adjust registered items - Rejected: would delete user data without consent

### API Endpoint Structure

**Decision**: RESTful endpoints under `/api/events/:eventId/items` following existing API patterns.

**Rationale**:
- Follows existing API structure (`/api/events/:eventId/...`)
- RESTful conventions (GET, POST, PATCH, DELETE)
- Consistent with other event-scoped endpoints
- Clear resource hierarchy

**Endpoints**:
- `GET /api/events/:eventId/items` - List all items (admin) or user's items (user)
- `POST /api/events/:eventId/items` - Register new item
- `PATCH /api/events/:eventId/items/:itemId` - Update item
- `DELETE /api/events/:eventId/items/:itemId` - Delete item
- `PATCH /api/events/:eventId/items/:itemId/assign-item-id` - Assign item ID (admin, paused state only)

**Alternatives Considered**:
- Separate `/api/items` endpoint - Rejected: breaks resource hierarchy, items are event-scoped
- GraphQL - Rejected: project uses REST, no GraphQL infrastructure

### Service Layer Pattern

**Decision**: Create ItemService following existing EventService pattern for business logic.

**Rationale**:
- Follows established service layer pattern
- Separates business logic from API routes
- Enables reuse and testability
- Consistent with codebase architecture

**Service Methods**:
- `registerItem(eventId, itemData, userEmail)` - Register new item
- `getItems(eventId, userEmail)` - Get items (filtered by user or all for admin)
- `updateItem(eventId, itemId, updates, userEmail)` - Update item
- `deleteItem(eventId, itemId, userEmail)` - Delete item
- `assignItemId(eventId, itemId, itemIdToAssign, adminEmail)` - Assign item ID

**Alternatives Considered**:
- Business logic in API routes - Rejected: violates separation of concerns, harder to test
- Separate repository for items - Rejected: items are part of event config, FileDataRepository handles it
