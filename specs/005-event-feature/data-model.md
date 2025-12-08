# Data Model: Event Feature

**Feature**: Event Feature  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for event page access and administration

## Entities

### Event

Represents a user-created event in the blind tasting application. This entity is already defined in the create event feature (spec 004), but is extended here for access and display purposes.

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `eventId` | string | Yes | 8 characters, alphanumeric, unique | Unique identifier for the event |
| `name` | string | Yes | 1-100 characters, alphanumeric + spaces/hyphens/underscores | Event name displayed in header |
| `typeOfItem` | string | Yes | Must be "wine" (currently only option) | Type of item for the event |
| `state` | string | Yes | Enum: "created", "started", "paused", "finished" | Current lifecycle state of the event |
| `administrator` | string | Yes | Valid email address | Email of user who created the event (from JWT token) |
| `createdAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when event was created |
| `updatedAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when event was last updated |

**Storage**:
- File-based JSON storage: `data/events/{eventId}/config.json`
- Managed via `FileDataRepository` extending `DataRepository` interface
- Cached in memory via `CacheService` for performance

**Example**:
```json
{
  "eventId": "A5ohYrHe",
  "name": "My second tasting event",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "sreenivas.talasila@gmail.com",
  "createdAt": "2025-12-08T20:56:02.951Z",
  "updatedAt": "2025-12-08T20:56:02.951Z"
}
```

### Event Access Context (Frontend Only)

Represents the current event context for a user viewing an event page. This is a transient frontend state, not persisted.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `eventId` | string | Yes | Event identifier from route parameter |
| `event` | Event object | No | Full event data (null while loading) |
| `isLoading` | boolean | Yes | Whether event data is being fetched |
| `isAdmin` | boolean | Yes | Whether current user is event administrator |
| `error` | string | No | Error message if event fetch failed |
| `lastPolled` | number (timestamp) | No | Timestamp of last successful poll |

**Usage**:
- Managed by `useEvent` hook
- Used by EventPage and EventAdminPage components
- Updated via polling mechanism

## Data Relationships

```
Event (1) ──<administrator>── (1) User (via email)
```

- Each Event has exactly one administrator (the user who created it)
- Administrator is identified by email address from JWT token
- Email comparison is case-insensitive (RFC 5321 compliance)

## Data Access Patterns

### Get Event by ID

1. Extract eventId from route parameter
2. Check cache for event data
3. If not cached, retrieve from file storage via DataRepository
4. Validate event exists
5. Return event data
6. Cache result for performance

### Check Administrator Access

1. Extract user email from JWT token (authenticated user)
2. Retrieve event by eventId
3. Compare user email with event.administrator (case-insensitive)
4. Return boolean indicating admin status

### Poll Event State

1. Periodically (every 30-60 seconds) fetch event data
2. Compare with previous state
3. If state changed, update UI accordingly
4. Continue polling while user is on event page

## Validation Rules

### Event ID Format

1. **Format**: Exactly 8 alphanumeric characters
2. **Pattern**: `/^[A-Za-z0-9]{8}$/`
3. **Validation**: Must match pattern, event must exist in storage

### Administrator Email Comparison

1. **Case-insensitive**: Convert both emails to lowercase before comparison
2. **Format**: Valid email address format (validated during event creation)
3. **Source**: User email from JWT token payload, event.administrator from storage
4. **Comparison**: `userEmail.toLowerCase() === event.administrator.toLowerCase()`

### Event State

1. **Valid values**: `"created"`, `"started"`, `"paused"`, `"finished"`
2. **State transitions**: Defined in EventService but out of scope for this feature
3. **State impact**: Affects UI (e.g., disable rating when paused/finished)

## Storage Implementation

### File Structure

```
data/
└── events/
    ├── A5ohYrHe/
    │   └── config.json
    ├── xY9mKaB3/
    │   └── config.json
    └── ...
```

### File Format

- JSON files, one per event
- Directory: `data/events/{eventId}/`
- Filename: `config.json`
- Content: Event object as defined above

### DataRepository Methods

- `getEvent(eventId)`: Retrieve event by ID (existing, reused)
- Cache key: `event:config:{eventId}` (via `getEventConfigKey`)

## Caching Strategy

### Cache Keys

- Event config: `event:config:{eventId}`
- Cache TTL: Per CacheService configuration (typically short-lived for freshness)

### Cache Invalidation

- On event update (future feature)
- Manual cache clear on state change detection
- Cache checked before file system read

## Migration Considerations

**Future Database Migration**:
- Current file-based storage can be migrated to database
- Event access patterns remain the same (getEvent by ID)
- Administrator email comparison logic unchanged
- Polling mechanism works with any storage backend
