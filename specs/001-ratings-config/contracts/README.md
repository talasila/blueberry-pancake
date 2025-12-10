# Ratings Configuration API Contracts

This directory contains the OpenAPI specification for the Ratings Configuration API endpoints.

## Files

- `rating-configuration-api.yaml` - OpenAPI 3.0.3 specification for rating configuration endpoints

## Endpoints

### GET /api/events/:eventId/rating-configuration

Retrieve the rating configuration for an event.

**Authentication**: Required (JWT token)  
**Authorization**: Must be an event administrator  
**Response**: Rating configuration object with `maxRating` and `ratings` array

**Example Response**:
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

### PATCH /api/events/:eventId/rating-configuration

Update the rating configuration for an event. Supports partial updates.

**Authentication**: Required (JWT token)  
**Authorization**: Must be an event administrator  
**Request Body**: Object with optional `maxRating` and/or `ratings` array

**Example Request** (update max rating):
```json
{
  "maxRating": 3
}
```

**Example Request** (customize labels and colors):
```json
{
  "ratings": [
    { "value": 1, "label": "Terrible", "color": "#FF0000" },
    { "value": 2, "label": "Okay", "color": "#FFFF00" },
    { "value": 3, "label": "Great", "color": "#00FF00" },
    { "value": 4, "label": "Amazing", "color": "#008000" }
  ]
}
```

**Example Response**:
```json
{
  "maxRating": 4,
  "ratings": [
    { "value": 1, "label": "Terrible", "color": "#FF0000" },
    { "value": 2, "label": "Okay", "color": "#FFFF00" },
    { "value": 3, "label": "Great", "color": "#00FF00" },
    { "value": 4, "label": "Amazing", "color": "#008000" }
  ]
}
```

## Validation Rules

1. **maxRating**: Integer, range 2-4 (inclusive), default 4
2. **maxRating changes**: Only allowed when event is in "created" state
3. **ratings array**: Must contain exactly maxRating items, sequential values 1 to maxRating
4. **label**: String, non-empty, max 50 characters
5. **color**: Hex format (#RRGGBB or #RGB), accepts hex/RGB/HSL input but stores as hex
6. **Optimistic locking**: Checks event updatedAt timestamp, rejects with 409 Conflict if modified

## Error Responses

- **400 Bad Request**: Validation errors (invalid range, empty label, invalid color, etc.)
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User is not an administrator
- **404 Not Found**: Event does not exist
- **409 Conflict**: Event was modified by another admin (optimistic locking conflict)

## Usage

The OpenAPI specification can be used with tools like:
- Swagger UI for interactive API documentation
- Postman for API testing
- Code generators for client SDKs
- Contract testing tools

