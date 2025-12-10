# Research: Wine Note Suggestions

**Feature**: Wine Note Suggestions  
**Date**: 2025-01-27  
**Purpose**: Document research and design decisions for wine note suggestions feature

## Quotes.json Access Strategy

**Decision**: Serve quotes.json as static file via backend API endpoint, load once and cache in frontend service.

**Rationale**:
- Quotes.json is large (~300KB) and should be loaded once, not on every rating form render
- Backend can serve file with proper caching headers
- Frontend service can cache parsed JSON in memory
- Follows existing pattern of API-based data access
- Allows graceful error handling if file is missing

**Alternatives Considered**:
- Import quotes.json directly in frontend code - Rejected: Large file would bloat bundle size, no runtime flexibility
- Load quotes.json via public folder - Rejected: No error handling, harder to cache, security concerns
- Backend API endpoint - **Selected**: Best balance of performance, error handling, and flexibility

**Implementation**:
- Create `GET /api/quotes` endpoint in backend
- Create `quoteService.js` in frontend to load and cache quotes
- Use React hook `useQuotes()` for component access
- Cache quotes in service singleton to avoid repeated API calls

## Random Quote Selection Strategy

**Decision**: Use `Math.random()` to select one quote from each quote type array for the selected rating level.

**Rationale**:
- Simple, performant O(1) operation
- No state management needed (truly random each time)
- Meets requirement for random selection per spec clarification
- No need for seed or deterministic selection

**Alternatives Considered**:
- Deterministic selection (first quote, round-robin) - Rejected: Spec requires random selection
- Weighted random selection - Rejected: Unnecessary complexity, no requirement for weighting
- Shuffle and pick first - Rejected: More complex than needed, Math.random() is sufficient

**Implementation**:
```javascript
const getRandomQuote = (quotes) => {
  if (!quotes || quotes.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};
```

## Toggle Setting Storage

**Decision**: Store `noteSuggestionsEnabled` boolean as part of `ratingConfiguration` object in event config.

**Rationale**:
- Follows existing pattern (ratingConfiguration already exists)
- Logical grouping: note suggestions are part of rating experience
- Single API call to get/update rating configuration
- Consistent with other rating-related settings
- Default value handling: missing = enabled (true) for migration

**Alternatives Considered**:
- Separate endpoint for note suggestions toggle - Rejected: Adds unnecessary API complexity
- Store in separate event property - Rejected: Breaks logical grouping, requires separate API
- Store in itemConfiguration - Rejected: Not related to items, related to rating experience

**Implementation**:
```json
{
  "ratingConfiguration": {
    "maxRating": 4,
    "ratings": [...],
    "noteSuggestionsEnabled": true
  }
}
```

## UI Component Patterns for Suggestions

**Decision**: Display suggestions as clickable button/chip components below the note textarea, using shadcn/ui Button component with variant="outline".

**Rationale**:
- Consistent with existing UI patterns (shadcn/ui components)
- Clear visual hierarchy: suggestions below input field
- Button variant="outline" provides good visual distinction
- Clickable area is clear and accessible
- Can be styled with Tailwind CSS for spacing and layout

**Alternatives Considered**:
- Inline suggestions within textarea - Rejected: Clutters input field, poor UX
- Dropdown menu of suggestions - Rejected: Extra click required, less discoverable
- Autocomplete-style suggestions - Rejected: More complex, not required by spec
- Button chips below textarea - **Selected**: Clear, accessible, follows existing patterns

**Implementation**:
- Use shadcn/ui Button component
- Display in flex/grid layout below textarea
- Show one suggestion per quote type (snarky, poetic, haiku)
- Handle click to append to note with proper spacing

## Error Handling for Missing/Corrupted Quotes.json

**Decision**: Graceful degradation - if quotes.json is missing or corrupted, hide suggestions but keep rating form fully functional.

