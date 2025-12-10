# Quick Start: Wine Note Suggestions

**Feature**: Wine Note Suggestions  
**Date**: 2025-01-27  
**Purpose**: Quick reference guide for implementing and testing wine note suggestions functionality

## Overview

This feature adds contextual note suggestions for wine rating events. When users select a rating level, the system displays one randomly selected suggestion from each quote type (snarky, poetic, haiku) for that rating level. Users can click suggestions to add them to their note field. Event administrators can enable/disable this feature via a toggle in the Ratings Configuration section.

## Key Changes

### Backend

1. **EventService Extensions** (`backend/src/services/EventService.js`):
   - Extend `getRatingConfiguration(eventId)` - Return `noteSuggestionsEnabled` field (defaults to true for wine events)
   - Extend `updateRatingConfiguration(eventId, config, requesterEmail, expectedUpdatedAt)` - Accept and validate `noteSuggestionsEnabled`
   - Add validation: `noteSuggestionsEnabled` can only be changed when event is in "created" state
   - Add validation: `noteSuggestionsEnabled` only applicable to wine events

2. **API Routes** (`backend/src/api/events.js`):
   - Extend `GET /api/events/:eventId/rating-configuration` - Include `noteSuggestionsEnabled` in response
   - Extend `PATCH /api/events/:eventId/rating-configuration` - Accept `noteSuggestionsEnabled` in request body

3. **New API Route** (`backend/src/api/quotes.js` - NEW FILE):
   - `GET /api/quotes` - Return quotes.json file content
   - Handle errors gracefully (missing/corrupted file)

4. **Data Model**:
   - Extend `ratingConfiguration` object to include `noteSuggestionsEnabled: boolean`
   - Default: `true` for wine events when missing
   - Storage: `data/events/{eventId}/config.json`

### Frontend

1. **New Service** (`frontend/src/services/quoteService.js` - NEW FILE):
   - Load quotes from `GET /api/quotes`
   - Cache quotes in memory after first load
   - Provide `getQuotes()`, `getSuggestionsForRating(ratingLevel)` methods
   - Handle errors gracefully (return empty object if quotes unavailable)

2. **New Hook** (`frontend/src/hooks/useQuotes.js` - NEW FILE):
   - React hook to access quotes service
   - Returns `{ quotes, loading, error }`
   - Handles loading state and error handling

3. **RatingForm Component** (`frontend/src/components/RatingForm.jsx`):
   - Add props: `eventType`, `noteSuggestionsEnabled`
   - Load quotes via `useQuotes()` hook
   - Display suggestions when:
     - `eventType === "wine"`
     - `noteSuggestionsEnabled === true`
     - Rating level is selected
   - Show one suggestion per quote type (snarky, poetic, haiku)
   - Handle suggestion click: append to note with proper spacing
   - Handle character limit: add partial text if needed
   - Handle missing quotes gracefully (no suggestions shown)

4. **EventAdminPage** (`frontend/src/pages/EventAdminPage.jsx`):
   - Add toggle in Ratings Configuration accordion section
   - Only show toggle for wine events (`typeOfItem === "wine"`)
   - Toggle disabled when event state !== "created"
   - Default toggle to `true` for new wine events
   - Include `noteSuggestionsEnabled` in rating configuration save

5. **EventPage** (`frontend/src/pages/EventPage.jsx`):
   - Pass `event.typeOfItem` to RatingDrawer
   - Pass `noteSuggestionsEnabled` from rating config to RatingDrawer

6. **RatingDrawer** (`frontend/src/components/RatingDrawer.jsx`):
   - Pass `eventType` and `noteSuggestionsEnabled` to RatingForm

## Implementation Checklist

### Backend
- [ ] Create `backend/src/api/quotes.js` with `GET /api/quotes` endpoint
- [ ] Extend `EventService.getRatingConfiguration()` to include `noteSuggestionsEnabled`
- [ ] Extend `EventService.updateRatingConfiguration()` to handle `noteSuggestionsEnabled`
- [ ] Add validation for `noteSuggestionsEnabled` (state, event type)
- [ ] Update rating configuration API to include `noteSuggestionsEnabled` in responses
- [ ] Add error handling for missing/corrupted quotes.json

### Frontend
- [ ] Create `frontend/src/services/quoteService.js` with caching
- [ ] Create `frontend/src/hooks/useQuotes.js` hook
- [ ] Extend `RatingForm` to display suggestions
- [ ] Add suggestion click handlers with text insertion logic
- [ ] Add toggle to `EventAdminPage` Ratings Configuration section
- [ ] Update `EventPage` and `RatingDrawer` to pass required props
- [ ] Add error handling for missing quotes (graceful degradation)

