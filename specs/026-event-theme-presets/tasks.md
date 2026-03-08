# Tasks: Event Theme Presets

**Input**: Design documents from `/specs/026-event-theme-presets/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story. US5 (Backward Compatibility) is not a separate phase — it is inherent in all phases via read-time defaulting and CSS var fallbacks. Every phase validates backward compat as part of its checkpoint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Backend theme validation/storage and frontend constants module. These are required before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Create theme preset definitions in `frontend/src/utils/themePresets.js`. Define `THEME_PRESETS` object with all 6 presets (`classic`, `cellar`, `garden`, `golden`, `midnight`, `rose`). Each preset contains: `id`, `name`, `description`, `emoji` (null for classic), `light` object (`accent`, `accentForeground`, `surface`, `surfaceForeground`, `headerBg`, `gradientFrom`, `gradientTo`), and `dark` object (same fields). **Color format**: All color values MUST be complete CSS color values usable directly in inline `style` props — use `oklch(...)` for all presets. **Important**: The existing `:root` tokens in `globals.css` use bare HSL numbers (e.g., `222.2 47.4% 11.2%`) which are NOT valid standalone CSS colors. The `classic` preset MUST use oklch equivalents of those tokens (e.g., `:root --background: 0 0% 100%` → `oklch(1 0 0)`, `:root --primary: 222.2 47.4% 11.2%` → the oklch equivalent). The `.dark` overrides already use oklch, so the classic dark values can match those directly. Export helpers: `getPreset(id)` (returns preset, falls back to classic for unrecognized IDs), `getAllPresets()` (returns array of all presets), `getThemeVars(presetId, isDark)` (returns object mapping CSS var names like `--event-accent` to color values for the given preset and mode).
- [x] T002 Add theme validation and storage to `backend/src/services/EventService.js`. Add `const VALID_THEMES = ['classic', 'cellar', 'garden', 'golden', 'midnight', 'rose']` near the existing `DEFAULT_RATING_PRESETS`. Add `validateTheme(theme)` method mirroring the `validateTypeOfItem()` pattern — returns `{ valid: true }` for recognized IDs, `{ valid: false, error: '...' }` for unrecognized. Update `createEvent(name, typeOfItem, administratorEmail)` signature to `createEvent(name, typeOfItem, administratorEmail, theme)` — validate theme if provided, default to `'classic'` if omitted, include `theme` in the event object written to DynamoDB. Add `updateTheme(eventId, theme, administratorEmail)` method: fetch event, verify admin, check `event.state === 'created'` (reject with "Theme can only be changed when event is in created state" if not), validate theme, set `event.theme = theme`, call `updateEvent`. Update `getEventSummariesByAdministrator()` (currently lines 2025-2030) to include `theme: event.theme` in the summaries object alongside the existing `eventId`, `name`, `state`, `createdAt` fields — this is required for themed My Events cards (US3).
- [x] T003 Add theme routes to `backend/src/api/events.js`. In the POST `/` (create event) handler: extract `theme` from `req.body`, pass it as the 4th argument to `eventService.createEvent()`. Add `PATCH /:eventId/theme` route: require JWT auth, require admin role, extract `theme` from `req.body`, call `eventService.updateTheme(eventId, theme, email)`, return updated event (same shape as GET). Note: the `GET /mine` handler already returns whatever `eventService.getEventSummariesByAdministrator()` provides — the `theme` field addition is handled in T002 (EventService.js). The existing `GET /:eventId` already returns the full event object, so `theme` is included automatically.
- [x] T004 [P] Add `updateTheme(eventId, theme)` method to `frontend/src/services/apiClient.js`. Pattern: `return this.patch(`/events/${eventId}/theme`, { theme })`. Follows existing `updateEventName`, `updateItemConfiguration` pattern.
- [x] T005 [P] Create `frontend/src/components/EventThemeProvider.jsx`. Props: `children`. Reads `event` from `useEventContext()`. Gets `theme` from `event?.theme` (defaults to `'classic'`). Detects dark mode by checking `document.documentElement.classList.contains('dark')` (matching the existing `.dark` class convention in `globals.css`). Calls `getThemeVars(theme, isDark)` from `themePresets.js`. Renders a `<div style={cssVarObject} data-event-theme={theme}>` wrapping `{children}`. The CSS var object sets: `--event-accent`, `--event-accent-fg`, `--event-surface`, `--event-surface-fg`, `--event-header-bg`, `--event-gradient-from`, `--event-gradient-to`. **CSS vars MUST always be set, including for the `classic` preset.** The existing `:root` tokens use bare HSL numbers (e.g., `0 0% 100%`) that are NOT valid standalone CSS color values — so component fallbacks like `var(--event-surface, var(--background))` would break in light mode. Always setting the vars from `getThemeVars` (which returns full oklch values) ensures components always receive valid colors. Listen for dark mode changes via `MutationObserver` on `<html>` classList to re-render with correct variant.

**Checkpoint**: Backend accepts theme on create and update, validates against allowlist, enforces state lock. Frontend has preset definitions and a theme provider ready to wrap event routes. My Events API returns theme per event.

---

## Phase 2: User Story 1 — Theme Selection at Event Creation (Priority: P1) + User Story 5 — Backward Compatibility (Priority: P1) 🎯 MVP

**Goal**: Admins see a mood picker on the Create Event page, select a theme, and the event is created with it stored. Pre-existing events without a theme field render identically to today.

**Independent Test**: Navigate to Create Event page → mood picker visible with Classic pre-selected → tap "Classic Cellar" → card highlights → create event → verify event data includes `theme: "cellar"`. Create event without selecting theme → verify defaults to `"classic"`. Access pre-existing event → verify no visual change.

### Implementation for User Stories 1 + 5

- [x] T006 [US1] Create `frontend/src/components/ThemePicker.jsx`. Props: `selectedTheme` (string), `onSelect` (function), `disabled` (boolean, default false). Renders a grid (`grid grid-cols-2 gap-2`) of all presets from `getAllPresets()`. Each card is self-styled: card background uses the preset's `light.surface` (or `light.accent` for cards without surface), border uses `light.accent`, text uses `light.surfaceForeground`. Card content: emoji (if defined) + name + short description. Selected card shows `ring-2 ring-primary ring-offset-2`. When `disabled`, cards show `opacity-60 cursor-not-allowed` and `onSelect` is not called. Add `data-testid="theme-picker"` on container and `data-testid={`theme-card-${preset.id}`}` on each card.
- [x] T007 [US1] Integrate ThemePicker into `frontend/src/pages/CreateEventPage.jsx`. Add `const [theme, setTheme] = useState('classic')` state. Below the "Type of Item" field, add a `<div className="space-y-2">` with `<Label>Mood</Label>` and `<ThemePicker selectedTheme={theme} onSelect={setTheme} />`. Update the `handleSubmit` to include `theme` in the `apiClient.createEvent()` payload: `apiClient.createEvent({ name: trimmedName, typeOfItem, theme })`.
- [x] T008 [US1] Wrap event routes with EventThemeProvider in `frontend/src/App.jsx`. In the `AppLayout` component, where `isEventRoute && eventId` wraps content in `EventContextProviderForRoute`, also wrap with `EventThemeProvider` inside the context provider (so it can access the event context). The provider should wrap the `<main>` content area for event routes.

### Tests for User Stories 1 + 5

- [x] T009 [P] [US1] Backend unit tests in `backend/tests/unit/EventService.test.js`. Test cases: (1) `validateTheme('cellar')` returns valid, (2) `validateTheme('invalid')` returns error, (3) `validateTheme(undefined)` returns valid (optional), (4) `createEvent` with valid theme stores it, (5) `createEvent` without theme defaults to `'classic'`, (6) `createEvent` with invalid theme throws, (7) `updateTheme` succeeds when state is `'created'`, (8) `updateTheme` throws when state is `'started'`, (9) `updateTheme` with invalid theme throws, (10) `updateTheme` by non-admin throws.
- [x] T010 [P] [US1] Backend integration tests in `backend/tests/integration/events.test.js`. Test cases: (1) POST /api/events with `{ name, typeOfItem, theme: 'cellar' }` returns 201 with `theme: 'cellar'`, (2) POST /api/events without theme returns 201 with `theme: 'classic'`, (3) POST /api/events with invalid theme returns 400, (4) GET /api/events/:eventId includes `theme` in response, (5) GET /api/events/mine includes `theme` per event.
- [x] T011 [P] [US1] Frontend unit tests. Create `frontend/tests/unit/themePresets.test.js`: all 6 presets have required fields (id, name, description, light, dark), `getPreset('cellar')` returns cellar, `getPreset('unknown')` returns classic, `getThemeVars('cellar', false)` returns light vars, `getThemeVars('cellar', true)` returns dark vars, classic light values match globals.css tokens. Create `frontend/tests/unit/ThemePicker.test.jsx`: renders 6 preset cards, Classic pre-selected shows ring indicator, tapping card calls onSelect with preset ID, disabled mode prevents onSelect. Create `frontend/tests/unit/EventThemeProvider.test.jsx`: renders children, sets CSS vars from event theme, defaults to classic when event has no theme, updates vars when theme changes.

**Checkpoint**: Admins can select a theme during event creation. Events store the theme. Pre-existing events without theme field render with classic (unchanged). MVP of the feature is functional.

---

## Phase 3: User Story 2 — Themed Event Experience for Participants (Priority: P1)

**Goal**: The selected theme visually transforms the event — header background, unrated button colors, page gradient, and bottom sheet surfaces all reflect the theme.

**Independent Test**: Create events with different themes → navigate as guest → verify header bg matches theme, unrated buttons use theme surface color, page has gradient (for presets that define one), bottom sheets use theme surface. Verify Classic theme is visually identical to pre-feature.

### Implementation for User Story 2

- [x] T012 [P] [US2] Update `frontend/src/components/Header.jsx`. Change the header `<header>` background to consume the theme var (only on event routes): `style={{ backgroundColor: 'var(--event-header-bg)' }}`. Since EventThemeProvider always sets `--event-header-bg` (even for classic), the var is always defined and no inline fallback is needed. Keep `bg-background` as a Tailwind class for non-event routes. For the emoji prefix: import `getPreset` from `themePresets.js`, get preset from `event?.theme`, if `preset.emoji` exists, prepend it to `eventName` display: `{preset.emoji && <span>{preset.emoji}</span>} {eventName}`.
- [x] T013 [P] [US2] Update `frontend/src/components/ItemButton.jsx`. For unrated buttons: replace `bg-gray-100 dark:bg-gray-800` with inline style `style={{ backgroundColor: 'var(--event-surface)' }}`. Since EventThemeProvider always sets `--event-surface` (even for classic, where it maps to the current gray), no inline fallback is needed. For rated buttons: continue using `ratingColor` from props — theme must not override rating colors (FR-014). Conditional: `style={{ backgroundColor: ratingColor || 'var(--event-surface)' }}`.
- [x] T014 [P] [US2] Update `frontend/src/components/GuestWelcomeBottomSheet.jsx`. Change the bottom sheet panel background from `bg-background` to consume the theme surface var: `style={{ backgroundColor: 'var(--event-surface)' }}`. Since EventThemeProvider always sets `--event-surface`, no inline fallback is needed. Apply to the main panel `<div>` (currently line 76).
- [x] T015 [P] [US2] Update `frontend/src/components/WelcomeBottomSheet.jsx`. Change the panel background to `style={{ backgroundColor: 'var(--event-surface)' }}`. Change the primary action button ("Got it") to use theme accent: `style={{ backgroundColor: 'var(--event-accent)', color: 'var(--event-accent-fg)' }}`. Since EventThemeProvider always sets these vars (even for classic), no inline fallbacks to Tailwind vars are needed. This is the admin's first visual confirmation of their theme choice (FR-012).
- [x] T016 [US2] Add gradient background to `frontend/src/pages/EventPage.jsx`. On the outermost wrapper `<div>` (currently `className="px-4 sm:px-6 lg:px-8 py-8"`), add a background style: `style={{ background: 'linear-gradient(to bottom, var(--event-gradient-from), var(--event-gradient-to))' }}`. The `classic` preset sets gradient values to `transparent`, so no separate fallback is needed.

**Checkpoint**: Events with non-Classic themes show visible differences in header, buttons, gradients, and bottom sheets. Classic events look identical to before. Rating colors are untouched. Themed appearance is consistent across all event pages.

---

## Phase 4: User Story 3 — Themed Event Cards on My Events Page (Priority: P2)

**Goal**: Each event card on the My Events page shows its theme's accent color as a left border and displays the theme's emoji alongside the event name.

**Independent Test**: Create 3 events with different themes → navigate to My Events → verify each card has a distinct accent-colored left border and the correct emoji next to the name. Verify Classic-themed cards look unchanged.

### Implementation for User Story 3

- [x] T017 [US3] Update `frontend/src/pages/MyEventsPage.jsx`. Import `getPreset` from `themePresets.js`. In the event card render (currently line 99-115), get the preset via `const preset = getPreset(event.theme)`. Apply accent-colored left border: `style={{ borderLeftWidth: preset.id !== 'classic' ? '4px' : undefined, borderLeftColor: preset.id !== 'classic' ? preset.light.accent : undefined }}`. Display emoji: if `preset.emoji`, render `<span className="mr-1">{preset.emoji}</span>` before `event.name` in the `CardTitle`. Classic events get no border or emoji — unchanged appearance.

**Checkpoint**: My Events page shows visually distinct cards per theme. Classic cards unchanged.

---

## Phase 5: User Story 4 — Theme Editing on the Admin Page (Priority: P2)

**Goal**: Admin page shows the current theme and allows changing it while the event is in "created" state. Locked with explanation in other states.

**Independent Test**: Create event with "Classic Cellar" → navigate to admin page → theme section shows "Classic Cellar" selected → tap "Garden Party" → theme updates immediately → start event → theme section shows "Garden Party" read-only with lock message.

### Implementation for User Story 4

- [x] T018 [US4] Add theme section to `frontend/src/pages/EventAdminPage.jsx`. Add a new settings category card (following the existing Items/Ratings/State/PIN pattern) labeled "Theme" or "Mood". When `event.state === 'created'`: render `<ThemePicker selectedTheme={event.theme || 'classic'} onSelect={handleThemeChange} />`. `handleThemeChange` calls `apiClient.updateTheme(eventId, theme)`, then updates local event state with the new theme. When `event.state !== 'created'`: render the current theme card (name + emoji) with `disabled` ThemePicker or a single read-only card, plus a muted text note: "Theme is locked after the event starts" (FR-021). Position the theme section between event name and the Items category.
- [x] T019 [P] [US4] Backend integration tests for PATCH theme in `backend/tests/integration/events.test.js`. Test cases: (1) PATCH /api/events/:eventId/theme with valid theme when state is 'created' returns 200 with updated theme, (2) PATCH when state is 'started' returns 403, (3) PATCH with invalid theme returns 400, (4) PATCH without auth returns 401, (5) PATCH by non-admin returns 403.

**Checkpoint**: Admins can change theme before starting. Theme locks after start with clear messaging. Backend enforces the lock server-side.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E coverage and final validation across all stories.

- [x] T020 Create E2E test in `frontend/tests/e2e/specs/theme-presets.spec.js`. Test cases: (1) Create event → mood picker visible with Classic pre-selected, (2) Select "Classic Cellar" → create event → welcome bottom sheet shows themed styling, (3) Navigate to event page → header has themed background and emoji prefix, (4) Unrated buttons use themed surface color, (5) Navigate to admin page → theme section shows "Classic Cellar" editable, (6) Change theme to "Garden Party" → verify immediate update, (7) Start event → theme section locked, (8) Navigate to My Events → card shows accent border and emoji, (9) Access pre-existing event (no theme field) → no visual change.
- [x] T021 Run quickstart.md manual verification: create events with each theme, verify visual application, verify backward compat, verify state lock behavior.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **US1+US5 (Phase 2)**: Depends on Phase 1 completion.
- **US2 (Phase 3)**: Depends on Phase 2 (needs EventThemeProvider wrapped in App.jsx from T008).
- **US3 (Phase 4)**: Depends on Phase 1 (needs themePresets.js and My Events API returning theme). Independent of Phases 2 and 3.
- **US4 (Phase 5)**: Depends on Phase 1 (PATCH endpoint, apiClient) AND Phase 2 T006 (ThemePicker component). Independent of Phases 3 and 4.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

```
T001, T004, T005 ──┐ (parallel, different files)
                   │
