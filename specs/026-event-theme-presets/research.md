# Research: Event Theme Presets

**Branch**: `026-event-theme-presets` | **Date**: 2026-03-08

## R-001: Where to Store Preset Definitions

**Decision**: Frontend only. The backend stores and validates the theme identifier string but does not need the visual details (colors, emoji, gradients).

**Rationale**: Presets are purely visual data — colors, gradients, emoji — consumed exclusively by the frontend rendering layer. Keeping them in the frontend means: no API call to fetch preset metadata, no synchronization between backend and frontend preset lists, and color values can be co-located with the CSS custom property system they feed into. The backend only needs to know the valid set of identifier strings for validation.

**Alternatives considered**:
- **Backend-stored presets (rejected)**: Would require a dedicated API endpoint to serve preset data, database storage for preset definitions, and frontend/backend sync when presets are added or modified. Adds complexity with no functional benefit since the backend never renders anything.
- **Shared module (rejected)**: The project is not a monorepo with shared packages. Creating a shared dependency for a small constants file introduces build pipeline complexity disproportionate to the problem.

## R-002: How to Propagate Theme to Components

**Decision**: Scoped CSS custom properties set on the event layout wrapper element, consumed by components via Tailwind arbitrary values (e.g., `bg-[var(--event-accent)]`) and inline `style` props with CSS var fallbacks.

**Rationale**: The application already uses CSS custom properties for design tokens (`globals.css`). Scoping theme variables to the event wrapper means: no global state mutation, automatic cleanup when leaving event context, and CSS-native fallback behavior (`var(--event-accent, var(--primary))`) guarantees backward compatibility. Components don't need to know whether a theme is active — they just reference the variable.

**Alternatives considered**:
- **React context with style objects (rejected)**: Would require every themed component to consume a context and apply inline styles manually. More prop drilling, more render overhead, and less maintainable than CSS-native propagation.
- **Global CSS class on `<body>` (rejected)**: Cannot scope to event context — would affect non-event pages (landing page, system admin). Also complicates cleanup when navigating between events with different themes.
- **Tailwind `@apply` with dynamic classes (rejected)**: Tailwind purges unused classes at build time. Dynamic class names (`bg-${color}`) are not safe-listable for arbitrary color values. CSS variables bypass this limitation entirely.

## R-003: Backend Validation Approach

**Decision**: Maintain an allowlist of valid theme identifiers (`VALID_THEMES`) in `EventService.js`. Validate on both create and update. Reject unrecognized values with a 400 error.

**Rationale**: Follows the existing validation pattern established by `validateTypeOfItem()` (which checks against `"wine"`). Simple, explicit, testable. The allowlist is a static array — no database lookup needed.

**Alternatives considered**:
- **No backend validation (rejected)**: Allows garbage data in the database. The spec requires server-side enforcement (FR-010).
- **Frontend-only validation (rejected)**: Spec explicitly requires backend validation. Clients can bypass frontend checks.
- **Dynamic validation from a config file (rejected)**: Over-engineering for a static set of 6 presets. If the set needs to change, updating the code and deploying is the expected workflow.

## R-004: Theme Update API Design

**Decision**: New dedicated endpoint `PATCH /api/events/:eventId/theme` accepting `{ theme: "identifier" }`. Enforces state check — rejects with 403 if event is not in "created" state.

**Rationale**: Follows the established pattern of dedicated update endpoints: `PATCH /events/:eventId/item-configuration`, `PATCH /events/:eventId/rating-configuration`, `PATCH /events/:eventId/state`. Each endpoint owns its validation and state guards. This avoids coupling theme updates with the generic `PATCH /events/:eventId` (which only supports `name`).

**Alternatives considered**:
- **Extend generic PATCH /events/:eventId (rejected)**: That endpoint currently only supports `name`. Adding theme there would mix concerns and require refactoring the handler to support field-level patching. Existing tests would need updating for the changed behavior.
- **No update endpoint — creation only (rejected)**: The spec requires admins to edit the theme on the admin page while in "created" state (Story 4, FR-019).

## R-005: My Events API Response Change

**Decision**: Add `theme` field to each event object in the `GET /api/events/mine` response.

**Rationale**: The My Events page needs the theme identifier to show accent-colored card borders and emoji (FR-017, Story 3). The field is a single short string — negligible payload increase. The endpoint already returns `{ eventId, name, state, createdAt }` per event; adding `theme` requires only a minor projection change.

**Alternatives considered**:
- **Separate API call per event to fetch theme (rejected)**: N+1 query pattern — unacceptable for a list page.
- **No theme on My Events page (rejected)**: Spec explicitly requires themed cards (Story 3, FR-017).

## R-006: Color Format and Always-Set Strategy

**Decision**: All preset color values use full `oklch(...)` CSS color values. `EventThemeProvider` always sets the `--event-*` CSS custom properties, including for the `classic` preset. Components consume these vars without inline fallbacks to existing Tailwind design tokens.

**Rationale**: The existing `:root` tokens in `globals.css` use bare HSL numbers (e.g., `--background: 0 0% 100%`) that are only valid when wrapped by Tailwind as `hsl(var(--background))`. They are NOT valid standalone CSS color values in inline `style` props. A fallback pattern like `var(--event-surface, var(--background))` would resolve to `0 0% 100%` for classic in light mode, which the browser ignores — causing invisible elements. Always setting the vars from `getThemeVars()` (which returns full oklch values) ensures components always receive valid colors regardless of preset or mode. The `.dark` overrides already use oklch, so dark mode was not affected — but this decision prevents a light-mode-only rendering bug.

**Alternatives considered**:
- **Fallback to existing Tailwind vars (rejected)**: Broken in light mode due to bare HSL numbers. Would require refactoring all existing `:root` tokens to full color values, which is a much larger change.
- **Keep Tailwind classes as baseline, override only for non-classic (rejected)**: Requires every themed component to conditionally apply styles based on whether the theme is classic or not — more complex, more error-prone, and violates the principle that components shouldn't know about specific presets.

## R-007: Dark Mode Variant Strategy

**Decision**: Each preset defines two complete color palettes (light and dark). The `EventThemeProvider` component detects the user's preference via `prefers-color-scheme` media query (or the app's existing dark mode class) and sets the appropriate set of CSS variables.

**Rationale**: The app already has `.dark` class overrides in `globals.css`. The theme provider can check for `.dark` on the document and select the corresponding variant. This ensures each preset looks intentionally designed in both modes, rather than relying on algorithmic lightness adjustments that may produce poor contrast.

**Alternatives considered**:
- **Algorithmic adjustment (rejected)**: Shifting oklch lightness values automatically is unpredictable for accent colors — some hues shift in unexpected ways. Manual dark variants ensure WCAG AA compliance.
- **Light-mode only (rejected)**: Spec requires both variants (FR-024, FR-025). The "Midnight Tasting" preset is already dark-toned in light mode — without a distinct dark variant it would be indistinguishable from default dark mode.
