# API Contracts: Manage Event Administrators

This directory contains OpenAPI 3.0 specifications for the administrator management API endpoints.

## Files

- `administrators-api.yaml` - OpenAPI specification for administrator management endpoints

## Endpoints

### GET /api/events/{eventId}/administrators
Get list of all administrators for an event.

**Authentication**: Required (JWT token)
**Authorization**: Must be an administrator of the event

**Response**: Object with email addresses as keys, each containing:
- `assignedAt`: ISO 8601 timestamp
- `owner`: Boolean flag

### POST /api/events/{eventId}/administrators
Add a new administrator to an event.

**Authentication**: Required (JWT token)
**Authorization**: Must be an existing administrator

**Request Body**:
```json
{
  "email": "admin2@example.com"
}
```

**Response**: Updated administrators object

### DELETE /api/events/{eventId}/administrators/{email}
Delete an administrator from an event.

**Authentication**: Required (JWT token)
**Authorization**: Must be an existing administrator

**Constraints**:
- Owner cannot be deleted
- At least one administrator (the owner) must remain

**Response**: Success confirmation

## Error Responses

All endpoints return standard error responses:
- `400`: Validation error (invalid email, duplicate, owner deletion attempt, etc.)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (not an administrator)
- `404`: Not found (event or administrator not found)

## Testing

Use the OpenAPI specification to generate API client code or test with tools like:
- Postman (import OpenAPI spec)
- Swagger UI
- Insomnia
- curl commands

## Example Usage

```bash
# Get administrators list
curl -X GET http://localhost:3000/api/events/aB3xY9mK/administrators \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Add administrator
curl -X POST http://localhost:3000/api/events/aB3xY9mK/administrators \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin2@example.com"}'

# Delete administrator
curl -X DELETE http://localhost:3000/api/events/aB3xY9mK/administrators/admin2@example.com \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
