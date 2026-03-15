# Data Model: Unified Invite Drawer

**Branch**: `032-invite-drawer` | **Date**: 2026-03-13

## Summary

No data model changes required. This feature is entirely a frontend UI consolidation. The existing `event` object already contains all necessary fields.

## Existing Entities (Referenced, Not Modified)

### Event

| Field | Type | Usage in Invite Drawer |
|-------|------|----------------------|
| `pin` | string | Displayed in QR card, SettingsRow badge, formatted invitation, downloaded PNG |
| `name` | string | Used in formatted invitation message and downloaded PNG |
| `eventId` | string | Used to construct event URL for QR code and invitation message |

### API Endpoints (Existing, Not Modified)

| Endpoint | Method | Usage |
|----------|--------|-------|
| `PUT /events/:eventId/regenerate-pin` | PUT | Called by "Regenerate PIN" action (existing `apiClient.regeneratePIN()`) |

No new entities, fields, endpoints, or migrations are needed.
