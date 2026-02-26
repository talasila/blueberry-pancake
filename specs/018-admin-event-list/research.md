# Research: Admin Event List Enhancements

**Branch**: `018-admin-event-list` | **Date**: 2026-02-26

## Research Topics

### 1. Unified Search Parameter vs. Separate Filters

**Decision**: Add a single `search` query parameter that performs OR matching across `eventId`, `name`, and `ownerEmail`. Retain existing `name`, `owner`, and `state` parameters for backward compatibility but the frontend will only use `search`.

**Rationale**: The spec requires a single search box that matches across three fields with OR logic. A unified `search` parameter is the simplest contract for the frontend — one input maps to one parameter. The backend already loads all events into memory and filters in-place, so adding OR logic to the filter step is trivial.

**Alternatives considered**:
- Sending three separate params (`name`, `owner`, `eventId`) from the frontend — rejected because it forces the frontend to duplicate the search text into multiple params and the backend to apply OR logic across independent filters anyway.
- Client-side filtering — rejected because the spec requires searching ALL events, not just the displayed 25.

### 2. Default Limit Change (50 → 25) and Pagination Removal

**Decision**: Change the default view to request `limit=25` with no pagination controls. When a search is active, request `limit=100`. Remove the Previous/Next pagination buttons entirely.

**Rationale**: The spec says "show the top 25 most recently created events" as the default and search results are capped at 100. The existing pagination (Previous/Next with offset) is no longer needed because the default is a fixed subset and search has a hard cap. This simplifies the UI.

**Alternatives considered**:
- Keeping pagination for search results — rejected per clarification (cap at 100 with a message instead).
- Infinite scroll — overengineered for an admin page with at most 100 results.

### 3. PIN Exposure to Root Admins

**Decision**: Include `pin` (string or null) in both the event summary response (`getEventSummary`) and the event details response (`getEventDetailsForAdmin`). Read from `config.pin` which already exists in DynamoDB.

**Rationale**: The PIN is already stored on the event config object. Root admins have full system access and need the PIN for operational support. No new data store reads or writes are needed — just adding the field to the response shape.

**Alternatives considered**:
- Separate API call to fetch PIN — rejected as unnecessary complexity; it's a single field already available in the config.
- Masking the PIN — rejected because root admins explicitly need to see it for support purposes.

### 4. Search Filter Implementation (Backend In-Memory)

**Decision**: Implement the `search` filter as case-insensitive substring matching in the existing `listAllEventsForAdmin` method, applied as an OR across `eventId`, `name`, and `ownerEmail` after loading all event summaries.

**Rationale**: The backend already loads all events into memory (`dataRepository.listEvents()` → `getEventSummary()` for each). Adding an OR filter in the same pass adds negligible overhead. DynamoDB scan-based search would be more complex without benefit at this scale (admin page, low hundreds of events).

**Alternatives considered**:
- DynamoDB GSI-based search — rejected because the single-table design doesn't have a GSI on event name or owner email, and the current in-memory approach works well at the expected scale.
- ElasticSearch/OpenSearch — massively overengineered for this use case.

### 5. E2E Test Updates

**Decision**: Update existing `system.spec.js` E2E tests to cover: (a) event ID and PIN visible on cards, (b) PIN visible in drawer, (c) search by event ID, (d) search by owner email, (e) 25-event default limit label. The existing name-search test needs updating since the query parameter changes from `name=` to `search=`.

**Rationale**: Existing tests already cover the core system page flows. The changes are additive — new assertions on existing test patterns plus one parameter name change.

**Alternatives considered**:
- New test file — rejected because the changes extend existing user stories already covered in `system.spec.js`.
