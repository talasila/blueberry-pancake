# Research: Tasting Personality Card

**Branch**: `028-tasting-personality` | **Date**: 2026-03-12

## Where to Run Personality Detection: Backend vs. Frontend

**Decision**: Backend computes personality for other users (similar users, dashboard). Frontend computes personality for the current user from already-loaded rating data.

**Rationale**: The current user's ratings are already loaded in `EventPage` and passed to `UserDetailsDrawer` via `ratingService.getRatings()`. Computing personality client-side avoids an additional API call (aligns with FR-025 and SC-001). For *other* users' personalities (Similar Users, Dashboard), the backend already has all ratings loaded in `SimilarityService.findSimilarUsers()` and `DashboardService.calculateUserSummaries()` — computing personality there is a zero-cost side-effect.

**Alternatives considered**:
- **Backend-only**: Rejected — would require the current user's personality to come from an API response. The dashboard endpoint requires `completed` state (or admin), and the similar users endpoint returns *other* users, not the current one. A new endpoint would violate FR-025.
- **Frontend-only**: Rejected — `SimilarUsersDrawer` and `DashboardPage` don't have access to other users' full rating data (notes, timestamps). The backend already has this data in service methods.

**Implication**: The detection function must be implemented twice — once in backend (`PersonalityService.js`), once in frontend (`personalityDetection.js`). Both must produce identical results for the same input. This is acceptable because the function is pure, deterministic, and unit-tested on both sides. The alternative (a shared package) would add build complexity disproportionate to ~80 lines of logic.

## Detection Function Placement in Backend

**Decision**: Create `backend/src/services/PersonalityService.js` as a stateless module exporting a pure `detectPersonality(input)` function. Import it in both `DashboardService` and `SimilarityService`.

**Rationale**: Follows the existing service pattern (e.g., `bayesianAverage.js` in utils). A "service" is appropriate because the function encapsulates business logic (personality rules), not just math. It mirrors how `meanAbsoluteError.js` is a utility imported by `SimilarityService`.

**Alternatives considered**:
- **Inline in DashboardService**: Rejected — would duplicate when adding to SimilarityService (DRY violation, Principle II).
- **Put in `backend/src/utils/`**: Considered but rejected — detection is domain logic (11 personality rules with specific thresholds), not a generic utility like `csvParser` or `bayesianAverage`. The service layer is more appropriate.

## Gathering noteCount and Timestamps for Detection

**Decision**: Modify `DashboardService.calculateUserSummaries()` to preserve `noteCount` (count of ratings with non-empty `note` field) and compute speed data (earliest/latest timestamps) during the existing rating aggregation loop. In `SimilarityService`, derive the same fields from `allRatings` which already includes notes and timestamps.

**Rationale**: Both services already iterate over all ratings. Adding a counter for non-empty notes and tracking min/max timestamps is O(1) additional work per rating — zero additional DB queries. The raw rating records from DynamoDB already contain `note` and `timestamp` fields.

**Alternatives considered**:
- **Additional DynamoDB query for notes**: Rejected — ratings already contain the `note` field. No extra query needed.
- **Storing noteCount as a separate attribute**: Rejected — violates FR-026 (no new DB entities) and adds write-time complexity.

## Standard Deviation Calculation

**Decision**: Implement standard deviation as an inline helper within the detection function. Use population standard deviation (not sample), since we have all ratings, not a sample.

**Rationale**: The detection rules for "The Rollercoaster" (stddev > 35% of range) and "The Diplomat" (stddev < 20% of range) require standard deviation. Population stddev is correct because the user's ratings are the complete population, not a sample. The calculation is ~5 lines of code — no library needed.

**Alternatives considered**:
- **External statistics library (e.g., simple-statistics)**: Rejected — a full statistics library for a single 5-line function violates Principle II's intent (use packages for *non-trivial* problems). Standard deviation is trivial.

## Speed Measurement Strategy

**Decision**: Measure speed as `(latestTimestamp - earliestTimestamp) / (uniqueItemsRated - 1)` to get average inter-rating time. For a user with only 1 rating, speed is undefined and speed-based personalities are skipped.

**Rationale**: The spec (FR-017) defines speed as "elapsed time from earliest to latest rating timestamp divided by unique items rated." Using `uniqueItemsRated - 1` gives average time *between* ratings (n ratings create n-1 intervals), which maps more intuitively to the 2-minute and 8-minute thresholds. If a user rates 8 items over 14 minutes, the average inter-rating time is 14/7 = 2 minutes.

**Alternatives considered**:
- **Dividing by total items rated (not n-1)**: Considered — this is what the spec literally says. However, it would mean a user who rates 2 items 1 minute apart has an average of 0.5 minutes (unreasonably fast). Using n-1 intervals is the standard approach for spacing measurements and aligns better with the 2-minute/8-minute intent.
- **Per-consecutive-gap measurement**: Rejected per spec — re-ratings would skew timestamps. Span-based measurement is more robust.

