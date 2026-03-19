# Research: Themed Event Entry Pages

**Feature**: 036-themed-entry-pages
**Date**: 2026-03-19

## Research Findings

### 1. How to expose public event info without authentication

**Decision**: Create a new `GET /api/events/:eventId/public-info` endpoint that returns `{ name, typeOfItem, theme, state }`.

**Rationale**: The existing `getEvent()` method in EventService already loads the full event object. A new endpoint simply projects the safe fields. This is cleaner than extending `check-admin` (which is email-scoped) or `rating-configuration` (which has different semantics). A dedicated endpoint is explicit about its purpose and easy to rate-limit independently.

**Alternatives considered**:
- Extending `check-admin` to return event info: Rejected — check-admin is email-scoped and called on form submit, not page load. We need info before the user enters anything.
- Extending `rating-configuration`: Rejected — mixing theme data into a rating endpoint is semantically confusing. Also lacks rate limiting.
- Adding a query param to the authenticated `GET /events/:eventId`: Rejected — requires auth, which entry pages don't have.

### 2. How to apply theme on entry pages without EventContextProvider

**Decision**: Create a shared `useEventPublicInfo(eventId)` hook that fetches public info on mount and returns `{ name, typeOfItem, theme, state, loading, error }`. Each entry page calls this hook and applies theme CSS vars using the existing `getThemeVars(theme, isDark)` function inline — the same approach `EventThemeProvider` uses.

**Rationale**: Entry pages cannot use EventContextProvider (it requires auth to load the full event). A lightweight hook that fetches only the public projection is the right abstraction. Applying CSS vars inline (same as EventThemeProvider) reuses the existing theme system without wrapping entry pages in a new provider. Three pages using the same hook satisfies DRY (Constitution Principle II).

**Alternatives considered**:
- Wrapping entry pages in EventContextProvider: Rejected — EventContextProvider loads the full event (requires auth). Entry pages are pre-auth.
- Creating a new EntryThemeProvider component: Rejected — unnecessary abstraction layer when the hook + inline vars accomplishes the same thing. The provider pattern is warranted when many children need theme context; here, each page just needs vars applied to its own wrapper.
- Passing theme data from EmailEntryPage to PIN/OTP pages via sessionStorage: Rejected — breaks when a user navigates directly to the PIN page (bookmark, refresh). Each page should independently fetch.

### 3. Rate limiting strategy for the public-info endpoint

**Decision**: Apply the same rate limiting pattern as `check-admin`: global rate limit via `rateLimitService.checkGlobalCheckAdminLimit()` plus per-IP limit in production via `rateLimitService.checkIPLimit(clientIP)`.

**Rationale**: The existing rate limiting infrastructure is proven and the limits are appropriate (60 global requests/minute, 5 per IP in production). No need to create new rate limit buckets — this endpoint has similar access patterns to check-admin (one call per page load).

**Alternatives considered**:
- No rate limiting: Rejected — public endpoints must be rate-limited per Constitution Principle V (Security).
- Separate rate limit bucket: Over-engineered — the access pattern is similar to check-admin and shares the same threat model.

### 4. Dark mode detection on entry pages

**Decision**: Use the same pattern as EventThemeProvider: read `document.documentElement.classList.contains('dark')` on mount and observe mutations. The `useEventPublicInfo` hook returns the raw theme ID; the page component handles dark mode detection and CSS var computation via `getThemeVars(theme, isDark)`.

**Rationale**: This is the exact same approach used by EventThemeProvider, ensuring consistency. Dark mode detection is a UI concern, so it belongs in the page component, not the data-fetching hook.

**Alternatives considered**:
- Including dark mode detection in the hook: Rejected — mixes data fetching with UI concerns. The hook should return data; the page decides how to render it.

### 5. Handling event-not-found and event-ended states

**Decision**: The `useEventPublicInfo` hook returns an `error` state for 404 responses and the `state` field for event lifecycle. Each entry page checks these and renders appropriate messaging: "Event not found" for 404, "This event has ended" banner for completed events (still allowing access).

**Rationale**: The event not found case is a hard error — show a message, hide the form. The completed case is informational — show a banner but let the user proceed (they may want to view results). This matches the spec (FR-008, FR-009).

### 6. Contextual copy using typeOfItem

**Decision**: The email entry page description uses a simple template: "Enter your details to join the {typeOfItem} tasting". If typeOfItem is empty or unavailable, fall back to "Enter your details to join the tasting". The PIN and OTP pages show the event name but don't need the typeOfItem in their description (they already have context from the previous step).

**Rationale**: Simple string interpolation. The typeOfItem values in the system are informal nouns (wine, whiskey, beer, etc.) that read naturally in the sentence "join the wine tasting". No mapping table needed.
