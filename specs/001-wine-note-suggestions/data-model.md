# Data Model: Wine Note Suggestions

**Feature**: Wine Note Suggestions  
**Date**: 2025-01-27  
**Purpose**: Define data structures and relationships for wine note suggestions feature

## Entities

### Event (Extended)

Represents a user-created event with note suggestions configuration. Extends the Event entity from previous features, specifically the rating configuration.

**Modified Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `ratingConfiguration.noteSuggestionsEnabled` | boolean | No | Default: true for wine events | Whether note suggestions are enabled for this event |

**Rating Configuration Object Structure** (extended):
```json
{
  "maxRating": 4,
  "ratings": [
    { "value": 1, "label": "What is this crap?", "color": "#FF3B30" },
    { "value": 2, "label": "Meh...", "color": "#FFCC00" },
    { "value": 3, "label": "Not bad...", "color": "#34C759" },
    { "value": 4, "label": "Give me more...", "color": "#28A745" }
  ],
  "noteSuggestionsEnabled": true
}
```

**Note Suggestions Configuration Rules**:
- `noteSuggestionsEnabled`: Boolean, optional
- Default value: `true` (enabled) for wine events when setting is missing
- Default value: `true` (enabled) for new wine events
- Only applicable to events where `typeOfItem === "wine"`
- Can only be changed when event is in "created" state
- Stored as part of `ratingConfiguration` object

**Default Values**:
- When `noteSuggestionsEnabled` is not present and `typeOfItem === "wine"`: default to `true`
- When `noteSuggestionsEnabled` is not present and `typeOfItem !== "wine"`: setting is not applicable (toggle not shown)

**Storage**:
- File-based JSON storage: `data/events/{eventId}/config.json`
- Managed via `FileDataRepository` extending `DataRepository` interface
- Part of event configuration object, nested in `ratingConfiguration`

**Example** (extended Event with note suggestions):
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
    ],
    "noteSuggestionsEnabled": true
  },
  "administrator": "owner@example.com",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T11:00:00.000Z"
}
```

### Quote Database

Represents the static collection of quotes organized by rating level and quote type. Stored in `quotes.json` file in the project root directory.

**Structure**:
```json
{
  "1": {
    "snarky": [
      { "id": "1-snarky-1", "text": "This wine tastes like..." },
      { "id": "1-snarky-2", "text": "If regret had a flavor..." }
    ],
    "poetic": [
      { "id": "1-poetic-1", "text": "A delicate dance..." },
      { "id": "1-poetic-2", "text": "Like morning dew..." }
    ],
    "haiku": [
      { "id": "1-haiku-1", "text": "Bitter notes linger..." },
      { "id": "1-haiku-2", "text": "Empty glass reflects..." }
    ]
  },
  "2": {
    "snarky": [...],
    "poetic": [...],
    "haiku": [...]
  }
}
```

**Attributes**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `ratingLevel` | string | Yes | Numeric string ("1", "2", "3", "4") | Rating level key |
| `quoteType` | string | Yes | One of: "snarky", "poetic", "haiku" | Type of quote |
| `quotes` | array | Yes | Array of quote objects | List of quotes for this rating level and type |

**Quote Object Structure**:

| Attribute | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `id` | string | Yes | Unique identifier | Quote identifier (e.g., "1-snarky-1") |
| `text` | string | Yes | Non-empty, max 500 characters | Quote text content |

**Quote Database Rules**:
- Organized hierarchically: rating level → quote type → array of quotes
- Rating levels are string keys ("1", "2", "3", "4") matching rating values
- Quote types are consistent across rating levels (snarky, poetic, haiku)
- Each quote has unique ID combining rating level, type, and index
- Quotes are static content, not user-generated
- File is read-only from application perspective

**Storage**:
- Static file: `quotes.json` in project root directory
- Served via backend API endpoint: `GET /api/quotes`
- Cached in frontend service after first load
- File size: ~300KB (estimated)

**Access Pattern**:
1. Frontend requests quotes via `GET /api/quotes`
2. Backend reads and returns quotes.json
3. Frontend caches parsed JSON in quoteService
4. Components access quotes via `useQuotes()` hook
5. Random selection happens client-side per rating level selection

### Note Suggestion (Transient)

Represents a selectable text suggestion displayed to users in the rating form. This is a transient UI entity, not persisted.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The suggestion text to display and insert |
| `quoteType` | string | No | Internal: quote type (for debugging, not displayed) |
| `ratingLevel` | number | Yes | The rating level this suggestion corresponds to |

**Lifecycle**:
- Created: When user selects a rating level, system randomly selects one quote from each quote type
- Displayed: Shown as clickable button/chip in rating form UI
- Used: When user clicks suggestion, text is appended to note field
- Destroyed: When user changes rating level or closes rating form

**Relationships**:
- Derived from: Quote Database (one suggestion per quote type per rating level)
- Used by: RatingForm component
- Appends to: Note field in rating submission

**Example**:
```javascript
{
  text: "This wine tastes like someone tried to make grape juice but forgot the grapes.",
  quoteType: "snarky",  // Internal only, not displayed
  ratingLevel: 1
}
```

## Validation Rules

### Note Suggestions Toggle Validation

1. **Type**: Must be boolean if present
2. **Applicability**: Only valid for events where `typeOfItem === "wine"`
3. **State Restriction**: Can only be changed when event is in "created" state
4. **Default**: If missing and `typeOfItem === "wine"`, default to `true`

**Validation Logic**:
```javascript
// When reading rating configuration
if (event.typeOfItem === 'wine') {
  const noteSuggestionsEnabled = ratingConfiguration.noteSuggestionsEnabled ?? true;
}

// When updating rating configuration
if (event.state !== 'created') {
  throw new Error('Note suggestions toggle can only be changed when event is in "created" state');
}

if (event.typeOfItem !== 'wine') {
  throw new Error('Note suggestions are only available for wine events');
}
```

### Quote Selection Validation

1. **Rating Level**: Must match a rating value from 1 to maxRating
2. **Quote Type**: Must exist in quotes database for that rating level
3. **Empty Arrays**: If quote type array is empty for a rating level, skip that type (no suggestion shown)
4. **Missing Rating Level**: If rating level has no quotes, show no suggestions

**Selection Logic**:
```javascript
const getSuggestions = (quotes, ratingLevel) => {
  const levelQuotes = quotes[String(ratingLevel)];
  if (!levelQuotes) return [];
  
  const suggestions = [];
  const quoteTypes = ['snarky', 'poetic', 'haiku'];
  
  quoteTypes.forEach(type => {
    const typeQuotes = levelQuotes[type];
    if (typeQuotes && typeQuotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * typeQuotes.length);
      suggestions.push({
        text: typeQuotes[randomIndex].text,
        quoteType: type,
        ratingLevel
      });
    }
  });
  
  return suggestions;
};
```

## State Transitions

### Note Suggestions Toggle

- **Initial State**: `noteSuggestionsEnabled: true` (for new wine events)
- **Migration State**: `noteSuggestionsEnabled: undefined` → treated as `true` (for existing wine events)
- **User Action**: Toggle on/off (only when event state === "created")
- **Final State**: `noteSuggestionsEnabled: boolean` (persisted in ratingConfiguration)

## Relationships

- **Event** → **Rating Configuration** → **Note Suggestions Enabled**: One-to-one relationship
- **Quote Database** → **Note Suggestions**: One-to-many (one suggestion per quote type per rating level)
- **Note Suggestions** → **Note Field**: Many-to-one (multiple suggestions can be added to one note)
