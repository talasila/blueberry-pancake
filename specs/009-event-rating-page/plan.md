# Implementation Plan: Event Rating Page

**Branch**: `009-event-rating-page` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-event-rating-page/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements the main event rating page where users can view items as numbered buttons (iPhone dialpad-style), open item drawers to provide ratings and notes, and bookmark items for later review. Ratings are persisted to CSV files in the event directory with caching to minimize file I/O. The drawer content adapts based on event state (created, started, paused, completed), and item buttons display rating colors and bookmark indicators.

**Technical Approach**: 
- Frontend: React components for dialpad-style item buttons, drawer component with state-based content, rating form with validation
- Backend: REST API endpoints for rating submission, CSV file operations with replace-on-update logic, in-memory caching with periodic invalidation
- Data: CSV file (ratings.csv) with RFC 4180 escaping, session storage for bookmarks

## Technical Context

**Language/Version**: Node.js >=22.12.0, JavaScript (ES modules)  
**Primary Dependencies**: 
- Frontend: React 19.2.1, React Router 7.10.1, Tailwind CSS 4.1.17, Vite 6.0.5
- Backend: Express 5.2.1, node-cache 5.1.2 (for caching)
**Storage**: File-based (CSV files in `data/events/{eventId}/ratings.csv`), session storage (browser localStorage/sessionStorage for bookmarks)  
**Testing**: Vitest (unit/integration), Playwright (e2e), @testing-library/react  
**Target Platform**: Web application (browser), Node.js server  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 
- Page load: <1 second (SC-001)
- Rating submission: <30 seconds user time (SC-002)
- Drawer open: <500ms (SC-007)
- Cache efficiency: 70% reduction in file reads (SC-006)
**Constraints**: 
- CSV file operations must handle concurrent writes
- Cache invalidation on state change, rating submission, and every 30 seconds
- 500 character limit for notes
- RFC 4180 CSV escaping required
**Scale/Scope**: 
- Multiple concurrent users rating items
- File-based storage (no database)
- Session-only bookmarks (not persisted)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing code patterns, use established components, and maintain clear separation of concerns.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: 
- Reuse existing FileDataRepository for CSV operations
- Reuse existing drawer/modal patterns from UI components
- Reuse existing caching infrastructure (CacheService)
- Reuse existing API client patterns

### III. Maintainability
✅ **PASS**: 
- Clear component structure (ItemButton, RatingDrawer, etc.)
- Reusable rating form component
- Centralized CSV parsing/writing utilities
- Well-documented API contracts

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: 
- Unit tests for rating service, CSV operations, cache logic
- Integration tests for API endpoints
- E2E tests for user rating flow
- Contract tests for API

### V. Security
✅ **PASS**: 
- Input validation (rating values, note length, email)
- CSV injection prevention (proper escaping)
- Authentication required for rating submission
- Event state validation on submission

### VI. User Experience Consistency
✅ **PASS**: 
- Reuse existing UI components (buttons, drawers, forms)
- Consistent with existing EventPage styling
- Follows established design patterns

### VII. Performance Requirements
✅ **PASS**: 
- Caching reduces file I/O by 70%
- Meets all success criteria performance targets
- Efficient CSV parsing and writing

**Constitution Compliance**: ✅ All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/009-event-rating-page/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── ratings-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── ratings.js          # New: Ratings API endpoints
│   ├── services/
│   │   └── RatingService.js   # New: Rating business logic, CSV operations
│   ├── data/
│   │   └── FileDataRepository.js  # Modified: Add replaceRating method
│   └── utils/
│       └── csvParser.js        # New: CSV parsing/writing utilities with RFC 4180 support

frontend/
├── src/
│   ├── components/
│   │   ├── ItemButton.jsx      # New: Dialpad-style item button with rating color and bookmark indicator
│   │   ├── RatingDrawer.jsx    # New: Drawer component with state-based content
│   │   └── RatingForm.jsx      # New: Rating form with validation
│   ├── pages/
│   │   └── EventPage.jsx       # Modified: Replace placeholder with item buttons and drawer
│   ├── services/
│   │   └── ratingService.js    # New: Frontend rating API client
│   └── hooks/
│       └── useRatings.js       # New: Hook for ratings data and operations

tests/
├── backend/
│   ├── unit/
│   │   ├── RatingService.test.js
│   │   └── csvParser.test.js
│   └── integration/
│       └── ratings.test.js
└── frontend/
    ├── unit/
    │   ├── ItemButton.test.jsx
    │   ├── RatingDrawer.test.jsx
    │   └── RatingForm.test.jsx
    └── e2e/
        └── rating-flow.feature
```

**Structure Decision**: Web application structure (frontend + backend) matches existing project layout. New components follow established patterns. CSV utilities extracted to shared utils for reuse.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution gates pass.

## Phase Completion Status

### Phase 0: Outline & Research ✅ COMPLETE

**Output**: `research.md`

**Research Completed**:
- CSV parsing/writing with RFC 4180 escaping
- CSV replace-on-update pattern
- React drawer/modal component patterns
- Dialpad-style button layouts
- Cache invalidation strategies
- Session storage for bookmarks

**Decisions Made**:
- Native Node.js CSV operations (no external libraries)
- Read-parse-replace-write pattern for rating updates
- React drawer component with CSS transitions
- CSS Grid for dialpad layout
- CacheService with explicit invalidation + periodic refresh
- Browser sessionStorage for bookmarks

### Phase 1: Design & Contracts ✅ COMPLETE

**Outputs**:
- `data-model.md` - Data model with entities, relationships, validation rules
- `contracts/ratings-api.yaml` - OpenAPI 3.0 specification for ratings API
- `quickstart.md` - Implementation guide with step-by-step instructions

**Design Artifacts Created**:
- Rating entity model (CSV format, RFC 4180 escaping)
- Bookmark entity model (sessionStorage format)
- Item Button State model (computed from ratings and bookmarks)
- API endpoints: GET/POST ratings, GET specific rating
- Component structure: ItemButton, RatingDrawer, RatingForm
- Service layer: RatingService, csvParser utilities

**Agent Context Updated**: ✅ Cursor IDE context file updated with technology stack

### Phase 2: Task Breakdown

**Status**: Pending - Use `/speckit.tasks` command to generate task breakdown

**Next Command**: `/speckit.tasks` - Break down implementation plan into actionable tasks
