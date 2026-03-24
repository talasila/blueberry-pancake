# Implementation Plan: Structured Error Codes

**Branch**: `042-structured-error-codes` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/042-structured-error-codes/spec.md`

## Summary

Add machine-readable error codes to all authentication and authorization error responses, and update the frontend's 401 interceptor to distinguish credential errors (wrong PIN/OTP) from session errors (expired token). This fixes a bug where entering a wrong PIN triggers the "Welcome back! Your session has expired" dialog instead of showing an inline error message.

**Two-layer approach:**
1. **Backend**: Add a `code` field to every auth/authz error response via `apiErrorHandler.js` utilities
2. **Frontend**: Update `apiClient.request()` to parse the `code` field on 401 responses and only dispatch `session-expired` for actual session errors

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0
**Primary Dependencies**: Express 5.2.1 (backend), React 19.2.1 (frontend)
**Storage**: DynamoDB (no schema changes needed)
**Testing**: Vitest 1.6.1 (unit), Supertest 7.1.4 (integration), Playwright 1.57.0 (E2E)
**Target Platform**: AWS Lambda + CloudFront (backend), Browser SPA (frontend)
**Project Type**: Web application (monorepo: backend + frontend)
**Performance Goals**: No performance impact — adds a string field to existing error responses
**Constraints**: Backward compatible — responses without `code` field must be treated as session errors
**Scale/Scope**: ~66 direct `res.status().json()` calls across backend; only auth/authz subset in scope (~30 calls across 8 files)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Error code addition is additive; improves response clarity |
| II. DRY | PASS | Error codes centralized in `apiErrorHandler.js`; no duplication. Existing two manual `code` usages (`EVENT_MEMBERSHIP_REQUIRED`, `EVENT_ACCESS_DENIED`) will be consolidated into the shared utility |
| III. Maintainability | PASS | Error code taxonomy documented; clear naming conventions |
| IV. Testing Standards | PASS | Plan includes unit, integration, and E2E test updates |
| V. Security | PASS | Error codes are informational; no sensitive data exposed. Credential vs session distinction improves security UX |
| VI. UX Consistency | PASS | Fixes misleading dialog; ensures correct error feedback for all auth flows |
| VII. Performance | PASS | Adding a string field to JSON responses has negligible overhead |

**Gate result: PASS** — No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/042-structured-error-codes/
├── plan.md              # This file
├── research.md          # Phase 0: Research findings
├── data-model.md        # Phase 1: Error code taxonomy
├── quickstart.md        # Phase 1: Quick implementation guide
├── contracts/           # Phase 1: Error response contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── utils/
│   │   └── apiErrorHandler.js     # Add code param to all error helpers
│   ├── api/
│   │   ├── auth.js                # Add codes to OTP error responses
│   │   └── events.js              # Add codes to PIN error responses
│   └── middleware/
│       ├── jwtAuth.js             # Add codes to token error responses
│       ├── requireAuth.js         # Already has EVENT_ACCESS_DENIED — consolidate
│       ├── requireEventMembership.js  # Already has EVENT_MEMBERSHIP_REQUIRED — consolidate
│       └── requireRoot.js         # Add codes to root admin errors
└── tests/
    ├── unit/
    │   └── utils/apiErrorHandler.test.js  # Test code field in all helpers
    └── integration/
        ├── auth.test.js           # Assert error codes in OTP responses
        └── security.test.js       # Assert error codes in middleware responses

frontend/
├── src/
│   └── services/
│       └── apiClient.js           # Context-aware 401 interceptor
└── tests/
    ├── unit/
    │   └── apiClient.sessionExpiry.test.js  # Test credential vs session routing
    └── e2e/
        └── specs/
            ├── pin-access.spec.js     # Verify wrong PIN shows inline error
            └── otp-auth.spec.js       # Verify wrong OTP shows inline error
```

**Structure Decision**: Existing web application structure (backend + frontend monorepo). No new files or directories needed — all changes are modifications to existing files.
