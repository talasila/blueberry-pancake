# Implementation Plan: Manage Event State

**Branch**: `001-event-state-management` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-event-state-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement event state management functionality for the blind tasting event management application. Events can transition between four states: "created", "started", "paused", and "completed". State transitions are controlled by administrators and use optimistic locking to prevent concurrent modification conflicts. The system automatically migrates legacy events with "finished" state to "completed" state on first access. The UI only presents valid state transition options based on the current state, preventing invalid transitions at the interface level. State changes control user feedback capabilities: users can provide feedback when state is "started", but feedback is disabled when state is "paused" or "completed".

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, React Router DOM 7.10.1, jsonwebtoken 9.0.3 (for auth), existing EventService, DataRepository patterns, shadcn UI components (Button, Badge)  
**Storage**: File-based JSON storage via FileDataRepository (existing) for event data with state field  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: State transition API response <500ms, state transition completion <2 seconds, unauthorized attempt rejection <1 second, state display accuracy 100%  
**Constraints**: Optimistic locking required for concurrent operations, UI-level prevention of invalid transitions, automatic migration of "finished" to "completed", state validation before transitions, atomic state updates, test OTP "123456" works in dev/test environments  
**Scale/Scope**: Single application instance, file-based event storage, state transitions for all events, migration of existing events from "finished" to "completed" state

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (service layer, repository pattern, middleware structure, React component patterns). Code will be modular with clear separation of concerns (EventService for state transition logic, API routes for endpoints, React components for state management UI). Reuse existing authentication middleware, state validation patterns, error handling patterns, and optimistic locking patterns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing EventService and DataRepository infrastructure, JWT middleware, authentication patterns, shadcn UI components, form validation utilities, error handling patterns, API client patterns, and routing patterns. Update existing state validation constants in EventService rather than duplicating. Use existing test OTP mechanism for dev/test environments. No custom implementations where existing solutions exist.

### III. Maintainability
✅ **PASS**: Clear service boundaries (EventService for state transition logic, API routes for endpoints), consistent naming conventions, comprehensive error handling, separation of concerns (API routes, services, UI components). State transition logic isolated from event creation, UI components isolated from business logic, migration logic isolated from core functionality. State transition rules clearly defined and maintainable.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for state transition logic, optimistic locking, state validation, legacy migration, invalid state handling, concurrent operation handling. Integration tests for state transition API endpoints, authorization checks, optimistic locking behavior, error handling. E2E tests for complete flows (start event, pause event, complete event, resume from completed, UI state display, valid transition options display). All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: State transition operations require authentication (JWT token) and authorization (administrator check), optimistic locking prevents race conditions, input validation for state values, atomic updates prevent data inconsistency, test OTP restricted to dev/test environments only, proper error messages that don't reveal system internals, authorization checks ensure only administrators can change state.

### VI. User Experience Consistency
✅ **PASS**: State management UI will use existing component patterns, consistent error messaging, loading indicators follow existing patterns, state display follows existing patterns, mobile-first responsive design maintained, consistent navigation flows, only valid transition options displayed based on current state.

### VII. Performance Requirements
✅ **PASS**: State transition API optimized for <500ms response, state transition completion <2 seconds, unauthorized attempt rejection <1 second, state display <1 second, efficient state validation and optimistic locking, performance targets defined in spec.

## Project Structure

### Documentation (this feature)

```text
specs/001-event-state-management/
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
│   │   └── events.js          # Extend: Add PATCH /api/events/:eventId/state endpoint
│   ├── services/
│   │   └── EventService.js     # Extend: Add transitionState, validateStateTransition, migrateLegacyState, getValidTransitions methods, update VALID_TRANSITIONS constant
│   └── data/
│       └── FileDataRepository.js  # Extend: Support optimistic locking for updateEvent method
└── tests/
    ├── integration/
    │   └── events.test.js      # Extend: Add state transition API tests
    └── unit/
        └── EventService.test.js  # Extend: Add state transition logic tests

frontend/
├── src/
│   ├── pages/
│   │   ├── EventAdminPage.jsx  # Extend: Add state management UI (state display, transition buttons)
│   │   └── EventPage.jsx       # Extend: Update feedback validation to use "completed" instead of "finished"
│   ├── components/
│   │   └── ui/                 # Existing: Reuse Button, Badge components
│   └── services/
│       └── apiClient.js        # Extend: Add transitionEventState method
└── tests/
    ├── e2e/                    # Add: E2E tests for state transition flows
    └── unit/                   # Extend: Update EventPage tests for "completed" state
```

**Structure Decision**: Web application structure (frontend + backend) following existing patterns. Backend extends EventService and events API routes. Frontend extends EventAdminPage with state management UI and updates EventPage to handle "completed" state. All changes follow existing architectural patterns and component structures.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles are satisfied.
