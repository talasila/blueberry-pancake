# Implementation Plan: Manage Event Administrators

**Branch**: `007-manage-event-admins` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-manage-event-admins/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement administrator management functionality for events in the blind tasting event management application. Events can have multiple administrators, with the original event creator marked as the "owner" who cannot be deleted. Administrators can add new administrators (one at a time via email) and delete other administrators (except the owner) from the event admin screen. All administrators are automatically added to the users section when created and removed when deleted. The administrators management UI is displayed as a separate card component similar to PIN Management. The data structure uses an `administrators` object with email keys, tracking assignment dates and owner designation. Migration strategy required to convert existing single `administrator` string field to the new `administrators` object structure.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, React Router DOM 7.10.1, jsonwebtoken 9.0.3 (for auth), existing EventService, DataRepository patterns, shadcn UI components (Card, Button, Input)  
**Storage**: File-based JSON storage via FileDataRepository (existing) for event data with administrators object structure  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: Add administrator API response <500ms, delete administrator API response <500ms, administrators list display <1 second, complete add flow <30 seconds, complete delete flow <20 seconds  
**Constraints**: Owner cannot be deleted by anyone (including themselves), at least one administrator must always exist (the owner), administrators object structure with email keys and assignedAt timestamps, atomic updates to both administrators object and users section, test OTP "123456" works in dev/test environments, migration required for existing events  
**Scale/Scope**: Single application instance, file-based event storage, multiple administrators per event, migration of existing events from single administrator field to administrators object

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (service layer, repository pattern, middleware structure, React component patterns). Code will be modular with clear separation of concerns (EventService for administrator management logic, API routes for endpoints, React components for administrators management UI). Reuse existing authentication middleware, Card component patterns, form validation patterns, and error handling patterns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing EventService and DataRepository infrastructure, JWT middleware, authentication patterns, shadcn UI Card component (similar to PIN Management), form validation utilities, error handling patterns, API client patterns, and routing patterns. Use existing test OTP mechanism for dev/test environments. No custom implementations where existing solutions exist.

### III. Maintainability
✅ **PASS**: Clear service boundaries (EventService for administrator management logic, API routes for endpoints), consistent naming conventions, comprehensive error handling, separation of concerns (API routes, services, UI components). Administrator management logic isolated from event creation, UI components isolated from business logic, migration logic isolated from core functionality.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for administrator addition logic, administrator deletion logic, owner protection, duplicate prevention, email validation, atomic updates, migration logic. Integration tests for add administrator API endpoint, delete administrator API endpoint, owner deletion prevention, administrators list retrieval. E2E tests for complete flows (add administrator, delete administrator, owner protection, administrators list display). All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: Administrator operations require authentication (JWT token), owner protection prevents unauthorized deletion, input validation for email addresses, atomic updates prevent data inconsistency, test OTP restricted to dev/test environments only, proper error messages that don't reveal system internals, authorization checks ensure only administrators can manage administrators.

### VI. User Experience Consistency
✅ **PASS**: Administrators management UI will use existing Card component pattern (similar to PIN Management), consistent error messaging, loading indicators follow existing patterns, form validation follows existing patterns, mobile-first responsive design maintained, consistent navigation flows, owner designation clearly displayed.

### VII. Performance Requirements
✅ **PASS**: Add administrator API optimized for <500ms response, delete administrator API optimized for <500ms response, administrators list display <1 second, complete add flow <30 seconds, complete delete flow <20 seconds, efficient administrators object storage and retrieval, atomic updates implemented efficiently, performance targets defined in spec.

## Project Structure

### Documentation (this feature)

```text
specs/007-manage-event-admins/
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
│   │   └── events.js          # Extend: Add POST /api/events/:eventId/administrators, DELETE /api/events/:eventId/administrators/:email endpoints
│   ├── services/
│   │   └── EventService.js     # Extend: Add addAdministrator, deleteAdministrator, getAdministrators, migrateAdministratorField methods
│   └── data/
│       └── FileDataRepository.js  # Extend: Support administrators object structure, migration helper
└── tests/
    ├── integration/
    │   └── events.test.js      # Extend: Add administrator management API tests
    └── unit/
        └── EventService.test.js  # Extend: Add administrator management logic tests

frontend/
├── src/
│   ├── pages/
│   │   └── EventAdminPage.jsx  # Extend: Add Administrators Management card component
│   ├── components/
│   │   └── ui/                 # Existing: Reuse Card, Button, Input components
│   └── services/
│       └── apiClient.js        # Extend: Add addAdministrator, deleteAdministrator, getAdministrators methods
└── tests/
    └── e2e/                    # Add: E2E tests for administrator management flows
```

**Structure Decision**: Web application structure (frontend + backend) following existing patterns. Backend extends EventService and events API routes. Frontend extends EventAdminPage with new Administrators Management card component. All changes follow existing architectural patterns and component structures.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles are satisfied.
