# Data Model: Guest Management (023)

**Feature Branch**: `023-guest-management`  
**Date**: 2026-03-03

## Overview

This feature is **frontend-only** and does not introduce new entities or storage. It aggregates existing data already present in EventAdminPage state (`event.users`, `items`, `administrators`) into a per-guest summary view. This document records the existing entities used and the derived guest list view.

## Existing Entities (no changes)

### Event Users (`event.users`)

| Field          | Type   | Source                    | Description                                      |
|----------------|--------|---------------------------|--------------------------------------------------|
| `[email]`      | object | `event.users[email]`      | User object keyed by email address               |
| `.name`        | string | `event.users[email].name` | Display name (optional; may be null or absent)    |
| `.registeredAt` | string | `event.users[email].registeredAt` | ISO 8601 registration timestamp          |

### Administrators (`administrators`)

| Field          | Type    | Source                             | Description                                  |
|----------------|---------|-------------------------------------|----------------------------------------------|
| `[email]`      | object  | `administrators[email]`            | Admin object keyed by email address          |
| `.owner`       | boolean | `administrators[email].owner`       | True if this admin is the event owner        |
| `.assignedAt`  | string  | `administrators[email].assignedAt` | ISO 8601 timestamp of admin assignment       |

### Items (`items`)

| Field        | Type   | Source           | Description                                      |
|--------------|--------|------------------|--------------------------------------------------|
| `ownerEmail` | string | `item.ownerEmail` | Email of the user who registered this item       |
| `name`       | string | `item.name`       | Display name of the item (e.g., "Château Margaux") |
| `itemId`     | number | `item.itemId`     | Assigned item ID (may be null if unassigned)     |
| `id`         | string | `item.id`         | Internal item identifier                         |
| `registeredAt` | string | `item.registeredAt` | ISO 8601 registration timestamp              |

## Derived View: Guest List Entry

The guest list is computed client-side by aggregating users, administrators, and items. Not stored; recomputed on each render/refresh.

| Field            | Type     | Computation                                                                                    | Example                                |
|------------------|----------|------------------------------------------------------------------------------------------------|----------------------------------------|
| `email`          | string   | Key from `event.users`                                                                         | `"john@example.com"`                   |
| `normalizedEmail`| string   | `email.trim().toLowerCase()`                                                                   | `"john@example.com"`                   |
| `name`           | string?  | `event.users[email].name` or null                                                              | `"John Doe"` or `null`                 |
| `registeredAt`   | string?  | `event.users[email].registeredAt` or null                                                      | `"2026-03-01T10:30:00.000Z"`          |
| `isAdministrator`| boolean  | `administrators[normalizedEmail]` exists                                                       | `true`                                 |
| `isOwner`        | boolean  | `administrators[normalizedEmail]?.owner === true`                                              | `false`                                |
| `itemsCount`     | number   | `items.filter(i => i.ownerEmail.toLowerCase() === normalizedEmail).length`                     | `2`                                    |
| `itemNames`      | string[] | `items.filter(...).map(i => i.name).filter(Boolean)`                                           | `["Château Margaux", "Opus One"]`     |

## Sort Order

The guest list is sorted in this priority:

1. **Owners** first (isOwner === true)
2. **Administrators** next (isAdministrator === true, isOwner === false)
3. **Regular guests** last
4. Within each group: alphabetical by email (ascending)

## Search Filter

Client-side filtering on the derived guest list. A guest matches if any of the following contain the query (case-insensitive, partial match):

- `name`
- `email`
- Any entry in `itemNames`

## Card Badge Count

The Guests card badge displays `getNonAdminUserCount()` — the number of users in `event.users` whose email does **not** appear as a key in `administrators`. This count excludes admins to answer "how many non-admin guests registered."

## Data Refresh Lifecycle

```
Drawer Opens → fetch event + items + administrators → update state → recompute guest list
       ↕
Refresh Button → same fetch cycle → inline spinner on button → list updates in place
       ↕
Delete Guest → apiClient.deleteUser → refresh event + items + administrators → list updates
```
