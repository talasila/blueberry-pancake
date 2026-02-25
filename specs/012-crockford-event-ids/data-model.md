# Data Model: Crockford Base32 Event IDs

**Feature**: 012-crockford-event-ids | **Date**: 2026-02-24

## Entities

### Event ID

| Property | Before | After |
|----------|--------|-------|
| Type | String | String (no change) |
| Length | 8 characters | 8 characters (no change) |
| Alphabet | `0-9A-Za-z` (62 chars) | `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (32 chars) |
| Case | Mixed (upper + lower) | Uppercase only |
| Entropy | ~47.6 bits | ~40 bits |
| Possible values | ~218 trillion | ~1.1 trillion |
| Storage key | DynamoDB partition key (PK) | DynamoDB partition key (no change) |
| Format regex (generation) | `/[A-Za-z0-9]{8}/` | `/[0-9A-HJKMNP-TV-Z]{8}/` |
| Format regex (input validation) | `/^[A-Za-z0-9]{8}$/` | `/^[A-Za-z0-9]{8}$/` (no change — accepts any alphanumeric) |

### DynamoDB Impact

No schema changes required. The Event ID is stored as a string value in the DynamoDB partition key (`PK: EVENT#<eventId>`). The change affects only which characters appear in `<eventId>`:

- **Before**: `PK: EVENT#xK4mN7pQ` (mixed case, any alphanumeric)
- **After**: `PK: EVENT#A3RKT9WP` (uppercase, Crockford chars only)

The GSI1 key structure is also unaffected — it references the same event ID string.

### Lookup Normalization

Event ID lookup now requires uppercase normalization before querying DynamoDB:

```
Input: "a3rkt9wp" → Normalize: "A3RKT9WP" → Query: PK = "EVENT#A3RKT9WP"
```

This normalization happens once in the shared `validateEventId()` function, which returns the normalized ID to callers.

## State Transitions

No state transitions apply — Event IDs are immutable once generated.

## Validation Rules

| Rule | Description |
|------|-------------|
| Length | Exactly 8 characters |
| Characters (input) | Any alphanumeric character (`A-Z`, `a-z`, `0-9`) |
| Characters (generation) | Crockford Base32 only (`0-9`, `A-H`, `J-K`, `M-N`, `P-T`, `V-Z`) |
| Normalization | Input uppercased before lookup |
| Whitespace | Trimmed before validation |
| Uniqueness | Enforced via DynamoDB existence check with 3-retry mechanism |
