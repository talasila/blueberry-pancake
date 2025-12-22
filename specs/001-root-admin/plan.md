# Implementation Plan: Root Admin Dashboard

**Branch**: `001-root-admin` | **Date**: 2024-12-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-root-admin/spec.md`

## Summary

Build a system administrator dashboard at `/system` route that allows designated root users to view all events, see detailed event information in a slide-out drawer, delete events with confirmation, search/filter events, and view aggregate statistics. Root users are identified via `rootAdmins` config array and authenticate using existing OTP flow.

## Technical Context

**Language/Version**: Node.js 22+, JavaScript ES2020+  
**Primary Dependencies**: Express 5, React 19, Vite, Tailwind CSS 4, Radix UI  
**Storage**: File-based (JSON config, CSV ratings) with in-memory cache  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Web (responsive: mobile, tablet, desktop)
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: Event list loads <2s with 1000+ events, details <3s  
**Constraints**: Must use existing OTP auth flow, no new auth mechanisms  
**Scale/Scope**: Single root admin dashboard page, ~5 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | Will follow existing patterns in codebase |
| II. DRY | ✅ PASS | Reuse existing auth, cache, logging services |
| III. Maintainability | ✅ PASS | Clear separation: new route, service, components |
| IV. Testing Standards | ✅ PASS | E2E tests required per spec (SC-006) |
| V. Security | ✅ PASS | Auth via existing JWT/OTP; audit logging required (FR-009) |
| VI. UX Consistency | ✅ PASS | Use existing Radix UI components, Tailwind styling |
| VII. Performance | ✅ PASS | Performance targets defined (SC-001, SC-002) |

**Gate Result**: ✅ PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-root-admin/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API specs)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── system.js        # NEW: /api/system/* endpoints
│   ├── services/
│   │   └── SystemService.js # NEW: Root admin business logic
│   ├── middleware/
│   │   └── requireRoot.js   # NEW: Root authorization middleware
│   └── config/
│       └── configLoader.js  # MODIFY: Add rootAdmins getter
└── tests/
    ├── integration/
    │   └── system.test.js   # NEW: API integration tests
    └── unit/
        └── SystemService.test.js # NEW: Service unit tests

frontend/
├── src/
│   ├── pages/
│   │   └── SystemPage.jsx   # NEW: Admin dashboard page
│   ├── components/
│   │   ├── EventList.jsx    # NEW: Event list with filters
│   │   ├── EventDrawer.jsx  # NEW: Slide-out event details
│   │   └── SystemStats.jsx  # NEW: Statistics panel
│   └── services/
│       └── systemApi.js     # NEW: API client for /system
└── tests/
    └── e2e/
        └── specs/
            └── system.spec.js # NEW: E2E tests

config/
└── default.json             # MODIFY: Add rootAdmins array
```

**Structure Decision**: Web application structure (Option 2). New files follow existing naming conventions and directory organization.

## Complexity Tracking

> No constitution violations to justify. Design follows existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |

---

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

**Key Decisions:**
1. **Root identification**: Email list in `config.rootAdmins` array
2. **Authorization middleware**: New `requireRoot.js` checks JWT email against config
3. **Event aggregation**: Compute stats from existing `EventService.listEvents()` 
4. **Audit logging**: Use existing `Logger.info()` with structured event data

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) - Entity definitions
- [contracts/system-api.yaml](./contracts/system-api.yaml) - OpenAPI spec
- [quickstart.md](./quickstart.md) - Development setup guide
