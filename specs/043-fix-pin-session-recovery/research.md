# Research: Fix Stale Session Recovery for PIN Guests

**Feature**: 043-fix-pin-session-recovery | **Date**: 2026-03-24

## Research Areas

### 1. Refresh Token Storage Schema

**Decision**: Add `authMethod`, `userId`, and `events` fields to the existing DynamoDB refresh token record.

**Rationale**: The current record stores only `email`, `createdAt`, `expiresAt`, and `TTL`. The refresh endpoint (`auth.js:287-346`) hardcodes `authMethod: 'otp'` and calls `getEventsByAdministrator(email)` because it has no way to know the original auth method. Adding three fields to the existing item is backward-compatible (old records still work — absence of `authMethod` implies legacy OTP) and requires no new GSIs or table redesign.

**Alternatives considered**:
- **Reverse index GSI** (USER#{email} → EVENT#{eventId}): More scalable but unnecessary — PIN guests access 1-2 events. Adds write amplification and schema complexity.
- **Full table scan on refresh** (query all events, filter for user): O(N) events, not practical.
- **Separate auth-method lookup table**: Over-engineered; the refresh token record is the natural place.

---

### 2. Event Access Resolution for PIN Guests During Refresh

**Decision**: Store the events array in the refresh token record at creation time and return it during validation. The refresh endpoint uses the stored events directly instead of querying.

**Rationale**: No equivalent of `getEventsByAdministrator(email)` exists for guests. The `event.users` map has no reverse index (given email → find events). The JWT already contains the events array — persisting it alongside the refresh token keeps them in sync. Refresh token rotation (every 7 days max) keeps the list reasonably fresh.

**Alternatives considered**:
- **Implementing `getEventsByUserEmail(email)`**: Would require scanning all events or adding a GSI. Not worth it for a session recovery use case.
- **Re-verifying PIN on refresh**: Defeats the purpose of silent recovery.

---

### 3. `isAuthenticated()` Side Effect Removal

**Decision**: Make `isAuthenticated()` a pure boolean query. Introduce a separate `clearExpiredSession()` method that returns a snapshot of the session before clearing it. Only the apiClient visibility listener calls `clearExpiredSession()`.

**Rationale**: `isAuthenticated()` is called from 14+ sites (route guards, polling, renders, navigation). Only 1 site (the visibility listener) needs the side effect. The destructive clearing races with other callers, causing the session-expired dialog to receive null email/authMethod. Splitting query from mutation eliminates the entire class of race conditions.

**Call site audit** (14 `isAuthenticated()` + 4 `hasEventAccess()` callers):
- 1 site needs side effect (visibility listener) → uses new `clearExpiredSession()`
- 17 sites need pure boolean → unchanged, work with side-effect-free `isAuthenticated()`

---

### 4. PIN User Silent Refresh Feasibility

**Decision**: Enable silent refresh for PIN users by making the refresh endpoint auth-method-aware. Remove the `authMethod === 'otp'` guard in the frontend 401 handler.

**Rationale**: PIN users already receive a 7-day refresh token cookie. The backend just needs to read the stored `authMethod`/`userId`/`events` from the refresh record and generate the appropriate JWT type. The frontend `refreshToken()` method already works for all auth methods — only the 401 handler artificially restricts it to OTP.

**Changes required**:
- Backend `generateRefreshToken()`: Accept and store `authMethod`, `userId`, `events`
- Backend `validateRefreshToken()`: Return full metadata (not just `email`)
- Backend `/auth/refresh`: Branch on `authMethod` to generate correct JWT type
- Frontend 401 handler: Remove `if (authMethod === 'otp')` guard

---

### 5. Existing Test Coverage and Gaps

**Existing coverage** (~1,764 lines across 7 test files):
- Frontend unit: `apiClient.sessionExpiry.test.js` (335 lines) — event dispatch, error code routing, visibility listener
- Frontend unit: `SessionExpiredDialog.test.jsx` (217 lines) — dialog rendering, PIN/OTP re-auth
- Frontend E2E: `session-expiry.spec.js` (183 lines) — full session expiry flow
- Backend unit: `jwtAuth.test.js` (215 lines) — token generation, error codes
- Backend integration: `auth.test.js` (315 lines) — OTP request/verify
- Backend integration: `security.test.js` (171 lines) — JWT/CSRF
- Backend unit: `PINService.test.js` (328 lines) — PIN verification, sessions

**Critical gaps**:
- No `/auth/refresh` endpoint integration tests at all
- No tests for PIN user token refresh (doesn't exist yet)
- No tests for race conditions between visibility handler and polling
- No tests verifying refresh token invalidation on re-auth
- SessionExpiredDialog tests don't cover the null-email scenario
- E2E tests don't cover the silent-renewal path

---

### 6. Email Persistence for Recovery

**Decision**: Store email in `localStorage` at `pin:email:${eventId}` during initial PIN verification. The SessionExpiredDialog reads it as a fallback when the session's email is null.

**Rationale**: The guest already entered their email on this device. Storing it separately from the session token preserves feature 041's privacy intent (email is not in the JWT or session object) while making recovery possible. The key is per-event and survives session clearing.

**Alternatives considered**:
- **Adding email input to SessionExpiredDialog**: More friction for the user, especially when silent refresh handles most cases.
- **Server-side email resolution**: Would require a new endpoint or modified verify-pin flow. Over-engineered given the simple localStorage fallback.
