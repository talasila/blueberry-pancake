# Data Model: Event PIN Access

**Feature**: Event PIN Access  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for PIN-based event access

## Entities

### Event (Extended)

Represents a user-created event with PIN-based access control. Extends the Event entity from feature 004-create-event.

**Additional Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `pin` | string | Yes | Exactly 6 digits (000000-999999) | 6-digit PIN for event access, automatically generated |
| `pinGeneratedAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when PIN was generated or last regenerated |

**PIN Generation**:
- Automatically generated when event is created (FR-001)
- Format: 6-digit numeric string (e.g., "123456", "789012")
- Generated using `crypto.randomInt(100000, 1000000)` for cryptographic security
- Stored in plain text (PINs are meant to be shared)

**PIN Regeneration**:
- Only event administrators can regenerate PINs (FR-007)
- Regeneration invalidates previous PIN immediately (FR-008)
- `pinGeneratedAt` updated to current timestamp
- All existing PIN verification sessions invalidated

**Initial Values**:
- `pin`: Generated automatically during event creation
- `pinGeneratedAt`: Set to current timestamp when PIN is generated

**Storage**:
- File-based JSON storage: `data/events/{eventId}/config.json`
- Managed via `FileDataRepository` extending `DataRepository` interface

**Example** (extended Event):
```json
{
  "eventId": "aB3xY9mK",
  "name": "Summer Wine Tasting",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "user@example.com",
  "pin": "456789",
  "pinGeneratedAt": "2025-01-27T10:30:00.000Z",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z"
}
```

### PIN Verification Session

Represents a user's authenticated access to an event via PIN verification. Stored in CacheService (in-memory cache).

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `eventId` | string | Yes | 8 characters, alphanumeric | Event identifier this session grants access to |
| `sessionId` | string | Yes | UUID or hash | Unique session identifier |
| `verifiedAt` | number (timestamp) | Yes | Unix timestamp in milliseconds | Timestamp when PIN was verified |
| `eventId` | string | Yes | Event ID | Event this session is for |

**Session Lifecycle**:
- Created when PIN is successfully verified (FR-010)
- Valid until PIN is regenerated or event state becomes "finished" (no time expiration)
- Stored in CacheService with key: `pin:verified:{eventId}:{sessionId}`
- No expiration TTL (0 = never expires automatically)

**Session Invalidation**:
- When PIN is regenerated: all sessions for that event are invalidated
- When event state becomes "finished": sessions remain valid but event functionality may be restricted
- Client-side session ID stored in localStorage or sessionStorage

**Storage**:
- In-memory cache via CacheService (node-cache)
- Key pattern: `pin:verified:{eventId}:{sessionId}`
- Value: `{ eventId, verifiedAt }`

**Example** (cache entry):
```javascript
// Key: "pin:verified:aB3xY9mK:550e8400-e29b-41d4-a716-446655440000"
// Value:
{
  "eventId": "aB3xY9mK",
  "verifiedAt": 1706356800000
}
```

### Event Access Method

Represents how a user accessed an event. Used internally to determine access permissions.

**Valid Methods**:
- `PIN`: PIN-based access (grants access to main page only)
- `OTP`: OTP-based access (grants access to both main page and admin page)

**Access Permissions**:
- PIN access: Can access `/event/{eventId}` only
- OTP access: Can access `/event/{eventId}` and `/event/{eventId}/admin`

**Storage**:
- Not stored as separate entity
- Determined by presence of:
  - PIN verification session (PIN access)
  - JWT token (OTP access)

## Validation Rules

### PIN Format Validation

1. **Required**: PIN must be provided (non-empty)
2. **Length**: Exactly 6 characters
3. **Format**: Numeric only (0-9)
4. **Range**: 000000 to 999999 (all 6-digit numbers valid)

**Validation Pattern**:
```javascript
/^\d{6}$/
```

**Client-side validation**: InputOTP component with maxLength={6} and numeric input
**Server-side validation**: Regex pattern validation before processing (FR-009)

### PIN Verification Session Validation

1. **Session ID required**: Must provide valid session ID
2. **Event ID match**: Session eventId must match requested event
3. **Session exists**: Session must exist in cache
4. **PIN not regenerated**: Event PIN must match PIN used to create session (implicit check via session existence)

### Event Existence Validation

1. **Event ID format**: Must be valid 8-character alphanumeric
2. **Event exists**: Event must exist in storage (FR-011)
3. **Event not deleted**: Event file must be readable

## Data Relationships

```
Event (1) ──<has>── (1) PIN
Event (1) ──<has>── (*) PIN Verification Sessions
PIN Verification Session (1) ──<grants access to>── (1) Event
```

- Each Event has exactly one active PIN at a time
- Each Event can have multiple active PIN verification sessions (multiple users)
- Each PIN Verification Session grants access to exactly one Event
- PIN regeneration invalidates all sessions for that Event

## Data Access Patterns

### Generate PIN (Event Creation)
1. Generate 6-digit random PIN using crypto.randomInt
2. Set `pin` field in event data
3. Set `pinGeneratedAt` to current timestamp
4. Persist event data via DataRepository

### Verify PIN
1. Validate PIN format (6 digits)
2. Check rate limits (per IP and per event)
3. Retrieve event by eventId
4. Compare provided PIN with event PIN
5. If valid: create PIN verification session, return session ID
6. If invalid: record failed attempt, return error

### Check PIN Verification Session
1. Extract session ID from request (header or cookie)
2. Look up session in cache: `pin:verified:{eventId}:{sessionId}`
3. If exists: grant access to event main page
4. If not exists: require PIN entry

### Regenerate PIN
1. Verify user is event administrator (case-insensitive email comparison)
2. Generate new 6-digit PIN
3. Update event data: `pin`, `pinGeneratedAt`, `updatedAt`
4. Invalidate all PIN verification sessions for this event
5. Return new PIN to administrator

### Invalidate PIN Sessions
1. Get all cache keys matching pattern: `pin:verified:{eventId}:*`
2. Delete all matching keys from cache
3. Used when PIN is regenerated or event becomes "finished"

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

**File Format** (extended):
- JSON files, one per event
- Filename: `{eventId}/config.json`
- Content: Event object with PIN fields added

**Example Event File**:
```json
{
  "eventId": "aB3xY9mK",
  "name": "Summer Wine Tasting",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "user@example.com",
  "pin": "456789",
  "pinGeneratedAt": "2025-01-27T10:30:00.000Z",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z"
}
```

### PIN Verification Sessions (Cache)

**Storage**: In-memory cache (CacheService/node-cache)

**Key Pattern**: `pin:verified:{eventId}:{sessionId}`

**Value Structure**:
```javascript
{
  eventId: string,
  verifiedAt: number // Unix timestamp in milliseconds
}
```

**Cache Operations**:
- `set(key, value, 0)`: Store session (0 = no expiration)
- `get(key)`: Retrieve session
- `del(key)`: Delete single session
- `keys()`: Get all keys (for pattern matching)
- Pattern deletion: Get all keys, filter by pattern, delete matches

## Migration Considerations

**Existing Events**:
- Events created before PIN feature need PIN generation
- Migration script: Generate PINs for all existing events
- Set `pinGeneratedAt` to event `createdAt` timestamp (approximation)

**PIN Verification Sessions**:
- No migration needed (in-memory cache, ephemeral)
- Sessions recreated on next PIN verification

**Backward Compatibility**:
- Events without PIN field: Generate PIN on first access or migration
- PIN field optional during transition, required after migration

## Security Considerations

**PIN Storage**:
- PINs stored in plain text (they're meant to be shared)
- Event data files should have appropriate file permissions
- PINs not logged in application logs

**PIN Validation**:
- Server-side validation required (FR-009)
- Client-side validation for UX only
- Rate limiting prevents brute force (FR-017)

**Session Security**:
- Session IDs should be unpredictable (UUID or cryptographic hash)
- Session validation on every request
- Sessions invalidated on PIN regeneration

**Rate Limiting**:
- Per IP: 5 attempts per 15 minutes
- Per Event: 5 attempts per 15 minutes
- Independent limits (both must pass)
- Temporary lockout when limits exceeded