## Personality Content: File Format and Location

**Decision**: Store personality content as a JavaScript object in `frontend/src/utils/personalityContent.js`. Each personality type maps to `{ name: string, quotes: string[] }`. Export a `getPersonalityDisplay(typeId, templateVars)` function that selects a random quote and interpolates tokens.

**Rationale**: The total content is ~50 personality quotes across 11 types — approximately 3KB. This is small enough to live in a single JS module, loaded once with the app bundle. No async loading, no backend content serving. Follows the principle of keeping content close to where it's consumed.

**Alternatives considered**:
- **Backend `.txt` files (like existing quotes)**: Rejected — the existing quote system uses text files because quotes are served via an API endpoint (`GET /api/quotes/:ratingLevel`). Personality quotes are rendered client-side from a known personality type — no API call needed. Adding a backend loading/serving layer would be unnecessary complexity.
- **JSON file**: Considered — but a JS module allows co-locating the `getPersonalityDisplay` function and template interpolation logic, reducing import surface area.
- **Separate file per personality type**: Rejected — 11 files for 3-5 lines each is excessive fragmentation. A single file is easier to review, edit, and maintain.

## Template Interpolation Approach

**Decision**: Simple string replacement via `String.prototype.replace()` with a regex matching `{tokenName}`. No template engine.

**Rationale**: The token set is small and fixed (`{n}`, `{max}`, `{count}`, `{minutes}`, `{avg}`, `{preview}`, `{item}`, `{items}`). A `replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')` one-liner handles all cases. Adding a template engine for 8 tokens would violate Principle II (prefer simplicity).

**Alternatives considered**:
- **Template literals at definition time**: Rejected — quotes must be defined as static strings (content lives in a data file). Template literals would require the data to be functions, complicating the content format.
- **Mustache/Handlebars**: Rejected — a full template engine for 8 simple token replacements is disproportionate.

## Personality Threshold Clamping for Small Events

**Decision**: The minimum rating threshold `max(4, ceil(totalItems * 0.5))` is clamped to `totalItems` when `totalItems < 4`. So for a 3-item event, the threshold is 3 (all items), not 4 (impossible).

**Rationale**: FR-001 explicitly specifies this clamping behavior. Without it, events with fewer than 4 items would never trigger personality assignment — a confusing UX for small events.

**Alternatives considered**:
- **Hard minimum of 4 regardless of event size**: Rejected per spec — would make personalities impossible in small events.
- **No minimum, just 50%**: Rejected — for large events, 50% of 2 items = 1 item, which is too few ratings for meaningful pattern detection.

## Dot Badge for Personality Discovery (FR-022/23/24)

**Decision**: Track personality availability in `sessionStorage` with a key like `personality-badge-{eventId}`. When ratings cross the threshold and a personality is first computed, set a flag. Clear it when the drawer opens. The dot badge is a small CSS circle positioned on the My Progress button.

**Rationale**: `sessionStorage` is already used for personality shift tracking (FR-009/010). Using it for the badge flag keeps all ephemeral personality state in one storage mechanism. The badge is purely cosmetic — a 6px colored dot — requiring no new component, just a conditional CSS class on the existing button.

**Alternatives considered**:
- **React state only**: Rejected — would reset on page re-render from polling, causing the badge to flicker.
- **localStorage**: Rejected — badge should reappear in a new session (the user may not have noticed it). `sessionStorage` provides the right lifetime.

## Frontend Detection for Current User

**Decision**: Compute the current user's personality on the frontend in `UserDetailsDrawer` when it opens, using the already-loaded ratings data. The detection function in `personalityDetection.js` mirrors the backend's `PersonalityService.detectPersonality()`.

**Rationale**: `UserDetailsDrawer` already calls `ratingService.getRatings(eventId)` and computes `calculateUserRatingProgress()`. The ratings data (including notes and timestamps) is available. Running detection client-side avoids needing personality in any API response for the current user.

**Alternatives considered**:
- **Backend-only via the dashboard endpoint**: Rejected — dashboard requires `completed` state or admin access. The personality card must work during `started` and `paused` states.
- **New dedicated API endpoint**: Rejected per FR-025 (no new endpoints).

## Event Type Gating

**Decision**: Gate the entire personality feature on `event.typeOfItem === "wine"` at each surface (frontend) and each API response inclusion point (backend). The detection function itself is event-type-agnostic — gating happens at the call site.

**Rationale**: FR-021 requires hiding personality entirely for non-wine events. FR-020 requires detection logic to remain type-agnostic for future extensibility. Gating at call sites (not inside the detection function) preserves this separation.

**Alternatives considered**:
- **Gate inside the detection function**: Rejected — would couple detection logic to event type, making future expansion harder.
- **Gate only on frontend**: Rejected — would still compute and transmit personality data in API responses for non-wine events, wasting computation and bandwidth.
