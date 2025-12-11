# Quick Start: Similar Users Discovery

**Feature**: 001-similar-users  
**Date**: 2025-01-27  
**Purpose**: Quick reference guide for implementing similar users discovery feature

## Overview

This feature enables users to discover other participants with similar taste preferences during blind tasting events. Similarity is calculated using Pearson correlation on rating patterns.

## Key Components

### Backend

1. **SimilarityService** (`backend/src/services/SimilarityService.js`)
   - Calculates similarity between users using Pearson correlation
   - Filters users by minimum 3 common items
   - Sorts and limits results to top 5

2. **Pearson Correlation Utility** (`backend/src/utils/pearsonCorrelation.js`)
   - Implements Pearson correlation coefficient calculation
   - Handles edge cases (insufficient variance, division by zero)

3. **API Endpoint** (`backend/src/api/similarUsers.js`)
   - `GET /api/events/:eventId/similar-users`
   - Returns list of similar users with comparison data

### Frontend

1. **SimilarUsersDrawer** (`frontend/src/components/SimilarUsersDrawer.jsx`)
   - Drawer component displaying similar users
   - Shows loading state with "Running compatibility scanner..." message
   - Displays user list with rating comparisons

2. **Similar Users Service** (`frontend/src/services/similarUsersService.js`)
   - API client for similar users endpoint
   - Handles API calls and error states

3. **EventPage Integration** (`frontend/src/pages/EventPage.jsx`)
   - "Find Similar Tastes" button (visible when user has 3+ ratings)
   - Opens SimilarUsersDrawer on click

## Implementation Steps

### Phase 1: Backend - Similarity Calculation

1. **Create Pearson Correlation Utility**
   ```javascript
   // backend/src/utils/pearsonCorrelation.js
   export function calculatePearsonCorrelation(user1Ratings, user2Ratings) {
     // Extract common items
     // Calculate means
     // Calculate numerator: Σ((x - x̄)(y - ȳ))
     // Calculate denominator: √(Σ(x - x̄)² × Σ(y - ȳ)²)
     // Return r = numerator / denominator
     // Handle edge cases (null for invalid calculations)
   }
   ```

2. **Create SimilarityService**
   ```javascript
   // backend/src/services/SimilarityService.js
   class SimilarityService {
     async findSimilarUsers(eventId, currentUserEmail, limit = 5) {
       // Get all ratings for event
       // Get current user's ratings
       // Get all other users' ratings
       // For each other user:
       //   - Find common items
       //   - If >= 3 common items:
       //     - Calculate correlation
       //     - If valid, add to results
       // Sort results (similarity desc, commonItems desc, identifier asc)
       // Return top 5
     }
   }
   ```

3. **Create API Endpoint**
   ```javascript
   // backend/src/api/similarUsers.js
   router.get('/similar-users', requireAuth, async (req, res) => {
     // Validate current user has 3+ ratings
     // Call SimilarityService.findSimilarUsers()
     // Return response with similar users
   });
   ```

### Phase 2: Frontend - UI Components

1. **Create Similar Users Service**
   ```javascript
   // frontend/src/services/similarUsersService.js
   export async function getSimilarUsers(eventId) {
     // Call GET /api/events/:eventId/similar-users
     // Handle errors
     // Return similar users data
   }
   ```

2. **Create SimilarUsersDrawer Component**
   ```jsx
   // frontend/src/components/SimilarUsersDrawer.jsx
   function SimilarUsersDrawer({ isOpen, onClose, eventId }) {
     // Loading state: "Running compatibility scanner..."
     // Error state: Display error message
     // Success state: Display similar users list
     // Each user entry shows:
     //   - Name or email
     //   - Similarity score (optional)
     //   - Common items with rating comparisons
   }
   ```

3. **Integrate into EventPage**
   ```jsx
   // frontend/src/pages/EventPage.jsx
   // Add button (only visible when user has 3+ ratings)
   // Add state for drawer open/close
   // Add SimilarUsersDrawer component
   ```

## Key Algorithms

### Pearson Correlation

Formula: `r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)`

Where:
- `x` = current user's ratings for common items
- `y` = other user's ratings for common items
- `x̄` = mean of current user's ratings
- `ȳ` = mean of other user's ratings

### Sorting Logic

```javascript
similarUsers.sort((a, b) => {
  // Primary: Similarity score (descending)
  if (a.similarityScore !== b.similarityScore) {
    return b.similarityScore - a.similarityScore;
  }
  // Secondary: Common items count (descending)
  if (a.commonItemsCount !== b.commonItemsCount) {
    return b.commonItemsCount - a.commonItemsCount;
  }
  // Tertiary: Identifier (alphabetical)
  return a.identifier.localeCompare(b.identifier);
});
```

## Caching Strategy

- **Cache key**: `similarUsers:{eventId}:{userEmail}`
- **TTL**: 30 seconds
- **Invalidation**: On rating submission, invalidate all `similarUsers:{eventId}:*` keys

## Testing Checklist

### Backend Tests

- [ ] Unit test: Pearson correlation calculation
- [ ] Unit test: Correlation with insufficient variance (returns null)
- [ ] Unit test: Correlation with division by zero (returns null)
- [ ] Unit test: SimilarityService.findSimilarUsers() with various scenarios
- [ ] Unit test: Tie-breaking logic
- [ ] Integration test: API endpoint with authentication
- [ ] Integration test: API endpoint with <3 ratings (400 error)
- [ ] Integration test: API endpoint with no similar users (empty array)

### Frontend Tests

- [ ] Unit test: SimilarUsersDrawer component rendering
- [ ] Unit test: Loading state display
- [ ] Unit test: Error state display
- [ ] Unit test: Similar users list display
- [ ] Unit test: Rating comparisons display
- [ ] Unit test: Button visibility logic (3+ ratings)
- [ ] E2E test: Complete user flow (rate items → click button → see similar users)

## Performance Targets

- **API Response Time**: <2 seconds (SC-001)
- **Calculation Time**: O(n) where n = number of users × average common items
- **Cache Hit Rate**: Target >80% for repeated requests

## Common Pitfalls

1. **Forgetting to handle null correlation scores**: Always check for null before including in results
2. **Not invalidating cache on rating submission**: Similarity may change when ratings are added
3. **Incorrect tie-breaking**: Must sort by similarity, then common items, then identifier
4. **Button visibility**: Must check rating count on every render (ratings can change)
5. **User identification**: Must handle case where name is not available (display email)

## Dependencies

- **Backend**: RatingService, EventService, CacheService, requireAuth middleware
- **Frontend**: React Router, existing drawer component patterns, API client

## Next Steps

1. Implement Pearson correlation utility
2. Implement SimilarityService
3. Create API endpoint
4. Create frontend service
5. Create SimilarUsersDrawer component
6. Integrate into EventPage
7. Write tests
8. Performance testing and optimization
