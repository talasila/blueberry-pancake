# Data Model: Manage Event Administrators

**Feature**: Manage Event Administrators  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for administrator management

## Entities

### Event (Extended)

Represents a user-created event with multiple administrators. Extends the Event entity from previous features.

**Modified Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `administrators` | object | Yes | Object with email keys, at least one entry | Administrators object with email addresses as keys, each containing assignedAt timestamp and owner flag |
| `users` | object | Yes | Object with email keys | Users section tracking all users (including administrators) by email with registration timestamps |

**Removed Attributes**:
- `administrator` (string) - Replaced by `administrators` object

**Administrators Object Structure**:
```json
{
  "email@example.com": {
    "assignedAt": "2025-01-27T10:30:00.000Z",
    "owner": true
  },
  "admin2@example.com": {
    "assignedAt": "2025-01-27T11:00:00.000Z",
    "owner": false
  }
}
```

**Administrators Object Rules**:
- Email addresses are keys (normalized to lowercase)
- Each administrator entry contains:
  - `assignedAt`: ISO 8601 timestamp when administrator was added
  - `owner`: Boolean flag (true for original event creator, false for others)
- At least one administrator must exist (the owner)
- Only one owner per event (the creator)
- Owner cannot be deleted

**Users Section Structure**:
```json
{
  "email@example.com": {
    "registeredAt": "2025-01-27T10:30:00.000Z"
  }
}
```

**Users Section Rules**:
- Email addresses are keys (normalized to lowercase)
- Each user entry contains:
  - `registeredAt`: ISO 8601 timestamp when user was registered
