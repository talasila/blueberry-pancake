# Item Configuration API Contracts

This directory contains the OpenAPI specification for the Item Configuration API endpoints.

## Files

- `item-configuration-api.yaml` - OpenAPI 3.0.3 specification for item configuration endpoints

## Endpoints

### GET /api/events/:eventId/item-configuration

Retrieve the item configuration for an event.

**Authentication**: Required (JWT token)  
**Authorization**: Must be an event administrator  
**Response**: Item configuration object with `numberOfItems` and `excludedItemIds`

**Example Response**:
```json
{
  "numberOfItems": 25,
  "excludedItemIds": [3, 7, 12]
}
```

### PATCH /api/events/:eventId/item-configuration

Update the item configuration for an event. Supports partial updates.

**Authentication**: Required (JWT token)  
**Authorization**: Must be an event administrator  
**Request Body**: Object with optional `numberOfItems` and/or `excludedItemIds`

**Example Request**:
```json
{
  "numberOfItems": 30,
  "excludedItemIds": "5,10,15"
}
```

**Example Response** (with warning):
```json
{
  "numberOfItems": 12,
  "excludedItemIds": [5, 10],
  "warning": "Item IDs 15, 25 were removed because they are outside the valid range (1-12)"
}
```

## Validation Rules

1. **numberOfItems**: Integer, range 1-100, default 20
2. **excludedItemIds**: Array of integers, each in range 1 to numberOfItems, no duplicates
3. **At least one item must remain**: Cannot exclude all item IDs
4. **Automatic cleanup**: Invalid excluded IDs are removed when numberOfItems is reduced

## Error Responses

- **400 Bad Request**: Validation errors (invalid range, all items excluded, etc.)
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User is not an administrator
- **404 Not Found**: Event does not exist

## Usage

The OpenAPI specification can be used with tools like:
- Swagger UI for interactive API documentation
- Postman for API testing
- Code generators for client SDKs
- Contract testing tools
