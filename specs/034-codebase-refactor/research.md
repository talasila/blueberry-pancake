# Research: Codebase Refactoring & Simplification

**Branch**: `034-codebase-refactor` | **Date**: 2026-03-16

## R1: Backend Cookie Clearing Duplication

**Decision**: Extract `clearAuthCookies(res)` utility into `backend/src/middleware/jwtAuth.js` alongside existing cookie option helpers.

**Rationale**: The cookie-clearing logic appears in 2 locations (4 `clearCookie` calls) in `auth.js` (lines 279-291 and 321-332). Both blocks are identical, clearing JWT and refresh cookies with production-aware options. Placing the utility in `jwtAuth.js` keeps cookie management co-located with `getJWTCookieOptions()` and `getRefreshCookieOptions()`.

**Alternatives considered**:
- Standalone `cookieUtils.js` — rejected: cookie management is already centralized in jwtAuth.js
- Inline helper in auth.js — rejected: other route files may need it in the future

## R2: Rate Limit Response Formatting

**Decision**: Extract `formatRateLimitResponse(res, result, message?)` into `backend/src/utils/apiErrorHandler.js`.

**Rationale**: 4 instances found across auth.js (lines 55-60, 77-82) and events.js (lines 249-254, 262-266). All compute `retryAfterSeconds`, `retryAfterMinutes`, and return a 429 JSON response. The apiErrorHandler already exports error-formatting helpers (`rateLimitError`, `badRequestError`, etc.), making it the natural home.

**Alternatives considered**:
- New `rateLimitUtils.js` — rejected: apiErrorHandler already handles error responses
- Middleware-level rate limiting — rejected: too large a change for this refactoring scope

## R3: Email Normalization Consistency

**Decision**: Replace all 12+ manual `.trim().toLowerCase()` calls with `normalizeEmail()` from `backend/src/utils/emailUtils.js`.

**Rationale**: Files with manual normalization: auth.js (2), events.js (4), EventService.js (5), ItemService.js (5), DashboardService.js (2), configLoader.js (1). Several of these files already import from emailUtils.js but still use manual calls in some methods. The utility `normalizeEmail()` does exactly `email.trim().toLowerCase()`.

**Alternatives considered**:
- Middleware-level normalization — rejected: would require request mutation, not all endpoints have email in the same field
- Keep manual calls — rejected: violates DRY principle (Constitution II)

## R4: Timestamp Formatting

**Decision**: Extract `getCurrentTimestamp()` into `backend/src/utils/timestamps.js`.

**Rationale**: 25+ instances of `new Date().toISOString()` across EventService.js (20+), ItemService.js (6), RatingService.js (1). RatingService has a variant: `.replace(/\.\d{3}Z$/, 'Z')` which strips milliseconds. The utility should support both formats: `getCurrentTimestamp()` (standard) and `getCurrentTimestamp({ stripMs: true })`.

**Alternatives considered**:
- Use a date library (dayjs, date-fns) — rejected: `toISOString()` is standard and sufficient
- Keep inline — rejected: centralizing enables future format changes and testing

## R5: Frontend Wrapper Removal

**Decision**: Remove `useQuotes.js`, `usePINVerification.js`, and `dashboardService.js`, updating consumers to use underlying implementations.

**Rationale**:
- `useQuotes.js` (22 lines): Wraps `quoteService` with hardcoded `loading: false`. Only consumer: `RatingForm.jsx`. Will use `quoteService.getSuggestionsForRating()` directly.
- `usePINVerification.js` (22 lines): Wraps `usePIN()` from PINContext with a computed `isVerified`. No external consumers found — may already be unused. Will search exhaustively before removing.
- `dashboardService.js` (24 lines): Single method wrapping `apiClient.get()`. Consumers: DashboardPage, ItemDetailsDrawer, EventPage. Will replace with direct `apiClient.get('/events/${eventId}/dashboard')` calls.

**Alternatives considered**:
- Deprecation period — rejected: internal codebase, not a library; immediate removal is safe
- Keep wrappers for future expansion — rejected: YAGNI; re-add if needed

## R6: Event ID Validation Consolidation

**Decision**: Consolidate to `frontend/src/utils/eventIdValidation.js` as the single frontend validation module. Remove validation from `serviceValidation.js` (event ID only; keep `validateItemId`) and inline checks in `ratingService.js`.

**Rationale**: Three implementations exist with different strictness levels:
- `eventIdValidation.js`: Regex pattern `/^[A-Za-z0-9]{8}$/` + normalization (strictest, matches backend)
- `serviceValidation.js`: Loose string checks (falsy, empty, 'undefined', 'null')
- `ratingService.js`: Inline duplicate of serviceValidation pattern

**Alternatives considered**:
- Shared validation package between frontend/backend — rejected: over-engineered for this scope
- Keep serviceValidation as-is — rejected: less strict than eventIdValidation, creates inconsistency

