# Quickstart: Event State Management Help Guide

**Feature**: 021-event-state-help-guide  
**Date**: 2026-03-02

## Prerequisites

- Node.js >=22.12.0
- Frontend deps installed (`npm install` in `frontend/`)
- Familiarity with `EventAdminPage.jsx` and the event state management section (drawer/section where Start / Pause / Complete are shown)

## Development Setup

```bash
cd frontend
npm run dev
```

Open an event admin page (`/event/:eventId/admin`), go to the section that manages event state (e.g. “Event state” or “Manage state”), and use the new help entry point to expand/collapse the inline help.

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/data/eventStateHelpContent.js` | Static help content: lifecycle steps and per-state admin/guest copy (to be added) |
| `frontend/src/pages/EventAdminPage.jsx` | State management section: add help trigger + inline expandable panel that reads `event` from context |
| `frontend/src/utils/eventState.jsx` | Existing `STATE_CONFIG` (labels, short descriptions); reuse for state names if desired |

## Architecture (inline help)

The help lives **inside the same drawer as the state controls**: on EventAdminPage, the event state management section is the content of the state SideDrawer (where Start / Pause / Complete live). The inline help trigger and panel are added inside that drawer, not on the main admin page.

```
EventAdminPage — state SideDrawer (event state management section)
├── State controls (Start / Pause / Complete) [existing]
├── Help trigger (e.g. “Learn about event states”) [new]
└── Inline expandable panel [new]
    ├── Current state line: event?.state ?? “—” / “Loading…”
    ├── Lifecycle: order, transitions, when to use (from eventStateHelpContent)
    └── Per-state: admin can / guest can (from eventStateHelpContent)
```

- **Expand/collapse**: One trigger, one panel (e.g. Accordion with one item or a boolean state + conditional content).
- **Data**: Content from `eventStateHelpContent.js`; current state and transitions from `useEventContext()` (and existing transition helpers on the page).
- **Placeholder**: When `event` is null or loading, show “—” or “Loading…” for current state; keep lifecycle and per-state copy visible.

## Content Editing

Edit `frontend/src/data/eventStateHelpContent.js` (or equivalent). Ensure:

- **Lifecycle**: All four states in order; for each, list allowed transitions and when to use them.
- **Per state**: For `created`, `started`, `paused`, `completed`, provide “admin can” and “guest can” (and optionally “cannot”) so FR-002–FR-004 are satisfied.

## Testing

- **Unit**: Content shape (all four states present, required fields); component renders with and without `event`; placeholder when `event` is null.
- **E2E**: Open state section → expand help → see lifecycle and state descriptions; change event state (or mock) and confirm help updates in place; no horizontal scroll at app minimum width.

## Minimum Viewport

Use the same minimum viewport width as the rest of the application. Document that value (e.g. in this quickstart or frontend README) so SC-004 can be validated at that width.

- **Event-state-help E2E** runs in the Playwright `mobile` project (e.g. iPhone 12–style viewport), which exercises the help at a narrow width.
- **SC-004** (no horizontal scroll, readable text, tappable controls at minimum viewport) is validated manually at the app’s minimum width unless a dedicated E2E at that exact width is added. When the app’s minimum width is defined (e.g. 320px or 375px), document it here or in the frontend README.
