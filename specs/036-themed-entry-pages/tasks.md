# Tasks: Themed Event Entry Pages

**Input**: Design documents from `/specs/036-themed-entry-pages/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-changes.md, quickstart.md

**Tests**: Included — constitution principle IV (Testing Standards) is NON-NEGOTIABLE.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Backend Endpoint + Frontend Hook)

**Purpose**: Shared infrastructure that all themed entry pages depend on. Must complete before any user story work begins.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `GET /:eventId/public-info` endpoint to backend/src/api/events.js: validate eventId format, apply global + per-IP rate limiting (same pattern as check-admin), call `eventService.getEvent(eventId)`, return only `{ name: event.name, typeOfItem: event.typeOfItem, theme: event.theme, state: event.state }`; return 404 for not-found events, 400 for invalid eventId format
- [x] T002 Add `getEventPublicInfo(eventId)` method to frontend/src/services/apiClient.js: call `GET /events/${eventId}/public-info`; return `{ data, notFound }` — on 200 return `{ data: parsedJSON, notFound: false }`, on 404 return `{ data: null, notFound: true }`, on any other error (429, network failure) return `{ data: null, notFound: false }`
- [x] T003 Create frontend/src/hooks/useEventPublicInfo.js: shared hook that accepts `eventId`, fetches public info via `apiClient.getEventPublicInfo(eventId)` on mount, destructures `{ data, notFound }` from client response, returns `{ name, typeOfItem, theme, state, loading, error, notFound }` where fields come from `data` (or null/defaults when unavailable); handle errors gracefully (never throw)
- [x] T004 Create frontend/src/hooks/useDarkMode.js (already exists): shared hook that returns `isDark` boolean; reads initial state from `document.documentElement.classList.contains('dark')`; observes mutations on `document.documentElement` attributes via MutationObserver to track dark mode toggles; cleans up observer on unmount (same pattern as EventThemeProvider but extracted for reuse across entry pages)
- [x] T005 [P] Create frontend/tests/unit/useEventPublicInfo.test.js: test hook fetches on mount, returns correct shape, handles 404 (sets notFound via `{ data: null, notFound: true }`), handles network errors gracefully (notFound false, data null), returns loading state

**Checkpoint**: Backend serves public event info; frontend has reusable hooks for data fetching and dark mode detection. No UI changes yet.

---

## Phase 2: User Story 1 — Event-Branded Email Entry Page (Priority: P1) MVP

**Goal**: The email entry page displays the event name, applies the event's theme colors, and shows contextual copy using typeOfItem. Handles event-not-found and event-ended states.

**Independent Test**: Navigate to `/event/{eventId}/email` and verify event name, theme colors, contextual description, not-found handling, and ended banner.

### Implementation for User Story 1

- [x] T006 [US1] Update frontend/src/pages/EmailEntryPage.jsx: import `useEventPublicInfo` hook, `useDarkMode` hook, and `getThemeVars` from themePresets; call `useEventPublicInfo(eventId)` on mount; call `useDarkMode()` for dark mode state; compute CSS vars via `getThemeVars(theme, isDark)` and apply as inline `style` on the outermost wrapper div; add `data-event-theme` attribute; update CardTitle to show "Join {name}" when name is available (fallback: "Access Event"); update CardDescription to show "Enter your details to join the {typeOfItem} tasting" when typeOfItem is available (fallback: "Enter your name and email address to continue"); if `notFound` is true, render a "Event not found" card instead of the form; if `state` is "completed", render an informational banner "This event has ended" above the form but still allow submission

### Tests for User Story 1

- [x] T007 [P] [US1] Update frontend/tests/unit/EmailEntryPage.test.jsx: add tests for event name displayed in title when hook returns data, contextual description with typeOfItem, theme CSS vars applied to wrapper, fallback to generic copy when hook returns null/loading, "Event not found" message when notFound is true, "This event has ended" banner when state is "completed"
- [x] T008 [P] [US1] Add integration tests in backend/tests/integration/api.test.js: test GET /events/:eventId/public-info returns { name, typeOfItem, theme, state } for valid event, test returns 404 for non-existent event, test returns 400 for invalid eventId format, test does NOT return sensitive fields (pin, administrators, users)

**Checkpoint**: Email entry page is fully branded. MVP complete — guests see the event's identity on first load.

---

## Phase 3: User Story 2 — Themed PIN and OTP Entry Pages (Priority: P1)

**Goal**: PIN and OTP entry pages display the event name and apply the event's theme colors, creating a consistent branded flow across the entire entry experience.

**Independent Test**: Complete email entry step, verify PIN/OTP page has the same event name and theme colors. Also test direct navigation to PIN/OTP page.

### Implementation for User Story 2

- [x] T009 [P] [US2] Update frontend/src/pages/PINEntryPage.jsx: import `useEventPublicInfo` hook, `useDarkMode` hook, and `getThemeVars`; call hooks; compute and apply CSS vars as inline style on outermost wrapper div; add `data-event-theme` attribute; update CardTitle to show event name when available (e.g., "Enter PIN — {name}"); add event name display in CardDescription alongside existing email display
- [x] T010 [P] [US2] Update frontend/src/pages/EventOTPEntryPage.jsx: import `useEventPublicInfo` hook, `useDarkMode` hook, and `getThemeVars`; call hooks; compute and apply CSS vars as inline style on outermost wrapper div; add `data-event-theme` attribute; update CardTitle to show event name when available (e.g., "Admin Authentication — {name}"); add event name display in CardDescription

### Tests for User Story 2

- [x] T011 [P] [US2] Add tests to frontend/tests/unit/PINEntryPage.test.jsx: verify event name displayed, theme CSS vars applied, fallback when hook returns null

**Checkpoint**: All three entry pages are consistently themed. No style breaks between steps.

---

## Phase 4: User Story 3 — Friendly Auth Page Copy (Priority: P2)

**Goal**: The auth page uses warm, jargon-free language. No "OTP" in user-visible text. Visible email label. Friendly title and button text.

**Independent Test**: Navigate to `/auth` and verify all copy matches updated wording.

### Implementation for User Story 3

- [x] T012 [US3] Update frontend/src/pages/AuthPage.jsx: change CardTitle from "Sign In" to "Welcome back"; change email step CardDescription from "Enter your email address to receive an OTP code" to "We'll send a verification code to your email"; change verify step CardDescription from "Enter the 6-digit OTP code sent to your email" to "Enter the verification code sent to your email"; change email step button from "Request OTP" to "Send verification code"; change verify step button from "Verify OTP" to "Sign in"; replace sr-only email label with visible `<Label htmlFor="email">Email Address</Label>` using the Label component (import from @/components/ui/label)

### Tests for User Story 3

- [x] T013 [P] [US3] Create frontend/tests/unit/AuthPage.test.jsx: test title reads "Welcome back", test email step description reads "We'll send a verification code to your email", test email step button reads "Send verification code", test verify step button reads "Sign in", test verify step description reads "Enter the verification code sent to your email", test visible "Email Address" label exists (not sr-only), test zero instances of "OTP" in rendered text, test no theme CSS vars (--event-accent etc.) are present on the page (FR-010)

**Checkpoint**: Auth page is jargon-free and welcoming. Zero instances of "OTP" in user-visible text.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and cross-cutting quality checks.

- [x] T014 Run full test suite (`npm run test:backend` and `npm run test:frontend`) to verify no regressions
- [x] T015 Run linter and fix any issues introduced by changes
- [x] T016 Manual smoke test per quickstart.md: themed email page (multiple themes), themed PIN page, themed OTP page, classic theme (no visual change), dark mode, invalid event, completed event, auth page copy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **US1 (Phase 2)**: Depends on Phase 1 completion. This is the MVP.
- **US2 (Phase 3)**: Depends on Phase 1 completion. Can run in parallel with US1 (different files: PINEntryPage and EventOTPEntryPage vs EmailEntryPage).
- **US3 (Phase 4)**: No dependencies on Phase 1 — AuthPage changes are independent of the public-info endpoint and hook. Can start anytime.
- **Polish (Phase 5)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only — no dependencies on other stories
- **US2 (P1)**: Foundational only — independent of US1 (different pages)
- **US3 (P2)**: Fully independent — no dependency on Foundational or other stories

### Within Each User Story

- Backend changes before frontend changes (API must exist before frontend calls it)
- Implementation before tests (tests reference implemented code)

### Parallel Opportunities

- **Phase 1**: T002 and T003/T004 can start after T001; T003 and T004 are independent of each other; T005 can run in parallel with T003/T004
- **Phase 2 + Phase 3**: US1 and US2 can run in parallel after Phase 1 (different pages entirely)
- **Phase 2 + Phase 4**: US1 and US3 can run in parallel (completely independent)
- **All tests**: T005, T007, T008, T011, T013 can all run in parallel (different test files)

---

## Parallel Example: Phase 1 (Foundational)

```text
# Sequential:
T001: Backend public-info endpoint
T002: Frontend apiClient method (depends on T001 for contract)

