# API Contract: Error Responses

**Feature**: 042-structured-error-codes
**Date**: 2026-03-23

## Error Response Format

All authentication and authorization error responses MUST follow this shape:

```json
{
  "error": "<human-readable message>",
  "code": "<MACHINE_READABLE_CODE>"
}
```

The `code` field is optional for backward compatibility. When present, it MUST be a string from the defined taxonomy.

## PIN Verification Errors

**Endpoint**: `POST /api/events/:eventId/verify-pin`

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| Missing email | 400 | `INVALID_EMAIL` | "Email address is required" |
| Invalid email format | 400 | `INVALID_EMAIL` | "Invalid email format" |
| Missing display name | 400 | `INVALID_DISPLAY_NAME` | "Display name is required" |
| Invalid PIN format | 400 | `INVALID_PIN` | "PIN must be exactly 6 digits" |
| Wrong PIN | 401 | `INVALID_PIN` | "Invalid PIN" |
| Admin tried PIN | 401 | `ADMIN_MUST_USE_OTP` | "Administrators must use OTP authentication..." |
| Rate limited | 429 | `RATE_LIMITED` | "Too many attempts. Please try again in X minutes." |
| Event not found | 404 | `EVENT_NOT_FOUND` | "Event not found" |

## OTP Request Errors

**Endpoint**: `POST /api/auth/otp/request`

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| Missing email | 400 | `INVALID_EMAIL` | "Email address is required" |
| Invalid email format | 400 | `INVALID_EMAIL` | "Invalid email address format" |
| Suspended | 403 | `SUSPENDED` | "Account is temporarily suspended..." |
| Email send failure | 500 | — | "Failed to send OTP email" |

## OTP Verification Errors

**Endpoint**: `POST /api/auth/otp/verify`

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| Missing email | 400 | `INVALID_EMAIL` | "Email address is required" |
| Missing OTP | 400 | `INVALID_OTP` | "OTP code is required" |
| Invalid email format | 400 | `INVALID_EMAIL` | "Invalid email address format" |
| Wrong OTP | 400 | `INVALID_OTP` | "Invalid or expired OTP code" |
| Expired OTP | 400 | `OTP_EXPIRED` | "OTP has expired" |
| Suspended | 403 | `SUSPENDED` | "Account is temporarily suspended..." |
| Suspension triggered | 403 | `SUSPENDED` | "Too many failed attempts. Your account has been temporarily suspended for 5 minutes." |

## Token Refresh Errors

**Endpoint**: `POST /api/auth/refresh`

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| Invalid refresh token | 401 | `TOKEN_INVALID` | "Invalid refresh token" |

## JWT Middleware Errors

**Middleware**: `jwtAuth.js` (applied to all protected routes)

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| No token provided | 401 | `AUTHENTICATION_REQUIRED` | "Missing or invalid authorization" |
| Token expired | 401 | `TOKEN_EXPIRED` | "Token expired" |
| Invalid token | 401 | `TOKEN_INVALID` | "Invalid token" |

## Authorization Middleware Errors

**Middleware**: `requireAuth.js`

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| No event access | 403 | `EVENT_ACCESS_DENIED` | "Access denied: You do not have access to this event..." |

**Middleware**: `requireEventMembership.js`

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| Not registered | 403 | `EVENT_MEMBERSHIP_REQUIRED` | "User is not registered for this event" |

**Middleware**: `requireRoot.js`

| Condition | Status | code | error (example) |
|-----------|--------|------|-----------------|
| No token | 401 | `AUTHENTICATION_REQUIRED` | "Authentication required" |
| Not root admin | 403 | `ROOT_ACCESS_REQUIRED` | "Root access required" |

## Frontend Interceptor Contract

The frontend `apiClient.request()` method:

1. On **any 401 response**: Read response body before taking action
2. If `code` is in `CREDENTIAL_ERROR_CODES`: throw error (do NOT dispatch `session-expired`)
3. If `code` is in `SESSION_ERROR_CODES` or absent: proceed with session-expired flow
4. **Safety net**: Requests to `/verify-pin`, `/otp/verify`, `/otp/request` always skip session-expired

```
CREDENTIAL_ERROR_CODES = [
  'INVALID_PIN', 'INVALID_OTP', 'OTP_EXPIRED', 'INVALID_EMAIL',
  'SUSPENDED', 'ADMIN_MUST_USE_OTP', 'RATE_LIMITED'
]
```
