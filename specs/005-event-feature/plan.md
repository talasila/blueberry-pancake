# Implementation Plan: Event Feature

**Branch**: `005-event-feature` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-event-feature/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement event page access and navigation functionality for the blind tasting event management application. Authenticated users can access event main pages at `/event/<event-id>` where ratings will happen. Event administrators can access admin pages at `/event/<event-id>/admin` for event administration. Event names appear in the application header when viewing event pages. Administrators can navigate between main and admin pages. System periodically polls for event state updates and validates state on user actions to reflect administrator changes (e.g., pausing events).

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, React Router DOM 7.10.1, jsonwebtoken 9.0.3 (for auth), existing EventService and DataRepository patterns  
**Storage**: File-based JSON storage via FileDataRepository (existing) for event data retrieval  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: Event page load <2 seconds (p95), admin page load <2 seconds (p95), navigation between pages <1 second, polling interval 30-60 seconds  
**Constraints**: Protected routes requiring OTP authentication, case-insensitive email comparison for administrator identification, periodic polling for state updates, event state validation on user actions, header event name display with trimming  
**Scale/Scope**: Single application instance, file-based event storage, multiple concurrent users viewing same event, polling for state synchronization

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (service layer, repository pattern, middleware structure, React component patterns). Code will be modular with clear separation of concerns (EventService for business logic, API routes for endpoints, React components for UI, polling logic isolated). Reuse existing authentication middleware, ProtectedRoute component, and routing patterns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing OTP authentication system (feature 003-otp-auth), ProtectedRoute component, EventService and DataRepository infrastructure, JWT middleware, error handling patterns, Header component, routing patterns, and API client. Use React Router for route protection and navigation. No custom implementations where existing solutions exist.

### III. Maintainability
✅ **PASS**: Clear component boundaries (EventPage, EventAdminPage, Header updates), consistent naming conventions, comprehensive error handling, separation of concerns (API routes, services, UI components, polling logic). Event access logic isolated from authentication, polling logic isolated from UI components.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for event access logic, administrator identification (case-insensitive email comparison), polling mechanism, state validation. Integration tests for event page API endpoints, admin page access control, navigation flows. E2E tests for complete flows (access event page, access admin page, navigation, state updates). All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: Protected routes requiring OTP authentication, administrator access control (case-insensitive email comparison), event existence validation, JWT token validation on all requests, no unauthorized access to admin pages, proper error messages that don't reveal system internals.

### VI. User Experience Consistency
✅ **PASS**: Event pages will use existing UI component patterns, consistent error messaging, loading indicators follow existing patterns, header event name display maintains visual consistency, navigation controls follow existing button/link patterns, mobile-first responsive design maintained, polling updates are seamless.

### VII. Performance Requirements
✅ **PASS**: Event page load optimized for <2 seconds, admin page load <2 seconds, navigation between pages <1 second, polling interval balanced (30-60 seconds) to minimize server load while maintaining freshness, efficient event data retrieval with caching, performance targets defined in spec.

## Project Structure

### Documentation (this feature)

```text
specs/005-event-feature/
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
│   │   └── events.js          # Extend: Add GET /api/events/:eventId endpoint
│   ├── services/
│   │   └── EventService.js   # Extend: Add getEvent method for event retrieval
│   └── middleware/
│       └── requireAuth.js     # Existing: Reuse for authentication
└── tests/
    ├── integration/
    │   └── events.test.js     # Extend: Add event retrieval integration tests
    └── unit/
        └── EventService.test.js  # Extend: Add getEvent unit tests

frontend/
├── src/
│   ├── pages/
│   │   ├── EventPage.jsx      # New: Event main page component
│   │   └── EventAdminPage.jsx # New: Event admin page component
│   ├── components/
│   │   ├── ProtectedRoute.jsx  # Existing: Reuse for route protection
│   │   ├── Header.jsx          # Extend: Add event name display logic
│   │   └── AdminRoute.jsx     # New: Route protection for admin pages
│   ├── contexts/
│   │   └── EventContext.jsx   # New: Context for sharing event data with Header
│   ├── hooks/
│   │   ├── useEvent.js        # New: Hook for event data fetching
│   │   └── useEventPolling.js # New: Hook for periodic polling logic
│   └── services/
│       └── apiClient.js       # Extend: Add getEvent API method
└── tests/
    ├── e2e/
    │   └── features/
    │       └── event-access.feature  # New: E2E test scenarios
    └── unit/
        ├── EventPage.test.jsx        # New: Component unit tests
        └── useEvent.test.js         # New: Hook unit tests
```

**Structure Decision**: Web application structure (frontend + backend) is already established. This feature extends existing backend API and frontend components. New components follow existing patterns: pages for route-level components, hooks for reusable logic, services for API communication.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | No violations - all patterns follow existing architecture |
