# Data Model: Event Dashboard Page

**Feature**: 010-dashboard-page  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for dashboard statistics and item rating summaries

## Overview

The dashboard feature aggregates data from existing event configuration and ratings data to display summary statistics and detailed item rating information. No new persistent data structures are created; the dashboard calculates and presents derived data from existing sources.

## Entities

### Dashboard Statistics

Represents aggregated event metrics displayed as summary statistics on the dashboard.

**Source**: Calculated from Event configuration and Ratings CSV

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `totalUsers` | number | Yes | Count of all registered users in the event (from event.users object) |
| `totalBottles` | number | Yes | Count of configured items minus excluded items (numberOfItems - excludedItemIds.length) |
| `totalRatings` | number | Yes | Total count of all rating submissions in the event (from ratings.csv) |
| `averageRatingsPerBottle` | number | Yes | Total ratings count divided by total bottles count, formatted to 2 decimal places |

**Calculation**:
- `totalUsers`: `Object.keys(event.users).length`
- `totalBottles`: `event.itemConfiguration.numberOfItems - event.itemConfiguration.excludedItemIds.length`
- `totalRatings`: `ratings.length` (from parsed ratings.csv)
- `averageRatingsPerBottle`: `(totalRatings / totalBottles).toFixed(2)`

**Edge Cases**:
- If `totalBottles = 0`: `averageRatingsPerBottle` should display "N/A" or "0.00"
- If `totalRatings = 0`: `averageRatingsPerBottle = 0.00`

**Storage**: Not persisted - calculated on-demand, cached in memory

**Example**:
```json
{
  "totalUsers": 30,
  "totalBottles": 33,
  "totalRatings": 150,
  "averageRatingsPerBottle": 4.55
}
```

---

### Item Rating Summary

Represents aggregated rating data for a single item in the dashboard table.

**Source**: Calculated from Ratings CSV filtered by itemId

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `itemId` | number | Yes | Item identifier (1 to numberOfItems, excluding excludedItemIds) |
| `numberOfRaters` | number | Yes | Count of unique users who have rated this item |
| `averageRating` | number | Yes | Arithmetic mean of all rating values for this item, formatted to 2 decimal places |
| `weightedAverage` | number | Yes | Bayesian weighted average, formatted to 2 decimal places |
| `ratingProgression` | number | Yes | Percentage of users who have rated this item (numberOfRaters / totalUsers), 0-100 |

**Calculation**:
- `numberOfRaters`: Count unique emails from ratings filtered by `itemId`
- `averageRating`: `(sum of ratings for item) / numberOfRaters`, formatted to 2 decimal places
- `weightedAverage`: `(C × global_avg + Σ(ratings)) / (C + n)`, where:
  - `C = Math.floor(totalUsers * 0.4)`
  - `global_avg = average of all ratings across all items`
  - `n = numberOfRaters`
  - `Σ(ratings) = sum of all rating values for this item`
- `ratingProgression`: `(numberOfRaters / totalUsers) * 100`

**Edge Cases**:
- If `numberOfRaters = 0`: 
  - `averageRating`: "N/A" or "0.00"
  - `weightedAverage`: equals `global_avg` if available, otherwise "N/A"
  - `ratingProgression`: 0
- If `totalUsers = 0`: 
  - `ratingProgression`: 0
  - `weightedAverage`: "N/A" (C = 0, cannot calculate)
- If `global_avg` is undefined (no ratings exist): 
  - `weightedAverage`: "N/A"

**Storage**: Not persisted - calculated on-demand, cached in memory

**Example**:
```json
{
  "itemId": 5,
  "numberOfRaters": 15,
  "averageRating": 3.40,
  "weightedAverage": 3.12,
  "ratingProgression": 50.0
}
```

---

### Global Average

Represents the average rating value across all items in the event, used as a baseline in the Bayesian weighted average formula.

**Source**: Calculated from all ratings in the event

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `value` | number | Yes | Mean of all rating values in the event |

**Calculation**:
- `value`: `(sum of all rating values) / (total number of ratings)`

**Edge Cases**:
- If no ratings exist: `value` is `undefined` or `null`
- Used in Bayesian formula: if undefined, weighted averages display "N/A"

**Storage**: Not persisted - calculated on-demand, cached in memory

**Example**:
```json
{
  "value": 3.0
}
```

---

## Data Relationships

```
Event
  ├── users (object) → totalUsers count
  ├── itemConfiguration
  │   ├── numberOfItems → totalBottles calculation
  │   └── excludedItemIds → totalBottles calculation
  └── ratings.csv
      └── Rating[] → totalRatings count, item rating summaries, global average

Dashboard Statistics
  ├── totalUsers (from Event.users)
  ├── totalBottles (from Event.itemConfiguration)
  ├── totalRatings (from ratings.csv)
  └── averageRatingsPerBottle (calculated)

Item Rating Summary[]
  ├── itemId (references Item)
  ├── numberOfRaters (from ratings.csv filtered by itemId)
  ├── averageRating (calculated from ratings for item)
  ├── weightedAverage (calculated using global_avg and Bayesian formula)
  └── ratingProgression (calculated from numberOfRaters / totalUsers)

Global Average
  └── value (calculated from all ratings in ratings.csv)
```

## Data Access Patterns

### Reading Dashboard Statistics

1. **Get event configuration**: Read from EventService (cached)
2. **Get ratings**: Read from RatingService (cached)
3. **Calculate statistics**:
   - Count users from `event.users`
   - Calculate total bottles from `itemConfiguration`
   - Count ratings from `ratings` array
   - Calculate average ratings per bottle
4. **Cache result**: Store in cache with key `dashboard:{eventId}`

### Reading Item Rating Summaries

1. **Get event configuration**: Read from EventService (cached)
2. **Get ratings**: Read from RatingService (cached)
3. **Calculate global average**: Mean of all rating values
4. **For each item** (excluding excludedItemIds):
   - Filter ratings by `itemId`
   - Count unique raters
   - Calculate average rating
   - Calculate weighted average using Bayesian formula
   - Calculate rating progression percentage
5. **Cache result**: Store in cache with key `dashboard:{eventId}`

### Cache Invalidation

- **On rating submission**: Invalidate `dashboard:{eventId}` cache (via RatingService)
- **On event state change**: Invalidate `dashboard:{eventId}` cache (via EventService)
- **On manual refresh**: Invalidate cache before recalculating

## Validation Rules

### Dashboard Statistics Validation

- `totalUsers`: Must be >= 0
- `totalBottles`: Must be >= 0, <= numberOfItems
- `totalRatings`: Must be >= 0
- `averageRatingsPerBottle`: Must be >= 0, formatted to 2 decimal places

### Item Rating Summary Validation

- `itemId`: Must be integer between 1 and numberOfItems, must not be in excludedItemIds
- `numberOfRaters`: Must be >= 0, <= totalUsers
- `averageRating`: Must be between 1 and maxRating (if ratings exist), or "N/A" if no ratings
- `weightedAverage`: Must be between 1 and maxRating (if calculable), or "N/A" if C=0 or global_avg undefined
- `ratingProgression`: Must be between 0 and 100

### Global Average Validation

- `value`: Must be between 1 and maxRating (if ratings exist), or undefined if no ratings

## Performance Considerations

- **Caching**: Dashboard statistics cached for 30 seconds to reduce file I/O
- **Lazy calculation**: Calculate item summaries only when needed (on dashboard page load)
- **Efficient aggregation**: Use array methods (filter, reduce) for calculations
- **Cache invalidation**: Invalidate on rating submission to ensure data freshness
