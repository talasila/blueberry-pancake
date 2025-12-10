# API Contracts: Wine Note Suggestions

**Feature**: Wine Note Suggestions  
**Date**: 2025-01-27  
**Purpose**: API contract documentation for wine note suggestions feature

## Overview

This feature extends the existing Rating Configuration API and adds a new Quotes API endpoint. The rating configuration API is extended to include `noteSuggestionsEnabled` boolean field. A new quotes endpoint provides access to the static quotes database.

## Extended Endpoints

### Rating Configuration API (Extended)

The existing rating configuration endpoints are extended to include `noteSuggestionsEnabled`:

- `GET /api/events/{eventId}/rating-configuration` - Now returns `noteSuggestionsEnabled` field
- `PATCH /api/events/{eventId}/rating-configuration` - Now accepts `noteSuggestionsEnabled` in request body

See `rating-configuration-api-extended.yaml` for full OpenAPI specification.

## New Endpoints

### Quotes API

- `GET /api/quotes` - Returns the complete quotes database from quotes.json

See `quotes-api.yaml` for full OpenAPI specification.

## Changes Summary

### Rating Configuration Response (Extended)

**Before**:
```json
{
  "maxRating": 4,
  "ratings": [
    { "value": 1, "label": "...", "color": "..." },
    ...
  ]
}
```

**After**:
```json
{
  "maxRating": 4,
  "ratings": [
    { "value": 1, "label": "...", "color": "..." },
    ...
  ],
  "noteSuggestionsEnabled": true
}
```

### Rating Configuration Update Request (Extended)

**Before**:
```json
{
  "maxRating": 4,
  "ratings": [...],
  "expectedUpdatedAt": "2025-01-27T10:00:00.000Z"
}
```

**After**:
```json
{
  "maxRating": 4,
  "ratings": [...],
  "noteSuggestionsEnabled": true,
  "expectedUpdatedAt": "2025-01-27T10:00:00.000Z"
}
```

## Validation Rules

### noteSuggestionsEnabled

- **Type**: boolean
- **Required**: No (optional field)
- **Default**: `true` for wine events when missing
- **Applicable**: Only for events where `typeOfItem === "wine"`
- **State Restriction**: Can only be changed when event is in "created" state
- **Validation**: Must be boolean if provided

## Error Responses

### Rating Configuration Update Errors

- **400 Bad Request**: Event not in "created" state (when trying to change noteSuggestionsEnabled)
- **400 Bad Request**: Invalid noteSuggestionsEnabled value (not boolean)
- **400 Bad Request**: noteSuggestionsEnabled provided for non-wine event

### Quotes API Errors

- **500 Internal Server Error**: quotes.json file missing or corrupted
- **500 Internal Server Error**: Invalid JSON structure in quotes.json

## Backward Compatibility

- Existing clients that don't send `noteSuggestionsEnabled` will continue to work
- Missing `noteSuggestionsEnabled` in response defaults to `true` for wine events (handled client-side)
- No breaking changes to existing rating configuration API
