# Data Model: Personality Detection Toggle

**Feature**: 040-personality-toggle
**Date**: 2026-03-21

## Entity Changes

### Rating Configuration (existing entity — modified)

The `ratingConfiguration` nested object within the event record gains one new field.

| Field               | Type    | Required | Default | Notes                                      |
|---------------------|---------|----------|---------|--------------------------------------------|
| maxRating           | integer | yes      | 4       | Existing — unchanged                       |
| ratings             | array   | yes      | preset  | Existing — unchanged                       |
| noteSuggestionsEnabled | boolean | no    | true    | Existing — unchanged, wine events only     |
| **personalityEnabled** | **boolean** | **no** | **true** | **New — wine events only** |

### Validation Rules

- `personalityEnabled` MUST be a boolean when provided
- `personalityEnabled` is only accepted for events where `typeOfItem === 'wine'`
- `personalityEnabled` can only be changed when `event.state === 'created'`
- When `personalityEnabled` is `undefined` or missing, the system treats it as `true` (backward compatibility)

### Storage

No schema migration needed. DynamoDB is schemaless — the new field is simply included in the `ratingConfiguration` nested object within the existing event CONFIG item (`PK: EVENT#{eventId}, SK: CONFIG`).

Existing events will not have the field. The application handles this via the `undefined → true` default.

## State Transitions

No new state transitions. The `personalityEnabled` field is immutable after the event leaves the "created" state, enforced by the same validation logic that restricts `noteSuggestionsEnabled`.

```
created  →  [personalityEnabled editable]
started  →  [personalityEnabled locked]
paused   →  [personalityEnabled locked]
completed → [personalityEnabled locked]
```
