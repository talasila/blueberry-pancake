# API Contracts: Guest Management (023)

**Feature Branch**: `023-guest-management`

## Summary

This feature does **not** introduce any new backend endpoints or API contracts. All data required for the Guests card and drawer is already available from existing APIs:

- **Event data** (including `event.users`): `GET /api/events/:eventId` via `apiClient.getEvent(eventId)`
- **Items list**: `GET /api/events/:eventId/items` via `itemService.getItems(eventId)`
- **Administrators**: `GET /api/events/:eventId/administrators` via `apiClient.getAdministrators(eventId)`
- **Ratings** (on-demand for delete dialog): `GET /api/events/:eventId/ratings` via `ratingService.getRatings(eventId)`
- **Delete user**: `DELETE /api/events/:eventId/users/:email` via `apiClient.deleteUser(eventId, email)`

No OpenAPI or GraphQL schema changes are required for 023.
