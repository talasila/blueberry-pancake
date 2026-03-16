# API Contracts: Dashboard Summary Redesign

No API contract changes. This feature is entirely frontend-only.

The existing `GET /api/events/:eventId/dashboard` endpoint already returns all data
needed for the redesigned Summary tab. See [data-model.md](../data-model.md) for the
full response shape and which fields are consumed by each new card.
