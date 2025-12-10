# Quickstart Guide: Event Rating Page

**Feature**: 009-event-rating-page  
**Date**: 2025-01-27

## Overview

This guide provides a quick start for implementing the Event Rating Page feature. It covers the key components, API endpoints, and implementation steps.

## Feature Summary

The Event Rating Page allows users to:
- View items as numbered buttons in a dialpad-style layout
- Click items to open a drawer with rating form (when event is started)
- Submit ratings with optional notes
- See rating colors on buttons after rating
- Bookmark items for later review
- View appropriate messages based on event state

## Architecture Overview

```
Frontend (React)
├── EventPage.jsx (main page with item buttons)
├── ItemButton.jsx (dialpad-style button with rating color/bookmark)
├── RatingDrawer.jsx (drawer with state-based content)
├── RatingForm.jsx (rating form with validation)
└── ratingService.js (API client)

Backend (Express)
├── ratings.js (API routes)
├── RatingService.js (business logic, CSV operations)
└── csvParser.js (CSV parsing/writing utilities)
```

## Implementation Steps

### Phase 1: Backend API

#### 1.1 Create CSV Parser Utility

**File**: `backend/src/utils/csvParser.js`

```javascript
/**
 * Parse CSV string into array of objects
 * Handles RFC 4180 escaping
 */
export function parseCSV(csvString) {
  // Implementation: parse CSV with RFC 4180 rules
  // Return array of rating objects
}

/**
 * Convert array of rating objects to CSV string
 * Handles RFC 4180 escaping
 */
export function toCSV(ratings) {
  // Implementation: convert to CSV with proper escaping
  // Return CSV string with header
}
```

**Key Requirements**:
- Handle quoted fields (commas, quotes, newlines)
- Escape double quotes by doubling them
- Parse header row
- Validate data types

#### 1.2 Create Rating Service

**File**: `backend/src/services/RatingService.js`

```javascript
import dataRepository from '../data/FileDataRepository.js';
import { parseCSV, toCSV } from '../utils/csvParser.js';
import cacheService from '../cache/CacheService.js';

class RatingService {
  async getRatings(eventId) {
    // Read CSV, parse, return array
  }

  async getRating(eventId, itemId, email) {
    // Get user's rating for specific item
  }

  async submitRating(eventId, itemId, rating, note, email) {
    // Read CSV, find/replace rating, write back
    // Invalidate cache
  }
}
```

**Key Requirements**:
- Read ratings.csv file (with cache check)
- Parse CSV into rating objects
- Find existing rating by email + itemId
- Replace existing or append new rating
- Write CSV back (with cache invalidation)
- Validate event state (must be "started")
- Validate rating value (1 to maxRating)
- Validate note length (max 500 chars)

#### 1.3 Extend FileDataRepository

**File**: `backend/src/data/FileDataRepository.js`

Add method:
```javascript
async replaceRating(eventId, email, itemId, newRating) {
  // Read CSV, parse, find/replace, write back
  // Invalidate cache
}
```

Or use existing `appendEventData` and handle replace logic in RatingService.

#### 1.4 Create API Routes

**File**: `backend/src/api/ratings.js`

```javascript
import express from 'express';
import ratingService from '../services/RatingService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requirePIN } from '../middleware/requirePIN.js';

const router = express.Router();

// GET /api/events/:eventId/ratings
router.get('/:eventId/ratings', requireAuth, requirePIN, async (req, res) => {
  // Get all ratings for event
  // Return CSV format
});

// POST /api/events/:eventId/ratings
router.post('/:eventId/ratings', requireAuth, requirePIN, async (req, res) => {
  // Submit rating
  // Validate event state
  // Call ratingService.submitRating
});

// GET /api/events/:eventId/ratings/:itemId
router.get('/:eventId/ratings/:itemId', requireAuth, requirePIN, async (req, res) => {
  // Get user's rating for specific item
});
```

**Key Requirements**:
- Authentication required (JWT or PIN)
- Validate event state on submission
- Validate input (itemId, rating, note)
- Return appropriate error messages
- Handle file I/O errors gracefully

### Phase 2: Frontend Components

#### 2.1 Create Rating Service (API Client)

**File**: `frontend/src/services/ratingService.js`

```javascript
import apiClient from './apiClient.js';

export const ratingService = {
  async getRatings(eventId) {
    // GET /api/events/:eventId/ratings
    // Parse CSV response
  },

  async getRating(eventId, itemId) {
    // GET /api/events/:eventId/ratings/:itemId
  },

  async submitRating(eventId, itemId, rating, note) {
    // POST /api/events/:eventId/ratings
  }
};
```

#### 2.2 Create Item Button Component

**File**: `frontend/src/components/ItemButton.jsx`

```jsx
function ItemButton({ itemId, ratingColor, isBookmarked, onClick }) {
  return (
    <button
      className="dialpad-button"
      style={{ backgroundColor: ratingColor }}
      onClick={onClick}
    >
      <span className="item-number">{itemId}</span>
      {isBookmarked && <BookmarkIcon className="bookmark-indicator" />}
    </button>
  );
}
```

**Key Requirements**:
- Dialpad-style (circular/rounded, large touch target)
- Display item number
- Show rating color as background
- Show bookmark icon overlay in corner
- Handle click to open drawer

#### 2.3 Create Rating Drawer Component

**File**: `frontend/src/components/RatingDrawer.jsx`

