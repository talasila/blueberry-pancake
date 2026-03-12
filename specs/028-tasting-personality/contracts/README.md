# API Contracts: Tasting Personality Card

**Branch**: `028-tasting-personality` | **Date**: 2026-03-12

## Overview

This feature introduces **no new API endpoints** (FR-025). Personality data is added as a new field to two existing API responses. This document records the response shape changes and component contracts.

## Modified Endpoints

### GET /api/events/:eventId/dashboard

Already called by `DashboardPage` on mount. Response includes `userSummaries` array.

**Existing `userSummaries[]` item shape** (unchanged fields):

| Field | Type | Description |
|-------|------|-------------|
| `email` | `string` | User email |
| `name` | `string \| null` | Display name |
| `numberOfBottlesRated` | `number` | Unique items rated |
| `ratingProgression` | `number` | Percentage of items rated |
| `averageRating` | `number \| null` | Mean rating |
| `ratings` | `number[]` | Chronological rating values |
| `ratingDistribution` | `object` | `{ [ratingValue]: count }` |
| `totalRatings` | `number` | Total rating records |

**New fields added to each `userSummaries[]` item**:

| Field | Type | Description |
|-------|------|-------------|
| `noteCount` | `number` | Count of ratings with non-empty notes |
| `personality` | `string \| null` | Personality type ID (e.g., `"simon-cowell"`) or `null` if user doesn't qualify or event is not wine type |

**Backward compatibility**: New fields are additive. Existing consumers that don't read `noteCount` or `personality` are unaffected.

**When `personality` is `null`**:
- User has not met the minimum rating threshold
- Event `typeOfItem` is not `"wine"`

### GET /api/events/:eventId/similar-users

Already called by `SimilarUsersDrawer` on open. Response includes `similarUsers` array.

**Existing `similarUsers[]` item shape** (unchanged fields):

| Field | Type | Description |
|-------|------|-------------|
| `email` | `string` | User email |
| `name` | `string \| null` | Display name |
| `similarityScore` | `number` | 0–1 similarity |
| `mae` | `number` | Mean Absolute Error |
| `commonItemsCount` | `number` | Items rated by both |
| `perfectMatches` | `number` | Same rating value |
| `closeMatches` | `number` | Within 1 point |
| `commonItems` | `array` | Per-item comparison |

**New field added to each `similarUsers[]` item**:

| Field | Type | Description |
|-------|------|-------------|
| `personality` | `string \| null` | Personality type ID or `null` if user doesn't qualify or event is not wine type |

**Backward compatibility**: Additive field. Existing consumers unaffected.

## Backend Function Contracts

### PersonalityService.detectPersonality(input)

Pure function. No side effects. No DB access.

**Input**:

```
{
  ratings: number[],              // Chronological rating values
  ratingDistribution: object,     // { [ratingValue]: count }
  averageRating: number,          // Mean rating
  totalRatings: number,           // Unique items rated
  totalItems: number,             // Available items in event
  maxRating: number,              // Max rating value (e.g., 4)
  noteCount: number,              // Ratings with non-empty notes
  noteLengths: number[],          // Lengths of non-empty notes
  earliestTimestamp: string,      // ISO timestamp of first rating
  latestTimestamp: string         // ISO timestamp of last rating
}
```

**Output**: `string | null`
- Returns personality type ID string (e.g., `"golden-retriever"`) on match
- Returns `null` if user doesn't meet minimum rating threshold

**Threshold**: `Math.min(Math.max(4, Math.ceil(totalItems * 0.5)), totalItems)`

**Detection order**: Evaluates rules 1–11 in priority order, returns first match.

## Frontend Component Contracts

### PersonalityCard (NEW)

```
interface PersonalityCardProps {
  personalityId: string;                // Personality type ID
  templateVars: {                       // Values for quote interpolation
    n?: number;                         // Dominant rating value (broken-record)
    max: number;                        // Event's maxRating
    count: number;                      // Items rated
    minutes?: number;                   // Minutes from first to last rating
    avg: string;                        // Average rating (1 decimal)
    preview?: string;                   // First 5 ratings as comma-separated string
    item: string;                       // Singular item term (e.g., "wine")
    items: string;                      // Plural item term (e.g., "wines")
  };
  previousPersonality?: string | null;  // Previous personality display name (for shift line)
}
```

### UserDetailsDrawer Props (no change to interface)

Existing props remain the same. Personality card is rendered internally using data from `ratingService.getRatings()` which is already called inside the component.

### SimilarUsersDrawer (no change to props interface)

Existing props remain the same. Personality name is consumed from the `personality` field on each user object in the `similarUsers` API response, which is already fetched inside the component.

### EventPage — My Progress Button (visual change only)

No new props. The dot badge is conditionally rendered based on:
1. Whether the current user's ratings meet the personality threshold
2. Whether `sessionStorage` has a `personality-badge-{eventId}` key
3. Whether `event.typeOfItem === "wine"`

### DashboardPage — Summary Tab (visual change only)

No new props. The "Tasting Personalities" section is rendered from `dashboardData.userSummaries` which now includes the `personality` field.

## Frontend Utility Contracts

### personalityDetection.detectPersonality(input)

Mirrors the backend `PersonalityService.detectPersonality()` exactly.

**Input**: Same shape as backend (see above).
**Output**: `string | null` — personality type ID or `null`.

### personalityContent.getPersonalityDisplay(personalityId, templateVars)

**Input**:
- `personalityId: string` — personality type ID
- `templateVars: object` — token values for interpolation

**Output**:

```
{
  name: string,     // Display name (e.g., "The Simon Cowell")
  quote: string     // Randomly selected quote with tokens interpolated
}
```

Returns `null` if `personalityId` is not found in the content map.

### personalityContent.getPersonalityName(personalityId)

**Input**: `personalityId: string`
**Output**: `string | null` — display name or `null` if not found.

Used by `SimilarUsersDrawer` list (needs name only, not quote) and `DashboardPage` (name only).
