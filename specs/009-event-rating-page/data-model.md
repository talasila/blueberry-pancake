# Data Model: Event Rating Page

**Feature**: 009-event-rating-page  
**Date**: 2025-01-27

## Overview

This feature extends the event data model with rating records stored in CSV format and bookmark data stored in browser session storage. The data model supports user ratings for items, with each user having one current rating per item (updates replace previous ratings).

## Entities

### Rating

Represents a user's rating for a specific item in an event.

**Storage**: CSV file at `data/events/{eventId}/ratings.csv`

**Attributes**:
- `email` (string, required): User email address (identifier)
- `timestamp` (string, required): ISO 8601 timestamp (YYYY-MM-DDTHH:MM:SSZ)
- `itemId` (integer, required): Item identifier (1 to numberOfItems)
- `rating` (integer, required): Rating value (1 to maxRating from rating configuration)
- `note` (string, optional): User's note/comment (max 500 characters, may be empty)

**Constraints**:
- Each user (email) can have only one current rating per item (itemId)
- When a user updates a rating, the previous record is replaced (not appended)
- Rating value must be within the valid range for the event's rating configuration
- Note must not exceed 500 characters
- Timestamp must be in ISO 8601 format with timezone (Z suffix)

**CSV Format**:
```csv
email,timestamp,itemId,rating,note
user@example.com,2025-01-27T14:30:00Z,1,4,"Great wine!"
user@example.com,2025-01-27T14:35:00Z,2,3,"Not bad"
```

**CSV Escaping Rules** (RFC 4180):
- Fields containing commas, quotes, or newlines must be enclosed in double quotes
- Double quotes within fields must be escaped by doubling them
- Example: `"This note has a ""quote"" and a comma, see?"`

**Example Records**:
```csv
email,timestamp,itemId,rating,note
alice@example.com,2025-01-27T14:30:00Z,1,4,"Excellent!"
bob@example.com,2025-01-27T14:31:00Z,1,3,"Good, but not great"
alice@example.com,2025-01-27T14:32:00Z,2,5,"Amazing"
alice@example.com,2025-01-27T14:40:00Z,1,5,"Changed my mind - even better!"
```

Note: Alice's second rating for item 1 (at 14:40) replaces her first rating (at 14:30).

---

### Bookmark

Represents a user's bookmark for a specific item in an event.

**Storage**: Browser sessionStorage (key: `bookmarks:{eventId}`)

**Attributes**:
- `eventId` (string, required): Event identifier (part of storage key)
- `itemIds` (Set<integer>, required): Set of bookmarked item IDs for this event

**Storage Format** (JSON):
```json
{
  "bookmarks:abc123": [1, 5, 12, 20]
}
```

**Constraints**:
- Session-only storage (cleared when browser tab/window closes)
- Not persisted to server or files
- User-specific (each browser session has its own bookmarks)
- Item IDs must be valid for the event (within available items)

**Operations**:
- Add bookmark: Add itemId to Set
- Remove bookmark: Remove itemId from Set
- Check bookmark: Check if itemId in Set
- List bookmarks: Return all itemIds in Set

---

### Item Button State

Represents the visual and interactive state of an item button on the main event page.

**Storage**: Computed from ratings and bookmarks (not persisted)

**Attributes**:
- `itemId` (integer, required): Item identifier
- `ratingColor` (string, optional): Color corresponding to user's rating (from rating configuration)
- `bookmarkIndicator` (boolean, required): Whether item is bookmarked (true/false)
- `isRated` (boolean, required): Whether user has rated this item
- `isAvailable` (boolean, required): Whether item is available (not excluded)

**Computation**:
1. Check if itemId is in available items (from event.itemConfiguration)
2. Check if user has rating for this item (from ratings.csv)
3. If rated, get rating value and lookup color from rating configuration
4. Check if itemId is in bookmarks (from sessionStorage)

**Example States**:
- Unrated, not bookmarked: Default button style, no color, no indicator
- Rated (rating 4): Button colored with rating 4 color, no bookmark indicator
- Bookmarked, not rated: Default button style, bookmark icon overlay
- Rated and bookmarked: Button colored with rating color, bookmark icon overlay

