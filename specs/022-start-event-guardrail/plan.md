# Implementation Plan: Start Event Guard-Rail (Bottle Count Mismatch)

**Branch**: `022-start-event-guardrail` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/022-start-event-guardrail/spec.md`

## Summary

Show an **inline** info or warning message inside the State drawer when the admin can transition to started (from created or completed), when the number of registered bottles is not equal to the number of bottles available for rating. Message appears above the Start button; Start remains clickable (one-click start). Use **info** when registered < slots; use **warning** when registered > slots. On load failure, show a short fallback message and keep Start clickable. No new APIs or backend changes; reuse existing EventAdminPage state (event, items, itemConfiguration) and the existing `Message` component (info/warning variants).

## Technical Context

**Language/Version**: JavaScript (ESM), Node.js >=22.12.0  
**Primary Dependencies**: React 19, Vite, Radix UI, Tailwind CSS, react-router-dom (frontend)  
**Storage**: N/A (reads existing event, items, itemConfiguration from EventAdminPage state)  
**Testing**: Vitest (unit), Playwright (e2e); existing patterns in `frontend/tests/`  
**Target Platform**: Web (mobile-first)  
**Project Type**: Web application (frontend + backend; this feature is frontend-only)  
**Performance Goals**: No new requests; message render is synchronous from existing state  
**Constraints**: Inline only inside State drawer; no blocking confirmation; use existing Message component for info/warning styling  
**Scale/Scope**: One conditional block inside State drawer in EventAdminPage; optional small helper for gap type; unit + e2e tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | Pass | Single responsibility: show message when mismatch; clear condition and copy |
| II. DRY | Pass | Reuse existing `Message` component (info/warning); reuse event/items/itemConfiguration; optional shared `getGapType(registeredCount, availableSlots)` if similar logic exists elsewhere |
| III. Maintainability | Pass | Logic localized to State drawer content; messaging content can be constants or small content module |
| IV. Testing Standards | Pass | Unit tests for gap-type logic and message selection; e2e for open State drawer and see correct message, then one-click start |
| V. Security | Pass | No new endpoints or user input; read-only use of event/items |
| VI. UX Consistency | Pass | Message component and Tailwind; inline placement per spec |
| VII. Performance | Pass | No new API calls; uses existing state |

## Project Structure

### Documentation (this feature)

```text
specs/022-start-event-guardrail/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 (README only; no new API)
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── Message.jsx           # Existing — reuse with type="info" | "warning"
│   ├── pages/
│   │   └── EventAdminPage.jsx    # MODIFIED — State drawer: add inline message block above Start button
│   └── utils/
│       ├── itemTerminology.js    # Existing — use for "bottles" vs "items" in copy
│       └── eventGuardrail.js     # Optional NEW or existing — getGapType(registeredCount, availableSlots)
└── tests/
    ├── unit/
    │   └── eventGuardrail.test.js   # Optional — if new/updated guardrail util
    └── e2e/
        └── specs/
            └── event-states.spec.js # MODIFIED or new — State drawer inline message + one-click start
```

**Structure Decision**: Web app; feature is frontend-only. All changes in `frontend/`: State drawer content in `EventAdminPage.jsx`, optional `eventGuardrail.js` for shared gap-type logic, reuse `Message` and `useItemTerminology`. No backend or new API.

## Implementation Design

### State drawer: when to show the message

- When **State drawer is open** AND the admin can transition to **started** (i.e. `event.state` is `created` or `completed`).
- Do **not** show when `event.state` is `paused` (resume) or `started` (no transition to started).

### Gap type and copy

- **availableSlots** = `event.itemConfiguration.numberOfItems - (event.itemConfiguration.excludedItemIds?.length ?? 0)`.
- **registeredCount** = `items.length` when items loaded; if items load failed (e.g. `itemsError`), treat as “unknown” and show fallback message (FR-007).
- **getGapType(registeredCount, availableSlots)** → `'zero-registrations' | 'more-slots' | 'fewer-slots' | 'match'`.
  - `match` → no message (or neutral).
  - `zero-registrations` or `more-slots` → **info** message (FR-002).
  - `fewer-slots` → **warning** message (FR-003).
- Fallback when load failed: show message "Counts unavailable" (canonical text per FR-007), keep Start clickable.

### Placement and UI

- Render the message **inside** the State drawer, **above** the Start (and any other transition) buttons.
- Use `<Message type="info">` for info and `<Message type="warning">` for warning.
- Copy: use `useItemTerminology(event)` so labels use “bottles”/“Bottles configuration” or “items”/“Items configuration” as appropriate (FR-006).

### Data sources

- **Event**: from EventAdminPage state (event from context/polling).
- **Items**: from EventAdminPage state (fetched via itemService.getItems).
- **Item configuration**: `event.itemConfiguration` (numberOfItems, excludedItemIds).
- No new API calls; all data already loaded on admin page.

## Complexity Tracking

No violations. Leave table empty or omit.
