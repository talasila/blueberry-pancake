# Data Model: Email Privacy — Opaque User Identity for Guests

**Feature**: 041-email-privacy-opaque-id
**Date**: 2026-03-22

## Entity Changes

### User Record (existing entity — modified)

The `users` map within the event CONFIG item gains one new field per user entry.

**Current structure** (email is the key):
```
users: {
  "john@example.com": {
    name: "John",
    registeredAt: "2026-03-22T10:00:00Z"
  }
}
```

**New structure**:
```
users: {
  "john@example.com": {
    name: "John",
    userId: "u_aBcDeFgHiJ",
    registeredAt: "2026-03-22T10:00:00Z"
  }
}
```

| Field        | Type   | Required | Default          | Notes                                               |
|--------------|--------|----------|------------------|-----------------------------------------------------|
| name         | string | yes (new)| email prefix     | Was optional, now mandatory. Backfilled from email prefix for existing users. |
| userId       | string | yes (new)| generated        | 12-char opaque identifier (`u_` + 10 alphanumeric). Generated at registration or lazy backfill. |
| registeredAt | string | yes      | —                | Existing — unchanged. ISO 8601 timestamp.           |

### Validation Rules

- `userId` MUST be a 12-character string matching pattern `u_[a-zA-Z0-9]{10}`
- `userId` MUST be unique within an event's users map
- `userId` is immutable once generated — it never changes for a given user in a given event
- `name` MUST be a non-empty string (1-100 characters) for new registrations
- `name` is mutable — users or admins can update it (existing behavior)
- When `userId` is `undefined` (existing users), the system generates one on first access (lazy backfill)
- When `name` is `undefined` (existing users), the system derives it from the email prefix (lazy backfill)

### Storage

No schema migration needed. DynamoDB is schemaless — the new fields are simply included in the `users` map entries within the existing event CONFIG item (`PK: EVENT#{eventId}, SK: CONFIG`).

Existing events will not have `userId` fields. The application handles this via lazy backfill on first access.

### JWT Token (modified entity)

**Guest (PIN) token payload**:

| Field      | Type   | Required | Notes                                    |
|------------|--------|----------|------------------------------------------|
| userId     | string | yes (new)| Replaces `email` for guest tokens        |
| events     | array  | yes      | Existing — unchanged. Array of event IDs |
| authMethod | string | yes      | Existing — value is `"pin"`              |

**Admin (OTP) token payload** (unchanged):

| Field      | Type   | Required | Notes                                    |
|------------|--------|----------|------------------------------------------|
| email      | string | yes      | Existing — unchanged                     |
| events     | array  | yes      | Existing — unchanged                     |
| authMethod | string | yes      | Existing — value is `"otp"`              |

### API Response Changes

**Dashboard userSummaries** (modified):

| Field    | Before              | After               |
|----------|---------------------|----------------------|
| email    | `"john@example.com"` | removed             |
| userId   | —                    | `"u_aBcDeFgHiJ"`   |
| name     | `"John"` or `null`   | `"John"` (always present) |
| (others) | unchanged            | unchanged           |

**Similar Users response** (modified):

| Field             | Before               | After               |
|-------------------|-----------------------|----------------------|
| email             | `"jane@example.com"` | removed             |
| userId            | —                    | `"u_xYzAbCdEfG"`   |
| name              | `"Jane"` or `null`   | `"Jane"` (always present) |
| currentUserEmail  | `"john@example.com"` | removed             |
| currentUserId     | —                    | `"u_aBcDeFgHiJ"`   |
| (others)          | unchanged            | unchanged           |

**Ratings CSV** (modified for non-admin):

| Column   | Before               | After (non-admin)    | After (admin)       |
|----------|----------------------|----------------------|---------------------|
| Column 1 | email               | userId               | email (unchanged)   |
| (others) | unchanged            | unchanged            | unchanged           |

**Verify-PIN response** (modified):

| Field       | Before                          | After                           |
|-------------|---------------------------------|---------------------------------|
| user.email  | `"john@example.com"`            | removed                         |
| user.userId | —                               | `"u_aBcDeFgHiJ"`              |
| user.name   | —                               | `"John"`                       |
| user.exp    | unchanged                       | unchanged                       |
| user.authMethod | unchanged                   | unchanged                       |

## State Transitions

No new state transitions. The `userId` field is immutable once set. It is generated either at registration time (new users) or on first access (lazy backfill for existing users).

```
New user registers   →  userId generated and stored
Existing user (no userId) accesses event  →  userId generated and stored (lazy backfill)
Existing user (has userId) accesses event  →  userId returned as-is
```
