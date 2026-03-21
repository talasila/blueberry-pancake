# Quickstart: Personality Detection Toggle

**Feature**: 040-personality-toggle
**Date**: 2026-03-21

## What This Feature Does

Adds a toggle to the event admin page that lets organizers disable personality detection for their wine tasting event. When disabled, guests see no personality labels, reveal sheets, or badge indicators anywhere in the app. All other features (ratings, notes, similar tastes, progress tracking) work normally.

## Key Files to Modify

### Backend
- `backend/src/services/EventConfigService.js` — Add `personalityEnabled` to defaults, read, update, and validation logic (mirror `noteSuggestionsEnabled`)

### Frontend — Admin
- `frontend/src/pages/EventAdminPage.jsx` — Add toggle state, fetch/save logic, and UI (Switch + description)

### Frontend — Guest Experience
- `frontend/src/pages/EventPage.jsx` — Gate personality reveal trigger, badge logic, and pre-drawer threshold check on `ratingConfig?.personalityEnabled !== false`
- `frontend/src/components/UserDetailsDrawer.jsx` — Conditionally hide personality card section
- `frontend/src/pages/DashboardPage.jsx` — Conditionally hide personality labels in dashboard view
- `frontend/src/components/PersonalitySummaryStrip.jsx` — Receive flag from parent, conditionally render
- `frontend/src/components/UserRatingsTable.jsx` — Receive flag from parent, conditionally render

### Tests
- `backend/tests/unit/EventConfigService.test.js` — Add tests for personalityEnabled validation
- `frontend/tests/unit/UserDetailsDrawer.test.jsx` — Add tests for personality suppression
- `frontend/tests/unit/DashboardPage.test.jsx` — Add tests for personality suppression
- `frontend/tests/e2e/specs/personality-reveal.spec.js` — Add disabled scenario
- `frontend/tests/e2e/specs/personality-card.spec.js` — Add disabled scenario

## Implementation Order

1. Backend: Add `personalityEnabled` to EventConfigService (read, write, validate)
2. Frontend admin: Add toggle to EventAdminPage
3. Frontend guest: Gate personality UI in EventPage, UserDetailsDrawer, DashboardPage
4. Tests: Unit and E2E for both enabled and disabled states

## How to Verify

1. Create a wine event
2. In rating configuration, see "Personality Detection" toggle (enabled by default)
3. Toggle it off, save, reload — confirm it persists as off
4. Start the event, rate enough items as a guest — confirm no personality reveal, badge, or card appears
5. Create another wine event, leave toggle on (default), repeat — confirm all personality UI appears as before
