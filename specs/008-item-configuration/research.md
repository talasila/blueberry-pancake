# Research: Item Configuration in Event Admin

**Feature**: Item Configuration in Event Admin  
**Date**: 2025-01-27  
**Purpose**: Document technical decisions and research findings

## Technical Decisions

### Data Structure

**Decision**: Store item configuration as `itemConfiguration` object in event config with `numberOfItems` (integer) and `excludedItemIds` (array of integers).

**Rationale**: 
- Follows existing event configuration pattern (similar to `administrators`, `users`, `pin`)
- Simple structure that's easy to validate and query
- Array of integers for excludedItemIds is efficient and straightforward to parse from comma-separated input
- Default values (20 items, empty array) can be applied when not configured

**Alternatives Considered**:
- Separate endpoints/files for item configuration - Rejected: adds complexity, event config is already centralized
- Storing excludedItemIds as comma-separated string - Rejected: array is easier to validate and manipulate, consistent with other array fields

### Validation Strategy

**Decision**: Validate on both client and server, with server as source of truth. Client validation provides immediate feedback, server validation ensures security and data integrity.

**Rationale**:
- Client-side validation improves UX with immediate feedback
- Server-side validation is required for security and data integrity
- Follows existing validation patterns in the codebase (e.g., event name, email validation)

**Alternatives Considered**:
- Client-only validation - Rejected: security risk, no guarantee of data integrity
- Server-only validation - Rejected: poor UX, users must submit to see errors

### Normalization Strategy

**Decision**: Normalize excluded item IDs by removing leading zeros and trimming whitespace before validation. Store as array of integers.

**Rationale**:
- User-friendly: accepts "05, 10" and normalizes to [5, 10]
- Prevents confusion: "05" and "5" are treated as the same item ID
- Consistent with sequential numbering (items are 1, 2, 3, not 01, 02, 03)
- Follows existing normalization patterns (email normalization to lowercase)

**Alternatives Considered**:
- Reject leading zeros - Rejected: less user-friendly, requires users to understand format
- Store as strings - Rejected: integers are more efficient and easier to validate

### Automatic Cleanup Strategy

**Decision**: When number of items is reduced, automatically remove invalid excluded IDs and display a warning message listing removed IDs.

**Rationale**:
- Maintains data integrity: configuration is always valid
- User-friendly: doesn't block the change, just cleans up invalid data
- Transparent: warning message informs user what was removed
- Follows principle of least surprise: user can proceed with their change

**Alternatives Considered**:
- Prevent the change - Rejected: too restrictive, user must manually clean up first
- Keep invalid IDs silently - Rejected: data inconsistency, invalid state
- Remove silently without warning - Rejected: user may not realize IDs were removed

### API Design

**Decision**: Use RESTful endpoints: GET and PATCH `/api/events/:eventId/item-configuration`.

**Rationale**:
- Follows existing API patterns (e.g., `/api/events/:eventId/state`, `/api/events/:eventId/administrators`)
- GET for retrieval, PATCH for partial updates (only update what's provided)
- Consistent with REST conventions
- Simple and intuitive

**Alternatives Considered**:
- PUT endpoint - Rejected: PUT implies full replacement, we want partial updates
- Separate endpoints for number of items and excluded IDs - Rejected: adds complexity, they're logically related

### UI Component Design

**Decision**: Use Card component pattern (similar to PIN Management and Administrators cards) with form inputs for number of items and excluded item IDs.

**Rationale**:
- Consistent with existing EventAdminPage UI patterns
- Card component provides clear visual separation
- Form inputs are standard and accessible
- Follows existing component reuse principles

**Alternatives Considered**:
- Separate page for item configuration - Rejected: adds navigation complexity, item config is part of event admin
- Inline editing - Rejected: less clear, harder to validate and provide feedback

## Implementation Patterns

### Existing Patterns to Reuse

1. **EventService pattern**: Add methods to EventService for item configuration logic (similar to administrator management)
2. **API route pattern**: Add routes to `/api/events/:eventId/item-configuration` (similar to state and administrators endpoints)
3. **Card component pattern**: Use existing Card, CardHeader, CardTitle, CardDescription, CardContent components
4. **Form validation pattern**: Use existing Input component with validation (similar to email input in Administrators card)
5. **Error handling pattern**: Use existing Message component for error/success feedback
6. **Authentication pattern**: Use existing requireAuth middleware and JWT authentication

### Validation Rules

1. **Number of items**: Integer, range 1-100, default 20
2. **Excluded item IDs**: Array of integers, each in range 1 to numberOfItems, no duplicates, at least one item must remain available
3. **Input parsing**: Comma-separated string → trim whitespace → remove leading zeros → parse as integers → validate range → remove duplicates

## No Additional Research Needed

All technical decisions are straightforward and follow existing patterns. No external dependencies or complex integrations required. Implementation can proceed directly to design phase.
