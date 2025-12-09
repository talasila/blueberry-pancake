# Implementation Plan: Item Configuration in Event Admin

**Branch**: `008-item-configuration` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-item-configuration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement item configuration functionality for events in the blind tasting event management application. Event administrators can configure the total number of items (default 20, range 1-100) and specify a comma-separated list of item IDs to exclude from the event. Items are numbered sequentially from 1 to the configured number, and excluded item IDs are not displayed on the main event page. The item configuration UI is displayed as a separate card component on the event admin screen, similar to PIN Management and Administrators cards. The data structure uses an `itemConfiguration` object with `numberOfItems` (integer) and `excludedItemIds` (array of integers). Validation includes: number of items (1-100), excluded item IDs within valid range, normalization of leading zeros, whitespace trimming, duplicate handling, and prevention of excluding all items. When the number of items is reduced, invalid excluded IDs are automatically removed with a warning.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js >=22.12.0  
**Primary Dependencies**: Express 5.2.1, React 19.2.1, React Router DOM 7.10.1, jsonwebtoken 9.0.3 (for auth), existing EventService, DataRepository patterns, shadcn UI components (Card, Button, Input, Badge)  
**Storage**: File-based JSON storage via FileDataRepository (existing) for event data with itemConfiguration object structure  
**Testing**: Vitest (unit/integration), Playwright + Cucumber (E2E)  
**Target Platform**: Web browsers (mobile-first), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: Get item configuration API response <500ms, update item configuration API response <500ms, item configuration section display <1 second, complete configuration flow <30 seconds  
**Constraints**: Number of items range 1-100, excluded item IDs must be within valid range (1 to numberOfItems), at least one item must be available (cannot exclude all), automatic cleanup of invalid excluded IDs when number reduced, normalization of leading zeros and whitespace, duplicate handling, validation on both client and server  
**Scale/Scope**: Single application instance, file-based event storage, item configuration per event, default value of 20 items when not configured

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing patterns (service layer, repository pattern, middleware structure, React component patterns). Code will be modular with clear separation of concerns (EventService for item configuration logic, API routes for endpoints, React components for item configuration UI). Reuse existing authentication middleware, Card component patterns, form validation patterns, and error handling patterns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuse existing EventService and DataRepository infrastructure, JWT middleware, authentication patterns, shadcn UI Card component (similar to PIN Management and Administrators), form validation utilities, error handling patterns, API client patterns, and routing patterns. Use existing validation patterns for number inputs and comma-separated lists. No custom implementations where existing solutions exist.

### III. Maintainability
✅ **PASS**: Clear service boundaries (EventService for item configuration logic, API routes for endpoints), consistent naming conventions, comprehensive error handling, separation of concerns (API routes, services, UI components). Item configuration logic isolated from other event management features, UI components isolated from business logic, validation logic centralized.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Unit tests for item configuration validation logic (number of items range, excluded item IDs validation, normalization, duplicate handling, all items excluded prevention, invalid ID cleanup), number parsing, comma-separated list parsing. Integration tests for get item configuration API endpoint, update item configuration API endpoint, validation error handling, automatic cleanup of invalid IDs. E2E tests for complete flows (configure number of items, configure excluded IDs, view configuration, validation errors, automatic cleanup). All edge cases from spec will have test coverage.

### V. Security
✅ **PASS**: Item configuration operations require authentication (JWT token) and administrator authorization, input validation for number of items and excluded item IDs, range validation prevents invalid data, normalization prevents injection issues, proper error messages that don't reveal system internals, authorization checks ensure only administrators can configure items.

### VI. User Experience Consistency
✅ **PASS**: Item configuration UI will use existing Card component pattern (similar to PIN Management and Administrators), consistent error messaging, loading indicators follow existing patterns, form validation follows existing patterns, mobile-first responsive design maintained, consistent navigation flows, validation feedback clearly displayed.

### VII. Performance Requirements
✅ **PASS**: Get item configuration API optimized for <500ms response, update item configuration API optimized for <500ms response, item configuration section display <1 second, complete configuration flow <30 seconds, efficient itemConfiguration object storage and retrieval, validation implemented efficiently, performance targets defined in spec.

## Project Structure

### Documentation (this feature)

```text
specs/008-item-configuration/
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
│   │   └── events.js          # Extend: Add GET /api/events/:eventId/item-configuration, PATCH /api/events/:eventId/item-configuration endpoints
│   ├── services/
│   │   └── EventService.js     # Extend: Add getItemConfiguration, updateItemConfiguration, validateItemConfiguration, normalizeExcludedItemIds methods
│   └── data/
│       └── FileDataRepository.js  # Extend: Support itemConfiguration object structure in event config
└── tests/
    ├── integration/
    │   └── events.test.js      # Extend: Add item configuration API tests
    └── unit/
        └── EventService.test.js  # Extend: Add item configuration validation and normalization tests

frontend/
├── src/
│   ├── pages/
│   │   ├── EventAdminPage.jsx  # Extend: Add Item Configuration card component
│   │   └── EventPage.jsx       # Extend: Filter item IDs based on itemConfiguration (exclude excludedItemIds)
│   ├── components/
│   │   └── ui/                 # Existing: Reuse Card, Button, Input, Badge components
│   └── services/
│       └── apiClient.js        # Extend: Add getItemConfiguration, updateItemConfiguration methods
└── tests/
    ├── unit/                    # Add: Unit tests for item configuration validation
    └── e2e/                     # Add: E2E tests for item configuration flows
```

**Structure Decision**: Web application structure (frontend + backend) following existing patterns. Backend extends EventService and events API routes. Frontend extends EventAdminPage with new Item Configuration card component and updates EventPage to filter item IDs. All changes follow existing architectural patterns and component structures.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles are satisfied.
