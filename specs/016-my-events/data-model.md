# Data Model: My Events Page

**Feature**: 016-my-events | **Date**: 2026-02-25

## Entities

### Event Summary (read-only projection)

A lightweight projection of the full Event entity, used exclusively for the My Events list display. No new database entities are created — this is a read-side view of existing Event data.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `eventId` | string (8 chars, Crockford Base32) | Event.eventId | Unique event identifier |
| `name` | string (1-100 chars) | Event.name | Human-readable event name |
| `state` | enum: `created`, `started`, `paused`, `completed` | Event.state | Current event lifecycle state |
| `createdAt` | ISO 8601 timestamp | Event.createdAt | When the event was created |

### JWT Token Payload (modified)

The existing JWT token payload is extended with an `authMethod` field.

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `email` | string | (existing) | User's email address |
| `events` | string[] | (existing) | Array of event IDs the user has access to |
| `authMethod` | string | `'otp'` or `'pin'` | How the user authenticated — OTP for administrators, PIN for participants |

## Relationships

- An **Administrator** (identified by email) has zero or more **Events** where they are listed in the event's `administrators` object.
- The **Event Summary** is derived from the full **Event** entity — no separate storage or denormalization is needed.
- The **authMethod** in the JWT determines whether the "My Events" header menu item is rendered.

## Storage

No new DynamoDB tables, indexes, or items are required. The `getEventSummariesByAdministrator(email)` method reads existing Event items and projects the summary fields.
