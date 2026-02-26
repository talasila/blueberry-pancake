# Quickstart: Bot Protection

## Local Development (Zero Config)

Bot protection works out of the box in development. Test keys are hardcoded as defaults.

```bash
# No additional setup required. Start the app normally:
cd backend && npm run dev
cd frontend && npm run dev
```

The Turnstile widget renders invisibly and always passes using Cloudflare's test keys:
- Frontend site key: `1x00000000000000000000BB` (from `.env.development`)
- Backend secret key: `1x0000000000000000000000000000000AA` (hardcoded default when NODE_ENV !== 'production')

Global rate limit is set to 10,000/minute in development (effectively disabled).

## Running Tests

```bash
# E2E tests — no changes needed, test keys bypass Turnstile automatically
cd frontend && npm run test:e2e

# Unit tests — include new bot protection tests
cd backend && npm test

# Production smoke tests — no changes needed, headed browser handles Turnstile
SMOKE_EMAIL=you@example.com ./scripts/smoketests.sh https://your-app.example.com
```

## Production Deployment

### 1. Get Turnstile Keys from Cloudflare

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com)
2. Go to **Turnstile** → **Add Site**
3. Set widget type to **Invisible**
4. Copy the **Site Key** and **Secret Key**

### 2. Configure Backend (template.yaml)

Add `TURNSTILE_SECRET_KEY` to the Lambda function's environment variables:

```yaml
Parameters:
  TurnstileSecretKey:
    Type: String
    NoEcho: true

# In the function's Environment.Variables:
TURNSTILE_SECRET_KEY: !Ref TurnstileSecretKey
```

### 3. Configure Frontend (deploy script)

Add `VITE_TURNSTILE_SITE_KEY` to the frontend build in `scripts/deploy-prod.sh`:

```bash
(cd frontend && VITE_API_BASE_URL="${API_URL}/api" VITE_TURNSTILE_SITE_KEY="your-real-site-key" npm run build)
```

### 4. Deploy

```bash
# Deploy backend with the Turnstile secret key parameter
sam deploy --parameter-overrides TurnstileSecretKey=your-real-secret-key ...

# Deploy frontend (build includes the site key)
./scripts/deploy-prod.sh
```

## Verification

After deployment, verify bot protection is active:

```bash
# Missing token → fails open (FR-019), hits rate limits normally:
curl -X POST https://your-api.com/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Expected: 200 (or 429 if rate limited) — missing token is NOT rejected

# Invalid/expired token → rejected with generic 400 (FR-009):
curl -X POST https://your-api.com/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "turnstileToken": "invalid-token"}'
# Expected: 400 {"error": "Request could not be processed. Please try again."}
```

Sign in normally via the browser — the Turnstile widget should complete invisibly and the OTP should arrive as usual.
