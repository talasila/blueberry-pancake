# Quickstart: Fix Stale Session Recovery for PIN Guests

**Feature**: 043-fix-pin-session-recovery | **Date**: 2026-03-24

## Overview

This fix addresses 5 interacting bugs that prevent PIN-authenticated guests from recovering their session after token expiry. The changes span backend (refresh endpoint, token storage, verify-pin cleanup) and frontend (apiClient session management, SessionExpiredDialog, email persistence).

## Implementation Order

The fixes have dependencies. Follow this order:

### Phase A: Foundation (no user-visible change yet)

**1. Make `isAuthenticated()` side-effect-free** (FR-001, FR-002)

- File: `frontend/src/services/apiClient.js`
- Remove the `setUserSession(null)` call from `isAuthenticated()`
- Add new method `clearExpiredSession()` that:
  - Checks if session is expired
  - Captures a snapshot (`{ authMethod, email, userId, name }`) before clearing
  - Calls `setUserSession(null)` to clear
  - Returns the snapshot (or null if not expired)
- Update `_initVisibilityListener()` to use `clearExpiredSession()` instead of `isAuthenticated()` + manual clearing
- Update the 401 handler to capture session snapshot before clearing

**2. Persist email at PIN verification time** (FR-006, FR-012)

- File: `frontend/src/pages/PINEntryPage.jsx`
- After successful PIN verification, write: `localStorage.setItem(\`pin:email:\${eventId}\`, email)`
- File: `frontend/src/components/SessionExpiredDialog.jsx`
- When preparing the verifyPIN call, fall back: `const recoveryEmail = email || localStorage.getItem(\`pin:email:\${eventId}\`)`
- After successful re-auth in the dialog, also update the stored email
- File: `frontend/src/services/apiClient.js`
- In `clearAllAuthState()`, also clear `pin:email:*` keys

### Phase B: Backend refresh endpoint upgrade

**3. Extend refresh token storage** (FR-009, FR-011)

- File: `backend/src/data/DynamoDBRepository.js`
- Modify `storeRefreshToken(tokenHash, email, expiresAt, metadata)` to accept and persist `authMethod`, `userId`, `events`
- Modify `getRefreshToken(tokenHash)` to return the new fields
- Backward compatible: missing fields → defaults (authMethod='otp', userId=null, events=null)

**4. Make refresh endpoint auth-method-aware** (FR-003, FR-004, FR-011)

- File: `backend/src/middleware/jwtAuth.js`
- Update `generateRefreshToken(email, metadata)` to pass metadata to `storeRefreshToken`
- Update `validateRefreshToken()` to return full metadata

- File: `backend/src/api/auth.js` (`POST /auth/refresh`)
- Read `authMethod`, `userId`, `events` from validated refresh token
- Branch on authMethod:
  - `'otp'`: Existing behavior — re-query admin events, generate OTP JWT
  - `'pin'`: Generate PIN JWT with stored `userId` and `events`
- Rotate refresh token with same metadata (updated events if available)

**5. Invalidate old refresh token on PIN re-auth** (FR-009)

- File: `backend/src/api/events.js` (verify-pin handler, ~line 220)
- Before generating new refresh token:
  ```
  const existingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (existingRefreshToken) {
    await invalidateRefreshToken(existingRefreshToken).catch(() => {});
  }
  ```
- Pass `{ authMethod: 'pin', userId, events: [eventId] }` to `generateRefreshToken()`

### Phase C: Frontend silent refresh for PIN users

**6. Enable PIN refresh in 401 handler** (FR-008)

- File: `frontend/src/services/apiClient.js`
- In the 401 handler (~line 379), remove `if (authMethod === 'otp')` guard:
  ```javascript
  // Before: if (authMethod === 'otp') { ... }
  // After: attempt refresh for all auth methods
  const refreshed = await this.refreshToken();
  if (refreshed) return this.request(endpoint, options, true);
  ```

### Phase D: Error message accuracy

**7. Fix error messages in SessionExpiredDialog** (FR-010)

- File: `frontend/src/components/SessionExpiredDialog.jsx`
- In the catch block (~line 59), add detection for email-related and session-data errors:
  ```javascript
  if (err.message?.includes('Email') || err.message?.includes('required')) {
    msg = 'Session data expired. Please reload the page to sign in again.';
  }
  ```

## Verification Steps

After each phase, verify:

1. **Phase A**: Existing session-expiry E2E tests still pass. `isAuthenticated()` callers behave identically (pure boolean). The SessionExpiredDialog receives non-null email for PIN users.

2. **Phase B**: New backend integration tests pass: refresh endpoint returns correct JWT type for PIN vs OTP. Old refresh tokens without new fields still work (backward compat). Verify-pin invalidates old refresh token before issuing new one.

3. **Phase C**: PIN guest with expired JWT but valid refresh cookie → session renews silently on tab focus or 401. No dialog shown. Event page continues working.

4. **Phase D**: Trigger each error condition in SessionExpiredDialog → verify message accuracy. "Invalid PIN" only shown for actual wrong PINs.

## Key Files Changed

| File | Changes |
|------|---------|
| `frontend/src/services/apiClient.js` | `isAuthenticated()` pure, new `clearExpiredSession()`, 401 handler refresh for all |
| `frontend/src/pages/PINEntryPage.jsx` | Persist email to `pin:email:{eventId}` |
| `frontend/src/components/SessionExpiredDialog.jsx` | Read recovery email, accurate error messages |
| `backend/src/data/DynamoDBRepository.js` | `storeRefreshToken` accepts metadata, `getRefreshToken` returns it |
| `backend/src/middleware/jwtAuth.js` | `generateRefreshToken` accepts metadata, `validateRefreshToken` returns it |
| `backend/src/api/auth.js` | Refresh endpoint branches on authMethod |
| `backend/src/api/events.js` | Invalidate old refresh token on PIN re-auth, pass metadata |

## Test Plan

| Test Type | File | New Tests |
|-----------|------|-----------|
| Backend integration | `backend/tests/integration/auth.test.js` | Refresh endpoint: PIN user refresh, OTP refresh, legacy token compat, expired refresh |
| Backend unit | `backend/tests/unit/middleware/jwtAuth.test.js` | `generateRefreshToken` with metadata, `validateRefreshToken` returns metadata |
| Frontend unit | `frontend/tests/unit/apiClient.sessionExpiry.test.js` | `isAuthenticated()` no side effect, `clearExpiredSession()` returns snapshot, 401 refresh for PIN |
| Frontend unit | `frontend/tests/unit/SessionExpiredDialog.test.jsx` | Recovery email from localStorage, accurate error messages per condition |
| Frontend E2E | `frontend/tests/e2e/specs/session-expiry.spec.js` | PIN silent renewal, PIN prompted recovery with persisted email, error message accuracy |
