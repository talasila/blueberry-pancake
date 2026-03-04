# Tasks: Guest Item Registration Nudge

**Input**: Design documents from `/specs/025-guest-registration-nudge/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Add the location state trigger that the bottom sheet depends on. This is a one-line change but blocks all US1 work.

**⚠️ CRITICAL**: US1 (bottom sheet) cannot function until this is complete.

- [x] T001 Add `{ state: { guestJustLoggedIn: true } }` to the post-PIN-verification navigate call in `frontend/src/pages/PINEntryPage.jsx`. Change `navigate(`/event/${eventId}`, { replace: true })` to `navigate(`/event/${eventId}`, { state: { guestJustLoggedIn: true }, replace: true })`.

**Checkpoint**: PINEntryPage passes location state on successful PIN verification. Verify by logging `location.state` in EventPage after PIN login.

---

## Phase 2: User Story 1 — Welcome Bottom Sheet (Priority: P1) 🎯 MVP

**Goal**: After PIN login, a one-time welcome bottom sheet slides up to introduce item registration with five key content points, a register button, and a skip action.

**Independent Test**: Log in as a guest via PIN → bottom sheet appears with correct content → tap "Register My Bottle" → navigated to profile → re-login → sheet appears again (new session) → refresh → sheet does not reappear (same session).

### Implementation for User Story 1

- [x] T002 [US1] Create `GuestWelcomeBottomSheet` component in `frontend/src/components/GuestWelcomeBottomSheet.jsx`. Adapt animation/overlay pattern from `frontend/src/components/WelcomeBottomSheet.jsx` (isMounted/isAnimating state, body scroll lock, history.pushState/popstate for browser back dismissal). Props: `isOpen` (boolean), `onDismiss` (function), `onRegister` (function), `event` (object with name, state, typeOfItem). Use `useItemTerminology(event)` for button label ("Register My [Singular]"). Content: event name heading, "Why register?" section (FR-006), "Good to know" section with four bullets (FR-005, FR-007, FR-008, FR-009). Footer: primary Button for register + text link "Skip for now" for dismiss. Guards: return null if !isMounted or !event (FR-016). Include `data-testid` attributes: `guest-welcome-bottom-sheet`, `guest-welcome-register-btn`, `guest-welcome-skip-btn`, `guest-welcome-backdrop`.
- [x] T003 [US1] Wire `GuestWelcomeBottomSheet` into `frontend/src/pages/EventPage.jsx`. Import `useLocation` from react-router-dom and `GuestWelcomeBottomSheet`. Add state: `const [showGuestWelcome, setShowGuestWelcome] = useState(() => !!location.state?.guestJustLoggedIn && !isAdmin && (event?.state === 'created' || event?.state === 'started'))`. Render the component after existing drawers with `isOpen={showGuestWelcome && !!event}`. Dismiss handler: set state false + `window.history.replaceState({}, document.title)`. Register handler: set state false + `navigate(`/event/${eventId}/profile`)`. Guard against paused/completed states (FR-002) and admin users (FR-003) in the state initializer.

### Tests for User Story 1

- [x] T004 [P] [US1] Create unit tests in `frontend/tests/unit/components/GuestWelcomeBottomSheet.test.jsx`. Test cases: (1) renders all five content points when isOpen=true and event provided, (2) does not render when isOpen=false, (3) does not render when event is null, (4) calls onDismiss when "Skip for now" is clicked, (5) calls onRegister when register button is clicked, (6) register button reads "Register My Bottle" when typeOfItem is "wine", (7) register button reads "Register My Item" when typeOfItem is null/generic, (8) displays event name in heading.

**Checkpoint**: Guest logs in via PIN → bottom sheet appears with all content → dismiss/register actions work → does not reappear on refresh. US1 is fully functional and independently testable.

---

## Phase 3: User Story 2 — Pre-Start Inline Registration Prompt (Priority: P1)

**Goal**: When the event is in "created" state, an inline prompt below "Event has not started yet" encourages guests to register items while they wait.

**Independent Test**: Navigate to event page as guest with event in "created" state → inline prompt visible below status text → tap register button → navigated to profile → transition event to "started" → prompt disappears.

### Implementation for User Story 2

- [x] T005 [US2] Add inline registration prompt in the `event?.state === 'created'` block of `frontend/src/pages/EventPage.jsx` (currently lines 559-562). Below the existing "Event has not started yet" `<p>` tag, add a `!isAdmin` guard wrapping a card-style prompt: muted background, brief message ("Brought a [singularLower]? Register it so the host can include it in the lineup."), and an outline Button ("Register My [Singular]") that navigates to `/event/${eventId}/profile`. Use existing `useItemTerminology` (already imported as `pluralLower` — destructure `singular` and `singularLower` too). Add `data-testid="created-state-register-prompt"` to the prompt container and `data-testid="created-state-register-btn"` to the button.

**Checkpoint**: Event in "created" state shows inline prompt for guests. Prompt disappears in "started"/"paused"/"completed" states. Admin does not see prompt. US2 is independently testable.

---

## Phase 4: User Story 3 — Admin Exclusion (Priority: P1)

**Goal**: Admins never see the guest welcome bottom sheet or the inline registration prompt. The `!isAdmin` guards from US1 (T003) and US2 (T005) enforce this, but this story verifies the behavior explicitly.

**Independent Test**: Log in as admin → navigate to event page in "created" state → no bottom sheet, no inline prompt. Log in as admin → navigate to event page in "started" state → no bottom sheet.

### Implementation for User Story 3

- [x] T006 [US3] Verify admin exclusion guards are present in `frontend/src/pages/EventPage.jsx`. Confirm: (1) `showGuestWelcome` state initializer includes `!isAdmin` (from T003), (2) inline prompt block includes `!isAdmin` guard (from T005), (3) `GuestWelcomeBottomSheet` render includes the admin guard. Deliverable: run T004 unit tests to confirm admin-context rendering returns null, and manually verify via dev server by logging in as admin — no bottom sheet or inline prompt should appear. No new code expected — this task validates that T003 and T005 correctly implemented the guards from FR-003 and FR-022.

**Checkpoint**: Admin user sees neither bottom sheet nor inline prompt in any event state.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end tests covering all stories together, and final validation.

- [x] T007 [P] Create E2E tests in `frontend/tests/e2e/specs/guest-registration-nudge.spec.js`. Test cases: (1) Guest logs in via PIN with event in "created" state → bottom sheet appears with correct content, (2) Guest taps "Register My Bottle" → navigated to profile page, (3) Guest taps "Skip for now" → sheet dismissed and event page interactive, (4) Guest refreshes page → bottom sheet does not reappear, (5) Admin logs in → no bottom sheet and no inline prompt shown, (6) Event in "created" state → inline prompt visible below "Event has not started yet", (7) Event in "started" state → no inline prompt shown, (8) Guest taps inline prompt register button → navigated to profile page.
- [x] T008 Run quickstart.md validation: start frontend dev server, manually verify bottom sheet and inline prompt per `specs/025-guest-registration-nudge/quickstart.md` verification steps.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS US1.
- **US1 (Phase 2)**: Depends on Phase 1 (T001 — location state trigger).
- **US2 (Phase 3)**: No dependency on Phase 1 or US1 — can start in parallel with US1.
- **US3 (Phase 4)**: Depends on US1 (T003) and US2 (T005) being complete — verification only.
- **Polish (Phase 5)**: Depends on US1, US2, and US3 all being complete.

### User Story Dependencies

```
T001 (Foundational)
  └──→ T002 (US1: Component)
        └──→ T003 (US1: Wire into EventPage)
              └──→ T004 (US1: Unit tests) [P - can run alongside T005]
              └──→ T006 (US3: Verify guards)

