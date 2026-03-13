# Data Model: Assignment Tab Redesign

**Branch**: `029-assignment-redesign` | **Date**: 2026-03-13

## No Data Model Changes

This feature is a frontend-only UI redesign. No backend data model changes are required (FR-014, SC-007).

## Existing Entities (Reference)

### Item (Registered Bottle)

Stored in `event.items[]` on the event config document in DynamoDB.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (12-char nanoid) | Unique item identifier |
| `name` | `string` (1-200 chars) | Bottle name (required) |
| `price` | `number \| null` | Price (optional) |
| `description` | `string \| null` (max 1000 chars) | Description (optional) |
| `ownerEmail` | `string` | Email of guest who registered the bottle |
| `registeredAt` | `string` (ISO 8601) | Registration timestamp |
| `itemId` | `number \| null` | Assigned tasting number (1 to numberOfItems), null if unassigned |

### Item Configuration

Stored in `event.itemConfiguration` on the event config document.

| Field | Type | Description |
|-------|------|-------------|
| `numberOfItems` | `number` (1-100) | Total number of tasting slots |
| `excludedItemIds` | `number[]` | Item IDs excluded from the event |

### Event State

| Field | Type | Description |
|-------|------|-------------|
| `state` | `string` | One of: `created`, `started`, `paused`, `completed` |

Assignment is only allowed when `state === 'paused'`.

## State Derivations (Frontend Only)

The following values are computed on the frontend from existing data — no storage needed:

| Derived Value | Source | Computation |
|---------------|--------|-------------|
| Available IDs | `itemConfiguration` | `[1..numberOfItems]` minus `excludedItemIds` |
| Assigned count | `items[]` | Count of items where `itemId !== null` |
| Unassigned bottles | `items[]` | Count of items where `itemId === null` |
| Available for assignment | `items[]` + assigned IDs | Items where `itemId === null` (not yet assigned to any number) |
