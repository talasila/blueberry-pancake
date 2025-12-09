# Implementation Plan: Event PIN Access

**Branch**: `006-event-pin-access` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-event-pin-access/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement PIN-based access control for events in the blind tasting event management application. Every event has a 6-digit PIN automatically generated upon creation. Regular users can access events via PIN entry (full-page UI similar to OTP entry) without OTP authentication. Event administrators can also access events via PIN, but admin pages require OTP authentication. Administrators can regenerate PINs from the admin screen, which invalidates previous PINs. PIN verification sessions persist until PIN regeneration or event completion. Rate limiting prevents brute force attacks (5 attempts per IP/event per 15 minutes). Test OTP "123456" works in dev/test environments for admin page access.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, React Router DOM 7.10.1, jsonwebtoken 9.0.3 (for auth), existing EventService, RateLimitService, EventService and DataRepository patterns  
**Storage**: File-based JSON storage via FileDataRepository (existing) for event data and PIN storage  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: PIN entry validation <500ms, PIN verification <10 seconds, PIN regeneration <2 seconds, admin screen PIN display <3 seconds  
**Constraints**: 6-digit PIN format, rate limiting (5 attempts per IP/event per 15 minutes), PIN sessions valid until regeneration or event completion, test OTP "123456" restricted to dev/test environments, full-page PIN entry UI similar to OTP entry  
**Scale/Scope**: Single application instance, file-based event storage, multiple concurrent users accessing events via PIN, rate limiting per IP and per event independently

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (service layer, repository pattern, middleware structure, React component patterns). Code will be modular with clear separation of concerns (PINService for PIN logic, EventService for event operations, API routes for endpoints, React components for PIN entry UI). Reuse existing authentication middleware, ProtectedRoute component, rate limiting service, and routing patterns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing OTP authentication system (feature 003-otp-auth) for admin page access, RateLimitService for PIN attempt rate limiting, EventService and DataRepository infrastructure, JWT middleware, error handling patterns, AuthPage UI pattern for PIN entry screen, routing patterns, and API client. Use existing test OTP mechanism for dev/test environments. No custom implementations where existing solutions exist.

### III. Maintainability
✅ **PASS**: Clear service boundaries (PINService for PIN generation/validation, EventService for event operations), consistent naming conventions, comprehensive error handling, separation of concerns (API routes, services, UI components, session management). PIN logic isolated from authentication, PIN entry UI isolated from event display, session management isolated from business logic.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for PIN generation, PIN validation, rate limiting logic, session management, PIN regeneration. Integration tests for PIN entry API endpoints, PIN verification flow, admin page OTP requirement, PIN regeneration API. E2E tests for complete flows (PIN entry, event access, admin page OTP requirement, PIN regeneration). All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: Rate limiting prevents brute force attacks (5 attempts per IP/event per 15 minutes), PIN validation on server-side, secure PIN storage, session management for PIN verification, OTP authentication required for admin pages, test OTP restricted to dev/test environments only, proper error messages that don't reveal system internals.

### VI. User Experience Consistency
✅ **PASS**: PIN entry UI will use existing AuthPage UI pattern (full-page with card component), consistent error messaging, loading indicators follow existing patterns, PIN regeneration UI follows existing admin screen patterns, mobile-first responsive design maintained, consistent navigation flows.

### VII. Performance Requirements
✅ **PASS**: PIN entry validation optimized for <500ms, PIN verification <10 seconds, PIN regeneration <2 seconds, admin screen PIN display <3 seconds, efficient PIN storage and retrieval, rate limiting implemented efficiently, performance targets defined in spec.

## Project Structure

### Documentation (this feature)

```text
specs/006-event-pin-access/
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
│   │   └── events.js          # Extend: Add POST /api/events/:eventId/verify-pin, POST /api/events/:eventId/regenerate-pin endpoints
│   ├── services/
│   │   ├── PINService.js      # New: PIN generation, validation, rate limiting logic
│   │   └── EventService.js     # Extend: Add PIN field to event creation, PIN regeneration method
│   ├── middleware/
│   │   ├── requireAuth.js     # Existing: Reuse for OTP authentication
│   │   └── requirePIN.js      # New: PIN verification middleware for event access
│   └── cache/
│       └── CacheService.js   # Extend: PIN verification session storage
│   └── data/
│       └── FileDataRepository.js  # Extend: PIN field in event data model
└── tests/
    ├── integration/
    │   └── events.test.js     # Extend: Add PIN verification, PIN regeneration integration tests
    └── unit/
        ├── PINService.test.js  # New: PIN generation, validation, rate limiting unit tests
        └── EventService.test.js  # Extend: Add PIN generation/regeneration unit tests

frontend/
├── src/
│   ├── components/
│   │   └── PINEntryPage.jsx   # New: Full-page PIN entry component (similar to AuthPage)
│   ├── pages/
│   │   ├── EventPage.jsx      # Extend: Add PIN verification check, redirect to PIN entry if needed
│   │   └── EventAdminPage.jsx # Extend: Add PIN regeneration UI, OTP requirement enforcement
│   ├── services/
│   │   └── apiClient.js       # Extend: Add verifyPIN, regeneratePIN methods
│   ├── contexts/
│   │   └── PINContext.jsx    # New: PIN verification session management
│   └── hooks/
│       └── usePINVerification.js  # New: Hook for PIN verification state management
└── tests/
    ├── integration/
    │   └── pin-access.test.js  # New: PIN entry, verification, regeneration integration tests
    └── unit/
        ├── PINService.test.js  # New: PIN service unit tests
        └── PINEntryPage.test.jsx  # New: PIN entry component unit tests
```

**Structure Decision**: Web application structure (frontend + backend) following existing patterns. Backend extends EventService and adds PINService for PIN-specific logic. Frontend adds PINEntryPage component following AuthPage pattern, extends EventPage and EventAdminPage for PIN integration, and adds PINContext for session management.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
