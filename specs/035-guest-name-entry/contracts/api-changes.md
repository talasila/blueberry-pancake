# API Contract Changes: Collect Guest Name at Event Entry

**Feature**: 035-guest-name-entry
**Date**: 2026-03-19

## Modified Endpoints

### POST /api/events/:eventId/verify-pin

**Change**: Accept optional `name` in request body.

**Request body** (updated):
```json
{
  "pin": "123456",
  "email": "guest@example.com",
  "name": "Sarah Johnson"
}
```

| Field | Type | Required | Change |
|-------|------|----------|--------|
| pin | string | Yes | Unchanged |
| email | string | Yes | Unchanged |
| name | string | No | **NEW** — display name to store in user record |

**Response**: Unchanged.

**Behavior change**:
- If `name` provided and user is new: stored alongside `registeredAt` in atomic registration
- If `name` provided and user already exists: updated via `updateUserName` (last-write-wins)
- If `name` omitted: existing behavior preserved (backward compatible)

---

### POST /api/auth/otp/verify

**Change**: Accept optional `name` and `eventId` in request body.

**Request body** (updated):
```json
{
  "email": "admin@example.com",
  "otp": "123456",
  "name": "Admin User",
  "eventId": "A5ohYrHe"
}
```

| Field | Type | Required | Change |
|-------|------|----------|--------|
| email | string | Yes | Unchanged |
| otp | string | Yes | Unchanged |
| name | string | No | **NEW** — display name to store in user record |
| eventId | string | No | **NEW** — event to associate name with |

**Response**: Unchanged.

**Behavior change**:
- If both `name` and `eventId` provided: after successful OTP verification, saves name to `event.users[email].name` via `updateUserName`
- If either is omitted: existing behavior preserved (backward compatible)
- Name save failure does not fail OTP verification (logged as warning)

---

## Unchanged Endpoints

### GET /api/events/:eventId/check-admin

No changes. Does not expose user registration status or names (FR-011).

### PUT /api/events/:eventId/profile

No changes. Existing name editing via MyBottlesSheet continues to work.

### GET /api/events/:eventId/profile

No changes. Existing name retrieval continues to work.
