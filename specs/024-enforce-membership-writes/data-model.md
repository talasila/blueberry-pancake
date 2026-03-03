# Data Model: Enforce User Membership on Backend Write Operations

**Feature**: 024-enforce-membership-writes  
**Date**: 2026-03-03

## Existing Entities (no schema changes)

### Event

Single-table DynamoDB item. Key fields relevant to this feature:

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | String | Primary identifier (Crockford Base32) |
| `users` | Object (keyed by email) | Registered guests. Each value: `{ registeredAt, name? }` |
| `administrators` | Object (keyed by email) | Event admins. Each value: `{ assignedAt, owner }` |
| `items` | Array | Registered items. Each item: `{ id, name, price?, description?, ownerEmail, registeredAt }` |
| `state` | String | Event lifecycle: `created` → `started` → `paused` → `completed` |

### Rating

Separate DynamoDB items per rating.

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | String | Parent event |
| `email` | String | Submitter's email |
| `itemId` | Number | Assigned item ID |
| `rating` | Number | Score value |
| `note` | String | Optional text note |

### Dashboard Cache

Cached DynamoDB item with TTL.

| Field | Type | Description |
|-------|------|-------------|
| PK | String | `EVENT#<eventId>` |
| SK | String | `DASHBOARD` |
| TTL | Number | Epoch seconds (30s from creation) |
| `statistics` | Object | Computed stats (totalUsers, totalItems, totalRatings, etc.) |
| `itemSummaries` | Array | Per-item: raters, average, Bayesian average, distribution |
| `userSummaries` | Array | Per-user: items rated, average rating |

### Similar Users Cache

Cached DynamoDB item with TTL.

| Field | Type | Description |
|-------|------|-------------|
| PK | String | `EVENT#<eventId>` |
| SK | String | `SIMILAR#<email>` |
| TTL | Number | Epoch seconds (30s from creation) |
| `similarUsers` | Array | Similarity scores and user info |

## New Methods (no new entities)

### EventService

```
isEventMember(event, email) → boolean
```

Returns `true` if the normalized email exists in `event.users` OR `event.administrators`. Combines the existing `isAdministrator` check with a new `event.users` lookup.

### DynamoDBRepository / DataRepository

```
deleteDashboardCache(eventId) → Promise<void>
```

Deletes the dashboard cache item (`PK: EVENT#<eventId>`, `SK: DASHBOARD`).

```
deleteAllSimilarUsersCache(eventId) → Promise<void>
```

Queries and deletes all similar-users cache items for the event (`PK: EVENT#<eventId>`, `SK: begins_with("SIMILAR#")`).

## Data Flow Changes

### Before (current)

```
Request → requireAuth (JWT + event claim) → Route handler → Service (loads event, performs operation)
```

### After (with membership check)

```
Request → requireAuth (JWT + event claim) → requireEventMembership (loads event, checks users/admins) → Route handler → Service
```

The event loaded in the middleware can be attached to `req.event` to avoid a redundant `getEvent()` call in the service layer. This is an optimization — the services already call `getEvent()`, so reusing the middleware's result eliminates one DynamoDB read per request.

### User Deletion Flow (updated)

```
deleteUser() → remove items → delete ratings → delete bookmarks 
            → delete dashboard cache (NEW) → delete similar-users cache (NEW)
            → remove from users/admins → persist event
```
