# Data Model: Manage Event State

**Feature**: Manage Event State  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for event state management

## Entities

### Event (Extended)

Represents a user-created event with state management. Extends the Event entity from previous features.

**Modified Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `state` | string | Yes | Enum: "created", "started", "paused", "completed" | Current lifecycle state of the event (migrated from "finished" to "completed") |
| `updatedAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when event was last updated (updated on state transitions) |

**State Values**:
- `"created"`: Initial state when event is first created
- `"started"`: Event is active, users can provide feedback
- `"paused"`: Event is temporarily inactive, users cannot provide feedback
- `"completed"`: Event is finished, users cannot provide feedback, results available

**State Transition Rules**:
- `created` → `started` (via start action)
- `started` → `paused` or `completed` (via pause or complete action)
- `paused` → `started` or `completed` (via start or complete action)
- `completed` → `started` or `paused` (via start or pause action)

**Legacy State Migration**:
- Events with `"finished"` state are automatically migrated to `"completed"` on first access
- Migration occurs in `getEvent` method before returning event data
- Migration updates both `state` and `updatedAt` fields

**Storage**:
- File-based JSON storage: `data/events/{eventId}/config.json`
- Managed via `FileDataRepository` extending `DataRepository` interface
- Cached in memory via `CacheService` for performance

**Example**:
```json
{
  "eventId": "A5ohYrHe",
  "name": "My tasting event",
  "typeOfItem": "wine",
  "state": "started",
  "administrators": {
    "admin@example.com": {
      "assignedAt": "2025-01-27T10:30:00.000Z",
      "owner": true
    }
  },
  "users": {
    "admin@example.com": {
      "registeredAt": "2025-01-27T10:30:00.000Z"
    }
  },
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T11:15:00.000Z"
}
```

## State Transition Validation

### Valid State Values

1. **Required**: State must be one of: "created", "started", "paused", "completed"
2. **Legacy support**: "finished" is automatically migrated to "completed"
3. **Invalid states**: Any other value is rejected with error and logged

### State Transition Validation

1. **Current state check**: Verify event exists and has valid current state
2. **Transition validation**: Check if transition from current state to new state is allowed
3. **Optimistic locking**: Verify current state matches expected state before applying transition
4. **Atomic update**: State change and `updatedAt` timestamp update occur atomically

### Transition Rules

| From State | Valid To States | Invalid Transitions |
|------------|----------------|---------------------|
| `created` | `started` | `paused`, `completed` |
| `started` | `paused`, `completed` | `created` |
| `paused` | `started`, `completed` | `created` |
| `completed` | `started`, `paused` | `created` |

## Data Access Patterns

### Get Event (with Migration)

1. Retrieve event by eventId from DataRepository
2. Check if state is "finished" (legacy)
3. If legacy state, migrate to "completed" and update storage
4. Return event with current state

### Transition Event State

1. Read current event state (with optimistic locking check)
2. Validate administrator authorization
3. Validate current state matches expected state (optimistic locking)
4. Validate transition is allowed from current state to new state
5. Update event state and `updatedAt` timestamp atomically
6. Invalidate cache for event
7. Return updated event

### Get Valid Transitions

1. Retrieve event by eventId
2. Look up valid transitions for current state
3. Return array of valid target states

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
- Content: Event object with state field

### DataRepository Methods

- `getEvent(eventId)`: Retrieve event by ID (with legacy migration)
- `updateEvent(eventId, updates)`: Update event with optimistic locking support
- Cache key: `event:config:{eventId}` (via `getEventConfigKey`)

## Caching Strategy

### Cache Keys

- Event config: `event:config:{eventId}`
- Cache TTL: Per CacheService configuration (typically short-lived for freshness)

### Cache Invalidation

- On state transition (invalidate event config cache)
- Manual cache clear on state change detection
- Cache checked before file system read

## Migration Considerations

### Legacy State Migration

**Migration Strategy**: Lazy migration on first access
- Migration occurs in `getEvent` method
- "finished" → "completed" conversion
- Updates both `state` and `updatedAt` fields
- No batch migration required

**Migration Safety**:
- Idempotent (safe to run multiple times)
- No data loss (state semantics preserved)
- Backward compatible (existing events continue to work)

### Future Database Migration

- Current file-based storage can be migrated to database
- State transition patterns remain the same
- Optimistic locking can use database transactions
- Migration logic can be removed after all events migrated

## Data Relationships

```
Event (1) ──<state>── (1) EventState (enum)
Event (1) ──<administrators>── (N) Administrator
```

- Each Event has exactly one state at any time
- State controls event lifecycle and user capabilities
- Administrators can transition event state
- State transitions are logged via `updatedAt` timestamp