# After T002 (parallel):
T003: useEventPublicInfo hook
T004: useDarkMode hook

# T005: useEventPublicInfo tests (parallel with T003/T004)
```

## Parallel Example: US1 + US2 + US3 (after Phase 1)

```text
# These can run concurrently (different files entirely):
US1: T006 (EmailEntryPage)
US2: T009 (PINEntryPage) + T010 (EventOTPEntryPage) — parallel
US3: T012 (AuthPage) — fully independent

# All tests can run in parallel:
T005, T007, T008, T011, T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (backend endpoint + API client + hook)
2. Complete Phase 2: User Story 1 (themed EmailEntryPage)
3. **STOP and VALIDATE**: Navigate to event email page — verify name, theme, contextual copy
4. Deploy/demo if ready — this alone transforms the first impression

### Incremental Delivery

1. Phase 1 (Foundational) → Backend and hook ready
2. US1 (Themed EmailEntryPage) → Test independently → **MVP deployed**
3. US2 (Themed PIN/OTP pages) → Test independently → Full entry flow branded
4. US3 (Auth page copy) → Test independently → Jargon removed
5. Polish → Run full suite, lint, smoke test

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US3 (AuthPage) is fully independent — no dependency on the public-info endpoint or theme hook
- Dark mode detection extracted into shared `useDarkMode` hook (T004) to satisfy Constitution Principle II (DRY); all 3 entry pages and potentially EventThemeProvider can reuse it
- Two shared hooks (`useEventPublicInfo` + `useDarkMode`) are the key DRY abstractions — all 3 entry pages call them identically
- Entry page e2e tests (helpers.js) don't need updates — the `submitEmail` helper fills fields by ID, which haven't changed
