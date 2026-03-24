# Data Model: Structured Error Codes

**Feature**: 042-structured-error-codes
**Date**: 2026-03-23

## Error Response Entity

The only "data model" change is the addition of a `code` field to error response objects. No database schema changes are needed.

### Error Response Shape

**Before**:
```json
{ "error": "Invalid PIN" }
```

**After**:
```json
{ "error": "Invalid PIN", "code": "INVALID_PIN" }
```

- `error` (string, required): Human-readable error message. Unchanged from current behavior.
- `code` (string, optional): Machine-readable error identifier from the taxonomy below. Omitted when no specific code applies (backward compatibility).

### Error Code Taxonomy

#### Credential Errors (login attempt failures)

These indicate the user provided wrong or invalid credentials during an authentication attempt. The frontend MUST NOT trigger session-expired flow for these codes.

| Code | HTTP Status | Context |
|------|-------------|---------|
| `INVALID_PIN` | 401 | Wrong PIN entered |
| `INVALID_OTP` | 400 | Wrong OTP code entered |
| `OTP_EXPIRED` | 400 | OTP code has expired |
| `INVALID_EMAIL` | 400 | Malformed email address |
| `SUSPENDED` | 403 | User temporarily suspended (too many failed attempts) |
| `ADMIN_MUST_USE_OTP` | 401 | Administrator attempted PIN login |
| `INVALID_DISPLAY_NAME` | 400 | Missing or invalid display name for guest registration |
| `RATE_LIMITED` | 429 | Too many requests (PIN or OTP attempts) |

#### Session Errors (authenticated request failures)

These indicate a previously authenticated session is no longer valid. The frontend SHOULD trigger the session-expired/refresh flow for these codes.

| Code | HTTP Status | Context |
|------|-------------|---------|
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `TOKEN_INVALID` | 401 | JWT is malformed or signature invalid |
| `AUTHENTICATION_REQUIRED` | 401 | No token provided |
| `EVENT_ACCESS_DENIED` | 403 | User lacks access to the requested event |

#### Membership Errors

| Code | HTTP Status | Context |
|------|-------------|---------|
| `EVENT_MEMBERSHIP_REQUIRED` | 403 | User not registered for the event |

#### Authorization Errors

| Code | HTTP Status | Context |
|------|-------------|---------|
| `ADMIN_REQUIRED` | 403 | Operation requires event administrator |
| `OWNER_REQUIRED` | 403 | Operation requires event owner |
| `ROOT_ACCESS_REQUIRED` | 403 | Operation requires root admin |

### Frontend Error Code Sets

For the frontend interceptor, codes are grouped into two sets:

**CREDENTIAL_ERROR_CODES** (skip session-expired dispatch):
```
INVALID_PIN, INVALID_OTP, OTP_EXPIRED, INVALID_EMAIL,
SUSPENDED, ADMIN_MUST_USE_OTP, RATE_LIMITED
```

**SESSION_ERROR_CODES** (trigger session-expired dispatch):
```
TOKEN_EXPIRED, TOKEN_INVALID, AUTHENTICATION_REQUIRED, EVENT_ACCESS_DENIED
```

**Fallback behavior**: Any 401 response without a recognized `code` field is treated as a session error (preserving current behavior).

### Relationships

- Each error response contains exactly one error code (or none)
- Error codes map 1:1 to specific failure conditions
- Multiple endpoints may return the same error code (e.g., `RATE_LIMITED` from both PIN and OTP endpoints)
- The `code` field does not replace or modify the `error` field — both coexist

### State Transitions

No state transitions are introduced. Error codes are stateless metadata attached to error responses.
