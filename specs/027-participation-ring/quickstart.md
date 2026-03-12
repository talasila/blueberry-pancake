# Quickstart: Live Participation Ring on Item Buttons

**Branch**: `027-participation-ring` | **Date**: 2026-03-11

## What This Feature Does

Adds a subtle circular participation ring around each item button on the event page during active tastings. The ring fills as more participants rate each item, giving everyone ambient awareness of the room's progress.

## Files to Change

| File | Action | What Changes |
|------|--------|-------------|
| `frontend/src/utils/participationCounts.js` | CREATE | Pure function: `deriveItemRaterCounts(ratings)` → `Record<number, number>` |
| `frontend/src/components/ItemButton.jsx` | MODIFY | Add optional `ratedCount`, `totalParticipants`, `showRing` props. Render SVG ring when `showRing` is true. |
| `frontend/src/components/RatingDrawer.jsx` | MODIFY | Add optional `ratedCount`, `totalParticipants` props. Show "N of M tasters have rated this item" text. |
| `frontend/src/pages/EventPage.jsx` | MODIFY | Retain `allRatings` in `loadRatings()`, derive `itemRaterCounts` state. Trigger `loadRatings()` on event poll during `started`. Pass ring props to ItemButton and RatingDrawer. |
| `frontend/tests/unit/participationCounts.test.js` | CREATE | Unit tests for count derivation (empty array, single rater, duplicates, re-ratings, multiple items). |
| `frontend/tests/unit/ItemButton.test.jsx` | CREATE/MODIFY | Tests for ring rendering: shows when `showRing`, hidden when not, correct progress fraction, graceful fallback. |
| `frontend/tests/e2e/specs/participation-ring.spec.js` | CREATE | E2e test: ring visible during `started`, hidden during other states. |

## Implementation Order

1. **Utility function** (`participationCounts.js` + tests) — no UI dependencies, fully unit-testable in isolation
2. **ItemButton ring** (`ItemButton.jsx` + tests) — pure rendering, can be tested with hardcoded props
3. **RatingDrawer text** (`RatingDrawer.jsx`) — simple text addition
4. **EventPage wiring** (`EventPage.jsx`) — connects everything: derives counts, triggers poll-based refresh, passes props
5. **E2e test** (`participation-ring.spec.js`) — validates the full flow across event states

## How to Verify Locally

1. Start the dev environment: `npm run dev`
2. Create an event and start it
3. Open the event in two different browser sessions (two different users via OTP)
4. Rate items in one session → observe the ring filling on the other session's item buttons (after ~30 seconds)
5. Transition event to `paused` → rings disappear
6. Transition back to `started` → rings reappear
7. Tap an item button → rating drawer shows "N of M tasters have rated this item"

## Key Design Decisions

- **Ring color**: Darker shade of the button's own color via CSS `color-mix()`, not the theme accent
- **No new API endpoints**: Counts derived from existing `GET /events/:eventId/ratings` response
- **Polling**: Piggybacked on existing 30-second event poll — no new intervals
- **Visibility**: Only during `started` state — hidden in `created`, `paused`, `completed`
- **Graceful degradation**: Ring invisible on browsers without `color-mix()` support — no broken layout
