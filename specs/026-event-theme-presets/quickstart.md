# Quickstart: Event Theme Presets

**Branch**: `026-event-theme-presets`

## Prerequisites

- Node.js 20+
- Backend and frontend dependencies installed (`npm install` in both directories)
- DynamoDB local or AWS credentials configured
- Existing features: event creation (004), event admin page, My Events page (016), post-creation welcome bottom sheet (020), guest welcome bottom sheet (025)

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/utils/themePresets.js` | Theme preset definitions (IDs, names, colors, emoji) and helper functions |
| `frontend/src/components/EventThemeProvider.jsx` | Wrapper that sets scoped CSS custom properties from event's theme |
| `frontend/src/components/ThemePicker.jsx` | Self-styled preset card grid for creation and admin pages |

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/EventService.js` | Add `VALID_THEMES` allowlist, `validateTheme()`, theme in `createEvent()`, new `updateTheme()` method |
| `backend/src/api/events.js` | Add `PATCH /events/:eventId/theme` route, pass `theme` in create handler, include `theme` in My Events response |
| `frontend/src/services/apiClient.js` | Add `updateTheme(eventId, theme)` method |
| `frontend/src/pages/CreateEventPage.jsx` | Add ThemePicker below type field, include `theme` in createEvent payload |
| `frontend/src/pages/EventAdminPage.jsx` | Add theme section with ThemePicker (editable in "created", read-only otherwise) |
| `frontend/src/pages/MyEventsPage.jsx` | Themed card borders/backgrounds and emoji from event.theme |
| `frontend/src/components/Header.jsx` | Consume `--event-header-bg` CSS var, display emoji prefix from theme |
| `frontend/src/components/ItemButton.jsx` | Consume `--event-surface` CSS var for unrated button background |
| `frontend/src/components/GuestWelcomeBottomSheet.jsx` | Consume `--event-surface` CSS var for sheet background |
| `frontend/src/components/WelcomeBottomSheet.jsx` | Consume `--event-surface` and `--event-accent` CSS vars |
| `frontend/src/App.jsx` | Wrap event routes with EventThemeProvider |

## Development Flow

### Step 1: Backend — Theme Validation and Storage

1. In `EventService.js`, add `VALID_THEMES = ['classic', 'cellar', 'garden', 'golden', 'midnight', 'rose']` and a `validateTheme(theme)` method mirroring the `validateTypeOfItem()` pattern.
2. Update `createEvent()` to accept an optional `theme` parameter. Default to `'classic'` if not provided. Validate against allowlist.
3. Add `updateTheme(eventId, theme, administratorEmail)` method: fetch event, check state is `'created'`, validate theme, update and save.
4. In `events.js`, pass `theme` from the POST request body to `createEvent()`. Add the `PATCH /events/:eventId/theme` route handler (admin-only, validates, calls `updateTheme`).
5. Update the My Events query projection to include `theme`.

### Step 2: Backend — Tests

1. Unit tests in `EventService.test.js`: validate theme on create (valid, invalid, missing/default), validate theme update (valid, invalid, wrong state, non-admin).
2. Integration tests in `events.test.js`: create event with theme, create without theme (defaults), PATCH theme (success, invalid, wrong state, not admin), verify My Events includes theme.

### Step 3: Frontend — Theme Presets Module

1. Create `themePresets.js` with the preset map (all 6 presets), each containing `id`, `name`, `description`, `emoji`, `light` palette, and `dark` palette.
2. **Color format**: All color values MUST be full CSS color values (e.g., `oklch(...)`) — NOT bare Tailwind-format HSL numbers. The existing `:root` tokens use bare HSL numbers (e.g., `0 0% 100%`) that are not valid in inline styles. The classic preset must use oklch equivalents. The `.dark` overrides already use oklch.
3. All palette fields (`accent`, `accentForeground`, `surface`, `surfaceForeground`, `headerBg`, `gradientFrom`, `gradientTo`) are required for every preset. Use `transparent` for gradient fields on presets without gradients.
4. Export helpers: `getPreset(id)` (with fallback to classic), `getAllPresets()`, `getThemeVars(presetId, isDark)`.
5. The `getThemeVars` function returns an object of CSS custom property names to values for the given preset and mode.

### Step 4: Frontend — EventThemeProvider

