# Data Model: Create Event Functionality

**Feature**: Create Event Functionality  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for event creation

## Entities

### Event

Represents a user-created event in the blind tasting application.

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `eventId` | string | Yes | 8 characters, alphanumeric, unique | Unique identifier generated using nanoid |
| `name` | string | Yes | 1-100 characters, alphanumeric + spaces/hyphens/underscores | Event name provided by user |
| `typeOfItem` | string | Yes | Must be "wine" (currently only option) | Type of item for the event |
| `state` | string | Yes | Enum: "created", "started", "paused", "finished" | Current lifecycle state of the event |
| `administrator` | string | Yes | Valid email address | Email of user who created the event (from JWT token) |
| `createdAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when event was created |
| `updatedAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when event was last updated |

**Initial Values**:
- `state`: Always set to `"created"` when event is first created
- `administrator`: Set to email from authenticated user's JWT token
- `createdAt`: Set to current timestamp when event is created
- `updatedAt`: Set to current timestamp when event is created (same as `createdAt`)

**State Transitions** (defined for future implementation):
- `created` → `started` or `paused` or `finished` (one-way)
- `started` ↔ `paused` (bidirectional)
- `started` → `finished` (one-way)
- `paused` → `finished` (one-way)
- `finished` → (no transitions allowed, terminal state)

**Storage**:
- File-based JSON storage: `data/events/{eventId}.json`
- Managed via `FileDataRepository` extending `DataRepository` interface

**Example**:
```json
{
  "eventId": "aB3xY9mK",
  "name": "Summer Wine Tasting",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "user@example.com",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z"
}
```

### Event Administrator

Represents the user role for event management. The user who creates an event is automatically assigned as the event administrator.

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `email` | string | Yes | Valid email address | Email of the administrator (from JWT token) |
| `eventId` | string | Yes | 8 characters, alphanumeric | Event identifier this administrator manages |
| `assignedAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when administrator was assigned |

**Storage**:
- Stored as part of Event entity (`administrator` field)
- No separate administrator table/collection needed for current scope

**Relationships**:
- One-to-one with Event (each event has exactly one administrator)
- Administrator identified by email address (from authentication)

## Validation Rules

### Event Name Validation

1. **Required**: Event name must be provided (non-empty)
2. **Length**: 1-100 characters (after trimming)
3. **Characters**: Alphanumeric, spaces, hyphens, underscores only
4. **Whitespace**: Leading and trailing whitespace trimmed
5. **Empty after trim**: Rejected if empty string after trimming

**Validation Pattern**:
```javascript
/^[a-zA-Z0-9\s\-_]+$/
```

### Type of Item Validation

1. **Required**: Type of item must be selected
2. **Valid values**: Currently only `"wine"` is allowed
3. **Future**: Additional types may be added in future features

### Event ID Validation

1. **Format**: Exactly 8 alphanumeric characters
2. **Uniqueness**: Must be unique across all events
3. **Generation**: Generated using nanoid with custom alphabet
4. **Collision handling**: If duplicate detected, regenerate (max 3 retries)

### State Validation

1. **Initial value**: Always `"created"` for new events
2. **Valid values**: `"created"`, `"started"`, `"paused"`, `"finished"`
3. **Transitions**: Must follow defined state transition rules (enforced in future features)

### Administrator Validation

1. **Required**: Administrator email must be present
2. **Format**: Valid email address format
3. **Source**: Extracted from authenticated user's JWT token
4. **Assignment**: Automatically assigned during event creation

## Data Relationships

```
Event (1) ──<administrator>── (1) User (via email)
```

- Each Event has exactly one administrator (the user who created it)
- Administrator is identified by email address from JWT token
- No separate User entity needed for current scope

## Data Access Patterns

### Create Event
1. Generate unique event ID (nanoid, 8 characters)
2. Validate event name and type of item
3. Extract administrator email from JWT token
4. Create event object with initial state "created"
5. Persist to file storage via DataRepository
6. Return created event with event ID

### Read Event (for future features)
1. Retrieve event by eventId from DataRepository
2. Validate event exists
3. Return event data

### List Events (for future features)
1. Retrieve all event files from storage
2. Parse and return array of events
3. Optionally filter by administrator or state

## Storage Implementation

### File Structure
```
data/
└── events/
    ├── aB3xY9mK.json
    ├── xY9mKaB3.json
    └── ...
```

### File Format
- JSON files, one per event
- Filename: `{eventId}.json`
- Content: Event object as defined above

### DataRepository Methods
- `createEvent(eventData)`: Create new event
- `getEvent(eventId)`: Retrieve event by ID
- `listEvents()`: List all events (for future features)
- `updateEvent(eventId, updates)`: Update event (for future features)

## Migration Considerations

**Future Database Migration**:
- Current file-based storage can be migrated to database
- DataRepository abstraction allows migration without changing service layer
- Event structure remains the same, only storage mechanism changes
- No data transformation needed

**Scalability**:
- File-based storage sufficient for single-instance deployment
- Can migrate to database (PostgreSQL, MongoDB) when needed
- Event ID remains unique identifier regardless of storage backend