**Rationale**:
- Meets FR-011 requirement for graceful degradation
- Rating form is primary functionality, suggestions are enhancement
- User can still rate items without suggestions
- No error messages needed (silent failure for enhancement feature)

**Alternatives Considered**:
- Show error message to user - Rejected: Unnecessary, suggestions are optional enhancement
- Disable rating form - Rejected: Violates graceful degradation requirement
- Fallback to default quotes - Rejected: No default quotes defined, adds complexity

**Implementation**:
- Try-catch around quotes.json loading
- If load fails, set quotes to null/empty in service
- RatingForm checks if quotes available before displaying suggestions
- No UI error state, just no suggestions displayed

## Quote Type Consistency Handling

**Decision**: Display suggestions only for quote types that exist for the selected rating level. If a quote type is missing, skip it (don't show empty suggestion).

**Rationale**:
- Meets FR-013 requirement
- Flexible: handles inconsistent quote types across rating levels
- Better UX: only show suggestions that exist
- No need to pad with empty/placeholder suggestions

**Alternatives Considered**:
- Show placeholder for missing quote types - Rejected: Poor UX, confusing to users
- Require all quote types for all rating levels - Rejected: Too restrictive, not in spec
- Show error for missing quote types - Rejected: Unnecessary, graceful degradation preferred

**Implementation**:
- Filter available quote types for selected rating level
- Only render suggestion buttons for available types
- No special handling needed for missing types

## Text Insertion Formatting

**Decision**: Add space before suggestion only if existing note text doesn't end with whitespace.

**Rationale**:
- Meets spec clarification requirement
- Preserves user formatting (respects existing spacing)
- Prevents double spaces
- Natural text flow

**Implementation**:
```javascript
const appendSuggestion = (note, suggestion) => {
  const needsSpace = note.length > 0 && !/\s$/.test(note);
  return note + (needsSpace ? ' ' : '') + suggestion;
};
```

## Character Limit Handling

**Decision**: Add as much of suggestion text as fits within remaining character limit (partial addition).

**Rationale**:
- Meets spec clarification requirement (Option B)
- Better UX than blocking entirely
- User gets partial value even if full suggestion doesn't fit
- Simple implementation: slice suggestion to fit

**Implementation**:
```javascript
const appendSuggestionWithLimit = (note, suggestion, maxLength) => {
  const remaining = maxLength - note.length;
  if (remaining <= 0) return note;
  const needsSpace = note.length > 0 && !/\s$/.test(note);
  const space = needsSpace ? ' ' : '';
  const available = remaining - space.length;
  const partialSuggestion = suggestion.slice(0, available);
  return note + space + partialSuggestion;
};
```

## Toggle UI Placement

**Decision**: Add toggle in Ratings Configuration accordion section, below the rating levels configuration, above the Save button.

**Rationale**:
- Logical grouping with other rating-related settings
- Follows existing UI pattern (accordion section)
- Clear visual hierarchy
- Consistent with other configuration toggles

**Alternatives Considered**:
- Separate accordion section - Rejected: Too much separation, logically belongs with rating config
- Above rating levels - Rejected: Rating levels are primary, toggle is secondary
- Below Save button - Rejected: Toggle should be part of configuration being saved

**Implementation**:
- Add Switch component from shadcn/ui
- Place in Ratings Configuration accordion
- Only visible for wine events (typeOfItem === "wine")
- Disabled when event state !== "created"

## Migration Strategy for Existing Events

**Decision**: Treat missing `noteSuggestionsEnabled` setting as `true` (enabled) for existing wine events.

**Rationale**:
- Meets spec clarification requirement
- Provides smooth migration: existing events get feature enabled automatically
- Consistent with default for new events
- No migration script needed: handled at read time

**Implementation**:
- In EventService.getRatingConfiguration(), if noteSuggestionsEnabled is undefined and typeOfItem === "wine", return true
- In frontend, if noteSuggestionsEnabled is undefined, default to true for wine events
- No data migration required: handled in code
