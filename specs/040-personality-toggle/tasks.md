# Tasks: Personality Detection Toggle

**Input**: Design documents from `/specs/040-personality-toggle/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — constitution requires testing standards (Principle IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup

**Purpose**: No setup needed — existing project, no new files or dependencies.

(No tasks — all changes are modifications to existing files.)

---

## Phase 2: Foundational (Backend Configuration)

**Purpose**: Add `personalityEnabled` to the backend rating configuration service. MUST be complete before any frontend work.

**⚠️ CRITICAL**: Frontend tasks depend on the backend correctly storing and returning `personalityEnabled`.

- [x] T001 Add `personalityEnabled` to default rating configuration and `getRatingConfiguration()` in `backend/src/services/EventConfigService.js` — default to `true` for wine events, include only for wine events in response, treat undefined as enabled (mirror `noteSuggestionsEnabled` pattern at lines 51-101)
- [x] T002 Add `personalityEnabled` validation and persistence to `updateRatingConfiguration()` in `backend/src/services/EventConfigService.js` — validate boolean type, enforce `event.state === 'created'`, enforce `event.typeOfItem === 'wine'`, store in `ratingConfiguration` object (mirror `noteSuggestionsEnabled` pattern at lines 198-218)
- [x] T003 Add unit tests for `personalityEnabled` in `backend/tests/unit/EventConfigService.test.js` — test default value, boolean validation, state restriction, wine-only restriction, persistence, backward compatibility with undefined

**Checkpoint**: Backend correctly stores, validates, and returns `personalityEnabled`. Existing tests still pass.

---

## Phase 3: User Story 1 - Organizer Disables Personality Detection (Priority: P1) 🎯 MVP

**Goal**: Admin can see, toggle, and save the Personality Detection setting on the event setup page.

**Independent Test**: Create a wine event, navigate to rating configuration, verify toggle is visible with description, toggle off, save, reload, confirm it persists.

### Implementation for User Story 1

- [x] T004 [US1] Add `personalityEnabled` state variable and fetch logic to `frontend/src/pages/EventAdminPage.jsx` — add `useState(true)`, read from `getRatingConfiguration()` response for wine events (mirror `noteSuggestionsEnabled` fetch at lines 351-357)
- [x] T005 [US1] Add `personalityEnabled` to save logic in `frontend/src/pages/EventAdminPage.jsx` — include in `configToSave` for wine events, update local state from response (mirror `noteSuggestionsEnabled` save at lines 580-593)
- [x] T006 [US1] Add Personality Detection toggle UI to `frontend/src/pages/EventAdminPage.jsx` — add stacked layout (label + switch on top row, full-width description below) directly after the Note Suggestions toggle. Description: "After guests rate enough items, a tasting personality is assigned based on their rating patterns — labels like 'The Simon Cowell' for tough critics or 'The Golden Retriever' for generous raters. Adds a fun reveal moment during social tastings. Turn off for formal or competitive events where personality labels may not suit the tone." Switch disabled when `event.state !== 'created'` or while saving. Only visible for wine events.

**Checkpoint**: Admin toggle works end-to-end. Toggle is visible, saves, persists, and is locked after event starts.

---

## Phase 4: User Story 2 - Guest Experience with Personality Disabled (Priority: P1)

**Goal**: When personality detection is disabled, all personality-specific UI is suppressed for guests.

**Independent Test**: Create wine event with personality disabled, rate enough items as guest, verify zero personality UI appears.

### Implementation for User Story 2

- [x] T007 [P] [US2] Gate personality reveal trigger in `frontend/src/pages/EventPage.jsx` — wrap personality reveal logic (lines 528-557) and personality badge logic (lines 510-518) and pre-drawer threshold check (lines 392-395) with `ratingConfig?.personalityEnabled !== false` check
- [x] T008 [P] [US2] Gate personality card in `frontend/src/components/UserDetailsDrawer.jsx` — wrap personality card section with `ratingConfig?.personalityEnabled !== false` check (UserDetailsDrawer already receives `ratingConfig` prop)
- [x] T009 [P] [US2] Gate personality in dashboard in `frontend/src/pages/DashboardPage.jsx` — conditionally hide personality labels in dashboard view when `personalityEnabled === false` from rating configuration
- [x] T010 [P] [US2] Gate personality in `frontend/src/components/PersonalitySummaryStrip.jsx` — pass `personalityEnabled` from parent (DashboardPage), conditionally render nothing when disabled
- [x] T011 [P] [US2] Gate personality in `frontend/src/components/UserRatingsTable.jsx` — pass `personalityEnabled` from parent (DashboardPage), conditionally hide personality column/labels when disabled

**Checkpoint**: With personality detection disabled, no personality UI appears anywhere in the guest experience.

---

## Phase 5: User Story 3 - No Regression When Enabled (Priority: P1)

**Goal**: When personality detection is enabled (default), guest experience is identical to current production behavior.

**Independent Test**: Create wine event with default settings, rate enough items, verify all personality UI appears as before.

### Implementation for User Story 3

- [x] T012 [US3] Verify all personality gating uses `!== false` pattern (not `=== true`) in `frontend/src/pages/EventPage.jsx`, `frontend/src/components/UserDetailsDrawer.jsx`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/components/PersonalitySummaryStrip.jsx`, `frontend/src/components/UserRatingsTable.jsx` — ensures undefined (existing events) is treated as enabled

