# Research: Similar Users Discovery

**Feature**: 001-similar-users  
**Date**: 2025-01-27  
**Purpose**: Document research decisions and technical choices for similarity calculation and user discovery implementation

## Pearson Correlation Implementation

**Decision**: Implement Pearson correlation coefficient (r) to measure similarity between user rating patterns.

**Rationale**:
- Pearson correlation measures linear relationship between two variables (user rating patterns)
- Range: -1 to +1, where +1 indicates perfect positive correlation (identical preferences)
- Well-established statistical method for recommendation systems and collaborative filtering
- Handles cases where users rate items differently but maintain consistent relative preferences
- Standard formula: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)

**Alternatives considered**:
- Cosine similarity: Rejected - doesn't account for rating scale differences as well as Pearson
- Euclidean distance: Rejected - sensitive to absolute rating values, not relative patterns
- Jaccard similarity: Rejected - designed for binary data, not continuous ratings
- Simple average difference: Rejected - doesn't capture correlation patterns

**Implementation approach**:
1. Extract ratings for common items between two users
2. Calculate mean rating for each user (x̄, ȳ)
3. Calculate numerator: Σ((x - x̄)(y - ȳ))
4. Calculate denominator: √(Σ(x - x̄)² × Σ(y - ȳ)²)
5. Return r = numerator / denominator
6. Handle edge cases:
   - Insufficient variance (all ratings identical): Return null (exclude from results)
   - Division by zero: Return null
   - NaN/Infinity: Return null

**Edge case handling**:
- Minimum 3 common items required (spec requirement)
- If variance is zero for either user's ratings, correlation is undefined → exclude user silently
- If denominator is zero, correlation is undefined → exclude user silently

**Performance considerations**:
- Calculation is O(n) where n = number of common items (typically 3-50)
- For 100 users with average 10 common items: ~1000 calculations
- Target: Complete within 2 seconds (SC-001)
- Optimization: Cache similarity results per event (invalidate on new rating)

## Similarity Service Architecture

**Decision**: Create SimilarityService following existing service patterns (RatingService, DashboardService).

**Rationale**:
- Follows existing project architecture patterns
- Separates business logic from API layer
- Enables unit testing of calculation logic
- Reusable across different contexts if needed

**Service structure**:
```javascript
class SimilarityService {
  // Calculate similarity between current user and all other users
  async findSimilarUsers(eventId, currentUserEmail, limit = 5)
  
  // Calculate Pearson correlation between two users
  calculateCorrelation(user1Ratings, user2Ratings)
  
  // Get common items between two users
  getCommonItems(user1Ratings, user2Ratings)
}
```

**Alternatives considered**:
- Inline calculation in API route: Rejected - violates separation of concerns, harder to test
- Utility function only: Rejected - service pattern provides better structure for caching and future extensions

## Caching Strategy

**Decision**: Cache similarity results per event with 30-second TTL, invalidate on rating submission.

**Rationale**:
- Similarity calculations are computationally expensive for large events
- Ratings don't change frequently during active events
- 30-second TTL balances freshness with performance
- Invalidation on rating submission ensures accuracy

**Cache key pattern**: `similarUsers:{eventId}:{userEmail}`

**Cache invalidation**:
- On rating submission: Invalidate cache for all users in event (similarity may change)
- Cache key: `similarUsers:{eventId}:*` (pattern-based invalidation)

**Alternatives considered**:
- No caching: Rejected - would exceed 2-second performance target for large events
- Longer TTL (5 minutes): Rejected - may show stale results after rapid rating submissions
- Per-user caching only: Rejected - need to invalidate all users when any rating changes

## API Endpoint Design

**Decision**: Create GET endpoint `/api/events/:eventId/similar-users` following RESTful conventions.

**Rationale**:
- Follows existing API patterns (e.g., `/api/events/:eventId/ratings`)
- GET method appropriate for read-only operation
- Returns JSON array of similar users with similarity scores
- Uses existing authentication middleware (requireAuth)

**Response structure**:
```json
{
  "similarUsers": [
    {
      "email": "user@example.com",
      "name": "John Doe",
      "similarityScore": 0.85,
      "commonItemsCount": 12,
      "commonItems": [
        { "itemId": 1, "userRating": 4, "similarUserRating": 4 },
        { "itemId": 3, "userRating": 5, "similarUserRating": 5 }
      ]
    }
  ]
}
```

**Error handling**:
- 400: User has rated fewer than 3 items
- 404: Event not found
- 500: Calculation error

**Alternatives considered**:
- POST endpoint: Rejected - operation is read-only, GET is semantically correct
- Separate endpoint for comparison data: Rejected - adds complexity, can include in main response

## Frontend Component Architecture

**Decision**: Create SimilarUsersDrawer component following RatingDrawer pattern.

**Rationale**:
- Consistent UX with existing drawer pattern
- Reuses existing drawer infrastructure and animations
- Follows established component patterns in codebase

**Component structure**:
```jsx
<SimilarUsersDrawer
  isOpen={boolean}
  onClose={function}
  eventId={string}
  eventState={string}
/>
```

**State management**:
- Loading state: Show "Running compatibility scanner..." message
- Error state: Display appropriate error messages
- Success state: Display list of similar users with comparisons

**Alternatives considered**:
- Modal dialog: Rejected - drawer pattern is more consistent with existing UI
- Inline component: Rejected - would clutter event page, drawer provides better focus

## Button Visibility Logic

**Decision**: Show "Find Similar Tastes" button only when user has rated 3+ items.

**Rationale**:
- Prevents users from clicking button when calculation is impossible
- Reduces unnecessary API calls
- Clearer UX - button appears when feature becomes available

**Implementation**:
- Check user's rating count on EventPage render
- Conditionally render button based on rating count
- Button appears dynamically when user reaches 3 ratings

**Alternatives considered**:
- Always show button, disable when <3 ratings: Rejected - spec requires hiding button
- Show button with tooltip: Rejected - spec requires hiding button

## User Identification Display

**Decision**: Display user name if available, otherwise full email address.

**Rationale**:
- Provides better UX when names are available
- Falls back to email (always available) when name is not set
- Follows spec clarification

**Implementation**:
- Check if user has name in profile data
- If name exists: display name
- If name missing: display email
- Handle case where profile data is not yet implemented (display email)

**Alternatives considered**:
- Always show email: Rejected - spec requires showing name if available
- Anonymized identifiers: Rejected - spec requires name or email

## Tie-Breaking Strategy

**Decision**: When similarity scores are identical, sort by:
1. Number of common items (descending)
2. Alphabetical by user identifier (email/name)

**Rationale**:
- Users with more common items provide more reliable similarity
- Alphabetical sort ensures deterministic ordering
- Follows spec clarification

**Implementation**:
```javascript
similarUsers.sort((a, b) => {
  if (a.similarityScore !== b.similarityScore) {
    return b.similarityScore - a.similarityScore; // Descending
  }
  if (a.commonItemsCount !== b.commonItemsCount) {
    return b.commonItemsCount - a.commonItemsCount; // Descending
  }
  return a.identifier.localeCompare(b.identifier); // Alphabetical
});
```

**Alternatives considered**:
- Random selection: Rejected - non-deterministic, harder to test
- First-come-first-served: Rejected - arbitrary, doesn't prioritize quality
