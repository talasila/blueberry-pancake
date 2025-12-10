# Quick Start: Ratings Configuration

**Feature**: Ratings Configuration  
**Date**: 2025-01-27  
**Purpose**: Quick reference guide for implementing and testing rating configuration functionality

## Overview

This feature enables event administrators to configure how items are rated in blind tasting events. Administrators can set the maximum rating value (2-4), customize labels (max 50 characters) and colors (hex format) for each rating level, and reset to default values. The maximum rating can only be changed when the event is in "created" state, while labels and colors can be customized at any time.

## Key Changes

### Backend

1. **EventService Extensions** (`backend/src/services/EventService.js`):
   - `getRatingConfiguration(eventId)` - Get rating configuration (with defaults)
   - `updateRatingConfiguration(eventId, config, requesterEmail)` - Update rating configuration
   - `validateRatingConfiguration(config, eventState)` - Validate rating configuration
   - `generateDefaultRatings(maxRating)` - Generate default ratings for a given maxRating
   - `convertColorToHex(colorInput)` - Convert hex/RGB/HSL input to hex format
   - `validateMaxRatingChange(eventState)` - Validate event state allows max rating change

2. **API Routes** (`backend/src/api/events.js`):
   - `GET /api/events/:eventId/rating-configuration` - Get rating configuration
   - `PATCH /api/events/:eventId/rating-configuration` - Update rating configuration

3. **Data Model**:
   - Add `ratingConfiguration` object to event config
   - Structure: `{ maxRating: integer (2-4), ratings: array of rating objects }`
   - Defaults: Scale 1-4 with default labels and colors

### Frontend

1. **EventAdminPage** (`frontend/src/pages/EventAdminPage.jsx`):
   - Add "Ratings Configuration" accordion section
   - Max rating input (number, range 2-4, disabled when event not in "created" state)
   - Rating level editor for each rating (label input, color picker)
   - "Reset to Defaults" button
   - Save button with validation feedback (on blur and submit)

2. **API Client** (`frontend/src/services/apiClient.js`):
   - `getRatingConfiguration(eventId)` - Fetch rating configuration
   - `updateRatingConfiguration(eventId, config)` - Update rating configuration

3. **Color Picker Component** (if needed):
   - Use HTML5 `<input type="color">` for color selection
   - Optional hex text input for manual entry
   - Display color preview

## Implementation Steps

### Step 1: Backend - Update EventService

1. Add default rating presets constant:
   ```javascript
   const DEFAULT_RATING_PRESETS = {
     2: [
       { value: 1, label: "Poor", color: "#FF3B30" },
       { value: 2, label: "Good", color: "#28A745" }
     ],
     3: [
       { value: 1, label: "Poor", color: "#FF3B30" },
       { value: 2, label: "Average", color: "#FFCC00" },
       { value: 3, label: "Good", color: "#34C759" }
     ],
     4: [
       { value: 1, label: "What is this crap?", color: "#FF3B30" },
       { value: 2, label: "Meh...", color: "#FFCC00" },
       { value: 3, label: "Not bad...", color: "#34C759" },
       { value: 4, label: "Give me more...", color: "#28A745" }
     ]
   };
   ```

2. Implement `getRatingConfiguration(eventId)`:
   - Get event
   - Return ratingConfiguration or generate defaults for maxRating 4

3. Implement `updateRatingConfiguration(eventId, config, requesterEmail)`:
   - Validate requester is administrator
   - Check optimistic locking (event updatedAt)
   - If maxRating changed, validate event is in "created" state
   - Validate maxRating (2-4)
   - If maxRating changed, generate new ratings array
   - Validate ratings array (length, sequential values, labels, colors)
   - Update event with new ratingConfiguration
   - Save event

4. Implement `convertColorToHex(colorInput)`:
   - Accept hex, RGB, or HSL input
   - Convert to hex format
   - Return hex color code

5. Implement `generateDefaultRatings(maxRating)`:
   - Look up default preset for maxRating
   - Return array of default rating objects

### Step 2: Backend - Add API Routes

1. Add `GET /api/events/:eventId/rating-configuration`:
   - Require authentication
   - Check administrator authorization
   - Call `eventService.getRatingConfiguration(eventId)`
   - Return rating configuration

2. Add `PATCH /api/events/:eventId/rating-configuration`:
   - Require authentication
   - Check administrator authorization
   - Call `eventService.updateRatingConfiguration(eventId, config, requesterEmail)`
   - Handle validation errors (400)
   - Handle optimistic locking conflicts (409)
   - Handle state restriction errors (400)
   - Return updated rating configuration

