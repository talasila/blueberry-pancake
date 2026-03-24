# Implementation Plan: Fix Stale Session Recovery for PIN Guests

**Branch**: `043-fix-pin-session-recovery` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/043-fix-pin-session-recovery/spec.md`

## Summary

PIN-authenticated guests are trapped in an unrecoverable error loop when their session expires after being idle (typically overnight). The root causes are: (1) `isAuthenticated()` destructively clears session state, racing with concurrent readers; (2) the refresh endpoint only handles OTP users; (3) PIN sessions lack the email needed for re-authentication; (4) old refresh tokens aren't invalidated on PIN re-auth; (5) error messages are misleading.

The fix makes `isAuthenticated()` side-effect-free, extends the refresh token schema to be auth-method-aware, enables silent refresh for PIN users, persists the guest's email for fallback recovery, invalidates old refresh tokens on re-auth, and improves error message accuracy.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0
**Primary Dependencies**: Express 5.2.1 (backend), React 19.2.1 (frontend), jsonwebtoken, Radix UI, Tailwind CSS 4.1.17
**Storage**: DynamoDB (single-table design) — refresh tokens stored as `REFRESH#{tokenHash}` items; localStorage for client-side session state
**Testing**: Vitest (unit), Supertest (integration), Playwright (E2E)
**Target Platform**: Web (browser + Node.js Lambda backend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Silent refresh must be invisible — no user-perceived delay
**Constraints**: Backward compatible with existing refresh tokens (missing new fields → OTP fallback)
**Scale/Scope**: 7 files modified, ~200-300 lines changed across frontend and backend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Bug fix with clear, focused changes. Each method has a single responsibility after refactoring. |
| II. DRY | PASS | Consolidates session clearing into one location (`clearExpiredSession`). Reuses existing refresh infrastructure. |
| III. Maintainability | PASS | Splitting `isAuthenticated()` improves clarity. Backward-compatible schema extension. |
| IV. Testing Standards | PASS | Plan includes unit, integration, and E2E tests. Fills existing gap (no refresh endpoint tests). |
| V. Security | PASS | Refresh token rotation preserved. Old tokens invalidated. Email stored locally per accepted privacy tradeoff (clarification session 2026-03-24). |
| VI. UX Consistency | PASS | SessionExpiredDialog behavior unchanged visually. Silent refresh is invisible. Error messages become more accurate. |
| VII. Performance | PASS | No new API calls. Silent refresh reuses existing refresh endpoint. DynamoDB item size increase is negligible (~100 bytes per record). |

**Post-design re-check**: All gates still pass. No new abstractions or patterns introduced — changes extend existing mechanisms.

## Project Structure

### Documentation (this feature)

```text
specs/043-fix-pin-session-recovery/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings and decisions
├── data-model.md        # Phase 1: entity changes and state transitions
├── quickstart.md        # Phase 1: implementation guide with verification steps
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── auth.js                    # Refresh endpoint — auth-method-aware branching
│   │   └── events.js                  # verify-pin — invalidate old refresh token, pass metadata
│   ├── data/
│   │   └── DynamoDBRepository.js      # storeRefreshToken/getRefreshToken — new metadata fields
│   └── middleware/
│       └── jwtAuth.js                 # generateRefreshToken/validateRefreshToken — metadata support
└── tests/
    ├── integration/
    │   └── auth.test.js               # New refresh endpoint tests (PIN, OTP, legacy, expired)
    └── unit/
        └── middleware/
            └── jwtAuth.test.js        # generateRefreshToken/validateRefreshToken with metadata

frontend/
├── src/
│   ├── components/
│   │   └── SessionExpiredDialog.jsx   # Recovery email fallback, accurate error messages
│   ├── pages/
│   │   └── PINEntryPage.jsx           # Persist email to pin:email:{eventId}
│   └── services/
│       └── apiClient.js               # isAuthenticated() pure, clearExpiredSession(), 401 refresh for all
└── tests/
    ├── e2e/
    │   └── specs/
    │       └── session-expiry.spec.js # New: PIN silent renewal, prompted recovery, error accuracy
    └── unit/
        ├── apiClient.sessionExpiry.test.js  # New: pure isAuthenticated, clearExpiredSession, PIN refresh
        └── SessionExpiredDialog.test.jsx    # New: recovery email, error message variants
```

**Structure Decision**: Existing web application structure (backend/ + frontend/). All changes are modifications to existing files — no new files created except additional test cases in existing test files.

## Complexity Tracking

No constitution violations. All changes extend existing patterns without introducing new abstractions, layers, or dependencies.
