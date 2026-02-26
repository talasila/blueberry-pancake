# Implementation Plan: Admin Event List Enhancements

**Branch**: `018-admin-event-list` | **Date**: 2026-02-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-admin-event-list/spec.md`

## Summary

Enhance the system admin "All Events" section at `/system` with four changes: (1) default view shows only the 25 most recently created events with an informational label, (2) event cards display the event ID and PIN, (3) event details drawer displays the PIN, and (4) the search box queries all events in the database by event ID, event name, or owner email (OR logic, capped at 100 results).

The backend already loads all events in memory and filters them — no new DynamoDB indexes or schema changes are needed. The primary changes are: adding a unified `search` query parameter to the API, including `pin` in both summary and detail responses, and updating the frontend components to display the new fields and handle the revised default/search limits.

## Technical Context

**Language/Version**: Node.js 22.x (ES modules)
**Primary Dependencies**: Express 5.x (backend), React 19.x + Vite 6.x + Tailwind CSS 4.x (frontend)
**Storage**: AWS DynamoDB (single-table design, pay-per-request) — no schema changes needed
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: AWS Lambda + API Gateway (backend), S3 + CloudFront (frontend)
**Project Type**: Web application (monorepo with `backend/` and `frontend/` workspaces)
**Performance Goals**: Search results within 2 seconds of user finishing typing (including 300ms debounce)
**Constraints**: PIN is already stored on event config as `config.pin`; no new data store fields required
**Scale/Scope**: Admin-only page; event count in low hundreds at most

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Code Quality | PASS | Changes are localized to existing files with clear, focused modifications |
| II. DRY | PASS | Reuses existing `getEventSummary`, `findOwnerEmail`, `useDebounce`; adds `search` as a single-parameter OR filter to avoid duplicating filter logic |
| III. Maintainability | PASS | No new files needed beyond updating existing service/component/route files; dead pagination code removed |
| IV. Testing Standards | PASS | E2E tests already exist in `system.spec.js`; will require updates to cover new search, card fields, and drawer PIN |
| V. Security | PASS | All endpoints remain behind `requireAuth` + `requireRoot` middleware; PIN is only exposed to root admins |
| VI. UX Consistency | PASS | Card layout extended consistently with existing icon+label pattern; drawer uses existing `DetailRow` pattern |
| VII. Performance | PASS | Default load reduced from 50 to 25 events; backend already loads all events in memory so search adds no extra DB calls |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/018-admin-event-list/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── system-events-api.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files to modify)

```text
backend/
├── src/
│   ├── api/
│   │   └── system.js              # Add `search` query param
│   └── services/
│       └── SystemService.js       # Add pin to responses, add search OR-filter
└── tests/                         # (if unit tests exist for SystemService)

frontend/
├── src/
│   ├── components/system/
│   │   ├── EventList.jsx          # Default 25 limit, search param, card layout (ID + PIN)
│   │   └── EventDrawer.jsx        # Add PIN detail row
│   └── services/
│       └── systemApi.js           # Add `search` param to listEvents
└── tests/
    └── e2e/specs/
        └── system.spec.js         # Update E2E tests for new behavior
```

**Structure Decision**: No new files. All changes are modifications to existing files in the established web application structure.
