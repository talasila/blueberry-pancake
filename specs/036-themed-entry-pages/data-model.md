# Data Model: Themed Event Entry Pages

**Feature**: 036-themed-entry-pages
**Date**: 2026-03-19

## Entities

### Public Event Info — NEW (read-only projection)

**Source**: Existing `event` record in DynamoDB. No new storage — this is a filtered view.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Event display name set by the host |
| typeOfItem | string | What's being tasted (e.g., "wine", "whiskey") |
| theme | string | Theme preset identifier (e.g., "cellar", "ocean", "classic") |
| state | string | Event lifecycle state: "created", "started", "paused", "completed" |

**Security boundary**: These four fields are the ONLY fields exposed publicly. The following are explicitly excluded: `administrators`, `users`, `pin`, `pinGeneratedAt`, `ratingConfiguration`, `itemConfiguration`, `createdAt`, `updatedAt`.

**Access pattern**: Read-only. Fetched on entry page load by any visitor with an event ID. Rate-limited.

## Data Flow

```
Entry Page Load (EmailEntryPage / PINEntryPage / EventOTPEntryPage)
  └── calls → GET /api/events/:eventId/public-info (no auth)
        └── server: eventService.getEvent(eventId)
              └── projects { name, typeOfItem, theme, state }
              └── returns 404 if event not found

Entry Page Render
  ├── theme → getThemeVars(theme, isDark) → CSS vars applied inline
  ├── name → page title: "Join {name}"
  ├── typeOfItem → description: "Enter your details to join the {typeOfItem} tasting"
  └── state → "completed" shows ended banner; "created"/"started"/"paused" normal flow
```

## No Schema Changes

This feature does not modify the event data model. It only reads existing fields through a new restricted endpoint.