## Testing Checklist

### Unit Tests
- [ ] `quoteService.getQuotes()` - loads and caches quotes
- [ ] `quoteService.getSuggestionsForRating()` - returns random suggestions
- [ ] `EventService.getRatingConfiguration()` - includes `noteSuggestionsEnabled` with defaults
- [ ] `EventService.updateRatingConfiguration()` - validates `noteSuggestionsEnabled`
- [ ] Text insertion logic - spacing and character limit handling
- [ ] Random quote selection - returns one per quote type

### Component Tests
- [ ] `RatingForm` displays suggestions when conditions met
- [ ] `RatingForm` hides suggestions when rating not selected
- [ ] `RatingForm` hides suggestions for non-wine events
- [ ] `RatingForm` hides suggestions when `noteSuggestionsEnabled === false`
- [ ] Suggestion click appends text correctly
- [ ] Character limit handling (partial addition)
- [ ] Toggle in `EventAdminPage` only shows for wine events
- [ ] Toggle disabled when event state !== "created"

### Integration Tests
- [ ] `GET /api/quotes` returns quotes.json content
- [ ] `GET /api/quotes` handles missing file gracefully
- [ ] Rating configuration includes `noteSuggestionsEnabled`
- [ ] Rating configuration update saves `noteSuggestionsEnabled`
- [ ] Rating configuration update validates state restriction
- [ ] Rating configuration update validates event type

### E2E Tests
- [ ] User selects rating → suggestions appear
- [ ] User clicks suggestion → text added to note
- [ ] User changes rating → suggestions update
- [ ] Admin toggles note suggestions off → suggestions hidden
- [ ] Admin toggles note suggestions on → suggestions appear
- [ ] Non-wine event → no toggle shown
- [ ] Event in "started" state → toggle disabled

## Key Files to Modify

### Backend
- `backend/src/services/EventService.js` - Extend rating configuration methods
- `backend/src/api/events.js` - Extend rating configuration endpoints
- `backend/src/api/quotes.js` - NEW: Quotes endpoint

### Frontend
- `frontend/src/components/RatingForm.jsx` - Add suggestions display
- `frontend/src/pages/EventAdminPage.jsx` - Add toggle
- `frontend/src/pages/EventPage.jsx` - Pass props
- `frontend/src/components/RatingDrawer.jsx` - Pass props
- `frontend/src/services/quoteService.js` - NEW: Quotes service
- `frontend/src/hooks/useQuotes.js` - NEW: Quotes hook

## Data Flow

1. **Admin Toggles Feature**:
   - Admin opens Event Admin → Ratings Configuration
   - Toggle `noteSuggestionsEnabled` on/off
   - Save → `PATCH /api/events/:eventId/rating-configuration`
   - Backend validates and saves to event config

2. **User Views Suggestions**:
   - User opens rating form for wine event
   - RatingForm checks: `eventType === "wine" && noteSuggestionsEnabled === true`
   - RatingForm loads quotes via `useQuotes()` hook
   - User selects rating level
   - RatingForm displays one random suggestion per quote type

3. **User Adds Suggestion**:
   - User clicks suggestion button
   - RatingForm appends suggestion text to note field
   - Handles spacing and character limit
   - User can submit rating with suggested text

## Error Scenarios

1. **quotes.json Missing**:
   - Backend returns 500 error
   - Frontend quoteService catches error, returns empty object
   - RatingForm shows no suggestions (graceful degradation)

2. **quotes.json Corrupted**:
   - Backend JSON parse fails
   - Backend returns 500 error
   - Frontend handles same as missing file

3. **Toggle Changed After Event Started**:
   - Backend validates event state
   - Returns 400 error: "can only be changed when event is in 'created' state"
   - Frontend shows error message

4. **Toggle Set for Non-Wine Event**:
   - Backend validates event type
   - Returns 400 error: "Note suggestions are only available for wine events"
   - Frontend shows error message

## Performance Considerations

- Quotes loaded once and cached in frontend service
- Random selection is O(1) operation
- Suggestions update immediately on rating change (no API call)
- Meets 1-second display target (SC-001)

## Migration Notes

- Existing wine events: `noteSuggestionsEnabled` missing → treated as `true`
- No data migration needed: handled in code at read time
- Backward compatible: existing API clients continue to work
