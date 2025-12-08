# API Contracts: Create Event Functionality

**Feature**: Create Event Functionality (004-create-event)  
**Date**: 2025-01-27

## Overview

This feature adds a single API endpoint for creating events. The endpoint requires authentication via JWT token (obtained through OTP authentication flow).

## Endpoints

### POST /api/events

Creates a new event with the provided details. The authenticated user is automatically assigned as the event administrator.

**Authentication**: Required (JWT token in Authorization header)

**Request**:

```http
POST /api/events
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Summer Wine Tasting",
  "typeOfItem": "wine"
}
```

**Request Body Schema**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | 1-100 characters, alphanumeric + spaces/hyphens/underscores | Event name |
| `typeOfItem` | string | Yes | Must be "wine" | Type of item for the event |

**Response (201 Created)**:

```json
{
  "eventId": "aB3xY9mK",
  "name": "Summer Wine Tasting",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "user@example.com",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z"
}
```

**Response (400 Bad Request)** - Validation Error:

```json
{
  "error": "Event name is required"
}
```

```json
{
  "error": "Event name must be 100 characters or less"
}
```

```json
{
  "error": "Event name contains invalid characters"
}
```

```json
{
  "error": "Type of item is required"
}
```

```json
{
  "error": "Invalid type of item. Only 'wine' is currently supported"
}
```

**Response (401 Unauthorized)** - Missing or Invalid Token:

```json
{
  "error": "Authentication required"
}
```

**Response (500 Internal Server Error)** - Server Error:

```json
{
  "error": "Failed to create event. Please try again."
}
```

## OpenAPI Specification

See [events-api.yaml](./events-api.yaml) for complete OpenAPI 3.0 specification.

## Error Handling

All errors follow consistent format:
- **400**: Validation errors (missing/invalid input)
- **401**: Authentication errors (missing/invalid JWT token)
- **500**: Server errors (storage failures, unexpected errors)

Error response format:
```json
{
  "error": "Human-readable error message"
}
```

## Authentication

All endpoints require JWT token obtained through OTP authentication flow (feature 003-otp-auth).

Token must be included in Authorization header:
```
Authorization: Bearer <jwt_token>
```

Token validation is handled by `requireAuth` middleware.

## Rate Limiting

Event creation is subject to existing rate limiting infrastructure (from OTP auth feature). No additional rate limiting specific to event creation is required for current scope.

## Future Endpoints

The following endpoints are out of scope for this feature but may be added in future:
- `GET /api/events/:eventId` - Get event details
- `GET /api/events` - List events
- `PATCH /api/events/:eventId` - Update event
- `PATCH /api/events/:eventId/state` - Update event state
- `DELETE /api/events/:eventId` - Delete event