- Administrators are automatically added to users section when created
- Administrators are automatically removed from users section when deleted
- Users section tracks all users of the event (administrators are also users)

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
  "administrators": {
    "owner@example.com": {
      "assignedAt": "2025-01-27T10:30:00.000Z",
      "owner": true
    },
    "admin2@example.com": {
      "assignedAt": "2025-01-27T11:00:00.000Z",
      "owner": false
    }
  },
  "users": {
    "owner@example.com": {
      "registeredAt": "2025-01-27T10:30:00.000Z"
    },
    "admin2@example.com": {
      "registeredAt": "2025-01-27T11:00:00.000Z"
    },
    "regularuser@example.com": {
      "registeredAt": "2025-01-27T12:00:00.000Z"
    }
  },
  "pin": "456789",
  "pinGeneratedAt": "2025-01-27T10:30:00.000Z",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T11:00:00.000Z"
}
```

### Event Administrator

Represents a user with administrative privileges for an event. Stored as entry in Event's administrators object.

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `email` | string | Yes | Valid email address, normalized to lowercase | Email address used as key in administrators object |
| `eventId` | string | Yes | 8 characters, alphanumeric | Event identifier this administrator manages |
| `assignedAt` | string (ISO 8601) | Yes | Valid ISO 8601 timestamp | Timestamp when administrator was assigned |
| `owner` | boolean | Yes | true or false | Flag indicating if this is the original administrator (event creator) |

**Storage**:
- Stored as entry in Event's `administrators` object
- Key: normalized email address (lowercase)
- Value: `{ assignedAt: string, owner: boolean }`

**Relationships**:
- Many-to-one with Event (each event can have multiple administrators)
- One-to-one with User (administrators are also users, tracked in users section)
- Administrator identified by email address (from authentication or input)

**Owner Rules**:
- Only one owner per event (the original creator)
- Owner flag is set to `true` for the creator, `false` for all others
- Owner cannot be deleted by anyone, including themselves
- Owner designation is permanent (cannot be transferred)

## Validation Rules

### Email Address Validation

1. **Required**: Email address must be provided (non-empty)
2. **Format**: Must be valid email format (RFC 5322 compliant)
3. **Normalization**: Converted to lowercase for storage and comparison
4. **Whitespace**: Leading and trailing whitespace trimmed
5. **Length**: Reasonable length limits (typically 1-254 characters per RFC)

**Validation Pattern**:
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

**Client-side validation**: HTML5 email input type + pattern validation
**Server-side validation**: Regex pattern validation before processing

### Administrator Addition Validation

1. **Requester authorization**: Requester must be an existing administrator
2. **Email format**: Must be valid email address
3. **Duplicate check**: Email must not already exist in administrators object
4. **Case-insensitive comparison**: "User@Example.com" and "user@example.com" are considered duplicates
5. **Self-addition**: Administrator cannot add themselves (already an administrator)

### Administrator Deletion Validation

1. **Requester authorization**: Requester must be an existing administrator
2. **Target exists**: Administrator to delete must exist in administrators object
3. **Owner protection**: Owner cannot be deleted (FR-011)
4. **Minimum count**: At least one administrator must remain (the owner)
5. **Self-deletion**: Non-owner administrators can delete themselves if others exist

### Administrators Object Validation

1. **Required**: Administrators object must exist
2. **Non-empty**: At least one administrator must exist
3. **Owner exists**: Exactly one owner must exist
4. **Email keys**: All keys must be valid email addresses (normalized)
5. **Structure**: Each value must have `assignedAt` (ISO 8601) and `owner` (boolean)

## Data Relationships

```
Event (1) ──<has>── (*) Administrators
Administrator (1) ──<is also>── (1) User
Event (1) ──<has>── (*) Users
```

- Each Event has one or more Administrators (at least the owner)
- Each Administrator is also a User (tracked in users section)
- Each Event has zero or more Users (including administrators)
- Administrators and Users share email addresses as identifiers

## Data Access Patterns

### Add Administrator

1. Validate requester is administrator
2. Validate email format
3. Normalize email to lowercase
4. Check for duplicate (case-insensitive)
5. Add to administrators object: `{ assignedAt: ISO 8601, owner: false }`
6. Add to users section: `{ registeredAt: ISO 8601 }` (if not already present)
7. Update event file atomically

### Delete Administrator

1. Validate requester is administrator
2. Normalize email to lowercase
3. Check if target is owner (prevent deletion)
4. Check if this would leave no administrators (prevent deletion)
5. Remove from administrators object
6. Remove from users section
7. Update event file atomically

### Get Administrators List

1. Retrieve event by eventId
2. Extract administrators object
3. Return list with email, assignedAt, and owner flag
4. Optionally format for display (sort by assignedAt, highlight owner)

### Check Administrator Status

1. Normalize email to lowercase
2. Check if email exists as key in administrators object
3. Return administrator data if exists, null otherwise

### Check Owner Status

1. Normalize email to lowercase
2. Check if email exists in administrators object
3. Check if `owner` flag is `true`
4. Return boolean result

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
- Content: Event object with `administrators` object (replaces `administrator` string)

**Migration**:
- Existing events with `administrator` field need migration
- Migration converts: `"administrator": "email@example.com"` → `"administrators": {"email@example.com": {"assignedAt": createdAt, "owner": true}}`
- Migration can be done lazily (on first access) or proactively (batch script)

## Migration Considerations

**Existing Events**:
- Events created before this feature have `administrator` field (string)
- Migration script: Convert to `administrators` object structure
- Set `assignedAt` to event `createdAt` timestamp (approximation)
- Set `owner` flag to `true` for migrated administrator
- Remove old `administrator` field after migration

**Migration Strategy**:
- **Lazy migration**: Migrate on first access (read event)
- **Batch migration**: Run migration script for all events at once
- **Backward compatibility**: Support both structures during transition

**Migration Example**:
```javascript
// Before migration
{
  "eventId": "aB3xY9mK",
  "administrator": "owner@example.com",
  "createdAt": "2025-01-27T10:30:00.000Z"
}

// After migration
{
  "eventId": "aB3xY9mK",
  "administrators": {
    "owner@example.com": {
      "assignedAt": "2025-01-27T10:30:00.000Z",
      "owner": true
    }
  },
  "createdAt": "2025-01-27T10:30:00.000Z"
}
```

## Security Considerations

**Administrator Authorization**:
- Only existing administrators can add/delete administrators
- Authorization checked on both frontend and backend
- JWT token provides authenticated user email

**Owner Protection**:
- Owner cannot be deleted by anyone (including themselves)
- Owner flag checked before deletion
- Clear error messages when owner deletion attempted

**Email Validation**:
- Server-side validation required (client-side for UX only)
- Email normalization prevents case-sensitivity issues
- Duplicate prevention ensures data integrity

**Atomic Updates**:
- Single file write ensures administrators and users sections updated together
- No partial updates possible
- File system provides atomicity at OS level
