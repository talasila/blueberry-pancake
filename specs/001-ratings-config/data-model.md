# Data Model: Ratings Configuration

**Feature**: Ratings Configuration  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for rating configuration

## Entities

### Event (Extended)

Represents a user-created event with rating configuration. Extends the Event entity from previous features.

**New Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `ratingConfiguration` | object | No | Object with maxRating and ratings array | Rating configuration settings for the event |

**Rating Configuration Object Structure**:
```json
{
  "maxRating": 4,
  "ratings": [
    { "value": 1, "label": "What is this crap?", "color": "#FF3B30" },
    { "value": 2, "label": "Meh...", "color": "#FFCC00" },
    { "value": 3, "label": "Not bad...", "color": "#34C759" },
    { "value": 4, "label": "Give me more...", "color": "#28A745" }
  ]
}
```

**Rating Configuration Object Rules**:
- `maxRating`: Integer, range 2-4 (inclusive), default 4 when not configured
- `ratings`: Array of rating objects, one for each value from 1 to maxRating
- Each rating object must have: value (integer 1 to maxRating), label (string, non-empty, max 50 chars), color (string, hex format)
- Rating values must be sequential from 1 to maxRating
- Max rating can only be changed when event is in "created" state

**Default Values**:
- When `ratingConfiguration` is not present: Default scale 1-4 with default labels and colors
- When `maxRating` is not specified: default to 4
- When `ratings` array is not specified: generate default ratings based on maxRating

**Storage**:
- File-based JSON storage: `data/events/{eventId}/config.json`
- Managed via `FileDataRepository` extending `DataRepository` interface
- Part of event configuration object

**Example** (extended Event):
```json
{
  "eventId": "aB3xY9mK",
  "name": "Summer Wine Tasting",
  "typeOfItem": "wine",
  "state": "created",
  "ratingConfiguration": {
    "maxRating": 4,
    "ratings": [
      { "value": 1, "label": "What is this crap?", "color": "#FF3B30" },
      { "value": 2, "label": "Meh...", "color": "#FFCC00" },
      { "value": 3, "label": "Not bad...", "color": "#34C759" },
      { "value": 4, "label": "Give me more...", "color": "#28A745" }
    ]
  },
  "administrators": {
    "owner@example.com": {
      "assignedAt": "2025-01-27T10:30:00.000Z",
      "owner": true
    }
  },
  "users": {
    "owner@example.com": {
      "registeredAt": "2025-01-27T10:30:00.000Z"
    }
  },
  "pin": "456789",
  "pinGeneratedAt": "2025-01-27T10:30:00.000Z",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T11:00:00.000Z"
}
```

### Rating Configuration

Represents the configuration settings for how items are rated in a blind tasting event. Stored as part of Event entity.

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `maxRating` | integer | Yes | Range 2-4 (inclusive), default 4 | Maximum rating value, determines scale from 1 to maxRating |
| `ratings` | array of rating objects | Yes | One rating per value 1 to maxRating, sequential | Array of rating level configurations |

