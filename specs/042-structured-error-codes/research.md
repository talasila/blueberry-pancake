# Research: Structured Error Codes

**Feature**: 042-structured-error-codes
**Date**: 2026-03-23

## R1: Current Error Response Pattern

**Decision**: Extend existing `{ error: "message" }` shape with an optional `code` field → `{ error: "message", code: "ERROR_CODE" }`

**Rationale**: The codebase already uses this pattern in two places:
- `requireAuth.js` returns `{ error: "...", code: "EVENT_ACCESS_DENIED" }`
- `requireEventMembership.js` returns `{ error: "...", code: "EVENT_MEMBERSHIP_REQUIRED" }`

Extending the existing pattern is backward compatible and requires no response schema migration.

**Alternatives considered**:
- RFC 9457 Problem Details (`{ type, title, status, detail }`) — Too heavy for this codebase; would require changing all error consumers
- Nested error objects (`{ error: { code, message } }`) — Breaking change to existing `errorData.error` string parsing throughout frontend

## R2: Error Code Naming Convention

**Decision**: UPPER_SNAKE_CASE string constants (e.g., `INVALID_PIN`, `TOKEN_EXPIRED`)

**Rationale**: Matches existing `EVENT_ACCESS_DENIED` and `EVENT_MEMBERSHIP_REQUIRED` patterns already in the codebase. Standard convention for machine-readable constants.

**Alternatives considered**:
- kebab-case (`invalid-pin`) — Inconsistent with existing codes
- Namespaced URIs (`urn:blueberry:error:invalid-pin`) — Over-engineering for internal use

## R3: apiErrorHandler.js Modification Strategy

**Decision**: Add optional `code` parameter to each error helper function. The `code` field is included in the response only when provided (preserving backward compatibility for callers that don't pass it).

**Rationale**: Minimally invasive — existing callers without a code continue to work unchanged. New callers pass the code as needed.

**Current signatures → New signatures**:
- `badRequestError(res, message)` → `badRequestError(res, message, code)`
- `unauthorizedError(res, message)` → `unauthorizedError(res, message, code)`
- `forbiddenError(res, message)` → `forbiddenError(res, message, code)`
- `notFoundError(res, message)` → `notFoundError(res, message, code)`
- `rateLimitError(res, message)` → `rateLimitError(res, message, code)`
- `conflictError(res, message, additionalData)` — Already supports additional data; code can be included in additionalData or added as param
- `formatRateLimitResponse(res, result, message)` → `formatRateLimitResponse(res, result, message, code)`

**Alternatives considered**:
- Options object (`unauthorizedError(res, { message, code })`) — Breaking change to all existing callers
- Separate function per error code — Explosion of functions, violates DRY

## R4: Frontend 401 Interceptor Strategy

**Decision**: Dual-check approach — parse response body for `code` field AND check request URL against known auth endpoints.

**Rationale**: The code-based check is the primary mechanism (self-describing, doesn't need endpoint list maintenance). The URL-based check is a safety net for edge cases where the code might be missing (network errors, non-JSON responses, legacy behavior).

**Implementation**:
1. On 401, read response body FIRST (before any session-expired dispatch)
2. If `code` is a credential error (`INVALID_PIN`, `INVALID_OTP`, `OTP_EXPIRED`, `INVALID_EMAIL`, `SUSPENDED`, `ADMIN_MUST_USE_OTP`): skip session-expired, throw error for caller
3. If `code` is a session error (`TOKEN_EXPIRED`, `TOKEN_INVALID`) or code is absent: proceed with existing session-expired flow
4. Safety net: if request URL matches `/verify-pin`, `/otp/verify`, `/otp/request` — always skip session-expired

**Credential error codes (skip session-expired)**:
`INVALID_PIN`, `INVALID_OTP`, `OTP_EXPIRED`, `INVALID_EMAIL`, `SUSPENDED`, `ADMIN_MUST_USE_OTP`, `RATE_LIMITED`

**Session error codes (trigger session-expired)**:
`TOKEN_EXPIRED`, `TOKEN_INVALID`, `EVENT_ACCESS_DENIED`

**Alternatives considered**:
- Only URL-based check — Fragile; requires maintaining a list of auth endpoints
- Only code-based check — Fails when response body can't be parsed (network error)

## R5: Handling Existing Manual Code Fields

**Decision**: Consolidate the two existing manual `code` fields to use `apiErrorHandler` helpers.

**Current state**:
- `requireAuth.js` line 20-24: `res.status(403).json({ error: "...", code: "EVENT_ACCESS_DENIED" })`
- `requireEventMembership.js` line 24-34: `res.status(403).json({ error: "...", code: "EVENT_MEMBERSHIP_REQUIRED" })`

**After**: Both will use `forbiddenError(res, message, 'EVENT_ACCESS_DENIED')` and `forbiddenError(res, message, 'EVENT_MEMBERSHIP_REQUIRED')` respectively, ensuring consistent response shape.

## R6: Test Strategy

**Decision**: Test at three levels — unit (apiErrorHandler), integration (auth endpoints), E2E (user-visible behavior).

**Unit tests** (apiErrorHandler.test.js):
- Each helper function returns `code` when provided
- Each helper function omits `code` when not provided
- Response shape is `{ error: string, code?: string }`

**Integration tests** (auth.test.js, security.test.js):
- Wrong PIN → 401 with `code: "INVALID_PIN"`
- Wrong OTP → 400 with `code: "INVALID_OTP"`
- Expired token → 401 with `code: "TOKEN_EXPIRED"`
- Rate limited → 429 with `code: "RATE_LIMITED"`

**Frontend unit tests** (apiClient.sessionExpiry.test.js):
- 401 with `INVALID_PIN` → does NOT dispatch `session-expired`
- 401 with `TOKEN_EXPIRED` → dispatches `session-expired`
- 401 with no code → dispatches `session-expired` (backward compat)

**E2E tests** (pin-access.spec.js, otp-auth.spec.js):
- Wrong PIN → inline error visible, session dialog NOT visible
- Wrong OTP → inline error visible, session dialog NOT visible

## R7: Scope Boundary for Error Codes

**Decision**: Only add error codes to authentication and authorization error responses (auth.js, events.js verify-pin, middleware). Non-auth errors (404 event not found, 400 rating validation, 500 server errors, quotes, dashboard, items, test-helpers) are out of scope.

**Rationale**: The bug being fixed is specifically about 401 confusion. Adding codes to all 66 error responses would be a large, unrelated refactor. Non-auth error codes can be added incrementally in a future feature.

**In-scope files** (~30 error responses across 8 files):
- `backend/src/utils/apiErrorHandler.js`
- `backend/src/api/auth.js`
- `backend/src/api/events.js` (verify-pin endpoint only)
- `backend/src/middleware/jwtAuth.js`
- `backend/src/middleware/requireAuth.js`
- `backend/src/middleware/requireEventMembership.js`
- `backend/src/middleware/requireRoot.js`
- `frontend/src/services/apiClient.js`

**Out-of-scope files**: ratings.js, dashboard.js, system.js, items.js, quotes.js, health.js, test-helpers.js, xsrfProtection.js, turnstileProtection.js
