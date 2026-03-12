# Quickstart: Tasting Personality Card

**Branch**: `028-tasting-personality` | **Date**: 2026-03-12

## What This Feature Does

Assigns each guest a humorous "tasting personality" based on their rating patterns during a blind tasting event. Personalities like "The Simon Cowell" or "The Golden Retriever" appear in three places: the guest's own My Progress drawer, the Similar Users drawer (other guests), and the Dashboard Summary tab (host view). Quote content matches the voice of the existing suggested wine notes.

## Files to Change

| File | Action | What Changes |
|------|--------|-------------|
| `backend/src/services/PersonalityService.js` | CREATE | Pure `detectPersonality(input)` function. 11 prioritized detection rules, threshold check, helper for std dev and speed. |
| `backend/src/services/DashboardService.js` | MODIFY | In `calculateUserSummaries()`: preserve `noteCount`, `noteLengths`, and timestamps from ratings loop. Call `detectPersonality()` for each user when `typeOfItem === "wine"`. Add `noteCount` and `personality` to output. |
| `backend/src/services/SimilarityService.js` | MODIFY | In `findSimilarUsers()`: derive detection input from `allRatings` per similar user. Call `detectPersonality()`. Add `personality` field to each similar user object. |
| `frontend/src/utils/personalityDetection.js` | CREATE | Frontend mirror of `detectPersonality()`. Same logic, same rules, same output. Used for current user's own personality. |
| `frontend/src/utils/personalityContent.js` | CREATE | Content map: `{ [typeId]: { name, quotes[] } }`. Functions: `getPersonalityDisplay(id, vars)` (random quote + interpolation), `getPersonalityName(id)`. Template interpolation utility. |
| `frontend/src/components/PersonalityCard.jsx` | CREATE | Compact card: personality name, interpolated quote, optional "Previously: X" line. Used in UserDetailsDrawer and SimilarUsersDrawer detail view. |
| `frontend/src/components/UserDetailsDrawer.jsx` | MODIFY | At drawer open: compute personality from loaded ratings (if wine event). Store/check `sessionStorage` for shift detection. Render `<PersonalityCard>` above Rating Timeline. |
| `frontend/src/components/SimilarUsersDrawer.jsx` | MODIFY | In user list: show `personality` name as subtitle next to common items count (from API response). In detail view: render `<PersonalityCard>` with quote. |
| `frontend/src/pages/EventPage.jsx` | MODIFY | On My Progress button: show dot badge when user first qualifies for personality (check via threshold + `sessionStorage`). Clear on drawer open. Gate on `typeOfItem === "wine"`. |
| `frontend/src/pages/DashboardPage.jsx` | MODIFY | In Summary tab: add "Tasting Personalities" section below statistics cards. List qualifying users with name + personality. Rows open UserDetailsDrawer. |
| `backend/tests/unit/PersonalityService.test.js` | CREATE | Test each detection rule, priority ordering, threshold clamping, edge cases (2-point scale, single rating, no notes). |
| `backend/tests/unit/DashboardService.test.js` | MODIFY | Assert `noteCount` and `personality` in user summaries. Test wine vs. non-wine gating. |
| `backend/tests/unit/SimilarityService.test.js` | MODIFY | Assert `personality` field in similar users response. |
| `frontend/tests/unit/personalityDetection.test.js` | CREATE | Mirror backend tests for frontend detection function. Ensure parity. |
| `frontend/tests/unit/personalityContent.test.js` | CREATE | Test interpolation, content integrity (all types have name + quotes), unknown type handling. |
| `frontend/tests/unit/PersonalityCard.test.jsx` | CREATE | Test card rendering, shift display, quote interpolation, accessibility. |
| `frontend/tests/unit/SimilarUsersDrawer.test.jsx` | MODIFY | Test personality subtitle appears when present, hidden when null. |
| `frontend/tests/unit/EventPage.test.jsx` | MODIFY | Test dot badge visibility and clearing. |

