# API Contracts: Admin Guide

**Feature**: 014-admin-guide  
**Date**: 2026-02-25

## No New API Contracts

This feature is frontend-only and does not introduce any new API endpoints, modify existing endpoints, or require backend changes.

### Existing API Dependencies (read-only)

The admin guide reads the event state from data already fetched by the existing `EventContext`:

| Endpoint | Method | Used For |
|----------|--------|----------|
| `GET /api/events/:eventId` | GET | Event data including `state` field (already polled by `useEventPolling`) |

No new requests are made by the admin guide. The event state is consumed from the in-memory context that the admin page already maintains.
