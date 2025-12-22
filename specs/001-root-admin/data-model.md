# Data Model: Root Admin Dashboard

**Feature**: 001-root-admin  
**Date**: 2024-12-17

## Entities

### 1. Root User (Logical Entity)

Root users are not stored separately - they are identified by checking if an authenticated user's email exists in the `rootAdmins` config array.

**Identification**:
```json
// config/default.json
{
  "rootAdmins": ["admin@example.com", "superuser@example.com"]
}
```

**Authorization Flow**:
1. User authenticates via OTP (existing flow)
2. JWT issued with `email` claim
3. On `/system` access, middleware checks `email` against `rootAdmins`
4. Access granted if email found in array

---

### 2. Event Summary (View Model)

Lightweight representation of an event for list display.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `eventId` | string | event config | Unique 8-char nanoid |
| `name` | string | event config | Event display name |
| `state` | enum | event config | `created`, `started`, `paused`, `completed` |
| `ownerEmail` | string | event config | Event creator's email |
| `typeOfItem` | string | event config | Item type (e.g., "wine") |
| `itemCount` | number | computed | Number of registered items |
| `participantCount` | number | computed | Unique users with ratings |
| `ratingCount` | number | computed | Total ratings submitted |
| `createdAt` | ISO string | event config | Creation timestamp |

**Example**:
```json
{
  "eventId": "Ab3xK9pQ",
  "name": "Wine Tasting 2024",
  "state": "started",
  "ownerEmail": "host@example.com",
  "typeOfItem": "wine",
  "itemCount": 6,
  "participantCount": 12,
  "ratingCount": 54,
  "createdAt": "2024-12-15T10:30:00.000Z"
}
```

---

### 3. Event Details (Extended View Model)

Full event information for detail view. Extends Event Summary.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| *(all from Event Summary)* | | | |
| `maxRating` | number | event config | Max rating scale (2-4) |
| `ratingPresets` | array | event config | Rating labels/colors |
| `items` | array | items list | Registered items with names/owners |
| `admins` | array | event config | List of admin emails |

---

### 4. System Statistics (Aggregate View Model)

Platform-wide statistics for dashboard header.

| Field | Type | Description |
|-------|------|-------------|
| `totalEvents` | number | Count of all events |
| `eventsByState` | object | Breakdown by state |
| `totalUsers` | number | Unique participant emails |
| `totalRatings` | number | Sum of all ratings |
| `eventsLast7Days` | number | Events created in last 7 days |
| `eventsLast30Days` | number | Events created in last 30 days |

**Example**:
```json
{
  "totalEvents": 156,
  "eventsByState": {
    "created": 12,
    "started": 8,
    "paused": 3,
    "completed": 133
  },
  "totalUsers": 847,
  "totalRatings": 12453,
  "eventsLast7Days": 5,
  "eventsLast30Days": 23
}
```

---

### 5. Admin Audit Log Entry (Write-Only)

Audit record for root admin actions. Written to log files.

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO string | When action occurred |
| `action` | enum | `VIEW_EVENTS`, `VIEW_DETAILS`, `DELETE_EVENT` |
| `adminEmail` | string | Root user who performed action |
| `targetEventId` | string | Affected event (if applicable) |
| `metadata` | object | Additional context (event name, state, etc.) |

**Log Format** (structured JSON in log file):
```json
{
  "level": "info",
  "message": "Admin action",
  "timestamp": "2024-12-17T14:30:00.000Z",
  "action": "DELETE_EVENT",
  "adminEmail": "admin@example.com",
  "targetEventId": "Ab3xK9pQ",
  "metadata": {
    "eventName": "Wine Tasting 2024",
    "eventState": "completed"
  }
}
```

---

## State Transitions

### Event States (Reference)

Events can be in one of these states:

```
created → started → paused ⟷ started
                  ↘        ↗
                   completed
                      ↓
                   (deleted by root)
```

Root admin can delete events in any state, with extra warning for `started` events.

---

## Relationships

```
┌─────────────────┐      checks      ┌──────────────────┐
│   Root Admin    │ ──────────────── │  rootAdmins[]    │
│   (JWT email)   │                  │  (config array)  │
└─────────────────┘                  └──────────────────┘
        │
        │ can view/delete
        ▼
┌─────────────────┐
│     Events      │ ◄── all events in system
│   (many)        │
└─────────────────┘
        │
        │ contains
        ▼
┌─────────────────┐     ┌─────────────────┐
│     Items       │     │    Ratings      │
│   (per event)   │     │  (per event)    │
└─────────────────┘     └─────────────────┘
```

---

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| Root identification | email | Must exist in `rootAdmins` config array |
| Event list filters | state | Must be valid state enum value |
| Event list filters | name | Case-insensitive substring match |
| Event list filters | owner | Case-insensitive email match |
| Pagination | limit | 1-100, default 50 |
| Pagination | offset | >= 0, default 0 |
