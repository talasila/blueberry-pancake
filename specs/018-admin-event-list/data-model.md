# Data Model: Admin Event List Enhancements

**Branch**: `018-admin-event-list` | **Date**: 2026-02-26

## Overview

No new entities or DynamoDB schema changes are required. This feature modifies the **shape of existing API responses** to include the `pin` field, and changes the **query/filter behavior** of the list events endpoint. All data already exists in the DynamoDB event config records.

## Modified Response Shapes

### Event Summary (list card)

Used by `GET /api/system/events` — returned for each event in the list.

| Field            | Type             | Source                | Change    |
| ---------------- | ---------------- | --------------------- | --------- |
| eventId          | string           | DynamoDB PK           | existing  |
| name             | string           | config.name           | existing  |
| state            | string (enum)    | config.state          | existing  |
| ownerEmail       | string           | config.administrators | existing  |
| typeOfItem       | string           | config.typeOfItem     | existing  |
| itemCount        | number           | computed              | existing  |
| participantCount | number           | computed              | existing  |
| ratingCount      | number           | computed              | existing  |
| createdAt        | ISO 8601 string  | config.createdAt      | existing  |
| **pin**          | **string\|null** | **config.pin**        | **added** |

### Event Details (drawer)

Used by `GET /api/system/events/:eventId` — returned when viewing a single event.

| Field            | Type             | Source                | Change    |
| ---------------- | ---------------- | --------------------- | --------- |
| eventId          | string           | DynamoDB PK           | existing  |
| name             | string           | config.name           | existing  |
| state            | string (enum)    | config.state          | existing  |
| ownerEmail       | string           | config.administrators | existing  |
| typeOfItem       | string           | config.typeOfItem     | existing  |
| maxRating        | number           | config.maxRating      | existing  |
| ratingPresets    | array            | config.ratingPresets  | existing  |
| itemCount        | number           | computed              | existing  |
| participantCount | number           | computed              | existing  |
| ratingCount      | number           | computed              | existing  |
| registeredItems  | array of objects | config.items          | existing  |
| admins           | array of strings | config.administrators | existing  |
| createdAt        | ISO 8601 string  | config.createdAt      | existing  |
| **pin**          | **string\|null** | **config.pin**        | **added** |

### List Events Response Envelope

The response envelope shape is unchanged but the default `limit` and behavior differ:

| Field  | Type   | Default (no search) | Default (with search) |
| ------ | ------ | ------------------- | --------------------- |
| events | array  | up to 25            | up to 100             |
| total  | number | total event count   | total match count     |
| limit  | number | 25                  | 100                   |
| offset | number | 0                   | 0                     |

## Filter Behavior

### Current (before)

| Parameter | Match Field | Match Type            |
| --------- | ----------- | --------------------- |
| name      | event name  | substring, case-insensitive |
| owner     | ownerEmail  | substring, case-insensitive |
| state     | state       | exact match           |

### New (after)

| Parameter  | Match Fields                      | Match Type                              |
| ---------- | --------------------------------- | --------------------------------------- |
| **search** | eventId OR name OR ownerEmail     | substring, case-insensitive, OR logic   |
| name       | event name                        | substring, case-insensitive (retained)  |
| owner      | ownerEmail                        | substring, case-insensitive (retained)  |
| state      | state                             | exact match (retained)                  |

When `search` is provided, it takes precedence over `name` and `owner` (they are ignored). The `state` filter can still be combined with `search`.

## Validation Rules

- `pin`: Read-only in this context — 6-digit string (`/^\d{6}$/`) or `null` for legacy events. No validation needed on read.
- `search`: Trimmed; whitespace-only treated as empty (no search). No minimum length. Debounced client-side (300ms).
- `limit`: Max 100 (enforced server-side, unchanged).