## Implementation Order

1. **PersonalityService + tests** (`backend/src/services/PersonalityService.js`, `backend/tests/unit/PersonalityService.test.js`)
   - Pure function, no dependencies on other changes. Fully unit-testable in isolation.
   - This is the foundation — every other piece depends on correct detection.

2. **personalityDetection + tests** (`frontend/src/utils/personalityDetection.js`, `frontend/tests/unit/personalityDetection.test.js`)
   - Frontend mirror of step 1. Can share test cases for parity verification.
   - No UI dependencies. Pure logic.

3. **personalityContent + tests** (`frontend/src/utils/personalityContent.js`, `frontend/tests/unit/personalityContent.test.js`)
   - Content map + interpolation utility. No dependencies on detection logic.
   - Can be developed in parallel with step 2.

4. **PersonalityCard component + tests** (`frontend/src/components/PersonalityCard.jsx`, `frontend/tests/unit/PersonalityCard.test.jsx`)
   - Presentational component. Depends on `personalityContent` for display data.
   - Can be tested with hardcoded props.

5. **DashboardService integration + tests** (`backend/src/services/DashboardService.js`, `backend/tests/unit/DashboardService.test.js`)
   - Wire `PersonalityService.detectPersonality()` into `calculateUserSummaries()`.
   - Add `noteCount` tracking and timestamp preservation.

6. **SimilarityService integration + tests** (`backend/src/services/SimilarityService.js`, `backend/tests/unit/SimilarityService.test.js`)
   - Wire `PersonalityService.detectPersonality()` into `findSimilarUsers()`.
   - Derive detection input from grouped ratings.

7. **UserDetailsDrawer integration** (`frontend/src/components/UserDetailsDrawer.jsx`)
   - Compute personality from loaded ratings. Render `<PersonalityCard>`.
   - Add sessionStorage shift tracking.

8. **SimilarUsersDrawer integration + tests** (`frontend/src/components/SimilarUsersDrawer.jsx`, `frontend/tests/unit/SimilarUsersDrawer.test.jsx`)
   - Show personality subtitle in list. Show card in detail view.

9. **EventPage dot badge + tests** (`frontend/src/pages/EventPage.jsx`, `frontend/tests/unit/EventPage.test.jsx`)
   - Add dot badge to My Progress button. Manage via sessionStorage.

10. **DashboardPage Tasting Personalities section** (`frontend/src/pages/DashboardPage.jsx`)
    - Add section to Summary tab. Wire up row taps to open UserDetailsDrawer.

## How to Verify Locally

1. Start the dev environment: `npm run dev`
2. Create a **wine** event with 8 items and start it
3. Join as a guest and rate 4+ items (all high ratings → expect "The Golden Retriever")
4. Observe the dot badge appear on the My Progress button
5. Open My Progress → personality card at top with name + quote
6. Rate more items to change the pattern (e.g., give low ratings) → reopen drawer → see "Previously: The Golden Retriever"
7. Open a second browser session as a different user, rate 4+ items
8. In the first session, open Similar Users → see other user's personality name
9. Complete the event → open Dashboard → Summary tab → "Tasting Personalities" section shows all qualifying users
10. Create a **non-wine** event → verify personality is completely hidden on all surfaces

## Key Design Decisions

- **Dual detection**: Backend computes for other users (Similar Users, Dashboard), frontend computes for current user (My Progress) — no additional API call needed
- **No new endpoints**: Personality piggybacks on existing dashboard and similar-users responses
- **No new DB entities**: Computed at query time from existing rating data
- **Wine-only gate**: Entire feature hidden for non-wine events (content is wine-specific)
- **sessionStorage for shift tracking**: Ephemeral — personality history does not persist across browser sessions
- **One-time dot badge**: Discovery cue appears once when personality first qualifies, never again for that session
- **Content as code**: Personality quotes live in a JS module (~3KB), not backend files — small enough, no async loading needed
