# Quick Start: Item Registration and Management

**Feature**: Item Registration and Management  
**Date**: 2025-01-27  
**Purpose**: Quick reference guide for implementing and testing item registration functionality

## Overview

This feature enables users to register items they're bringing to blind tasting events, with administrators managing item ID assignment during the paused state. Items are stored in the event configuration as an array, with details revealed only after event completion.

## Key Changes

### Backend

1. **ItemService** (`backend/src/services/ItemService.js`):
   - `registerItem(eventId, itemData, userEmail)` - Register new item
   - `getItems(eventId, userEmail)` - Get items (filtered by user or all for admin)
   - `updateItem(eventId, itemId, updates, userEmail)` - Update item
   - `deleteItem(eventId, itemId, userEmail)` - Delete item
   - `assignItemId(eventId, itemId, itemIdToAssign, adminEmail)` - Assign item ID
   - `normalizePrice(priceInput)` - Normalize price input to decimal number
   - `validateItemRegistration(itemData, eventState)` - Validate item registration
   - `validateItemIdAssignment(itemId, numberOfItems, excludedItemIds, existingAssignments)` - Validate item ID assignment

2. **API Routes** (`backend/src/api/items.js`):
   - `GET /api/events/:eventId/items` - List items
   - `POST /api/events/:eventId/items` - Register new item
   - `PATCH /api/events/:eventId/items/:itemId` - Update item
   - `DELETE /api/events/:eventId/items/:itemId` - Delete item
   - `PATCH /api/events/:eventId/items/:itemId/assign-item-id` - Assign item ID

3. **EventService Extensions** (`backend/src/services/EventService.js`):
   - Extend `updateItemConfiguration` to validate against registered items count
   - Add helper method `getRegisteredItemsCount(eventId)` for validation

4. **Data Model**:
   - Add `items` array to event config
   - Structure: Array of Item objects with id (nanoid, 12 chars), name, price, description, ownerEmail, registeredAt, itemId
   - Initialize as empty array `[]` for existing events

### Frontend

1. **ProfilePage** (`frontend/src/pages/ProfilePage.jsx`):
   - Add "My Items" section
   - Item registration form (name required, price/description optional)
   - List of user's registered items
   - Edit/delete actions for user's items
   - State-based access control (hide form when event is paused/completed)

2. **EventAdminPage** (`frontend/src/pages/EventAdminPage.jsx`):
   - Add "Items Management" section
   - Table/list view of all registered items
   - Item ID assignment interface (when event is paused)
   - Visual indicators for unassigned items
   - Display all item fields (name, price, description, owner)

3. **ItemDetailsDrawer** (`frontend/src/components/ItemDetailsDrawer.jsx`):
   - New drawer component for displaying item details
   - Shows name, price, description, owner
   - Handles missing optional fields gracefully
   - Only displays when event is completed

4. **EventPage** (`frontend/src/pages/EventPage.jsx`):
   - Integrate ItemDetailsDrawer
   - Open drawer when clicking item numbers (when event is completed)

5. **DashboardPage** (`frontend/src/pages/DashboardPage.jsx`):
   - Integrate ItemDetailsDrawer
   - Open drawer when clicking rows in Ratings table (when event is completed)

6. **API Client** (`frontend/src/services/itemService.js`):
   - `getItems(eventId)` - Fetch items
   - `registerItem(eventId, itemData)` - Register new item
   - `updateItem(eventId, itemId, updates)` - Update item
   - `deleteItem(eventId, itemId)` - Delete item
   - `assignItemId(eventId, itemId, itemIdToAssign)` - Assign item ID

## Implementation Checklist

### Backend

- [ ] Create `ItemService` class with business logic methods
- [ ] Implement price normalization function
- [ ] Implement item validation functions
- [ ] Create API routes in `backend/src/api/items.js`
- [ ] Mount items routes in `backend/src/api/index.js`
- [ ] Extend EventService to validate numberOfItems against registered items
- [ ] Add unit tests for ItemService
- [ ] Add integration tests for API endpoints
- [ ] Update FileDataRepository if needed (should work as-is)

### Frontend

- [ ] Create ItemDetailsDrawer component
- [ ] Extend ProfilePage with item registration UI
- [ ] Extend EventAdminPage with items management UI
- [ ] Integrate ItemDetailsDrawer into EventPage
- [ ] Integrate ItemDetailsDrawer into DashboardPage
- [ ] Create itemService API client
- [ ] Add form validation for item registration
- [ ] Add state-based UI controls (hide/show based on event state)
- [ ] Add unit tests for components
- [ ] Add E2E tests for user flows

## Testing Scenarios

### User Registration Flow

1. Navigate to profile page
2. Event in "created" state → registration form visible
3. Enter item name (required), price (optional), description (optional)
4. Submit → item appears in list
5. Edit item → updates persisted
6. Delete item → removed from list
7. Event transitions to "paused" → registration form hidden

### Admin Management Flow

1. Navigate to event admin page
2. View all registered items (name, price, description, owner)
3. Event transitions to "paused" state
4. Item ID assignment interface appears
5. Assign item IDs to items
6. Validation: duplicate item ID → error
7. Validation: excluded item ID → error
8. Validation: out of range → error
9. Successful assignment → itemId saved

### Item Details Reveal Flow

1. Event transitions to "completed" state
2. Navigate to event page
3. Click item number → ItemDetailsDrawer opens with details
4. Navigate to dashboard
5. Click row in Ratings table → ItemDetailsDrawer opens with details
6. Drawer shows name, price, description, owner

### Validation Flow

1. Register item without name → validation error
2. Register item with name > 200 chars → validation error
3. Register item with description > 1000 chars → validation error
4. Register item with negative price → validation error
5. Try to register when event is paused → state error
6. Try to assign item ID when event is not paused → state error
7. Try to reduce numberOfItems below registered count → validation error

## Key Files to Modify

### Backend
- `backend/src/services/ItemService.js` (new)
- `backend/src/api/items.js` (new)
- `backend/src/api/index.js` (mount items routes)
- `backend/src/services/EventService.js` (extend numberOfItems validation)

### Frontend
- `frontend/src/pages/ProfilePage.jsx` (extend)
- `frontend/src/pages/EventAdminPage.jsx` (extend)
- `frontend/src/pages/EventPage.jsx` (integrate drawer)
- `frontend/src/pages/DashboardPage.jsx` (integrate drawer)
- `frontend/src/components/ItemDetailsDrawer.jsx` (new)
- `frontend/src/services/itemService.js` (new)

## Data Migration

**Existing Events**: No migration required. System initializes `items` as empty array `[]` when accessing items for first time.

**Backward Compatibility**: Events without `items` property are handled gracefully (defaults to empty array).

## Performance Considerations

- Item registration: Target <30 seconds (success criteria SC-001)
- Admin view: Target <2 seconds (success criteria SC-003)
- Item details drawer: Target <500ms (success criteria SC-005)
- Use existing cache layer for event config reads
- Invalidate cache on item updates

## Security Considerations

- All endpoints require JWT authentication
- Item ownership validation (users can only edit/delete their own items)
- Admin-only item ID assignment
- State-based access control enforced on server
- Input validation on both client and server
- XSRF protection for state-changing requests
