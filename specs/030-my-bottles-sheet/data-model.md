# Data Model: My Bottles Bottom Sheet

**Feature**: 030-my-bottles-sheet  
**Date**: 2026-03-13

## Entities

No new backend entities are introduced. This feature reuses existing data models.

### Item (Bottle)

Already exists in the backend. Used by `itemService.getItems(eventId, true)`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Unique item identifier (UUID) |
| `name` | string | yes | 1–200 characters |
| `price` | string/number | no | Flexible format: `$50`, `50.00`, `50`, or empty |
| `description` | string | no | Max 1000 characters |
| `createdAt` | ISO 8601 string | yes | Registration timestamp, displayed as relative time |
| `itemId` | number/null | no | Assigned item number (set by host during paused state). Null when unassigned. Displayed to guest only during `completed` state. |
| `userId` | string | yes | Owner's user ID |

### User Profile

Already exists in the backend. Used by `apiClient.getUserProfile(eventId)`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | yes | Read-only in the sheet |
| `name` | string | no | Editable, auto-saves on blur. Optional (can be empty). |

### Event

Already exists. Relevant fields for this feature:

| Field | Type | Notes |
|-------|------|-------|
| `state` | enum | `created`, `started`, `paused`, `completed` — gates write vs. read-only mode |
| `typeOfItem` | string | `wine` → bottle terminology; anything else → item terminology |

## State Transitions

No new state transitions are introduced. The feature reads the existing event state to determine sheet behavior:

```
created  ──→  started  ──→  paused  ──→  completed
   │              │             │              │
   └──── R/W ─────┘             └── R/O ───────┘
```

- **R/W** (`created`, `started`): Add, edit, delete bottles. Edit name. Full interactivity.
- **R/O** (`paused`, `completed`): View only. No add/edit/delete. Name field read-only. During `completed`, assigned item numbers are displayed.

## Frontend State (MyBottlesSheet component)

| State Variable | Type | Initial | Purpose |
|----------------|------|---------|---------|
| `items` | Item[] | [] | User's registered bottles |
| `loading` | boolean | true | Initial data fetch |
| `error` | string/null | null | Fetch error message |
| `name` | string | '' | Display name (controlled input) |
| `showAddForm` | boolean | false | Toggle add form visibility |
| `editingItemId` | string/null | null | ID of item being edited (null = not editing) |
| `formLoading` | boolean | false | Submit/save in progress |
| `deletingItemId` | string/null | null | ID of item being deleted (for optimistic UI) |

## Validation Rules (shared utility)

Extracted into `utils/itemFormValidation.js`:

```javascript
validateItemForm({ name, price, description }) → { isValid: boolean, errors: object }
```

| Field | Rule | Error Message |
|-------|------|---------------|
| `name` | Required, 1–200 chars | "Name is required" / "Name must be 200 characters or less" |
| `price` | Optional; if provided, must be non-negative number (flexible format) | "Price must be a valid non-negative number" |
| `description` | Optional; max 1000 chars | "Description must be 1000 characters or less" |
