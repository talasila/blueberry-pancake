# Data Model: Collect Guest Name at Event Entry

**Feature**: 035-guest-name-entry
**Date**: 2026-03-19

## Entities

### User (event participant record) — MODIFIED

**Location**: `event.users[email]` in DynamoDB event document

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| registeredAt | string (ISO 8601) | Yes | Timestamp of initial registration |
| name | string | No | Display name, mutable. Set at entry or via in-app editor. Null/undefined if never set. |

**Identity rule**: Email address (the map key, normalized to lowercase) is the sole identifier. Name is a display label only.

**Write behavior**:
- On new registration: `name` is included in the atomic `if_not_exists` write alongside `registeredAt`
- On re-entry (user already exists): `name` is updated via `updateUserName` (last-write-wins)
- On in-app edit: `name` is updated via `updateUserName` (existing behavior, unchanged)

**Read behavior** (unchanged):
- Display logic: `user.name || trimEmail(user.email) || 'Unnamed User'`
- Used in: UserRatingsTable, DashboardService, SimilarUsers API

### Remembered Identity — NEW (client-side only)

**Location**: Browser localStorage (global, not per-event)

| Key | Type | Description |
|-----|------|-------------|
| `remembered:name` | string | Last submitted name from entry form |
| `remembered:email` | string | Last submitted email from entry form |

**Lifecycle**:
- Written on successful entry form submission
- Read on entry page load for pre-fill
- Never expires (persists until browser data is cleared)
- Not a source of truth — server record is authoritative

**Graceful degradation**: If localStorage is unavailable (private browsing, storage full), pre-fill silently fails and the form shows empty fields.

### Session Handoff — MODIFIED (client-side only)

**Location**: Browser sessionStorage (per-event, per-tab)

| Key | Type | Description |
|-----|------|-------------|
| `event:${eventId}:email` | string | Email for PIN/OTP page (existing) |
| `event:${eventId}:name` | string | Name for PIN/OTP page (new) |

**Lifecycle**:
- Written when user submits entry form
- Read by PINEntryPage or EventOTPEntryPage
- Cleared after successful verification

## Relationships

```
EmailEntryPage
  ├── writes → localStorage (remembered:name, remembered:email)
  ├── writes → sessionStorage (event:{id}:name, event:{id}:email)
  └── calls → check-admin API (unchanged)

PINEntryPage
  ├── reads → sessionStorage (event:{id}:name, event:{id}:email)
  └── calls → verify-pin API (now with name)
        └── server: registerUser (new user → atomic write with name)
        └── server: updateUserName (returning user → name update)

EventOTPEntryPage
  ├── reads → sessionStorage (event:{id}:name, event:{id}:email)
  └── calls → verify-otp API (now with name + eventId)
        └── server: updateUserName (admin → name update)
```