1. Create `EventThemeProvider.jsx`: reads `event.theme` from EventContext, detects dark mode (check for `.dark` class on `<html>`), calls `getThemeVars()`, sets CSS variables as inline style on a wrapper `<div>`.
2. **Always set CSS vars**, including for the `classic` preset. This avoids broken fallback chains to bare-number Tailwind vars in light mode (see research.md R-006).
3. Wrap event route content in `App.jsx` with `EventThemeProvider`.
4. CSS variables set: `--event-accent`, `--event-accent-fg`, `--event-surface`, `--event-surface-fg`, `--event-header-bg`, `--event-gradient-from`, `--event-gradient-to`.

### Step 5: Frontend — ThemePicker Component

1. Create `ThemePicker.jsx`: renders a grid of self-styled cards. Each card uses its preset's light palette for background/border/text colors. Shows name, description, emoji. Selected card has a ring indicator.
2. Props: `selectedTheme`, `onSelect`, `disabled` (for read-only on admin page).

### Step 6: Frontend — CreateEventPage Integration

1. Add `theme` state (default `'classic'`).
2. Render `ThemePicker` below the type field with label "Mood".
3. Include `theme` in the `apiClient.createEvent()` payload.

### Step 7: Frontend — Component Theming

Since `EventThemeProvider` always sets the `--event-*` CSS vars (even for classic), components consume them directly without inline fallbacks to Tailwind vars. No `var(--event-surface, var(--background))` pattern — just `var(--event-surface)`.

1. **Header.jsx**: Apply `var(--event-header-bg)` to header background via inline style (on event routes only). Prefix event name with emoji from `getPreset(event.theme).emoji`.
2. **ItemButton.jsx**: Use `var(--event-surface)` for unrated button background. Rated buttons continue using `ratingColor` from props.
3. **GuestWelcomeBottomSheet.jsx**: Use `var(--event-surface)` for sheet background.
4. **WelcomeBottomSheet.jsx**: Use `var(--event-surface)` for surface and `var(--event-accent)` / `var(--event-accent-fg)` for action button.
5. **EventPage.jsx**: Apply gradient background using `var(--event-gradient-from)` and `var(--event-gradient-to)`. Classic sets these to `transparent`, so no separate fallback needed.

### Step 8: Frontend — Admin Page and My Events

1. **EventAdminPage.jsx**: Add a theme section. Render `ThemePicker` with `disabled={event.state !== 'created'}`. Show lock message when disabled. On select, call `apiClient.updateTheme(eventId, theme)`.
2. **MyEventsPage.jsx**: For each event card, apply accent-colored left border using the preset's accent color. Display emoji alongside event name.

### Step 9: Frontend — Tests

1. Unit tests for `themePresets.js`: all presets have required fields, `getPreset` fallback, `getThemeVars` output.
2. Unit tests for `ThemePicker.jsx`: renders all presets, selection indicator, disabled state.
3. Unit tests for `EventThemeProvider.jsx`: sets correct CSS variables, dark mode variant.
4. E2E test: create event with theme, verify themed header and buttons, change theme on admin page, verify My Events card.

## Verification

```bash
# Backend unit tests
cd backend && npx vitest run tests/unit/EventService.test.js

# Backend integration tests
cd backend && npx vitest run tests/integration/events.test.js

# Frontend unit tests
cd frontend && npx vitest run tests/unit/themePresets.test.js
cd frontend && npx vitest run tests/unit/ThemePicker.test.jsx

# Frontend E2E tests
cd frontend && npx playwright test tests/e2e/specs/theme-presets.spec.js

# Manual verification
# 1. Create event → verify mood picker visible, Classic pre-selected
# 2. Select "Classic Cellar" → create event → verify welcome bottom sheet is themed
# 3. Navigate to event page → verify header bg, unrated buttons, gradient
# 4. Navigate to admin page → verify theme section editable
# 5. Start event → verify theme section locked
# 6. Navigate to My Events → verify accent border and emoji on card
# 7. Access pre-existing event → verify unchanged appearance
```

## References

- [spec.md](./spec.md) — Feature specification
- [data-model.md](./data-model.md) — Entity changes
- [contracts/README.md](./contracts/README.md) — API contracts
- [research.md](./research.md) — Design decisions
