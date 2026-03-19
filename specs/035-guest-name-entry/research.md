# Research: Collect Guest Name at Event Entry

**Feature**: 035-guest-name-entry
**Date**: 2026-03-19

## Research Findings

### 1. How to pass name through the PIN verification flow

**Decision**: Add `name` as an optional parameter to the existing `verify-pin` endpoint and propagate through `EventMemberService.registerUser` → `DynamoDBRepository.registerUserAtomic`.

**Rationale**: The PIN flow already calls `registerUser` at `events.js:155`. Adding `name` as an optional field keeps the change minimal. The `registerUserAtomic` method currently stores `{ registeredAt }` — it needs to include `name` when provided. For returning users (already registered), `registerUserAtomic` uses `if_not_exists` and won't overwrite — so for name updates on re-entry, a separate `updateUserName` call is needed after registration.

**Alternatives considered**:
- Calling `updateUserName` separately after `registerUser`: Adds an extra DB write for every PIN verification. Rejected — better to include name in the atomic registration for new users, and call `updateUserName` only for returning users (when `alreadyExists` is true).
- New dedicated endpoint for name: Over-engineered for a single field addition. Rejected.

### 2. How to save name during OTP verification

**Decision**: Call `EventConfigService.updateUserName(eventId, email, name)` after successful OTP verification in `auth.js`. The OTP verify endpoint needs the `eventId` — currently it doesn't receive it because OTP auth is global (not event-scoped).

**Rationale**: The OTP flow (`POST /api/auth/otp/verify`) does NOT call `registerUser` — it only generates JWT tokens. Admins are already in `event.users` from event creation (or admin addition). The existing `updateUserName` method handles initialization of missing user entries, so it works for both cases. The `eventId` must be passed from the frontend (stored in sessionStorage alongside email and name).

**Alternatives considered**:
- Adding `registerUser` call to OTP flow: Unnecessary — admins are already registered. Would add complexity to the OTP handler. Rejected.
- Deferring admin name to MyBottlesSheet: Defeats the purpose of this feature. Rejected.

### 3. localStorage key naming convention

**Decision**: Use `remembered:name` and `remembered:email` as global localStorage keys.

**Rationale**: Existing localStorage keys use colon-separated namespaces (`pin:session:${eventId}`, `userSession`). The `remembered:` prefix clearly signals these are for form pre-fill, not auth state. Global (not per-event) because a person's identity doesn't change between events.

**Alternatives considered**:
- Per-event keys (`event:${eventId}:remembered:name`): More granular but unnecessary — name doesn't vary by event. Would also not pre-fill for new events. Rejected.
- Reusing `userSession` localStorage: Would mix auth state with UI pre-fill. Rejected.

### 4. sessionStorage key for name handoff to PIN/OTP pages

**Decision**: Use `event:${eventId}:name` in sessionStorage, matching the existing `event:${eventId}:email` pattern.

**Rationale**: The email is already passed from EmailEntryPage to PINEntryPage/EventOTPEntryPage via sessionStorage using this naming convention. Adding a parallel key for name follows the established pattern exactly.

**Alternatives considered**:
- URL query parameters: Would expose name in browser history and server logs. Rejected for privacy.
- React Router state: Would be lost on page refresh. Rejected.

### 5. Handling name for returning users in PIN flow

**Decision**: After `registerUser` returns with `alreadyExists: true`, call `EventConfigService.updateUserName(eventId, email, name)` to update the name. For new users, include `name` in the atomic registration.

**Rationale**: `registerUserAtomic` uses DynamoDB `if_not_exists` — it won't overwrite existing user data. This means for returning users, the name from initial registration would stick forever unless explicitly updated. A follow-up `updateUserName` call handles the last-write-wins requirement.

**Alternatives considered**:
- Always calling `updateUserName` regardless: Would add an extra DB write for new users too. Rejected — include name in registration for new users, update only for returning.
- Changing `registerUserAtomic` to always overwrite: Would break the atomic registration safety that prevents race conditions from wiping `registeredAt`. Rejected.

### 6. OTP verify endpoint and eventId

**Decision**: Add `eventId` as an optional parameter to the OTP verify request body. The frontend already has `eventId` from the URL params.

**Rationale**: The OTP verify endpoint is currently event-agnostic (it's under `/api/auth/`, not `/api/events/:eventId/`). To save the name to the correct event's user record, it needs the eventId. Making it optional preserves backward compatibility — OTP verify without eventId still works for non-event admin auth.

**Alternatives considered**:
- New event-scoped OTP verify endpoint: Over-engineered. The existing endpoint can handle the optional eventId. Rejected.
- Saving name via a separate API call from the frontend after OTP: Would require the frontend to make an extra API call and handle its failure. Rejected — better to handle it server-side in one transaction.
