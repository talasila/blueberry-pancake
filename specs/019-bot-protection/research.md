# Research: Bot Protection

## 1. Cloudflare Turnstile API

### Decision: Use Cloudflare Turnstile invisible widget + server-side siteverify

**Rationale**: Turnstile provides invisible bot detection with zero user friction, a free tier of 1M verifications/month, and well-documented test keys for dev/CI. It's battle-tested at Cloudflare's scale and detects sophisticated bots (headless browsers, automation frameworks) that simpler approaches like honeypots cannot.

**Alternatives considered**:
- Proof-of-Work (PoW): No external dependency, but only raises cost threshold without actually distinguishing humans from bots. More custom code to maintain.
- reCAPTCHA v3: Similar capability to Turnstile but with Google privacy concerns and less generous free tier.
- Honeypot fields: Only catches bots that render HTML forms; the OTP endpoint is CSRF-exempt and callable directly via curl, so honeypots are ineffective for the primary threat.

### Client-Side Integration

- **Script URL**: `https://challenges.cloudflare.com/turnstile/v0/api.js`
- **Widget rendering**: Implicit (via `cf-turnstile` class div) or explicit (via `turnstile.render()` JS API)
- **Recommended approach**: Explicit rendering via React hook for lifecycle control
- **Invisible mode sitekey**: `1x00000000000000000000BB` (test, always passes)
- **Callback**: `onSuccess(token)` provides the response token to include in form submission

### Server-Side Verification

- **Endpoint**: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
- **Content-Type**: `application/x-www-form-urlencoded` or `application/json`
- **Required fields**: `secret` (secret key), `response` (client token)
- **Optional fields**: `remoteip` (client IP for additional validation), `idempotency_key` (UUID for retries)
- **Response**: `{ success: boolean, "error-codes": string[], challenge_ts: string, hostname: string }`
- **Token validity**: 300 seconds (5 minutes)
- **Token usage**: Single-use — subsequent verify attempts return error
- **Token size**: Up to 2,048 characters

### Test Keys (Cloudflare-published, safe to hardcode)

| Purpose | Site Key | Secret Key |
|---------|----------|------------|
| Always passes (invisible) | `1x00000000000000000000BB` | `1x0000000000000000000000000000000AA` |
| Always passes (visible) | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Always blocks | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |
| Token already spent | — | `3x0000000000000000000000000000000AA` |

Test tokens generate a dummy response (`XXXX.DUMMY.TOKEN.XXXX`) that only test secret keys accept. Production secret keys reject dummy tokens, preventing misconfiguration.

### CSP Requirements

The Turnstile script and iframes require these CSP additions:
- `script-src`: `https://challenges.cloudflare.com`
- `frame-src`: `https://challenges.cloudflare.com`

## 2. Global Rate Limit — DynamoDB Counter Pattern

### Decision: Single atomic counter in DynamoDB using the existing rate limit infrastructure

**Rationale**: The app already uses DynamoDB for per-email and per-IP rate limits with TTL-based expiration. Adding a global counter follows the exact same pattern with a fixed key, avoiding any new infrastructure.

**Alternatives considered**:
- In-memory counter: Doesn't work in Lambda (stateless, concurrent instances). Each Lambda invocation is isolated.
- Redis/ElastiCache: Accurate but adds a new service dependency and cost. Overkill for a single counter.
- DynamoDB atomic counter: Uses `UpdateExpression ADD count :inc` for atomic increment. Consistent with existing `incrementRateLimit` method.

### Implementation Pattern

- **PK**: `RATELIMIT#global#otp-request`
- **SK**: `RATELIMIT`
- **Attributes**: `count` (number), `windowStart` (ISO string), `TTL` (Unix seconds)
- **Window**: 60 seconds (1 minute)
- **Limit**: 100 (production), 10000 (development/test)
- **Reset**: Counter auto-expires via DynamoDB TTL. New requests after window expiry create a fresh counter.

This reuses the existing `rateLimitPK()`, `getRateLimit()`, `incrementRateLimit()`, and `resetRateLimit()` methods in DynamoDBRepository with no schema changes.

### Evaluation Order in auth.js `/otp/request`

```
1. Email validation (existing)
2. Turnstile token verification (NEW — reject bots before any DB calls)
3. Global rate limit check (NEW — reject if >100/min total)
4. Suspension check (existing)
5. Per-email + per-IP rate limit (existing)
6. Generate OTP + send email (existing)
```

Turnstile is checked first because it's the cheapest rejection (no DB call). Global rate limit is second because it's a single DB read. This minimizes cost for rejected requests.

## 3. Frontend Integration Pattern

### Decision: Custom React hook (`useTurnstile`) with explicit rendering

**Rationale**: Explicit rendering via `turnstile.render()` provides full lifecycle control — the hook manages widget mounting, token retrieval, error handling, and cleanup. This avoids race conditions with React's virtual DOM and lets the widget be conditionally rendered.

**Alternatives considered**:
- Implicit rendering (div with `cf-turnstile` class): Simpler but conflicts with React's DOM management; can cause double-rendering or stale tokens.
- Third-party React wrapper (e.g., `react-turnstile`): Adds a dependency; the hook is ~30 lines of code.

### Hook API

```javascript
const { token, isLoading, error, resetWidget } = useTurnstile(siteKey);
```

- `token`: The Turnstile response token (null until solved)
- `isLoading`: True while widget is initializing
- `error`: Error message if widget fails to load (triggers fail-open: token stays null)
- `resetWidget`: Function to regenerate a fresh token (e.g., after a failed submission)

### Fail-Open on Client Side (FR-019)

If the Turnstile script fails to load (ad blocker, network error), `window.turnstile` will be undefined. The hook detects this and sets `error` without blocking submission. The form submits with `turnstileToken: null`, and the backend falls open per FR-013/FR-019.