T005 (US2: Inline prompt) ← independent, can start immediately
  └──→ T006 (US3: Verify guards)

T006 (US3: Verify)
  └──→ T007, T008 (Polish)
```

### Parallel Opportunities

- **T004 and T005** can run in parallel (different files: test file vs EventPage inline prompt)
- **T007** (E2E tests) is independent of unit tests and can be written in parallel with T004
- **US2 (T005)** has no dependency on US1 — can start immediately while T001→T002→T003 proceeds. Note: T003 and T005 both modify `EventPage.jsx` (different sections); if developed in parallel by different developers, coordinate merges.

---

## Parallel Example: US1 + US2

```bash
# Stream 1: US1 (sequential — each step depends on previous)
T001 → T002 → T003 → T004

# Stream 2: US2 (can start immediately, no dependency on T001)
T005

# After both streams complete:
T006 → T007 → T008
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 (foundational PINEntryPage change)
2. Complete T002-T003 (bottom sheet component + wiring)
3. Complete T004 (unit tests)
4. **STOP and VALIDATE**: Test US1 independently — login via PIN, verify bottom sheet
5. Deploy/demo if ready — the bottom sheet alone delivers the core awareness value

### Incremental Delivery

1. T001 → Foundation ready
2. T002-T004 → US1 complete → Deploy/Demo (MVP — bottom sheet working)
3. T005 → US2 complete → Deploy/Demo (inline prompt adds "created" state coverage)
4. T006 → US3 verified → Confidence in admin exclusion
5. T007-T008 → E2E coverage + validation → Production-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US2 is fully independent of US1 — can be implemented in any order
- US3 is a verification task, not a new implementation — confirms guards from US1 and US2
- All tasks target `frontend/` only — no backend changes
- Total new code: ~150 lines across 1 new component + 2 modified files
- Commit after each task or logical group (T001, T002+T003, T004, T005, T006, T007+T008)
