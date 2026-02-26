# API Contract Changes: Bot Protection

## Modified Endpoints

### POST /api/auth/otp/request

**Change**: Accepts `turnstileToken` in request body. In production, requests with invalid or expired tokens are rejected with a generic error (FR-009). Missing tokens trigger fail-open behavior (FR-019), subject to all other rate limits.

**Request Body (updated)**:

```json
{
  "email": "user@example.com",
  "turnstileToken": "0.turnstile-response-token-string..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| turnstileToken | string | Conditional | Turnstile verification token. Invalid/expired tokens are rejected (FR-009). Missing/null tokens trigger fail-open (FR-019), subject to all other rate limits. In dev/test, always-pass test keys ensure verification succeeds (FR-011). |

**New Error Responses**:

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Request could not be processed. Please try again." }` | Missing, invalid, or expired Turnstile token (generic message per FR-009) |
| 429 | `{ "error": "Too many requests. Please try again in N minute(s).", "retryAfter": <seconds> }` | Global rate limit exceeded (100/min in production) |

**Existing responses unchanged** (200 success, 400 email validation, 403 suspended, 429 per-email/IP rate limit, 500 server error).

**Evaluation Order**:

1. Email validation → 400
2. Turnstile verification → 400 (generic)
3. Global rate limit → 429
4. Suspension check → 403
5. Per-email/IP rate limit → 429
6. Generate OTP + send email → 200

---

### GET /api/events/:eventId/check-admin

**Change**: Accepts `turnstileToken` query parameter. In production, requests with invalid or expired tokens are rejected with a generic error (FR-009). Missing tokens trigger fail-open behavior (FR-019), subject to all other rate limits.

**Query Parameters (updated)**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | Email address to check |
| turnstileToken | string | Conditional | Turnstile verification token. Same rules as OTP endpoint: invalid/expired → 400; missing → fail-open (FR-019). |

**New Error Responses**:

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Request could not be processed. Please try again." }` | Missing, invalid, or expired Turnstile token |

**Existing responses unchanged** (200 with `{ isAdmin: boolean }`).

---

## No Changes to These Endpoints

The following unauthenticated endpoints are **not** Turnstile-protected:

| Endpoint | Reason |
|----------|--------|
| POST /api/auth/otp/verify | Already protected by per-email suspension after 5 failures; no expensive side effect |
| POST /api/events/:eventId/verify-pin | Event-scoped, rate-limited; attacker needs valid event ID first |
| POST /api/auth/refresh | Requires valid refresh token cookie |
| POST /api/auth/logout | No side effects |

## External API Dependency

### Cloudflare Turnstile siteverify

**Called by**: TurnstileService (backend)

**Endpoint**: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`

**Request**:
```json
{
  "secret": "<TURNSTILE_SECRET_KEY>",
  "response": "<client-token>",
  "remoteip": "<client-ip>"  
}
```

**Response**:
```json
{
  "success": true,
  "challenge_ts": "2026-02-25T12:00:00.000Z",
  "hostname": "blindwinetasting.party",
  "error-codes": []
}
```

**Failure modes**: Network timeout, 5xx from Cloudflare, invalid secret key. All trigger fail-open (FR-013).
