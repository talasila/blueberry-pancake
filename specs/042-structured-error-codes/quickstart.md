# Quickstart: Structured Error Codes

**Feature**: 042-structured-error-codes
**Date**: 2026-03-23

## What's Changing

1. Backend error helper functions (`apiErrorHandler.js`) gain an optional `code` parameter
2. Auth/authz endpoints pass specific error codes to these helpers
3. Frontend `apiClient.js` reads the `code` field on 401 responses to decide between "show inline error" and "trigger session-expired dialog"

## Implementation Order

### Step 1: Backend — Update apiErrorHandler.js

Add `code` parameter to `badRequestError`, `unauthorizedError`, `forbiddenError`, `notFoundError`, `rateLimitError`, `formatRateLimitResponse`. Include `code` in response JSON only when provided.

### Step 2: Backend — Add codes to PIN verification (events.js)

Update the `verify-pin` endpoint to pass error codes: `INVALID_PIN`, `INVALID_EMAIL`, `ADMIN_MUST_USE_OTP`, `RATE_LIMITED`, `EVENT_NOT_FOUND`.

### Step 3: Backend — Add codes to OTP endpoints (auth.js)

Update `otp/request`, `otp/verify`, and `refresh` endpoints to pass error codes: `INVALID_OTP`, `OTP_EXPIRED`, `INVALID_EMAIL`, `SUSPENDED`, `RATE_LIMITED`, `TOKEN_INVALID`.

### Step 4: Backend — Add codes to middleware

Update `jwtAuth.js` (`TOKEN_EXPIRED`, `TOKEN_INVALID`, `AUTHENTICATION_REQUIRED`), `requireAuth.js` (consolidate existing `EVENT_ACCESS_DENIED`), `requireEventMembership.js` (consolidate existing `EVENT_MEMBERSHIP_REQUIRED`), `requireRoot.js` (`AUTHENTICATION_REQUIRED`, `ROOT_ACCESS_REQUIRED`).

### Step 5: Frontend — Context-aware 401 interceptor

Update `apiClient.request()` to:
1. Read response body on 401 before dispatching session-expired
2. Check if `code` is a credential error → skip session-expired, throw error
3. Check if request URL is an auth endpoint → skip session-expired, throw error
4. Otherwise → proceed with existing session-expired flow

### Step 6: Tests

- Update `apiErrorHandler.test.js` — verify code field presence/absence
- Update `auth.test.js` integration tests — assert error codes in responses
- Update `apiClient.sessionExpiry.test.js` — test credential vs session routing
- Update E2E `pin-access.spec.js` and `otp-auth.spec.js` — verify correct error UI

## How to Verify

1. Start dev environment: `npm run dev`
2. Navigate to an event PIN page
3. Enter a wrong PIN
4. **Expected**: Inline "Invalid PIN" error message. No "Welcome back!" dialog.
5. Authenticate, wait for session expiry, try an action
6. **Expected**: "Welcome back!" session expiry dialog appears as before.

## Key Files

| File | Change |
|------|--------|
| `backend/src/utils/apiErrorHandler.js` | Add `code` param to helpers |
| `backend/src/api/events.js` | Add codes to verify-pin errors |
| `backend/src/api/auth.js` | Add codes to OTP errors |
| `backend/src/middleware/jwtAuth.js` | Add codes to token errors |
| `backend/src/middleware/requireAuth.js` | Consolidate EVENT_ACCESS_DENIED via helper |
| `backend/src/middleware/requireEventMembership.js` | Consolidate EVENT_MEMBERSHIP_REQUIRED via helper |
| `backend/src/middleware/requireRoot.js` | Add codes to root errors |
| `frontend/src/services/apiClient.js` | Context-aware 401 interceptor |