**Rating Object Structure**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `value` | integer | Yes | Range 1 to maxRating, sequential | The rating value (1 = lowest/worst, maxRating = highest/best) |
| `label` | string | Yes | Non-empty, max 50 characters | Display text for this rating level |
| `color` | string | Yes | Hex format (e.g., #FF3B30) | Color code for this rating level, stored as hex |

**Rating Rules**:
- Ratings are numbered sequentially from 1 (lowest/worst) to maxRating (highest/best)
- Rating values are integers (1, 2, 3, ..., N where N = maxRating)
- Each rating level must have a unique value
- Labels are displayed to users when rating items
- Colors are used for visual representation in the rating interface

**Relationships**:
- One-to-one with Event (each event has one rating configuration)
- Rating configuration determines how users can rate items in the event

### Default Rating Presets

Predefined rating configurations for different scales. Used when rating configuration is not set or when resetting to defaults.

**Scale 1-2**:
```json
[
  { "value": 1, "label": "Poor", "color": "#FF3B30" },
  { "value": 2, "label": "Good", "color": "#28A745" }
]
```

**Scale 1-3**:
```json
[
  { "value": 1, "label": "Poor", "color": "#FF3B30" },
  { "value": 2, "label": "Average", "color": "#FFCC00" },
  { "value": 3, "label": "Good", "color": "#34C759" }
]
```

**Scale 1-4** (default):
```json
[
  { "value": 1, "label": "What is this crap?", "color": "#FF3B30" },
  { "value": 2, "label": "Meh...", "color": "#FFCC00" },
  { "value": 3, "label": "Not bad...", "color": "#34C759" },
  { "value": 4, "label": "Give me more...", "color": "#28A745" }
]
```

## Validation Rules

### Max Rating Validation

1. **Required**: maxRating must be provided when ratingConfiguration is present
2. **Type**: Must be an integer
3. **Range**: Must be between 2 and 4 (inclusive)
4. **Default**: If not provided, default to 4
5. **State Restriction**: Can only be changed when event is in "created" state

**Validation Logic**:
```javascript
if (maxRating === undefined || maxRating === null) {
  maxRating = 4; // default
}
if (!Number.isInteger(maxRating) || maxRating < 2 || maxRating > 4) {
  throw new Error('Maximum rating must be an integer between 2 and 4');
}
// Check event state if maxRating is being changed
if (isMaxRatingChange && event.state !== 'created') {
  throw new Error('Maximum rating can only be changed when event is in "created" state');
}
```

### Rating Array Validation

1. **Type**: Must be an array
2. **Length**: Must contain exactly maxRating items (one for each value 1 to maxRating)
3. **Values**: Each rating must have value matching its position (1, 2, 3, ..., maxRating)
4. **Sequential**: Rating values must be sequential starting from 1
5. **No Duplicates**: Each rating value must be unique

**Validation Logic**:
```javascript
if (!Array.isArray(ratings)) {
  throw new Error('Ratings must be an array');
}
if (ratings.length !== maxRating) {
  throw new Error(`Ratings array must contain exactly ${maxRating} items`);
}
const values = ratings.map(r => r.value).sort((a, b) => a - b);
if (values.length !== maxRating || values[0] !== 1 || values[maxRating - 1] !== maxRating) {
  throw new Error('Rating values must be sequential from 1 to maxRating');
}
```

### Label Validation

1. **Required**: Label must be provided for each rating
2. **Type**: Must be a string
3. **Non-empty**: Label cannot be empty or whitespace-only
4. **Length**: Maximum 50 characters

**Validation Logic**:
```javascript
if (!label || typeof label !== 'string') {
  throw new Error('Label is required and must be a string');
}
const trimmed = label.trim();
if (trimmed.length === 0) {
  throw new Error('Label cannot be empty');
}
if (trimmed.length > 50) {
  throw new Error('Label cannot exceed 50 characters');
}
```

### Color Validation

1. **Required**: Color must be provided for each rating
2. **Type**: Must be a string
3. **Format**: Must be valid hex color code (#RRGGBB or #RGB)
4. **Storage**: All colors stored as hex format

**Validation Logic**:
```javascript
if (!color || typeof color !== 'string') {
  throw new Error('Color is required and must be a string');
}
// Accept hex, RGB, or HSL input, convert to hex for storage
const hexColor = convertColorToHex(color);
if (!hexColor) {
  throw new Error('Invalid color format. Must be hex (#RRGGBB), RGB (rgb(r,g,b)), or HSL (hsl(h,s%,l%))');
}
// Validate hex format
const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
if (!hexRegex.test(hexColor)) {
  throw new Error('Color must be a valid hex color code');
}
```

### Color Format Conversion

**Input Formats Accepted**:
- Hex: `#FF3B30` or `#F30`
- RGB: `rgb(255, 59, 48)`
- HSL: `hsl(4, 100%, 60%)`

**Output Format**:
- Always stored as hex: `#FF3B30`

**Conversion Logic**:
```javascript
function convertColorToHex(input) {
  // If already hex format, validate and return
  if (input.startsWith('#')) {
    // Expand short hex (#RGB → #RRGGBB)
    if (input.length === 4) {
      return `#${input[1]}${input[1]}${input[2]}${input[2]}${input[3]}${input[3]}`.toUpperCase();
    }
    return input.toUpperCase();
  }
  
  // Parse RGB format
  const rgbMatch = input.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }
  
  // Parse HSL format (convert to RGB first, then to hex)
  const hslMatch = input.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (hslMatch) {
    // HSL to RGB conversion logic
    // ... (implementation details)
    return hexColor;
  }
  
  return null; // Invalid format
}
```

## Data Relationships

```
Event (1) ──<has>── (1) Rating Configuration
Rating Configuration (1) ──<defines>── (*) Rating Levels
```

- Each Event has one Rating Configuration (optional, defaults applied if missing)
- Rating Configuration defines Rating Levels (1 to maxRating)
- Rating Levels determine how users can rate items in the event

## Data Access Patterns

### Get Rating Configuration

1. Retrieve event by eventId
2. Extract ratingConfiguration object
3. Apply defaults if missing: Generate default ratings for maxRating 4
4. Return ratingConfiguration object

### Update Rating Configuration

1. Validate requester is administrator
2. Retrieve current event
3. Check optimistic locking (event updatedAt timestamp)
4. Get current ratingConfiguration (or defaults)
5. If maxRating is being changed:
   - Validate event is in "created" state
   - Validate new maxRating (2-4)
   - Generate new ratings array based on new maxRating (preserve custom labels/colors where possible, use defaults for new ratings)
6. Validate ratings array (length, sequential values, labels, colors)
7. Update event with new ratingConfiguration
8. Save event file atomically
9. Return updated ratingConfiguration

### Reset to Defaults

1. Validate requester is administrator
2. Retrieve current event
3. Get current maxRating (or default 4)
4. Generate default ratings for current maxRating
5. Update event with default ratingConfiguration
6. Save event file atomically
7. Return updated ratingConfiguration

### Generate Default Ratings

1. Look up default preset for maxRating (2, 3, or 4)
2. Return array of default rating objects with labels and colors

## Storage Implementation

### Event Data (Extended)

**File Structure** (unchanged):
```
data/
└── events/
    ├── aB3xY9mK/
    │   └── config.json
    ├── xY9mKaB3/
    │   └── config.json
    └── ...
```

**File Format** (modified):
- JSON files, one per event
- Filename: `{eventId}/config.json`
- Content: Event object with optional `ratingConfiguration` object

**Backward Compatibility**:
- Events without `ratingConfiguration` use defaults (scale 1-4 with default labels/colors)
- No migration required (lazy defaults on read)

## Security Considerations

**Administrator Authorization**:
- Only administrators can get/update rating configuration
- Authorization checked on both frontend and backend
- JWT token provides authenticated user email

**Input Validation**:
- Server-side validation required (client-side for UX only)
- Range validation prevents invalid data
- Color format validation prevents injection issues
- Label length validation prevents excessive data

**State Restrictions**:
- Max rating changes only allowed in "created" state
- Server validates event state on save
- Prevents invalid configuration changes after event starts

**Optimistic Locking**:
- Check event updatedAt timestamp before save
- Reject with 409 Conflict if event was modified by another admin
- Prevents concurrent modification conflicts

**Atomic Updates**:
- Single file write ensures ratingConfiguration updated atomically
- No partial updates possible
- File system provides atomicity at OS level

