# Implementation Plan: Item Registration and Management

**Branch**: `001-item-registration` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-item-registration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature enables users to register items they're bringing to blind tasting events, with administrators managing item ID assignment during the paused state. Items are stored in the event configuration as an array, with details (name, price, description, owner) revealed only after event completion. The implementation extends the existing event configuration structure, adds new API endpoints for item CRUD operations, and integrates item registration into the profile page and admin management interface.

## Technical Context

**Language/Version**: Node.js >=22.12.0 (ES modules)  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, Vite 6.0.5, Vitest 1.6.1  
**Storage**: File-based JSON storage (`data/events/{eventId}/config.json`) via FileDataRepository pattern  
**Testing**: Vitest for unit/integration tests, Playwright for E2E tests  
**Target Platform**: Web application (backend API + React frontend)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Item registration in <30s, admin view in <2s, item details drawer in <500ms  
**Constraints**: File-based storage with caching, state-based access control (created/started/paused/completed), optimistic locking for concurrent updates  
**Scale/Scope**: Events with up to 50 items, multiple users per event, file-based storage suitable for current scale

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Feature follows existing patterns (EventService, DataRepository, API routes). Code will be structured with clear separation of concerns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuses existing EventService, FileDataRepository, API routing patterns, and frontend component patterns (drawer components, form components).

### III. Maintainability
✅ **PASS**: Follows established project structure, uses existing validation patterns, integrates with existing event configuration.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Will include unit tests for ItemService, integration tests for API endpoints, and E2E tests for user flows. Tests follow existing patterns.

### V. Security
✅ **PASS**: Uses existing authentication (JWT), authorization checks (admin verification), input validation, and XSRF protection patterns.

### VI. User Experience Consistency
✅ **PASS**: Reuses existing drawer components, form patterns, and styling system (Tailwind CSS). Follows established UI patterns.

### VII. Performance Requirements
✅ **PASS**: Meets success criteria targets (<30s registration, <2s admin view, <500ms drawer). Uses existing caching layer.

**Gate Status**: ✅ **PASS** - All constitution principles satisfied. No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/001-item-registration/
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
│   ├── services/
│   │   └── ItemService.js          # New: Item business logic
│   ├── api/
│   │   └── items.js                 # New: Item API endpoints
│   └── data/
│       └── FileDataRepository.js   # Extended: Support items array in config
└── tests/
    └── [item service and API tests]

frontend/
├── src/
│   ├── pages/
│   │   ├── ProfilePage.jsx         # Extended: Add item registration UI
│   │   └── EventAdminPage.jsx      # Extended: Add items management section
│   ├── components/
│   │   └── ItemDetailsDrawer.jsx   # New: Item details display component
│   └── services/
│       └── itemService.js           # New: Item API client
└── tests/
    └── [item component and page tests]
```

**Structure Decision**: Web application structure with separate backend and frontend. Backend extends EventService pattern with new ItemService, frontend extends existing pages and adds new drawer component. Follows established patterns from previous features.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All complexity is justified by feature requirements and follows established patterns.
