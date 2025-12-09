# API Contracts: Event PIN Access

This directory contains OpenAPI 3.0 specifications for the Event PIN Access feature.

## Files

- `pin-api.yaml`: API specification for PIN-based event access operations

## Endpoints

### POST `/api/events/{eventId}/verify-pin`
Verifies a PIN for an event and creates a PIN verification session.

**Request**: `{ "pin": "456789" }`  
**Response**: `{ "sessionId": "uuid", "eventId": "aB3xY9mK", "message": "..." }`

**Rate Limiting**: 5 attempts per IP per 15 minutes AND 5 attempts per event per 15 minutes

### POST `/api/events/{eventId}/regenerate-pin`
Regenerates a new PIN for an event (admin only, requires JWT token).

**Request**: None (authenticated via JWT)  
**Response**: `{ "pin": "789012", "eventId": "aB3xY9mK", "pinGeneratedAt": "..." }`

### GET `/api/events/{eventId}`
Retrieves event details. Requires either PIN verification session (header `X-PIN-Session-Id`) or OTP authentication (JWT token).

**Request**: Header `X-PIN-Session-Id` or `Authorization: Bearer <JWT>`  
**Response**: Event object (PIN field only included for administrators)

## Authentication

- **PIN-based access**: Uses session ID from PIN verification
- **OTP-based access**: Uses JWT token from OTP authentication
- **Admin operations**: Require JWT token (OTP authentication)

## Rate Limiting

PIN verification attempts are rate limited:
- Per IP address: 5 attempts per 15 minutes
- Per event: 5 attempts per 15 minutes
- Limits are independent (both must pass)

## Error Responses

All endpoints return errors in the format:
```json
{
  "error": "Human-readable error message"
}
```

Common error codes:
- `400`: Validation error (invalid PIN format, missing fields)
- `401`: Authentication/authorization error (invalid PIN, not administrator)
- `404`: Event not found
- `429`: Rate limit exceeded
- `500`: Server error