**Checkpoint**: Existing events with no `personalityEnabled` field continue to show all personality UI exactly as before.

---

## Phase 6: User Story 4 - Toggle Restricted to Created State (Priority: P2)

**Goal**: Toggle is greyed out and non-interactive once event has started.

**Independent Test**: Create wine event, start it, verify toggle is disabled.

### Implementation for User Story 4

(Already handled by T002 backend validation and T006 frontend `disabled` prop. No additional tasks needed.)

**Checkpoint**: Toggle is disabled for started/paused/completed events.

---

## Phase 7: User Story 5 - Toggle Hidden for Non-Wine Events (Priority: P2)

**Goal**: Non-wine events don't see the Personality Detection toggle.

**Independent Test**: Create non-wine event, verify toggle is not visible.

### Implementation for User Story 5

(Already handled by T006 frontend wine-only condition. No additional tasks needed.)

**Checkpoint**: Non-wine events show no Personality Detection toggle.

---

## Phase 8: Tests

**Purpose**: Unit and E2E tests for both enabled and disabled states.

- [ ] T013 [P] Add unit tests for admin toggle in `frontend/tests/unit/EventAdminPage.test.jsx` — test toggle visible for wine events, hidden for non-wine, disabled when `event.state !== 'created'`, value persists after save (covers FR-001 through FR-006)
- [ ] T014 [P] Add unit tests for personality suppression in `frontend/tests/unit/UserDetailsDrawer.test.jsx` — test personality card hidden when `personalityEnabled: false`, shown when `true` or `undefined`
- [x] T015 [P] Add unit tests for personality suppression in `frontend/tests/unit/DashboardPage.test.jsx` — test personality labels hidden when disabled, shown when enabled
- [x] T016 [P] Add E2E test for disabled personality reveal in `frontend/tests/e2e/specs/personality-reveal.spec.js` — create event with personality disabled, rate enough items, verify no reveal sheet
- [x] T017 [P] Add E2E test for disabled personality card in `frontend/tests/e2e/specs/personality-card.spec.js` — create event with personality disabled, verify no personality card in My Progress

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T018 Run all existing unit tests (`npx vitest run`) and fix any regressions
- [x] T019 Run quickstart.md validation — follow verification steps end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Backend)**: No dependencies — can start immediately
- **Phase 3 (US1 - Admin Toggle)**: Depends on Phase 2 (backend must store/return the flag)
- **Phase 4 (US2 - Guest Suppression)**: Depends on Phase 2 (needs flag in ratingConfig). Can run in parallel with Phase 3.
- **Phase 5 (US3 - No Regression)**: Depends on Phase 4 (verification of gating pattern)
- **Phases 6-7 (US4, US5)**: Already covered by Phase 2-3 tasks, no additional work
- **Phase 8 (Tests)**: Depends on Phases 3-5 completion
- **Phase 9 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (Admin Toggle)**: Depends on backend (Phase 2) only
- **US2 (Guest Suppression)**: Depends on backend (Phase 2) only — independent of US1
- **US3 (No Regression)**: Depends on US2 (verifies gating pattern correctness)
- **US4 (State Restriction)**: No additional tasks — covered by US1
- **US5 (Non-Wine Hidden)**: No additional tasks — covered by US1

### Parallel Opportunities

- T007, T008, T009, T010, T011 can all run in parallel (different files, no dependencies)
- T013, T014, T015, T016, T017 can all run in parallel (different test files)
- Phase 3 (US1) and Phase 4 (US2) can run in parallel after Phase 2

---

## Parallel Example: User Story 2

```bash
# Launch all guest suppression tasks together (all different files):
Task T007: "Gate personality reveal in EventPage.jsx"
Task T008: "Gate personality card in UserDetailsDrawer.jsx"
Task T009: "Gate personality in DashboardPage.jsx"
Task T010: "Gate personality in PersonalitySummaryStrip.jsx"
Task T011: "Gate personality in UserRatingsTable.jsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 2: Backend configuration (T001-T003)
2. Complete Phase 3: Admin toggle (T004-T006)
3. Complete Phase 4: Guest suppression (T007-T011)
4. **STOP and VALIDATE**: Toggle works, personality UI suppressed when disabled, existing behavior preserved
5. Deploy/demo if ready

### Full Delivery

1. Backend → Admin toggle → Guest suppression → Regression check → Tests → Polish
2. Total: 19 tasks across 9 phases
3. Estimated parallel groups: 3 (backend sequential, frontend parallel, tests parallel)

---

## Notes

- All gating checks use `!== false` (not `=== true`) to ensure backward compatibility with existing events that lack the field
- No new files created — all changes are modifications to existing files
- The `personalityEnabled` flag flows through the existing `ratingConfig` prop chain, not through a new context
- Backend continues to compute personalities regardless of toggle — suppression is frontend-only
