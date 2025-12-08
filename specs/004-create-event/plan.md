# Implementation Plan: Create Event Functionality

**Branch**: `004-create-event` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-create-event/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement event creation functionality for the blind tasting event management application. Users click "Create" button on landing page, authenticate via OTP (reusing existing OTP auth system), navigate to create event page, fill form with event name and type of item (wine), and create event. System generates unique 8-character event ID, assigns creator as administrator, sets initial state to "created", and displays success popup with event ID. Event lifecycle states (created/started/paused/finished) are defined but state transition UI is out of scope.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, React Router DOM 7.10.1, nanoid (for event ID generation), jsonwebtoken 9.0.3 (for auth), existing DataRepository pattern  
**Storage**: File-based JSON storage via FileDataRepository (extends DataRepository) for event persistence  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: Event creation API response <500ms (p95), form validation feedback <500ms, success popup display <1s, complete flow (auth + create) <3 minutes  
**Constraints**: 8-character alphanumeric event ID uniqueness, event name validation (reasonable length limits), protected route requiring OTP authentication, test OTP "123456" works in dev/test environments  
**Scale/Scope**: Single application instance, file-based event storage (can scale to database later), event ID collision handling with regeneration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (service layer, repository pattern, middleware structure). Code will be modular with clear separation of concerns (EventService for business logic, DataRepository for persistence, API routes for endpoints). Reuse existing authentication middleware and form validation patterns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing OTP authentication system (feature 003-otp-auth), DataRepository infrastructure, JWT middleware, error handling patterns, form components (shadcn UI), and routing patterns. Use nanoid package for event ID generation (battle-tested). No custom implementations where existing solutions exist.

### III. Maintainability
✅ **PASS**: Clear service boundaries (EventService for event creation logic), consistent naming conventions, comprehensive error handling, separation of concerns (API routes, services, data layer). Event creation logic isolated from authentication, form validation isolated from business logic.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for event creation logic, event ID generation/uniqueness, administrator assignment, state initialization. Integration tests for create event API endpoint, form submission flow, success popup display. E2E tests for complete flow (landing page → auth → create event → success). All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: Protected route requiring OTP authentication, input validation for event name and type, event ID generation uses secure random (nanoid), administrator assignment based on authenticated user (JWT token), no unauthorized event creation, test OTP restricted to dev/test environments only.

### VI. User Experience Consistency
✅ **PASS**: Create event form will use existing shadcn UI components (Input, Button, Card, Label), consistent error messaging patterns, success popup follows existing UI patterns, mobile-first responsive design maintained, navigation flow consistent with existing routing patterns.

### VII. Performance Requirements
✅ **PASS**: Event creation API optimized for <500ms response, form validation provides immediate feedback (<500ms), success popup displays quickly (<1s), event ID generation is fast (nanoid), file-based storage optimized for single-instance deployment, performance targets defined in spec (3min complete flow, 500ms validation, 1s popup).

## Project Structure

### Documentation (this feature)

```text
specs/004-create-event/
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
│   │   └── events.js          # New: Event creation API endpoint
│   ├── services/
│   │   └── EventService.js   # New: Event creation business logic
│   ├── data/
│   │   ├── DataRepository.js  # Existing: Base repository interface
│   │   └── FileDataRepository.js  # Existing: File-based implementation (extend for events)
│   └── middleware/
│       └── requireAuth.js     # Existing: OTP authentication middleware
└── tests/
    ├── integration/
    │   └── events.test.js     # New: Event creation integration tests
    └── unit/
        └── EventService.test.js  # New: Event service unit tests

frontend/
├── src/
│   ├── pages/
│   │   └── CreateEventPage.jsx  # New: Create event form page
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx    # Existing: Reuse shadcn button
│   │       ├── input.tsx      # Existing: Reuse shadcn input
│   │       ├── label.tsx      # Existing: Reuse shadcn label
│   │       └── card.tsx       # Existing: Reuse shadcn card
│   └── services/
│       └── apiClient.js       # Existing: Extend for event creation API
└── tests/
    ├── e2e/
    │   └── features/
    │       └── create-event.feature  # New: E2E test scenarios
    └── unit/
        └── CreateEventPage.test.jsx   # New: Component unit tests
```

**Structure Decision**: Web application structure (frontend + backend) matches existing project layout. Backend adds EventService for business logic and events API endpoint. Frontend adds CreateEventPage component. Reuses existing authentication, routing, UI components, and data repository patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All constitution principles are satisfied with standard patterns and existing infrastructure.

## Phase 0: Research ✅

**Status**: Complete

**Research Document**: [research.md](./research.md)

**Key Decisions**:
1. Use nanoid package for 8-character event ID generation
2. Extend FileDataRepository for event persistence
3. Enforce 1-100 character event name validation
4. Use modal/dialog pattern for success popup
5. Store state as string enum (created/started/paused/finished)
6. Assign administrator from JWT token email
7. Client-side + server-side validation
8. Disable submit button during creation to prevent duplicates

All technical unknowns resolved. No NEEDS CLARIFICATION markers remain.

## Phase 1: Design & Contracts ✅

**Status**: Complete

**Generated Artifacts**:
- [data-model.md](./data-model.md) - Event entity, validation rules, data relationships
- [contracts/README.md](./contracts/README.md) - API contract documentation
- [contracts/events-api.yaml](./contracts/events-api.yaml) - OpenAPI 3.0 specification
- [quickstart.md](./quickstart.md) - Implementation quickstart guide

**Agent Context**: Updated via `update-agent-context.sh cursor-agent`

**Design Summary**:
- Event entity defined with all required attributes
- API contract: POST /api/events (protected route)
- Data storage: File-based JSON via FileDataRepository
- Validation rules: Event name (1-100 chars), typeOfItem (wine only)
- State management: Initial state "created", transitions defined for future

## Phase 2: Task Breakdown

**Status**: Pending (to be created by `/speckit.tasks` command)

**Next Step**: Run `/speckit.tasks` to generate task breakdown from this plan.