### Step 3: Frontend - Update API Client

1. Add `getRatingConfiguration(eventId)`:
   ```javascript
   async getRatingConfiguration(eventId) {
     return this.get(`/events/${eventId}/rating-configuration`);
   }
   ```

2. Add `updateRatingConfiguration(eventId, config)`:
   ```javascript
   async updateRatingConfiguration(eventId, config) {
     return this.patch(`/events/${eventId}/rating-configuration`, config);
   }
   ```

### Step 4: Frontend - Add Ratings Configuration UI

1. Add state variables in EventAdminPage:
   - `maxRating`, `ratings`, `isSaving`, `error`, `success`

2. Add "Ratings Configuration" accordion section:
   - Max rating input (disabled when event.state !== 'created')
   - Rating level editor for each rating:
     - Label input (max 50 chars, validate on blur and submit)
     - Color picker (HTML5 input type="color" + optional hex text input)
     - Color preview
   - "Reset to Defaults" button
   - Save button

3. Implement validation:
   - Client-side validation on blur and submit
   - Display validation errors
   - Disable save button when invalid

4. Handle optimistic locking conflicts:
   - Display error message on 409 Conflict
   - Prompt user to refresh and retry

## Testing Checklist

### Backend Unit Tests

- [ ] `getRatingConfiguration` returns defaults when not configured
- [ ] `getRatingConfiguration` returns existing configuration
- [ ] `updateRatingConfiguration` validates maxRating range (2-4)
- [ ] `updateRatingConfiguration` validates event state for maxRating changes
- [ ] `updateRatingConfiguration` validates label (non-empty, max 50 chars)
- [ ] `updateRatingConfiguration` validates color format
- [ ] `updateRatingConfiguration` generates new ratings when maxRating changes
- [ ] `convertColorToHex` converts hex input correctly
- [ ] `convertColorToHex` converts RGB input correctly
- [ ] `convertColorToHex` converts HSL input correctly
- [ ] `generateDefaultRatings` returns correct defaults for maxRating 2, 3, 4
- [ ] Optimistic locking rejects concurrent updates

### Backend Integration Tests

- [ ] GET endpoint returns rating configuration
- [ ] GET endpoint requires authentication
- [ ] GET endpoint requires administrator authorization
- [ ] PATCH endpoint updates maxRating successfully
- [ ] PATCH endpoint updates ratings array successfully
- [ ] PATCH endpoint rejects maxRating change when event not in "created" state
- [ ] PATCH endpoint validates maxRating range
- [ ] PATCH endpoint validates label length
- [ ] PATCH endpoint validates color format
- [ ] PATCH endpoint handles optimistic locking conflicts (409)

### Frontend Unit Tests

- [ ] Rating configuration section displays correctly
- [ ] Max rating input disabled when event not in "created" state
- [ ] Label validation works on blur
- [ ] Label validation works on submit
- [ ] Color picker updates color preview
- [ ] Reset to defaults restores default values
- [ ] Save button disabled when invalid
- [ ] Error messages display correctly
- [ ] Optimistic locking error handled correctly

### E2E Tests

- [ ] Admin can view rating configuration
- [ ] Admin can change max rating (when event in "created" state)
- [ ] Admin cannot change max rating (when event not in "created" state)
- [ ] Admin can customize labels
- [ ] Admin can customize colors
- [ ] Admin can reset to defaults
- [ ] Validation errors display correctly
- [ ] Concurrent edit conflict handled correctly

## Common Issues

### Issue: Color picker not displaying correctly

**Solution**: Ensure HTML5 color input is supported in target browsers. For older browsers, provide fallback hex text input.

### Issue: Optimistic locking conflicts

**Solution**: Display clear error message prompting user to refresh and retry. Consider auto-refresh on conflict.

### Issue: Max rating change rejected when event state changes

**Solution**: Server validates event state on save. Client should disable max rating input when event not in "created" state, but server validation is the source of truth.

### Issue: Color format conversion fails

**Solution**: Implement robust color parsing with fallback to hex validation. Accept common color formats but store as hex.

## Next Steps

After implementing this feature:

1. Test all validation scenarios
2. Test optimistic locking with concurrent edits
3. Test state restrictions for max rating changes
4. Verify color picker works on mobile devices
5. Update user rating interface (future feature) to use configured labels and colors

