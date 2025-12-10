# Implementation Plan: Ratings Configuration

**Branch**: `001-ratings-config` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ratings-config/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement ratings configuration functionality for events in the blind tasting event management application. Event administrators can configure how items are rated by setting the maximum rating value (2-4, default 4), customizing labels (max 50 characters) and colors (hex format) for each rating level, and resetting to default values. The maximum rating can only be changed when the event is in "created" state, while labels and colors can be customized at any time. The rating configuration UI is displayed as a new accordion section on the event admin screen, following the existing pattern. The data structure uses a `ratingConfiguration` object with `maxRating` (integer 2-4) and `ratings` (array of rating objects with value, label, color). Default presets are provided for scales 1-2, 1-3, and 1-4. Color input accepts hex, RGB, or HSL format but is stored as hex codes. Validation includes: max rating range (2-4), label non-empty and max 50 characters, valid color codes, event state check for max rating changes, and optimistic locking for concurrent edits.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, React Router DOM 7.10.1, jsonwebtoken 9.0.3 (for auth), existing EventService, DataRepository patterns, shadcn UI components (Accordion, Button, Input, ColorPicker or equivalent), existing optimistic locking pattern from event state transitions  
**Storage**: File-based JSON storage via FileDataRepository (existing) for event data with ratingConfiguration object structure  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: Get rating configuration API response <500ms, update rating configuration API response <500ms, rating configuration section display <1 second, complete configuration flow <2 minutes for 4-level scale, reset to defaults <1 second  
**Constraints**: Max rating range 2-4, max rating only changeable in "created" state, label max 50 characters, colors stored as hex codes, validation on blur and submit, optimistic locking for concurrent edits, server-side event state validation  
**Scale/Scope**: Single application instance, file-based event storage, rating configuration per event, default scale of 1-4 when not configured

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (service layer, repository pattern, middleware structure, React component patterns). Code will be modular with clear separation of concerns (EventService for rating configuration logic, API routes for endpoints, React components for rating configuration UI). Reuse existing authentication middleware, Accordion component patterns, form validation patterns, error handling patterns, and optimistic locking pattern from event state transitions.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing EventService and DataRepository infrastructure, JWT middleware, authentication patterns, shadcn UI Accordion component (similar to Item Configuration, State, PIN, Administrators sections), form validation utilities, error handling patterns, API client patterns, routing patterns, and optimistic locking pattern from event state transitions. Use existing color conversion utilities if available, or leverage standard color libraries. No custom implementations where existing solutions exist.

### III. Maintainability
✅ **PASS**: Clear service boundaries (EventService for rating configuration logic, API routes for endpoints), consistent naming conventions, comprehensive error handling, separation of concerns (API routes, services, UI components). Rating configuration logic isolated from other event management features, UI components isolated from business logic, validation logic centralized, default presets clearly defined.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for rating configuration validation logic (max rating range 2-4, label validation non-empty and max 50 chars, color format validation and conversion, default preset generation, event state validation for max rating changes). Integration tests for get rating configuration API endpoint, update rating configuration API endpoint, validation error handling, optimistic locking conflict resolution, event state validation. E2E tests for complete flows (configure max rating, customize labels, customize colors, reset to defaults, validation errors, state restrictions). All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: Rating configuration operations require authentication (JWT token) and administrator authorization, input validation for max rating, labels, and colors, range validation prevents invalid data, color format validation prevents injection issues, proper error messages that don't reveal system internals, authorization checks ensure only administrators can configure ratings, server-side event state validation prevents unauthorized max rating changes.

### VI. User Experience Consistency
✅ **PASS**: Rating configuration UI will use existing Accordion component pattern (similar to Item Configuration, State, PIN, Administrators), consistent error messaging, loading indicators follow existing patterns, form validation follows existing patterns (validate on blur and submit), mobile-first responsive design maintained, consistent navigation flows, validation feedback clearly displayed, color picker follows existing UI patterns.

### VII. Performance Requirements
✅ **PASS**: Get rating configuration API optimized for <500ms response, update rating configuration API optimized for <500ms response, rating configuration section display <1 second, complete configuration flow <2 minutes for 4-level scale, reset to defaults <1 second, efficient ratingConfiguration object storage and retrieval, validation implemented efficiently, performance targets defined in spec.

## Project Structure

### Documentation (this feature)

```text
specs/001-ratings-config/
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
│   │   └── events.js          # Extend: Add GET /api/events/:eventId/rating-configuration, PATCH /api/events/:eventId/rating-configuration endpoints
│   ├── services/
│   │   └── EventService.js     # Extend: Add getRatingConfiguration, updateRatingConfiguration, validateRatingConfiguration, generateDefaultRatings, convertColorToHex methods
│   └── data/
│       └── FileDataRepository.js  # Extend: Support ratingConfiguration object structure in event config
└── tests/
    ├── integration/
    │   └── events.test.js      # Extend: Add rating configuration API tests
    └── unit/
        └── EventService.test.js  # Extend: Add rating configuration validation, color conversion, default preset generation tests

frontend/
├── src/
│   ├── pages/
│   │   └── EventAdminPage.jsx  # Extend: Add Ratings Configuration accordion section with inline HTML5 color input
│   ├── components/
│   │   └── ui/                 # Existing: Reuse Accordion, Button, Input components
│   └── services/
│       └── apiClient.js        # Extend: Add getRatingConfiguration, updateRatingConfiguration methods
└── tests/
    ├── unit/                    # Add: Unit tests for rating configuration validation
    └── e2e/                     # Add: E2E tests for rating configuration flows
```

**Structure Decision**: Web application structure (frontend + backend) following existing patterns. Backend extends EventService and events API routes. Frontend extends EventAdminPage with new Ratings Configuration accordion section. Color selection uses inline HTML5 input type="color" (no separate component file needed). All changes follow existing architectural patterns and component structures.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles are satisfied.
