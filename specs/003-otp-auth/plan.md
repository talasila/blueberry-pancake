# Implementation Plan: OTP Authentication

**Branch**: `003-otp-auth` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-otp-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement email-based OTP (One-Time Password) authentication system for the blind tasting event management application. Users request a 6-digit OTP via email, verify it within 10 minutes, and receive a JWT token for accessing protected pages. System includes rate limiting (per email and IP), failed attempt tracking (5 max attempts, 5-minute suspension), and test OTP bypass for development/testing environments. All pages except landing page require authentication.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, jsonwebtoken 9.0.3, Resend (email service), node-cache 5.1.2, React 19.2.1, React Router DOM 7.10.1  
**Storage**: File-based (JSON for OTP/suspension state) with node-cache for in-memory rate limiting and OTP storage  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: OTP email delivery within 10 seconds (95% of requests), authentication flow completion under 2 minutes, rate limit checks <50ms  
**Constraints**: OTP expiration (10 minutes), rate limiting (3 per email AND 5 per IP per 15 minutes), max 5 failed attempts per email, test OTP only in dev/test environments  
**Scale/Scope**: Single application instance, in-memory rate limiting and OTP storage (can scale to Redis later), file-based suspension tracking

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (middleware structure, service layer, repository pattern). Code will be modular with clear separation of concerns (OTP service, email service, rate limiting service, suspension tracking).

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing JWT middleware (`jwtAuth.js`), configuration system (`configLoader.js`), caching layer (`CacheService.js`), and error handling patterns. Rate limiting will use existing node-cache infrastructure. No custom implementations where battle-tested packages exist (Resend for email, jsonwebtoken for JWT).

### III. Maintainability
✅ **PASS**: Clear service boundaries (OTPService, EmailService, RateLimitService, SuspensionService), consistent naming conventions, comprehensive error handling, and separation of concerns. OTP logic isolated from email delivery, rate limiting isolated from authentication flow.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for OTP generation/validation, rate limiting logic, suspension tracking. Integration tests for OTP request/verification flows, email delivery (mocked), JWT token generation. E2E tests for complete authentication flow, protected page access, test OTP behavior. All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: OTP codes use cryptographically secure random generation, rate limiting prevents abuse, suspension prevents brute force, test OTP restricted to dev/test environments only, JWT tokens follow existing secure patterns, email addresses validated, sensitive data (API keys) via environment variables.

### VI. User Experience Consistency
✅ **PASS**: Authentication UI will use existing shadcn UI components (Input, Button, Card), consistent error messaging patterns, redirect behavior follows established routing patterns, mobile-first responsive design maintained.

### VII. Performance Requirements
✅ **PASS**: Rate limiting uses in-memory cache (fast lookups), OTP storage optimized for quick validation, email delivery async to avoid blocking, JWT validation uses existing optimized middleware, performance targets defined in spec (10s email delivery, 2min auth flow).

## Project Structure

### Documentation (this feature)

```text
specs/003-otp-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── auth.js          # OTP request and verification endpoints
│   ├── services/
│   │   ├── OTPService.js     # OTP generation, validation, storage
│   │   ├── EmailService.js   # Resend email integration
│   │   ├── RateLimitService.js  # Rate limiting (email + IP)
│   │   └── SuspensionService.js # Suspension tracking and validation
│   ├── middleware/
│   │   ├── jwtAuth.js        # Existing - JWT validation
│   │   └── requireAuth.js   # New - Protect routes (uses jwtAuth)
│   └── config/
│       └── configLoader.js   # Existing - Configuration management
└── tests/
    ├── unit/
    │   ├── OTPService.test.js
    │   ├── RateLimitService.test.js
    │   └── SuspensionService.test.js
    └── integration/
        └── auth.test.js      # OTP request/verification flows

frontend/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx   # Existing - No auth required
│   │   └── AuthPage.jsx      # New - OTP request/verification UI
│   ├── components/
│   │   └── ProtectedRoute.jsx  # New - Route guard component
│   ├── services/
│   │   └── apiClient.js      # Existing - Update for auth endpoints
│   └── App.jsx               # Update - Add route protection
└── tests/
    ├── unit/
    │   ├── AuthPage.test.jsx
    │   └── ProtectedRoute.test.jsx
    └── e2e/
        └── features/
            └── authentication.feature  # Gherkin scenarios
```

**Structure Decision**: Web application structure (frontend + backend) following existing patterns. Backend services organized by domain (OTP, Email, Rate Limiting, Suspension), frontend uses React Router for protected routes. All follows established patterns from baseline setup.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all requirements align with constitution principles.
