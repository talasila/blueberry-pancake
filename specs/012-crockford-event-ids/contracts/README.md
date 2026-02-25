# API Contracts: Crockford Base32 Event IDs

**Feature**: 012-crockford-event-ids | **Date**: 2026-02-24

## Contract Changes

This feature does not add or remove any API endpoints. It modifies the **behavior** of existing endpoints that accept or return event IDs.

### Event ID Parameter Contract

All existing endpoints that accept an `eventId` path parameter (e.g., `GET /events/:eventId`, `POST /events/:eventId/ratings`) now behave as follows:

**Input**:
- Accepts any 8-character alphanumeric string (unchanged)
- Input is trimmed of leading/trailing whitespace
- Input is normalized to uppercase before lookup

**Output**:
- Event IDs in all response bodies are uppercase Crockford Base32 characters
- Event IDs in all redirect URLs are uppercase

### Affected Endpoints

All endpoints under `/events/:eventId` — behavior change is transparent since normalization happens in the shared validation layer.

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/events` | Response `eventId` is now uppercase Crockford Base32 |
| GET | `/events/:eventId` | Input normalized to uppercase before lookup |
| * | `/events/:eventId/*` | Input normalized to uppercase before lookup |

### Frontend Route Contract

| Route | Change |
|-------|--------|
| `/event/:eventId` | Redirects to uppercase canonical URL if eventId is not fully uppercase |
| `/event/:eventId/*` | Same redirect behavior for all sub-routes |

### Validation Response Contract (unchanged format)

```json
{
  "error": "Invalid event ID format. Event ID must be exactly 8 alphanumeric characters."
}
```

Error message and HTTP status code (400) remain unchanged. The validation still accepts any alphanumeric character — excluded Crockford characters (I, L, O, U) are not rejected at validation time.

### Event Creation Response

```json
{
  "eventId": "A3RKT9WP",
  "message": "Event created successfully"
}
```

The `eventId` field now contains only uppercase Crockford Base32 characters (previously could contain lowercase and I/L/O/U).