T002 → T003 ───────┤ (sequential, same files)
                   │
                   ▼
         Phase 1 complete
         ┌────────┴─────────┐
         ▼                  ▼
   Phase 2 (US1+US5)    T017 (US3, can start — needs T001, T002 only)
   T006 → T007 → T008
   T009, T010, T011 [P]
         │
         ├──────────────────┐
         ▼                  ▼
   Phase 3 (US2)      T018 (US4, needs T006 from Phase 2)
   T012-T016 [all P]  T019 [P]
         │                  │
         ▼                  ▼
         └──────────────────┘
                   │
                   ▼
            Phase 6 (Polish)
            T020 → T021
```

### Parallel Opportunities

- **Phase 1**: T001, T004, T005 run in parallel (different files). T002 → T003 sequential (same backend files).
- **Phase 2**: T009, T010, T011 run in parallel (different test files). T006 → T007 → T008 sequential.
- **Phase 3**: T012, T013, T014, T015 all run in parallel (different component files). T016 is independent.
- **Phase 4**: US3 (T017) can start as soon as Phase 1 completes — independent of Phase 2/3.
- **Phase 5**: US4 (T018) needs ThemePicker from Phase 2 (T006). Can start after T006 completes — independent of T007/T008 and Phase 3.
- **Phase 6**: T020 and T021 can run in parallel.

---

## Implementation Strategy

### MVP First (User Stories 1 + 5)

1. Complete Phase 1: Foundational (backend + frontend constants)
2. Complete Phase 2: US1+US5 (ThemePicker + CreateEventPage + EventThemeProvider)
3. **STOP and VALIDATE**: Create event with theme, verify stored, verify classic unchanged
4. Deploy/demo if ready — theme selection is functional

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 2 (US1+US5) → Theme selection works → **MVP!**
3. Phase 3 (US2) → Themed visuals across event → Core value delivered
4. Phase 4 (US3) → My Events cards themed → Admin quality of life
5. Phase 5 (US4) → Theme editable on admin page → Full flexibility
6. Phase 6 → E2E coverage → Production ready

### Parallel Team Strategy

With multiple developers:
1. Team completes Phase 1 together
2. Once Phase 1 done:
   - Developer A: Phase 2 (US1+US5) → Phase 3 (US2)
   - Developer B: Phase 4 (US3) immediately, then Phase 5 (US4) once Developer A finishes T006 (ThemePicker)
3. Both streams complete → Phase 6 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US5 (Backward Compatibility) is validated at every checkpoint, not implemented as a separate phase
- T002 and T003 modify the same backend files — must be sequential
- T012-T015 (component theming) are all parallel since they modify different component files
- US3 can start immediately after Phase 1. US4 needs ThemePicker from Phase 2 (T006) before it can start
- Total new files: 3 (`themePresets.js`, `EventThemeProvider.jsx`, `ThemePicker.jsx`)
- Total modified files: 11 (backend: 2, frontend: 9)
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