---

## Data Relationships

```
Event
  ├── itemConfiguration (from feature 008)
  │   ├── numberOfItems
  │   └── excludedItemIds
  ├── ratingConfiguration (from feature 001-ratings-config)
  │   ├── maxRating
  │   └── ratings[] (colors, labels)
  └── ratings.csv
      └── Rating[] (one per user/item combination)
          ├── email (references User)
          ├── itemId (references Item)
          └── rating (references RatingConfiguration.ratings[].value)

User (email)
  ├── ratings[] (in ratings.csv, filtered by email)
  └── bookmarks[] (in sessionStorage, keyed by eventId)
```

## Data Access Patterns

### Reading Ratings

1. **Get all ratings for event**: Read `ratings.csv`, parse into array
2. **Get user's ratings**: Filter by email
3. **Get rating for specific item**: Filter by email + itemId (should be 0 or 1)
4. **Check if item is rated**: Check if rating exists for email + itemId

### Writing Ratings

1. **Create new rating**: Read CSV, append new row, write back
2. **Update existing rating**: Read CSV, find row by email + itemId, replace, write back
3. **Cache invalidation**: Invalidate cache key `ratings:{eventId}` after write

### Bookmark Operations

1. **Add bookmark**: Read from sessionStorage, add itemId to Set, write back
2. **Remove bookmark**: Read from sessionStorage, remove itemId from Set, write back
3. **List bookmarks**: Read from sessionStorage, return Set as array
4. **Check bookmark**: Read from sessionStorage, check if itemId in Set

## Validation Rules

### Rating Validation

- `email`: Must be valid email format, required
- `timestamp`: Must be ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ), required
- `itemId`: Must be integer between 1 and numberOfItems, must not be in excludedItemIds, required
- `rating`: Must be integer between 1 and maxRating (from rating configuration), required
- `note`: Must be string, max 500 characters, optional (may be empty)

### Bookmark Validation

- `itemId`: Must be integer, must be in available items for event, required
- `eventId`: Must be valid event ID format (8 alphanumeric characters), required

## Data Migration

**Not applicable**: This is a new feature, no migration needed.

## Performance Considerations

1. **CSV File Size**: Grows with number of ratings. With caching, reads are infrequent.
2. **Cache Strategy**: Ratings cached in memory, invalidated on write or state change, refreshed every 30 seconds.
3. **Concurrent Access**: File writes are serialized by Node.js. Last-write-wins strategy handles conflicts.
4. **Bookmark Storage**: SessionStorage is fast, synchronous API, no performance concerns.

## Security Considerations

1. **CSV Injection Prevention**: All fields properly escaped per RFC 4180
2. **Input Validation**: All rating data validated before writing
3. **Authentication**: Rating submission requires authenticated user (email from session)
4. **File Path Security**: Event ID validated to prevent directory traversal
5. **Data Isolation**: Each event's ratings stored in separate directory

## File Structure

```
data/
└── events/
    └── {eventId}/
        ├── config.json          # Event configuration (existing)
        └── ratings.csv          # Ratings data (new)
            ├── Header: email,timestamp,itemId,rating,note
            └── Data rows (one per rating)
```

## Example Data

### ratings.csv
```csv
email,timestamp,itemId,rating,note
alice@example.com,2025-01-27T14:30:00Z,1,4,"Excellent wine!"
bob@example.com,2025-01-27T14:31:00Z,1,3,"Good"
alice@example.com,2025-01-27T14:32:00Z,2,5,"Amazing"
alice@example.com,2025-01-27T14:40:00Z,1,5,"Changed my mind"
bob@example.com,2025-01-27T14:45:00Z,2,2,"Not my favorite"
```

### sessionStorage (bookmarks)
```json
{
  "bookmarks:abc123": [1, 5, 12]
}
```

## Dependencies

- **Event Configuration** (feature 004): Provides eventId, itemConfiguration
- **Rating Configuration** (feature 001-ratings-config): Provides rating scale, colors, labels
- **Item Configuration** (feature 008): Provides available items, excluded items
- **User Authentication**: Provides user email for rating submissions
