# Data Model: Tasting Personality Card

**Branch**: `028-tasting-personality` | **Date**: 2026-03-12

## Overview

This feature introduces no new backend entities, tables, or schemas. All personality data is computed at query time from existing rating records. This document describes the detection input shape, the personality type registry, and the derived data structures used on both backend and frontend.

## Existing Entities Used (no changes to storage)

### Rating (from DynamoDB — `RATING#email#itemId`)

| Field | Type | Relevance |
|-------|------|-----------|
| `email` | `string` | Identifies user |
| `itemId` | `string` | Identifies rated item |
| `rating` | `number` | Rating value (1..maxRating) |
| `note` | `string \| null` | Used for noteCount (Novelist, Ghost detection) and average note length (Novelist) |
| `timestamp` | `string` (ISO) | Used for speed calculations (Speedrun, Philosopher detection) |

### Event (from DynamoDB — `EVENT#eventId`)

| Field | Type | Relevance |
|-------|------|-----------|
| `typeOfItem` | `string` | Gates personality feature (`=== "wine"` for initial release) |
| `state` | `string` | Gates personality visibility (`started`, `paused`, `completed`) |
| `itemConfiguration.numberOfItems` | `number` | Contributes to `totalItems` for threshold calculation |
| `itemConfiguration.excludedItemIds` | `number[]` | Subtracted from `numberOfItems` to get actual `totalItems` |
| `ratingConfiguration.maxRating` | `number` | Used in detection rules (scale bounds) |

## Personality Detection Input

The shape consumed by the pure `detectPersonality()` function. Assembled differently on backend vs. frontend but identical in structure.

```
PersonalityDetectionInput {
  ratings: number[]               // Chronological rating values (latest per item)
  ratingDistribution: object      // { [ratingValue: string]: number } — count per level
  averageRating: number           // Mean of all ratings
  totalRatings: number            // Count of rated items (unique items)
  totalItems: number              // Available items in event
  maxRating: number               // Maximum rating value (e.g., 4)
  noteCount: number               // Ratings with non-empty note
  noteLengths: number[]           // Length of each non-empty note (for average note length)
  earliestTimestamp: string        // ISO timestamp of first rating
  latestTimestamp: string          // ISO timestamp of most recent rating
}
```

**Where each field comes from**:

| Field | Backend (DashboardService) | Backend (SimilarityService) | Frontend (UserDetailsDrawer) |
|-------|---------------------------|----------------------------|------------------------------|
| `ratings` | Already in `userSummaries.ratings` | Derived from grouped `allRatings` | From `ratingService.getRatings()` |
| `ratingDistribution` | Already in `userSummaries.ratingDistribution` | Computed from ratings | From `calculateUserRatingProgress()` |
| `averageRating` | Already in `userSummaries.averageRating` | Computed from ratings | Computed from ratings |
| `totalRatings` | Already in `userSummaries.numberOfBottlesRated` | Counted from grouped ratings | From ratings array length (unique items) |
| `totalItems` | From event `itemConfiguration` | From event `itemConfiguration` | From `availableItemIds.length` |
| `maxRating` | From event `ratingConfiguration` | From `event.maxRating` | From `ratingConfig` prop |
| `noteCount` | **NEW** — count non-empty `note` in ratings loop | Derived from `allRatings` | From raw ratings (includes `note` field) |
| `noteLengths` | **NEW** — collect lengths of non-empty notes | Derived from `allRatings` | From raw ratings |
| `earliestTimestamp` | **NEW** — track min timestamp in ratings loop | From `allRatings` timestamps | From raw ratings (includes `timestamp` field) |
| `latestTimestamp` | **NEW** — track max timestamp in ratings loop | From `allRatings` timestamps | From raw ratings |

## Personality Type Registry

11 personality types in strict priority order. Detection returns the first match.

| Priority | ID | Display Name | Detection Rule | Required Fields |
|----------|----|-------------|----------------|-----------------|
| 1 | `broken-record` | The Broken Record | 75%+ of ratings same value | `ratings`, `ratingDistribution` |
| 2 | `love-hate-critic` | The Love-Hate Critic | 70%+ ratings are min(1) or max, <15% middle | `ratingDistribution`, `maxRating` |
| 3 | `speedrun` | The Speedrun | Avg inter-rating time < 2min AND 75%+ items rated | `earliestTimestamp`, `latestTimestamp`, `totalRatings`, `totalItems` |
| 4 | `golden-retriever` | The Golden Retriever | Average >= (maxRating − 0.5) | `averageRating`, `maxRating` |
| 5 | `simon-cowell` | The Simon Cowell | Average <= bottom 25% of scale | `averageRating`, `maxRating` |
| 6 | `novelist` | The Novelist | 70%+ have notes AND avg note length > 60 chars | `noteCount`, `noteLengths`, `totalRatings` |
| 7 | `rollercoaster` | The Rollercoaster | Stddev > 35% of range AND 3+ distinct values | `ratings`, `maxRating` |
| 8 | `diplomat` | The Diplomat | 65%+ middle values AND stddev < 20% of range | `ratings`, `ratingDistribution`, `maxRating` |
| 9 | `ghost` | The Ghost | Zero notes AND 50%+ items rated | `noteCount`, `totalRatings`, `totalItems` |
| 10 | `philosopher` | The Philosopher | Avg inter-rating time > 8min AND 50%+ rated | `earliestTimestamp`, `latestTimestamp`, `totalRatings`, `totalItems` |
| 11 | `explorer` | The Explorer | 2+ distinct rating values (fallback) | `ratingDistribution` |

