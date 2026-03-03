# API Contracts: Start Event Guard-Rail (022)

**Feature Branch**: `022-start-event-guardrail`

## Summary

This feature does **not** introduce any new backend endpoints or API contracts. All data required for the inline bottle-count mismatch message is already available from:

- Existing event state (e.g. `event.itemConfiguration`, `event.state`, `event.typeOfItem`)
- Existing items list (e.g. `itemService.getItems(eventId)`) and its error state

No OpenAPI or GraphQL schema changes are required for 022.
