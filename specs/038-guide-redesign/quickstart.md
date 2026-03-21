# Quickstart: Guide Redesign

**Branch**: `038-guide-redesign` | **Date**: 2026-03-20

## What This Feature Does

Replaces three separate guide systems (admin guide, walkthrough, hosting guide host path) with a single unified event guide that walks a host through the entire blind tasting experience — from announcing the event to declaring the winner. The guide shows all 17 steps at all times with a "you are here" marker based on event lifecycle state.

## Key Files

### New
- `frontend/src/data/eventGuideContent.js` — 17 steps organized into 4 phases with step type indicators
- `frontend/src/components/guide/EventGuideDrawer.jsx` — Scrollable list drawer with done/now/ahead visual states, phase headers, auto-scroll to current section

### Modified
- `frontend/src/data/guideContent.js` — Host path rewritten to summarize the 17-step flow at overview depth. Guest path unchanged.
- `frontend/src/components/guide/GuideStepCard.jsx` — Add expand/collapse toggle and step-type indicator (real-world vs in-app)
- `frontend/src/App.jsx` — Replace `AdminGuideDrawer` import/render with `EventGuideDrawer`
- `frontend/src/components/WelcomeBottomSheet.jsx` — Replace `WalkthroughDrawer` reference with `EventGuideDrawer` callback

### Removed
- `frontend/src/data/adminGuideContent.js`
- `frontend/src/data/walkthroughContent.js`
- `frontend/src/components/guide/AdminGuideDrawer.jsx`
- `frontend/src/components/guide/WalkthroughDrawer.jsx`

### Tests (rewritten)
- `frontend/tests/unit/adminGuideContent.test.js` → rewritten for `eventGuideContent`
- `frontend/tests/e2e/specs/admin-guide.spec.js` → rewritten for `EventGuideDrawer`

## How to Verify

```bash
# Run unit tests
npm test

# Run linting
npm run lint

# Manual verification
# 1. Create an event → open event guide → verify 17 steps visible, steps 7-10 highlighted
# 2. Start event → reopen guide → verify step 11 highlighted, steps 1-10 dimmed
# 3. Pause event → reopen guide → verify steps 12-16 highlighted
# 4. Complete event → reopen guide → verify step 17 highlighted
# 5. Visit non-admin page → open hosting guide → verify rewritten host overview
# 6. Visit non-admin page → open guest guide → verify unchanged 4-step path
```

## Architecture Notes

- Event guide reads `event.state` from `useEventContext()` — no new backend calls
- Step visual state (done/now/ahead) is computed at render time via a pure mapping function
- Auto-scrolls to first "now" step after drawer mount animation completes (300ms)
- Phase headers are non-interactive visual dividers between step groups
- GuideStepCard gains expand/collapse but remains backward-compatible for GuideDrawer usage
- GuideProgress and GuideNavigation are NOT reused (carousel-specific, not applicable to scrollable list)
