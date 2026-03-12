# API Contracts: Live Participation Ring on Item Buttons

**Branch**: `027-participation-ring` | **Date**: 2026-03-11

## Overview

This feature introduces **no new API endpoints**. All data is consumed from existing endpoints. This document records the existing contracts that the feature depends on, serving as a reference for test design and integration verification.

## Existing Endpoints Used

### GET /api/events/:eventId

Already polled every 30 seconds by `useEventPolling`.

| Field | Type | Used For |
|-------|------|----------|
| `users` | `object` | `Object.keys(users).length` → `totalParticipants` |
| `state` | `string` | Ring visibility gate (`=== 'started'`) |
| `itemConfiguration` | `object` | Available item IDs for the grid |

No changes to request or response format.

### GET /api/events/:eventId/ratings

Already called on EventPage mount and after own rating submission. This feature adds a call on each event poll tick during `started` state.

**Request**: `GET /api/events/:eventId/ratings` with JWT cookie.

**Response** (CSV parsed to array):

| Field | Type | Used For |
|-------|------|----------|
| `itemId` | `string` | Group by item |
| `email` | `string` | Count unique raters |
| `rating` | `string` | Not used for participation counts |
| `note` | `string` | Not used |
| `timestamp` | `string` | Not used |

**New usage pattern**: Previously called once on mount + on own rating submission. Now also called every ~30 seconds when `event.state === 'started'` (piggybacked on event poll cycle).

**Impact**: One additional GET request per 30-second poll cycle during active events. The endpoint performs a single DynamoDB query (scan ratings for eventId). No caching is applied to this endpoint, but the query is lightweight.

## Component Contracts

### ItemButton Props (updated)

```
interface ItemButtonProps {
  itemId: number;                   // Existing
  ratingColor?: string;             // Existing
  isBookmarked: boolean;            // Existing
  isWinner: boolean;                // Existing
  onClick: () => void;              // Existing
  ratedCount?: number;              // NEW — unique raters for this item
  totalParticipants?: number;       // NEW — total users in event
  showRing?: boolean;               // NEW — whether to render the ring
}
```

### RatingDrawer Props (updated)

The RatingDrawer receives two new optional props for displaying the participation count text:

```
interface RatingDrawerProps {
  // ...existing props...
  ratedCount?: number;              // NEW — unique raters for this item
  totalParticipants?: number;       // NEW — total users in event
}
```

### Utility Function Contract

```
/**
 * Derive per-item unique rater counts from a ratings array.
 * @param {Array<{itemId: string, email: string}>} ratings - Full ratings array
 * @returns {Record<number, number>} Map of itemId → unique rater count
 */
function deriveItemRaterCounts(ratings): Record<number, number>
```
