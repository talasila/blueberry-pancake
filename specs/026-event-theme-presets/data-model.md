# Data Model: Event Theme Presets

**Branch**: `026-event-theme-presets` | **Date**: 2026-03-08

## Overview

One new field added to the existing Event entity. No new database entities. Theme preset definitions are frontend-only constants — not stored in the database.

## Entity Changes

### Event (existing — modified)

**Storage**: DynamoDB, `PK=EVENT#{eventId}, SK=CONFIG`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `theme` | String | No | `"classic"` (at read time) | Identifier referencing a theme preset. Must be one of the valid preset IDs. Events created before this feature have no `theme` field — the system defaults to `"classic"` at read time. |

**Validation rules**:
- Must be one of: `"classic"`, `"cellar"`, `"garden"`, `"golden"`, `"midnight"`, `"rose"`
- Validated on event creation (`POST /api/events`) and theme update (`PATCH /api/events/:eventId/theme`)
- Unrecognized values rejected with 400 error

**Mutability**:
- Set at event creation (defaults to `"classic"` if not provided)
- Updatable via `PATCH /api/events/:eventId/theme` ONLY when `event.state === "created"`
- Backend rejects update attempts when event is in `"started"`, `"paused"`, or `"completed"` state (403)

**Backward compatibility**:
- Events without a `theme` field are treated as `"classic"` by the **frontend** (`EventThemeProvider` and `getPreset()` default to classic when `event.theme` is undefined)
- The **backend** returns the raw stored value — it does NOT inject a default for old events. The API response simply omits the `theme` field for pre-existing events.
- No data migration required — the field is optional and defaulted on the frontend at render time
- If a stored `theme` value does not match any known preset (e.g., preset retired), the frontend falls back to `"classic"`

## Theme Preset (frontend-only constant)

Not a database entity. Defined as a static JavaScript object in `frontend/src/utils/themePresets.js`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Unique identifier (e.g., `"cellar"`). This is the value stored on the event. |
| `name` | String | Yes | Display name (e.g., `"Classic Cellar"`) |
| `description` | String | Yes | Short mood description (e.g., `"Warm and refined"`) |
| `emoji` | String | No | Optional emoji displayed with event name (e.g., `"🍷"`) |
| `light` | Object | Yes | Light-mode color palette |
| `light.accent` | String | Yes | Primary accent color — full CSS color value, e.g., `oklch(0.5 0.2 15)` |
| `light.accentForeground` | String | Yes | Text color on accent backgrounds |
| `light.surface` | String | Yes | Surface color for themed areas (unrated buttons, bottom sheets) |
| `light.surfaceForeground` | String | Yes | Text color on surface backgrounds |
| `light.headerBg` | String | Yes | Header bar background color |
| `light.gradientFrom` | String | Yes | Page background gradient start (use `transparent` for no gradient) |
| `light.gradientTo` | String | Yes | Page background gradient end (use `transparent` for no gradient) |
| `dark` | Object | Yes | Dark-mode color palette (same fields as `light`) |

**Color format**: All color values MUST be complete, standalone CSS color values (e.g., `oklch(...)`) — NOT bare Tailwind-format numbers. The existing `:root` tokens in `globals.css` use bare HSL numbers (e.g., `222.2 47.4% 11.2%`) that are not valid in inline `style` props. The `classic` preset must use oklch equivalents of those tokens. The `.dark` overrides already use oklch and can be matched directly.

**Always-set strategy**: `EventThemeProvider` MUST always set the `--event-*` CSS custom properties, including for the `classic` preset. Components consume these vars without inline fallbacks (e.g., `style={{ backgroundColor: 'var(--event-surface)' }}`). This avoids broken fallback chains to bare-number Tailwind vars in light mode.

## Preset Inventory

| ID | Name | Emoji | Character |
|----|------|-------|-----------|
| `classic` | Classic | — | Neutral, matches current app appearance |
| `cellar` | Classic Cellar | 🍷 | Warm burgundy tones |
| `garden` | Garden Party | 🌿 | Fresh green tones |
| `golden` | Golden Hour | ✨ | Warm amber/gold tones |
| `midnight` | Midnight Tasting | 🌙 | Deep navy tones |
| `rose` | Rosé All Day | 🌸 | Soft pink tones |

## State Diagram

Theme mutability follows the existing event state machine:

```
                    theme editable
                         │
                    ┌─────────┐
                    │ created  │
                    └────┬─────┘
                         │ start
                    ┌────▼─────┐
              ┌─────│ started  │─────┐
              │     └──────────┘     │
              │ pause           complete
         ┌────▼─────┐          ┌─────▼──────┐
         │  paused   │──start──│ completed   │
         └──────┬────┘         └─────────────┘
                │ complete            ▲
                └─────────────────────┘

         theme locked (read-only) in all states
         below the "created" state
```

## Relationships

```
Event ──── theme (string) ────► Theme Preset (frontend lookup)
  │                                    │
  │  stored in DynamoDB                │  defined in themePresets.js
  │  as part of event config           │  static constant, not persisted
  │                                    │
  └── 1 event : 1 theme ──────────────┘
```

## API Response Impact

| Endpoint | Change |
|----------|--------|
| `POST /api/events` | Accepts optional `theme` in request body. Returns `theme` in response. |
| `GET /api/events/:eventId` | Response includes `theme` field. |
| `GET /api/events/mine` | Each event object includes `theme` field. |
| `PATCH /api/events/:eventId/theme` | New endpoint. Accepts `{ theme }`. Returns updated event. |
| `GET /api/system/events` | Response includes `theme` field per event (for root admin). |
| `GET /api/system/events/:eventId` | Response includes `theme` field. |
