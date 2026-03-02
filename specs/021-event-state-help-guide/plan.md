# Implementation Plan: Event State Management Help Guide

**Branch**: `021-event-state-help-guide` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/021-event-state-help-guide/spec.md`

## Summary

Add inline expandable help to the event state management section on the event admin/settings page. The help explains the event lifecycle (created → started → paused/completed), allowed transitions, and—for each of the four states—what the administrator and guests can do. Content is static and keyed by state; the only runtime dependency is the existing event state from `EventContext`. No new APIs or backend changes. Implementation is frontend-only: a content data file, an inline expandable/collapsible panel in the state section, and reactive display of current state (with placeholder when event is loading or failed).

## Technical Context

**Language/Version**: JavaScript (ESM), Node.js >=22.12.0  
**Primary Dependencies**: React 19, Vite, Radix UI (accordion), Tailwind CSS, react-router-dom (frontend); Node, serverless-express, AWS SDK DynamoDB (backend)  
**Storage**: N/A for this feature (static content; reads existing event state from context)  
**Testing**: Vitest (unit), Playwright (e2e); existing patterns in `frontend/tests/`  
**Target Platform**: Web (mobile-first); same minimum viewport as rest of app (documented for acceptance)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Help expand/collapse and content render with no perceptible delay; no new network requests  
**Constraints**: Inline presentation only (no overlay/drawer/modal); help updates in place when event state changes; entry point visible even when event is loading or failed  
**Scale/Scope**: Single new UI block and one static content module; no backend or API surface change  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | Pass | Clear, single-purpose components and content module |
| II. DRY | Pass | Reuse existing `eventState` labels/descriptions where appropriate; reuse UI primitives (e.g. Accordion/Collapsible) |
| III. Maintainability | Pass | Static content in dedicated file; logic in state section only |
| IV. Testing Standards | Pass | Unit tests for content shape and component behavior; e2e for open/close and current-state display |
| V. Security | Pass | No new endpoints or user input; read-only use of event state |
| VI. UX Consistency | Pass | Inline expandable follows existing patterns; styles via Tailwind/design system |
| VII. Performance | Pass | No new API calls; content bundled; minimal re-renders on state change |

## Project Structure

### Documentation (this feature)

```text
specs/021-event-state-help-guide/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 (README only; no new API)
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   ├── services/
│   └── data/
└── tests/

frontend/
├── src/
│   ├── components/      # Optional: small reusable help panel component
│   ├── components/ui/   # Existing: accordion.tsx (Radix)
│   ├── data/            # NEW: eventStateHelpContent.js (or similar)
│   ├── pages/           # EventAdminPage.jsx — state section + inline help
│   └── utils/           # eventState.jsx — existing STATE_CONFIG (labels)
└── tests/
    ├── unit/
    └── e2e/
```

**Structure Decision**: Web app layout is used. This feature touches only `frontend/`: one new data file for help content, and changes to the event state management section in `EventAdminPage.jsx`. Optional small component for the expandable block (or inline implementation in the page). No backend or new API.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Leave table empty or omit.
