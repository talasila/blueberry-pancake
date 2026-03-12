# Data Model: Live Participation Ring on Item Buttons

**Branch**: `027-participation-ring` | **Date**: 2026-03-11

## Overview

This feature introduces no new backend entities, tables, or schemas. All data is derived client-side from existing API responses. This document describes the derived data structures used on the frontend.

## Existing Entities Used (no changes)

### Event (from `GET /events/:eventId`)

| Field | Type | Relevance |
|-------|------|-----------|
| `users` | `Record<string, object>` | `Object.keys(event.users).length` provides `totalParticipants` |
| `state` | `string` | Ring visibility gated on `state === 'started'` |
| `itemConfiguration.numberOfItems` | `number` | Determines the set of item IDs |
| `itemConfiguration.excludedItemIds` | `number[]` | Items excluded from the grid |

### Rating (from `GET /events/:eventId/ratings`)

| Field | Type | Relevance |
|-------|------|-----------|
| `itemId` | `string` | Groups ratings by item (parsed as integer) |
| `email` | `string` | Identifies unique raters per item |
| `rating` | `string` | Not used for participation counts (only presence matters) |

## Derived Data Structures (frontend only)

### ItemRaterCounts

A map from item ID to the number of unique participants who have rated that item.

| Field | Type | Description |
|-------|------|-------------|
| `[itemId]` | `number` | Count of unique email addresses that submitted a rating for this item ID |

**Derivation**: Computed from the full `allRatings` array by grouping ratings by `itemId` and counting distinct `email` values (case-insensitive, trimmed).

**Lifecycle**: Recomputed each time `loadRatings()` runs (on page mount, on own rating submission, and on each 30-second event poll during `started` state). Stored in React state on `EventPage`.

### ItemButton Ring Props

Props passed from `EventPage` to each `ItemButton` component.

| Prop | Type | Default | Source |
|------|------|---------|--------|
| `ratedCount` | `number \| undefined` | `undefined` | `itemRaterCounts[itemId]` or `0` |
| `totalParticipants` | `number` | `0` | `Object.keys(event.users).length` |
| `showRing` | `boolean` | `false` | `event.state === 'started'` |

**Rendering rules**:
- Ring renders only when `showRing === true` AND `totalParticipants > 0` AND `ratedCount !== undefined`
- Progress fraction: `Math.min(ratedCount / totalParticipants, 1)` (clamped at 1.0)

## State Transitions

No new state transitions. The ring visibility is a pure function of the existing event `state` field:

```
created  → Ring hidden
started  → Ring visible (participation data refreshed on poll)
paused   → Ring hidden
completed → Ring hidden
```

## Data Flow Diagram

```
GET /events/:eventId (every 30s)
  └─► event.users → totalParticipants
  └─► event.state → showRing (=== 'started')
  └─► triggers loadRatings() when state === 'started'

GET /events/:eventId/ratings (piggybacked on event poll)
  └─► allRatings[] → deriveItemRaterCounts() → itemRaterCounts{}

EventPage
  └─► <ItemButton ratedCount={N} totalParticipants={M} showRing={bool} />
        └─► SVG ring: progress = min(N/M, 1)

RatingDrawer
  └─► "N of M tasters have rated this item"
```
