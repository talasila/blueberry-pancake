# Implementation Plan: Event Dashboard Page

**Branch**: `010-dashboard-page` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-dashboard-page/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements a dashboard page that displays event statistics and item rating details. The dashboard shows four summary statistics (Total Users, Total Bottles, Total Ratings, Average Ratings per Bottle) and a sortable table of item ratings with progression bars, average ratings, and Bayesian-weighted averages. Administrators can access the dashboard at any time, while regular users can only access it when the event is in "completed" state. The dashboard includes a manual refresh button and handles loading/error states gracefully.

**Technical Approach**: 
- Frontend: React dashboard page component with statistics cards, sortable table with progress bars, manual refresh button, loading/error states
- Backend: REST API endpoint for dashboard statistics aggregation, Bayesian average calculation service, caching for performance
- Data: Aggregates data from event configuration (users, items) and ratings CSV file
- Access Control: Route protection based on user role and event state, conditional UI visibility in profile page

## Technical Context

**Language/Version**: Node.js >=22.12.0, JavaScript (ES modules)  
**Primary Dependencies**: 
- Frontend: React 19.2.1, React Router 7.10.1, Tailwind CSS 4.1.17, Vite 6.0.5, lucide-react (for icons)
- Backend: Express 5.2.1, node-cache 5.1.2 (for caching)
**Storage**: File-based (event config JSON, ratings CSV files in `data/events/{eventId}/`), in-memory caching  
**Testing**: Vitest (unit/integration), Playwright (e2e), @testing-library/react  
**Target Platform**: Web application (browser), Node.js server  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 
- Dashboard page load: <3 seconds for events with up to 1000 ratings (SC-003)
- Access control check: <1 second for regular users (SC-002)
- Table sorting: <500ms response time (SC-005)
- API response: <2 seconds for dashboard data (SC-001)
**Constraints**: 
- Bayesian average calculation must handle edge cases (C=0, global_avg undefined)
- Table must support sorting on all columns (ID, Rating Progression, Average Rating, Weighted Average)
- Progress bars must be visual-only (no text labels)
- All averages formatted to 2 decimal places
- Manual refresh only (no real-time polling)
**Scale/Scope**: 
- Events with up to 100 items
- Events with up to 1000 ratings
- Multiple concurrent dashboard views
- File-based storage with caching

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Implementation will follow existing code patterns, use established components (Card, Button, Table), and maintain clear separation of concerns between dashboard service, API endpoint, and React components.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: 
- Reuse existing EventService for event data access
- Reuse existing RatingService for ratings data access
- Reuse existing CacheService for performance optimization
- Reuse existing API client patterns and authentication middleware
- Reuse existing UI components (Card, Button, LoadingSpinner, Table components)
- Reuse existing route protection patterns (ProtectedRoute, AdminRoute)

### III. Maintainability
✅ **PASS**: 
- Clear component structure (DashboardPage, StatisticsCard, ItemRatingsTable, ProgressBar)
- Reusable dashboard service for statistics calculation
- Centralized Bayesian average calculation utility
- Well-documented API contracts
- Consistent error handling patterns

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: 
- Unit tests for dashboard statistics calculation, Bayesian average formula
- Integration tests for API endpoint
- E2E tests for dashboard access control and table sorting
- Contract tests for API
- Edge case tests for C=0, global_avg undefined scenarios

### V. Security
✅ **PASS**: 
- Access control validation (admin vs regular user, event state check)
- Input validation for eventId
- Authentication required for dashboard access
- Route protection middleware

### VI. User Experience Consistency
✅ **PASS**: 
- Reuse existing UI components and styling patterns
- Consistent with existing page layouts (EventPage, EventAdminPage)
- Follows established design patterns (cards, tables, buttons)
- Loading and error states match existing patterns

### VII. Performance Requirements
✅ **PASS**: 
- Caching reduces file I/O for statistics calculations
- Meets all success criteria performance targets
- Efficient aggregation algorithms
- Lazy calculation of weighted averages

**Constitution Compliance**: ✅ All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/010-dashboard-page/
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
│   │   └── dashboard.js          # Dashboard API endpoint
│   ├── services/
│   │   └── DashboardService.js    # Statistics aggregation and Bayesian calculation
│   └── utils/
│       └── bayesianAverage.js    # Bayesian average calculation utility
└── tests/
    ├── api/
    │   └── dashboard.test.js      # API endpoint tests
    ├── services/
    │   └── DashboardService.test.js  # Service unit tests
    └── utils/
        └── bayesianAverage.test.js   # Utility tests

frontend/
├── src/
│   ├── components/
│   │   ├── StatisticsCard.jsx    # Reusable statistics card component
│   │   ├── ItemRatingsTable.jsx  # Sortable table component
│   │   └── ProgressBar.jsx       # Visual progress bar component
│   ├── pages/
│   │   └── DashboardPage.jsx     # Main dashboard page
│   └── services/
│       └── dashboardService.js   # Frontend API client for dashboard
└── tests/
    ├── components/
    │   ├── StatisticsCard.test.jsx
    │   ├── ItemRatingsTable.test.jsx
    │   └── ProgressBar.test.jsx
    ├── pages/
    │   └── DashboardPage.test.jsx
    └── e2e/
        └── dashboard.spec.js      # E2E tests for dashboard access and functionality
```

**Structure Decision**: Web application structure with separate frontend and backend. Dashboard functionality spans both layers: backend handles data aggregation and calculations, frontend handles presentation and user interaction. Reuses existing service patterns and UI components.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. All complexity is justified by feature requirements.