```jsx
function RatingDrawer({ isOpen, onClose, eventState, itemId, eventId }) {
  const content = {
    created: <Message>Event has not started yet</Message>,
    started: <RatingForm itemId={itemId} eventId={eventId} />,
    paused: <Message>Event is paused</Message>,
    completed: <Message>Feature coming soon</Message>
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      {content[eventState]}
    </Drawer>
  );
}
```

**Key Requirements**:
- Slide-out drawer (from side or bottom)
- State-based content rendering
- Close button and backdrop dismissal
- Only one drawer open at a time

#### 2.4 Create Rating Form Component

**File**: `frontend/src/components/RatingForm.jsx`

```jsx
function RatingForm({ itemId, eventId, existingRating }) {
  const [rating, setRating] = useState(existingRating?.rating || null);
  const [note, setNote] = useState(existingRating?.note || '');
  const [bookmarked, setBookmarked] = useState(false);

  const handleSubmit = async () => {
    // Validate rating selected
    // Validate note length (max 500)
    // Submit via ratingService
    // Update button color
    // Close drawer
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Rating options from rating configuration */}
      {/* Note textarea with character counter */}
      {/* Bookmark toggle */}
      {/* Submit button */}
    </form>
  );
}
```

**Key Requirements**:
- Display rating options (from rating configuration)
- Show rating colors and labels
- Note textarea with 500 char limit and counter
- Bookmark toggle button
- Validation before submission
- Loading state during submission
- Error handling

#### 2.5 Update EventPage

**File**: `frontend/src/pages/EventPage.jsx`

Replace placeholder content with:
- Item buttons in dialpad layout (CSS Grid)
- Rating drawer component
- State management for drawer open/close
- Load ratings and bookmarks on mount
- Update button colors based on ratings

**Key Requirements**:
- Generate item buttons from available items
- Filter out excluded items
- Arrange in dialpad-style grid (3 columns)
- Handle drawer open/close
- Update button states when ratings change

### Phase 3: Bookmark Functionality

#### 3.1 Bookmark Storage

**File**: `frontend/src/utils/bookmarkStorage.js`

```javascript
export const bookmarkStorage = {
  getBookmarks(eventId) {
    const key = `bookmarks:${eventId}`;
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  addBookmark(eventId, itemId) {
    const bookmarks = this.getBookmarks(eventId);
    if (!bookmarks.includes(itemId)) {
      bookmarks.push(itemId);
      sessionStorage.setItem(`bookmarks:${eventId}`, JSON.stringify(bookmarks));
    }
  },

  removeBookmark(eventId, itemId) {
    const bookmarks = this.getBookmarks(eventId).filter(id => id !== itemId);
    sessionStorage.setItem(`bookmarks:${eventId}`, JSON.stringify(bookmarks));
  }
};
```

### Phase 4: Cache Invalidation

#### 4.1 Periodic Cache Refresh

**File**: `backend/src/services/RatingService.js`

Add periodic refresh:
```javascript
// In RatingService constructor or initialization
setInterval(() => {
  // Invalidate all rating caches
  // This ensures fresh data every 30 seconds
}, 30000);
```

Or handle in cache service with TTL.

## Testing Checklist

### Backend Tests

- [ ] CSV parser handles RFC 4180 escaping correctly
- [ ] Rating service reads/writes CSV correctly
- [ ] Rating replacement works (finds and replaces existing rating)
- [ ] Event state validation prevents rating in non-started states
- [ ] Input validation (rating range, note length, itemId)
- [ ] Cache invalidation on write
- [ ] API endpoints return correct responses
- [ ] Error handling for file I/O failures

### Frontend Tests

- [ ] Item buttons render in dialpad layout
- [ ] Drawer opens/closes correctly
- [ ] Drawer content changes based on event state
- [ ] Rating form validates input
- [ ] Rating submission updates button color
- [ ] Bookmark indicator appears/disappears
- [ ] Bookmark persists in sessionStorage
- [ ] Button colors match rating configuration

### Integration Tests

- [ ] User can submit rating end-to-end
- [ ] Rating updates replace previous rating
- [ ] Multiple users can rate same item
- [ ] Cache refresh works correctly
- [ ] Event state changes prevent rating submission

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/:eventId/ratings` | Get all ratings (CSV format) |
| POST | `/api/events/:eventId/ratings` | Submit rating |
| GET | `/api/events/:eventId/ratings/:itemId` | Get user's rating for item |

## Key Files to Create/Modify

### New Files
- `backend/src/utils/csvParser.js`
- `backend/src/services/RatingService.js`
- `backend/src/api/ratings.js`
- `frontend/src/components/ItemButton.jsx`
- `frontend/src/components/RatingDrawer.jsx`
- `frontend/src/components/RatingForm.jsx`
- `frontend/src/services/ratingService.js`
- `frontend/src/utils/bookmarkStorage.js`

### Modified Files
- `backend/src/data/FileDataRepository.js` (optional: add replaceRating method)
- `backend/src/app.js` (add ratings routes)
- `frontend/src/pages/EventPage.jsx` (replace placeholder with implementation)

## Dependencies

**No new dependencies required** - all functionality uses existing stack:
- Node.js fs.promises (CSV operations)
- node-cache (caching)
- React (components)
- Tailwind CSS (styling)
- Browser sessionStorage (bookmarks)

## Performance Targets

- Page load: <1 second
- Drawer open: <500ms
- Rating submission: <30 seconds user time
- Cache efficiency: 70% reduction in file reads

## Next Steps

1. Implement CSV parser utility
2. Create RatingService with CSV operations
3. Implement API endpoints
4. Create frontend components
5. Integrate into EventPage
6. Add tests
7. Test end-to-end flow
