# Data Model: Similar Users Discovery

**Feature**: 001-similar-users  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for similarity calculation and user discovery

## Entities

### Similar User

Represents a user with similar taste preferences to the current user, including similarity metrics and comparison data.

**Source**: Calculated on-demand from ratings data

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User email address (identifier) |
| `name` | string | No | User display name (if available) |
| `similarityScore` | number | Yes | Pearson correlation coefficient (-1 to 1) |
| `commonItemsCount` | number | Yes | Number of items both users have rated |
| `commonItems` | array | Yes | Array of common item rating comparisons |

**Similarity Score**:
- Range: -1.0 to 1.0
- 1.0: Perfect positive correlation (identical rating patterns)
- 0.0: No correlation
- -1.0: Perfect negative correlation (opposite preferences)
- null: Correlation cannot be calculated (insufficient variance)

**Common Items Array**:
Each item in the array contains:
- `itemId` (number): Item identifier
- `userRating` (number): Current user's rating for this item
- `similarUserRating` (number): Similar user's rating for this item

**Example**:
```json
{
  "email": "alice@example.com",
  "name": "Alice Smith",
  "similarityScore": 0.87,
  "commonItemsCount": 12,
  "commonItems": [
    { "itemId": 1, "userRating": 4, "similarUserRating": 4 },
    { "itemId": 3, "userRating": 5, "similarUserRating": 5 },
    { "itemId": 7, "userRating": 3, "similarUserRating": 2 }
  ]
}
```

**Storage**: Not persisted - calculated on-demand, cached in memory

**Validation Rules**:
- `similarityScore` must be between -1 and 1, or null
- `commonItemsCount` must be >= 3 (minimum threshold)
- `commonItems` array length must equal `commonItemsCount`
- Each `commonItems` entry must have valid `itemId`, `userRating`, and `similarUserRating`

---

### Similar Users Response

Represents the API response containing list of similar users.

**Source**: API endpoint response

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `similarUsers` | array | Yes | Array of Similar User objects (max 5) |
| `currentUserEmail` | string | Yes | Email of the user requesting similar users |
| `eventId` | string | Yes | Event identifier |

**Response Structure**:
```json
{
  "similarUsers": [
    {
      "email": "alice@example.com",
      "name": "Alice Smith",
      "similarityScore": 0.87,
      "commonItemsCount": 12,
      "commonItems": [...]
    },
    {
      "email": "bob@example.com",
      "name": null,
      "similarityScore": 0.72,
      "commonItemsCount": 8,
      "commonItems": [...]
    }
  ],
  "currentUserEmail": "user@example.com",
  "eventId": "aB3xY9mK"
}
```

**Constraints**:
- Maximum 5 similar users in response (FR-003)
- Users sorted by similarity score (descending), then by common items count (descending), then alphabetically
- Users with null similarity scores excluded from results
- Empty array if no similar users found

---

### User Rating Profile

Represents a user's complete set of ratings for items in an event, used for similarity calculation.

**Source**: Aggregated from ratings CSV filtered by email

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User email address |
| `ratings` | array | Yes | Array of rating objects for items user has rated |

**Rating Object Structure**:
Each rating in the array contains:
- `itemId` (number): Item identifier
- `rating` (number): Rating value (1 to maxRating)

**Example**:
```json
{
  "email": "user@example.com",
  "ratings": [
    { "itemId": 1, "rating": 4 },
    { "itemId": 3, "rating": 5 },
    { "itemId": 7, "rating": 3 },
    { "itemId": 12, "rating": 4 }
  ]
}
```

**Storage**: Derived from `data/events/{eventId}/ratings.csv`

**Validation Rules**:
- Email must be valid format
- Ratings array must contain at least 3 items for similarity calculation
- Each rating must have valid itemId and rating value

---

## Data Relationships

```
Event
  ├── ratings.csv
  │   └── Rating[] (one per user/item combination)
  │       ├── email (references User)
  │       ├── itemId (references Item)
  │       └── rating (1 to maxRating)
  └── config.json
      └── users{} (optional user profile data)
          └── name (optional display name)

User (email)
  ├── ratings[] (in ratings.csv, filtered by email)
  └── profile (optional, in event config)
      └── name (optional display name)

Similarity Calculation
  ├── currentUser (User)
  ├── otherUsers[] (User[])
  └── result: SimilarUser[]
```

## Data Access Patterns

### Reading User Ratings

1. **Get all ratings for event**: Read `ratings.csv`, parse into array
2. **Get user's ratings**: Filter by email, extract itemId and rating pairs
3. **Get rating profiles for all users**: Group ratings by email
4. **Find common items**: Intersect itemId sets between two users

### Similarity Calculation

1. **Get current user's ratings**: Filter ratings by current user email
2. **Get all other users' ratings**: Group ratings by email, exclude current user
3. **For each other user**:
   - Find common items (intersection of rated itemIds)
   - If common items count >= 3:
     - Extract rating pairs for common items
     - Calculate Pearson correlation
     - If correlation is valid (not null), include in results
4. **Sort results**: By similarity score (desc), common items count (desc), identifier (asc)
5. **Limit results**: Take top 5

### Caching

1. **Cache key**: `similarUsers:{eventId}:{userEmail}`
2. **Cache TTL**: 30 seconds
3. **Cache invalidation**: On rating submission, invalidate all `similarUsers:{eventId}:*` keys

## Validation Rules

### Similarity Score Calculation

- Minimum 3 common items required (FR-002)
- If variance is zero for either user's ratings, correlation is undefined → exclude user
- If denominator is zero in correlation formula, correlation is undefined → exclude user
- If result is NaN or Infinity, exclude user

### Response Validation

- Maximum 5 similar users (FR-003)
- All users must have similarityScore between -1 and 1 (or null, but null users excluded)
- All users must have commonItemsCount >= 3
- commonItems array length must match commonItemsCount

### User Identification

- Display name if available in user profile, otherwise email
- Email is always available (from ratings data)
- Name may be null/undefined (not yet implemented in profile system)

## Edge Cases

### Insufficient Ratings

- Current user has <3 ratings: Return 400 error (button not visible, but API should handle)
- Other user has <3 common items: Exclude from results

### Calculation Failures

- Insufficient variance: Return null similarity score, exclude user
- Division by zero: Return null similarity score, exclude user
- NaN/Infinity: Return null similarity score, exclude user

### Empty Results

- No users with >=3 common items: Return empty array
- All users have null similarity scores: Return empty array
- Event has <5 total users: Return all available similar users (FR-006)

### Tie-Breaking

- Identical similarity scores: Sort by commonItemsCount (desc), then identifier (asc)
- Identical similarity scores and commonItemsCount: Sort by identifier (asc)
