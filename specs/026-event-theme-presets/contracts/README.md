# API Contract: Event Theme Presets

**Branch**: `026-event-theme-presets` | **Date**: 2026-03-08

## Changes to Existing Endpoints

### POST /api/events — Create Event

**Request body change**: Add optional `theme` field.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Event name (1–100 chars, alphanumeric + spaces/hyphens/underscores) |
| `typeOfItem` | string | Yes | Type of item (`"wine"`) |
| `theme` | string | No | Theme preset identifier. Defaults to `"classic"` if omitted. Must be a recognized preset ID. |

**Request example**:

```json
{
  "name": "Bordeaux Night",
  "typeOfItem": "wine",
  "theme": "cellar"
}
```

**Response (201)**: Existing response shape with `theme` field added.

```json
{
  "eventId": "A1B2C3D4",
  "name": "Bordeaux Night",
  "typeOfItem": "wine",
  "state": "created",
  "theme": "cellar",
  "pin": "123456",
  "...": "..."
}
```

**Error (400)**: If `theme` is provided but not a recognized preset ID.

```json
{
  "error": "Invalid theme. Must be one of: classic, cellar, garden, golden, midnight, rose"
}
```

### GET /api/events/:eventId — Get Event

**Response change**: Includes `theme` field when stored. Events created before this feature have no stored `theme` field — the field is simply absent from the response. The **frontend** defaults absent values to `"classic"` (via `getPreset()` and `EventThemeProvider`); the backend does not inject a default.

```json
{
  "eventId": "A1B2C3D4",
  "name": "Bordeaux Night",
  "theme": "cellar",
  "...": "..."
}
```

### GET /api/events/mine — Get My Events

**Response change**: Each event object includes `theme` field.

```json
{
  "events": [
    {
      "eventId": "A1B2C3D4",
      "name": "Bordeaux Night",
      "state": "started",
      "theme": "cellar",
      "createdAt": "2026-03-08T10:00:00Z"
    },
    {
      "eventId": "E5F6G7H8",
      "name": "Summer Tasting",
      "state": "created",
      "theme": "garden",
      "createdAt": "2026-03-07T14:30:00Z"
    }
  ]
}
```

### GET /api/system/events — System Event List

**Response change**: Each event object includes `theme` field.

### GET /api/system/events/:eventId — System Event Details

**Response change**: Includes `theme` field.

---

## New Endpoint

### PATCH /api/events/:eventId/theme — Update Event Theme

**Authentication**: JWT (admin only)

**Description**: Updates the theme preset for an event. Only allowed when the event is in `"created"` state. Rejected with 403 for events in any other state.

**Request**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `theme` | string | Yes | Theme preset identifier. Must be a recognized preset ID. |

**Request example**:

```json
{
  "theme": "golden"
}
```

**Responses**:

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Success | Updated event object (full event, same shape as `GET /api/events/:eventId`) |
| 400 | Missing or invalid `theme` value | `{ "error": "Theme is required" }` or `{ "error": "Invalid theme. Must be one of: classic, cellar, garden, golden, midnight, rose" }` |
| 403 | Event is not in `"created"` state | `{ "error": "Theme can only be changed when event is in created state" }` |
| 403 | User is not an admin for this event | `{ "error": "Only administrators can update the theme" }` |
| 404 | Event not found | `{ "error": "Event not found" }` |

**Success response example**:

```json
{
  "eventId": "A1B2C3D4",
  "name": "Bordeaux Night",
  "typeOfItem": "wine",
  "state": "created",
  "theme": "golden",
  "pin": "******",
  "...": "..."
}
```

---

## Valid Theme Identifiers

| ID | Name |
|----|------|
| `classic` | Classic (default) |
| `cellar` | Classic Cellar |
| `garden` | Garden Party |
| `golden` | Golden Hour |
| `midnight` | Midnight Tasting |
| `rose` | Rosé All Day |
