# Research: Personality Detection Toggle

**Feature**: 040-personality-toggle
**Date**: 2026-03-21

## Research Task 1: Existing Toggle Pattern (`noteSuggestionsEnabled`)

### Decision
Mirror the `noteSuggestionsEnabled` implementation exactly for `personalityEnabled`.

### Rationale
The pattern is proven, consistent, and handles all edge cases (backward compat, state restriction, wine-only gating, optimistic locking). Using the same pattern means less cognitive overhead and predictable behavior.

### Pattern Summary

**Backend (EventConfigService.js):**
- `getRatingConfiguration()`: Read from `event.ratingConfiguration.noteSuggestionsEnabled`. Default to `true` for wine events when undefined. Only include in response for wine events.
- `updateRatingConfiguration()`: Validate boolean type, enforce `event.state === 'created'`, enforce `event.typeOfItem === 'wine'`. Store in `ratingConfiguration` nested object.

**Backend (DynamoDB):**
- Single-table design. `ratingConfiguration` is a nested object within the event CONFIG item (`PK: EVENT#{eventId}, SK: CONFIG`). No separate table or item needed.

**Backend (API routes — events.js):**
- GET `/api/events/:eventId/rating-configuration` returns full config including toggle for wine events.
- PATCH `/api/events/:eventId/rating-configuration` accepts toggle in request body, validates via service layer. Uses optimistic locking via `expectedUpdatedAt`.

**Frontend (EventAdminPage.jsx):**
- State: `useState(true)` for the toggle.
- Fetch: On load, read from `apiClient.getRatingConfiguration()`, set state. Only for wine events.
- Save: Include in config payload only for wine events. Update local state from response.
- UI: Switch component, disabled when `event.state !== 'created'` or while saving.

**Frontend (EventPage.jsx → guest components):**
- `ratingConfig` state holds the full configuration including `noteSuggestionsEnabled`.
- Passed as individual prop to `RatingDrawer` → `RatingForm`.
- Defensive check pattern: `noteSuggestionsEnabled !== false` (treats undefined as enabled).

### Alternatives Considered
- **EventContext-based flag**: Would avoid prop threading but ratingConfig is already passed as props in this codebase. Mixing patterns would be inconsistent.
- **Backend suppression**: Could prevent personality computation entirely when disabled. Rejected because frontend-only suppression is simpler and the backend data could be useful if the flag becomes changeable later.

---

## Research Task 2: Personality UI Touchpoints

### Decision
Six frontend locations need the `personalityEnabled` check. The flag will flow via `ratingConfig` prop (existing pattern) rather than introducing a new context.

### Findings

**EventPage.jsx** — 3 touchpoints:
1. Personality reveal sheet trigger (lines 528-557): Check `personalityEnabled !== false` before scheduling reveal
2. Personality badge logic (lines 510-518): Check before showing badge dot on My Progress button
3. Pre-drawer threshold ref (lines 392-395): Check before tracking personality state

**UserDetailsDrawer.jsx** — 1 touchpoint:
- Already receives `ratingConfig` prop (line 765 in EventPage). Conditionally hide personality card section.

**DashboardPage.jsx** — 1 touchpoint:
- Fetches `ratingConfiguration` from dashboard data. Conditionally hide personality labels in summary and table.

**PersonalitySummaryStrip.jsx** and **UserRatingsTable.jsx** — receive personality data from parent (DashboardPage). Can be gated at the parent level or receive the flag as a prop.

### Rationale
Gating at the parent level (EventPage for guest experience, DashboardPage for results) is cleaner than pushing the flag into every leaf component. `PersonalityCard`, `PersonalityRevealSheet`, and `PersonalitySummaryStrip` are pure display components — they should simply not be rendered when disabled, rather than receiving a flag and rendering nothing.

### Alternatives Considered
- **Pass flag to every leaf component**: More explicit but adds unnecessary prop threading to pure display components that would just return null.
- **New React context for feature flags**: Over-engineered for a single boolean. Could revisit if more feature flags emerge.
