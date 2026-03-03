# Tasks: Start Event Guard-Rail (Bottle Count Mismatch)

**Input**: Design documents from `specs/022-start-event-guardrail/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently. This feature has two P1 user stories (US1: info when fewer registered, US2: warning when more registered + fallback); both are delivered by one State drawer block with shared foundational logic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `frontend/src/`, tests: `frontend/tests/`
- State drawer: `frontend/src/pages/EventAdminPage.jsx` (State SideDrawer at `openDrawer === 'state'`, content above "State Actions" / Start button)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and locations per implementation plan

- [x] T001 Verify frontend structure per plan: State drawer in frontend/src/pages/EventAdminPage.jsx (openDrawer === 'state'), Message and useItemTerminology available; create frontend/src/utils/eventGuardrail.js if missing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic and tests that both US1 and US2 depend on

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [x] T002 Implement getGapType(registeredCount, availableSlots) in frontend/src/utils/eventGuardrail.js returning 'zero-registrations' | 'more-slots' | 'fewer-slots' | 'match' per data-model.md
- [x] T003 [P] Add unit tests for getGapType in frontend/tests/unit/eventGuardrail.test.js covering all gap types and edge cases

**Checkpoint**: Foundation ready — State drawer message implementation can begin

---

## Phase 3: User Story 1 — Info When Fewer Bottles Registered (Priority: P1) 🎯 MVP

**Goal**: When admin can transition to started (created or completed) and registered count < rating slots (or zero), show an **info** message above the Start button stating the mismatch, that the event can be started, bottles can be registered later, and the benefit of mapping when paused. Start remains one-click.

**Independent Test**: Event in created state with more rating slots than registered bottles (e.g. 20 slots, 3 registered). Open State drawer → info message visible above Start with FR-002 content; click Start → event starts in one click.

- [x] T004 [US1] In frontend/src/pages/EventAdminPage.jsx State drawer add block above State Actions: compute availableSlots from event.itemConfiguration (numberOfItems − excludedItemIds.length), registeredCount from items.length when items loaded
- [x] T005 [US1] In same State drawer when event.state is created or completed call getGapType(registeredCount, availableSlots) and render Message type=info for gapType zero-registrations or more-slots with FR-002 copy using useItemTerminology (bottles/items, Bottles/Items configuration)

**Checkpoint**: US1 complete — info message and one-click start verifiable

---

## Phase 4: User Story 2 — Warning When More Bottles Registered (Priority: P1)

**Goal**: When registered count > rating slots, show a **warning** message above Start instructing admin to adjust bottle count in Bottles/Items configuration. When items load fails, show short fallback message (e.g. "Counts unavailable") and keep Start clickable.

**Independent Test**: Event with fewer slots than registered (e.g. 5 slots, 8 registered). Open State drawer → warning message above Start; one-click start still works. Simulate items load failure → fallback message; Start still clickable.

- [x] T006 [US2] In frontend/src/pages/EventAdminPage.jsx State drawer render Message type=warning for gapType fewer-slots with FR-003 copy using useItemTerminology (adjust count in Bottles/Items configuration)
- [x] T007 [US2] In same State drawer when items load has failed (e.g. itemsError) show fallback message "Counts unavailable" per FR-007 and keep Start button clickable

**Checkpoint**: US2 complete — warning, fallback, and one-click start verifiable

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: E2E coverage and manual validation

- [x] T008 [P] Add E2E tests in frontend/tests/e2e/specs/event-states.spec.js for guardrail: info when fewer registered than slots, warning when more registered than slots, no message when match, fallback "Counts unavailable" when items load failed, one-click start without confirmation
- [ ] T009 Run quickstart.md manual validation (all steps including terminology and completed→started restart); use run as readability/actionability check for SC-004

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS US1 and US2
- **US1 (Phase 3)**: Depends on Foundational — can start after T002–T003
- **US2 (Phase 4)**: Depends on Foundational; extends same State drawer block as US1 (T006–T007 after T004–T005)
- **Polish (Phase 5)**: Depends on US1 and US2 complete

### User Story Dependencies

- **US1 (P1)**: After Foundational; no dependency on US2
- **US2 (P1)**: After Foundational; shares EventAdminPage State drawer with US1 (implement after US1 block is in place)

### Within Each User Story

- US1: T004 (compute + block placement) before T005 (render info message)
- US2: T006 (warning) and T007 (fallback) can be done in either order; both extend the same drawer block

### Parallel Opportunities

- T003 can run in parallel with any other task after T002 (different file)
- T008 (E2E) can run in parallel with other Polish tasks
- T001 is quick verification; T002 and T003 can follow immediately

---

## Parallel Example: Foundational

```bash
# After T002: getGapType implemented
# Run unit tests (T003) in parallel with any other non-drawer work
Task: "Add unit tests for getGapType in frontend/tests/unit/eventGuardrail.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: US1 (T004, T005)
4. **STOP and VALIDATE**: Open State drawer with fewer registered than slots → info message; one-click start
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → getGapType and tests in place
2. Add US1 → Info message and one-click start (MVP)
3. Add US2 → Warning and load-failure fallback
4. Polish → E2E and quickstart validation

### Single-Developer Order

1. T001 → T002 → T003
2. T004 → T005 (US1)
3. T006 → T007 (US2)
4. T008 → T009 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [US1]/[US2] map tasks to spec user stories for traceability
- No new API or backend; all data from EventAdminPage state (event, items, itemConfiguration, itemsError)
- Message component: use type="info" for US1, type="warning" for US2; reuse existing Message.jsx
- Spec and plan: no test tasks required by spec; plan requests unit tests for getGapType and e2e for State drawer message and one-click start — included in Phase 2 and Phase 5