**Exclusion rules**:
- `diplomat` excluded when `maxRating <= 2` (no middle value exists)
- `speedrun` and `philosopher` excluded when `totalRatings <= 1` (no interval to measure)
- `rollercoaster` excluded when `maxRating <= 2` (cannot have 3 distinct values)

## Derived Data Structures

### Backend: Enhanced User Summary (DashboardService)

Fields **added** to each object returned by `calculateUserSummaries()`:

| Field | Type | Description |
|-------|------|-------------|
| `noteCount` | `number` | Count of ratings with non-empty `note` |
| `personality` | `string \| null` | Personality type ID (e.g., `"simon-cowell"`) or `null` if not qualifying |

Existing fields remain unchanged. `personality` is `null` when: user hasn't met rating threshold, or event is not wine type.

### Backend: Enhanced Similar User (SimilarityService)

Field **added** to each object in the `findSimilarUsers()` response:

| Field | Type | Description |
|-------|------|-------------|
| `personality` | `string \| null` | Personality type ID or `null` if not qualifying |

### Frontend: PersonalityCard Props

| Prop | Type | Description |
|------|------|-------------|
| `personalityId` | `string` | Personality type ID |
| `templateVars` | `object` | `{ n, max, count, minutes, avg, preview, item, items }` for quote interpolation |
| `previousPersonality` | `string \| null` | Previous personality display name for shift detection |

### Frontend: Personality Content Map

Static data structure in `personalityContent.js`:

```
{
  [personalityId: string]: {
    name: string,           // Display name (e.g., "The Simon Cowell")
    quotes: string[]        // 3-5 quote templates with {token} placeholders
  }
}
```

### Frontend: sessionStorage Keys

| Key Pattern | Value | Lifetime |
|-------------|-------|----------|
| `personality-{eventId}` | Previous personality type ID string | Session-scoped. Written when drawer opens, read on next open to detect shifts. |
| `personality-badge-{eventId}` | `"shown"` | Session-scoped. Set when personality first qualifies. Cleared when drawer opens. |

## State Transitions

No new entity state transitions. Personality is a derived, stateless computation. Visibility is gated on existing event state:

```
created   → Personality hidden (FR-007)
started   → Personality visible if user qualifies (FR-008)
paused    → Personality visible if user qualifies (FR-008)
completed → Personality visible if user qualifies (FR-008)
```

Non-wine event → Personality hidden regardless of state (FR-021).

## Data Flow Diagram

```
                              BACKEND
                              ───────

GET /events/:eventId/dashboard
  └─► DashboardService.calculateUserSummaries()
        ├─► Existing: ratings[], ratingDistribution, averageRating, totalRatings
        ├─► NEW: noteCount, noteLengths, earliestTimestamp, latestTimestamp
        ├─► IF event.typeOfItem === "wine":
        │     └─► PersonalityService.detectPersonality(input) → personality ID
        └─► Response: { ...existingSummary, noteCount, personality }

GET /events/:eventId/similar-users
  └─► SimilarityService.findSimilarUsers()
        ├─► Existing: allRatings grouped by user
        ├─► For each similar user:
        │     ├─► Derive noteCount, noteLengths, timestamps from allRatings
        │     ├─► IF event.typeOfItem === "wine":
        │     │     └─► PersonalityService.detectPersonality(input) → personality ID
        │     └─► Add personality field to response object
        └─► Response: { ...existingUser, personality }


                              FRONTEND
                              ────────

UserDetailsDrawer (My Progress — current user)
  └─► ratingService.getRatings(eventId) [already loaded]
        ├─► Extract: ratings, notes, timestamps, distribution
        ├─► IF event.typeOfItem === "wine":
        │     ├─► personalityDetection.detectPersonality(input) → personality ID
        │     ├─► personalityContent.getPersonalityDisplay(id, vars) → { name, quote }
        │     ├─► sessionStorage: check previous personality → shift detection
        │     └─► Render <PersonalityCard />
        └─► ELSE: No personality card

SimilarUsersDrawer (other users)
  └─► similarUsersService.getSimilarUsers(eventId) [already fetched]
        ├─► Each user now has .personality field
        ├─► IF personality exists:
        │     └─► Show personality name as subtitle in list
        └─► Detail view: personalityContent.getPersonalityDisplay(id, vars) → { name, quote }

DashboardPage Summary tab (all users)
  └─► dashboardService.getDashboardData(eventId) [already fetched]
        ├─► userSummaries now have .personality field
        ├─► Filter to qualifying users (personality !== null)
        ├─► IF any qualifying users:
        │     └─► Render "Tasting Personalities" section
        └─► ELSE: Section hidden

EventPage (dot badge on My Progress button)
  └─► On ratings load:
        ├─► Check if current user meets personality threshold
        ├─► IF qualifies AND sessionStorage has no "personality-badge-{eventId}":
        │     └─► Show dot badge on My Progress button
        └─► On drawer open: set sessionStorage flag, hide badge
```
