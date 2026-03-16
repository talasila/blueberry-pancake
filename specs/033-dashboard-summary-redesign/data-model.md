# Data Model: Dashboard Summary Redesign

No new entities, tables, or backend data structures are introduced. All data is derived on the frontend from the existing `DashboardService.getDashboardData()` response.

## Existing Entities Used (Read-Only)

### dashboardData (API response)

```
{
  statistics: {
    totalUsers: number,
    totalItems: number,
    totalRatings: number,
    averageRatingsPerItem: number     // REMOVED from UI (was "Ratings per Bottle")
  },
  itemSummaries: [
    {
      itemId: number,
      numberOfRaters: number,
      averageRating: number,
      weightedAverage: number,        // USED for top-rated hero card
      standardDeviation: number,
      ratingProgression: number,
      ratingDistribution: object
    }
  ],
  userSummaries: [
    {
      email: string,
      name: string | null,
      personality: string | null,     // USED for personality summary strip
      numberOfBottlesRated: number,
      averageRating: number,
      ...
    }
  ],
  globalAverage: number | null,       // USED for "Avg Rating" card (NEW)
  ratingConfiguration: {
    maxRating: number,                // USED for "out of {maxRating}" subtitle
    ratings: [...]
  },
  mostControversial: {                // RENAMED to "Most Divisive" in UI
    itemId: number,
    standardDeviation: number,
    numberOfRaters: number,
    averageRating: number             // USED for subtitle (NEW)
  } | null,
  leastControversial: { ... } | null  // REMOVED from UI
}
```

## Derived Frontend Computations

### Top-Rated Item
- **Source**: `itemSummaries`
- **Logic**: Item with highest `weightedAverage` where `numberOfRaters > 0`. Tie-break: lowest `itemId`.
- **Output**: `{ itemId, weightedAverage }` or `null`

### Ratings Progress
- **Source**: `statistics.totalRatings`, `statistics.totalUsers`, `statistics.totalItems`
- **Logic**: `expectedRatings = totalUsers × totalItems`; `progress = totalRatings / expectedRatings`; `remaining = expectedRatings - totalRatings`
- **Output**: `{ actual, expected, percentage, remaining }` or null when expected is 0

### Personality Counts
- **Source**: `userSummaries[].personality`
- **Logic**: Group non-null personality IDs; count occurrences; sort by count descending
- **Output**: `[{ personalityId, count, name, icon }]` — enriched via `PERSONALITY_CONTENT`

### Max Rating
- **Source**: `ratingConfiguration.maxRating`
- **Default**: 4 (matches backend default)