## R7: EmailService.isValidEmail Wrapper

**Decision**: Remove `EmailService.isValidEmail()` method, update callers to import `isValidEmail` directly from `emailUtils.js`.

**Rationale**: The method (lines 58-60) is a pure pass-through to `isValidEmailUtil()`. Callers in auth.js use `emailService.isValidEmail()` but could import the utility directly. Other services already do this.

## R8: Delete Dialog Consolidation

**Decision**: Create `DestructiveActionDialog` component accepting configuration props. Each dialog's unique content will be passed as a `children` or `contentItems` prop.

**Rationale**: All 4 dialogs share: backdrop/overlay, header (icon + title + close), confirmation input with phrase matching, keyboard handlers (Enter/Escape), footer buttons with loading state. Unique per dialog: title text, confirmation phrase, description, list of affected data items, conditional warnings.

**Prop interface**:
- `isOpen`, `onClose`, `onConfirm`, `isDeleting` (common)
- `title`, `description`, `confirmationText`, `icon` (configurable)
- `children` (unique content per use case)

## R9: Route Protection Abstraction

**Decision**: Extract shared loading spinner and create a `RouteGuard` wrapper component that accepts a permission-checking function.

**Rationale**: ProtectedRoute (41 lines), AdminRoute (61 lines), DashboardRoute (62 lines) all share: loading spinner markup, permission check → redirect pattern, loading state management. The key difference is the permission check logic. A `RouteGuard` component with `checkPermission` callback keeps each route's unique logic while eliminating the shared boilerplate.

## R10: Header.jsx Refactoring

**Decision**: Extract `useDarkMode()` hook and define menu items as a declarative data array.

**Rationale**: Header.jsx (375 lines) contains:
- MutationObserver for dark mode (lines 35-44): Generic, reusable hook
- 8 handler functions: Can be mapped to menu item definitions
- 4 conditional menu sections: Can be driven by a filtered array with `visible` predicates

**Structure**:
- `useDarkMode()` hook: Returns `{ isDark, toggleDark }`, manages MutationObserver lifecycle
- Menu items array: `[{ label, icon, onClick, visible: (ctx) => boolean }]`
- Header renders by mapping/filtering the array

## R11: Backend Error Handling Standardization

**Decision**: Add `handleApiError` to `auth.js`, `quotes.js`, and `system.js`. Remove manual `error.message.includes('not found')` patterns.

**Rationale**: Files already using handleApiError: ratings.js, events.js, items.js, dashboard.js, similarUsers.js. Files not using it: auth.js (most complex), quotes.js, system.js. The `apiErrorHandler.js` utility already exports typed error helpers for all common HTTP statuses.

## R12: RatingForm Utility Extraction

**Decision**: Extract `retryWithBackoff(fn, maxRetries, baseDelay)` and `appendWithCharLimit(existingText, newText, maxLength)` into `frontend/src/utils/`.

**Rationale**:
- Retry logic (lines 184-237): 3 retries, checks `isRetryable` (network/5xx/timeout), exponential backoff (`delay * (attempt + 1)`). Generic pattern reusable elsewhere.
- Character limit (lines 122-146): Appends text respecting 500-char limit, truncates intelligently. The `appendSuggestion` (lines 105-113) without limit can be removed since `appendSuggestionWithLimit` supersedes it.

## R13: ItemDetailsDrawer Split

**Decision**: Extract calculation utilities and sorting hook from ItemDetailsDrawer.jsx (589 lines).

**Rationale**: 6 `useMemo` blocks (lines 160-313) compute: rating distribution, average rating, Bayesian weighted average, user rating lookup, rating progression %, and item rank. Sorting state (lines 274-313) manages column/direction with a generic sort comparator. These are pure computations suitable for utility extraction.

**Extraction targets**:
- `itemCalculations.js`: Rating distribution, weighted average, ranking, progression
- `useColumnSort(defaultColumn, defaultDirection)`: Generic sorting hook

## R14: EventService.js Split

**Decision**: Split 2,146-line EventService.js into 3 services with one-directional dependencies.

**Rationale**: Dependency analysis confirms no circular dependencies:
- `EventService` (core): CRUD, state transitions, getEvent, updateEvent, validation helpers, user registration, migration helpers (~800 lines estimated)
- `EventAdminService`: Administrator CRUD, PIN regeneration, user deletion, bulk operations (~500 lines estimated)
- `EventConfigService`: Rating config, item config, theme, bookmarks, user profiles (~600 lines estimated)

Both `EventAdminService` and `EventConfigService` depend on core `EventService` (getEvent, isAdministrator, updateEvent) but not on each other. Shared helpers (normalizeEmail, isValidEmail, isAdministrator, isOwner) stay in EventService or are imported from emailUtils.

**API route impact**: `api/events.js` uses 24 methods and will need updated imports. `api/items.js` and `api/dashboard.js` only use `getEvent` and `isAdministrator` from core.
