# Implementation Plan: Bot Protection

**Branch**: `019-bot-protection` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-bot-protection/spec.md`

## Summary

Add two layers of bot protection to the OTP request and email entry endpoints: a global rate limit (backend-only, caps total OTP requests at 100/minute across all callers) and Cloudflare Turnstile integration (invisible browser challenge + server-side token verification). The global rate limit extends the existing DynamoDB-backed RateLimitService. Turnstile adds an invisible widget to AuthPage and EmailEntryPage, with server-side inline verification. Both layers fail open to preserve availability, falling back to existing per-email/IP rate limits.

## Technical Context

**Language/Version**: Node.js 22.12.0+ (backend), React 19.2.1 (frontend)
**Primary Dependencies**: Express 5.2.1, @aws-sdk/client-dynamodb ^3.600.0, Vite 6.0.5, Tailwind CSS 4.1.17
**New Dependencies**: None (backend uses native `fetch` for Turnstile siteverify; frontend uses Turnstile script tag)
**Storage**: DynamoDB single-table design (PAY_PER_REQUEST, TTL enabled)
**Testing**: Vitest (unit), Playwright + Cucumber (E2E), Playwright (smoke)
**Target Platform**: AWS Lambda (nodejs22.x) + API Gateway HTTP API + CloudFront + S3
**Project Type**: Web application (backend + frontend)
**Performance Goals**: Turnstile verification adds <200ms to OTP request latency; global rate limit check adds <50ms
**Constraints**: No new npm dependencies; Turnstile free tier (1M/month); fail-open on all external failures
**Scale/Scope**: ~6 backend files modified/created, ~5 frontend files modified/created, ~3 config/deploy files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New service follows existing patterns (RateLimitService, xsrfProtection) |
| II. DRY | PASS | Turnstile verification is a single reusable middleware; global rate limit extends existing RateLimitService |
| III. Maintainability | PASS | Configuration follows existing env var patterns; no dead code introduced |
| IV. Testing Standards | PASS | Unit tests for new services, E2E bypass via test keys, smoke test unchanged |
| V. Security | PASS | This feature directly addresses security (bot protection). Secret keys via env vars, fail-open preserves availability |
| VI. UX Consistency | PASS | Turnstile is invisible; no new UI elements visible to users |
| VII. Performance | PASS | Turnstile adds <200ms (async script, parallel with user typing); global rate limit is a single DynamoDB read |

No violations — no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/019-bot-protection/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: Turnstile API details, DynamoDB counter patterns
├── data-model.md        # Phase 1: Global rate limit counter entity
├── quickstart.md        # Phase 1: Setup guide for dev/test/prod
├── contracts/           # Phase 1: API contract changes
│   └── turnstile-verification.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── auth.js                    # MODIFY: add global rate limit + Turnstile verification to /otp/request
│   │   └── events.js                  # MODIFY: add Turnstile verification to /check-admin
│   ├── middleware/
│   │   └── turnstileProtection.js     # NEW: reusable Turnstile verification middleware
│   ├── services/
│   │   ├── RateLimitService.js        # MODIFY: add checkGlobalLimit() method
│   │   └── TurnstileService.js        # NEW: Cloudflare siteverify API client
│   ├── app.js                         # MODIFY: update CSP for Turnstile script domain
│   └── config/
│       └── configLoader.js            # (no change — env vars handled directly)
└── tests/
    └── unit/
        ├── TurnstileService.test.js   # NEW: unit tests for Turnstile verification
        ├── globalRateLimit.test.js    # NEW: unit tests for global rate limit
        └── turnstileProtection.test.js # NEW: unit tests for Turnstile verification function

frontend/
├── index.html                         # MODIFY: add Turnstile script tag
├── .env.development                   # NEW: VITE_TURNSTILE_SITE_KEY with test key
├── .env.production                    # MODIFY: add VITE_TURNSTILE_SITE_KEY placeholder
├── src/
│   ├── hooks/
│   │   └── useTurnstile.js            # NEW: React hook for Turnstile widget lifecycle
│   ├── pages/
│   │   ├── AuthPage.jsx               # MODIFY: integrate Turnstile widget, pass token
│   │   └── EmailEntryPage.jsx         # MODIFY: integrate Turnstile widget, pass token
│   └── services/
│       └── apiClient.js               # MODIFY: update requestOTP() and checkEventAdmin() to pass Turnstile token

config/
└── (no changes — Turnstile uses env vars, not config files)

scripts/
└── deploy-prod.sh                     # MODIFY: add VITE_TURNSTILE_SITE_KEY to frontend build

template.yaml                          # MODIFY: add TURNSTILE_SECRET_KEY parameter and env var
```

**Structure Decision**: Follows existing web application layout. New backend files mirror existing patterns (TurnstileService follows EmailService/OTPService pattern; turnstileProtection middleware follows xsrfProtection pattern). Frontend uses a custom hook for Turnstile widget management.
