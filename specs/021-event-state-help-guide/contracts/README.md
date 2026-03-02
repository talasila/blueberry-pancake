# API Contracts: Event State Management Help Guide

**Feature**: 021-event-state-help-guide  
**Date**: 2026-03-02

## No New API Contracts

This feature is frontend-only. It does not introduce any new API endpoints, modify existing endpoints, or require backend changes.

### Existing API Dependencies (read-only)

The help reads event state from data already available on the event admin page:

| Endpoint | Method | Used For |
|----------|--------|----------|
| `GET /api/events/:eventId` | GET | Event data including `state` (already used by EventContext / useEventPolling on admin page) |

No additional requests are made for the help. The inline help consumes the same in-memory event (and loading/error state) as the event state management section.
