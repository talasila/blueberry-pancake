# Tasks: Ratings Configuration

**Input**: Design documents from `/specs/001-ratings-config/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3], [US4])
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow plan.md structure

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Add DEFAULT_RATING_PRESETS constant in backend/src/services/EventService.js
- [x] T002 [P] Implement convertColorToHex utility function in backend/src/services/EventService.js
- [x] T003 [P] Implement generateDefaultRatings method in backend/src/services/EventService.js
- [x] T004 Implement getRatingConfiguration method in backend/src/services/EventService.js
- [x] T005 Implement validateRatingConfiguration method in backend/src/services/EventService.js
- [x] T006 Implement validateMaxRatingChange method in backend/src/services/EventService.js
- [x] T007 Implement updateRatingConfiguration method in backend/src/services/EventService.js (handles maxRating changes, labels, colors with state validation and optimistic locking)
- [x] T008 Add GET /api/events/:eventId/rating-configuration endpoint in backend/src/api/events.js
- [x] T009 Add PATCH /api/events/:eventId/rating-configuration endpoint in backend/src/api/events.js
- [x] T010 Add getRatingConfiguration method in frontend/src/services/apiClient.js
- [x] T011 Add updateRatingConfiguration method in frontend/src/services/apiClient.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 2: User Story 1 - Configure Rating Scale (Priority: P1) 🎯 MVP

**Goal**: Event administrators can set the maximum rating value (between 2 and 4) to customize the rating scale for their event. This is the foundational setting that determines the entire rating structure.

**Independent Test**: Navigate to Event Admin → Ratings Configuration section, set max rating value (2-4), save, and verify the scale updates correctly. Can be fully tested independently and delivers immediate value.

### Implementation for User Story 1

- [x] T012 [US1] Add state validation for maxRating changes in updateRatingConfiguration method in backend/src/services/EventService.js (only allow in "created" state)
- [x] T013 [US1] Add error handling for state restriction in PATCH endpoint in backend/src/api/events.js
- [x] T014 [US1] Add error handling for optimistic locking conflicts (409) in PATCH endpoint in backend/src/api/events.js
- [x] T015 [US1] Add "Ratings Configuration" accordion section in frontend/src/pages/EventAdminPage.jsx
- [x] T016 [US1] Add max rating input field (number, range 2-4) in frontend/src/pages/EventAdminPage.jsx
- [x] T017 [US1] Disable max rating input when event.state !== 'created' in frontend/src/pages/EventAdminPage.jsx
- [x] T018 [US1] Add state variables for rating configuration in frontend/src/pages/EventAdminPage.jsx (maxRating, ratings, isSaving, error, success)
- [x] T019 [US1] Implement fetchRatingConfiguration on component mount in frontend/src/pages/EventAdminPage.jsx
- [x] T020 [US1] Implement saveRatingConfiguration handler in frontend/src/pages/EventAdminPage.jsx
- [x] T021 [US1] Add validation for maxRating range (2-4) in frontend/src/pages/EventAdminPage.jsx
- [x] T022 [US1] Display validation errors for maxRating in frontend/src/pages/EventAdminPage.jsx
- [x] T023 [US1] Handle optimistic locking conflict errors (409) in frontend/src/pages/EventAdminPage.jsx
- [x] T024 [US1] Display ratings array based on maxRating in frontend/src/pages/EventAdminPage.jsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Admins can configure max rating (2-4) when event is in "created" state.

---

## Phase 3: User Story 2 - Customize Rating Labels (Priority: P2)

**Goal**: Event administrators can customize the label text for each rating level so that the labels match the tone and context of their event.

**Independent Test**: Set max rating, edit label text for each rating level, save, and verify labels persist. Can be fully tested independently and delivers value through personalized rating descriptions.

### Implementation for User Story 2

- [x] T025 [US2] Add label validation (non-empty, max 50 characters) in backend/src/services/EventService.js
- [x] T026 [US2] Add label input fields for each rating level in frontend/src/pages/EventAdminPage.jsx
- [x] T027 [US2] Implement label validation on blur in frontend/src/pages/EventAdminPage.jsx
- [x] T028 [US2] Implement label validation on submit in frontend/src/pages/EventAdminPage.jsx
- [x] T029 [US2] Display validation errors for labels in frontend/src/pages/EventAdminPage.jsx
- [x] T030 [US2] Update saveRatingConfiguration to include label changes in frontend/src/pages/EventAdminPage.jsx
- [x] T031 [US2] Add character counter for labels (max 50) in frontend/src/pages/EventAdminPage.jsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Admins can configure max rating and customize labels.

---

## Phase 4: User Story 3 - Customize Rating Colors (Priority: P2)

**Goal**: Event administrators can customize the color for each rating level so that the visual representation matches their event's branding or theme.

**Independent Test**: Select custom colors for rating levels, save, and verify colors are applied in the rating interface. Can be fully tested independently and delivers value through visual customization.

### Implementation for User Story 3

- [x] T032 [US3] Add color validation and conversion in backend/src/services/EventService.js (accept hex/RGB/HSL, store as hex)
- [x] T033 [US3] Add color picker using HTML5 input type="color" for each rating level in frontend/src/pages/EventAdminPage.jsx
- [x] T034 [US3] Add optional hex text input for manual color entry in frontend/src/pages/EventAdminPage.jsx
- [x] T035 [US3] Add color preview display for each rating level in frontend/src/pages/EventAdminPage.jsx
- [x] T036 [US3] Implement color change handler in frontend/src/pages/EventAdminPage.jsx
- [x] T037 [US3] Update saveRatingConfiguration to include color changes in frontend/src/pages/EventAdminPage.jsx
- [x] T038 [US3] Add color format validation in frontend/src/pages/EventAdminPage.jsx
- [x] T039 [US3] Display validation errors for invalid colors in frontend/src/pages/EventAdminPage.jsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Admins can configure max rating, customize labels, and customize colors.

---

## Phase 5: User Story 4 - Reset to Defaults (Priority: P3)

**Goal**: Event administrators can reset all rating configuration (labels and colors) to their default values so that they can quickly revert changes if needed.

**Independent Test**: Customize labels and colors, click "Reset to Defaults", and verify all values return to defaults. Can be fully tested independently and delivers value through ease of reversion.

### Implementation for User Story 4

- [x] T040 [US4] Add resetToDefaults method in backend/src/services/EventService.js (generates defaults for current maxRating)
- [x] T041 [US4] Add "Reset to Defaults" button in frontend/src/pages/EventAdminPage.jsx
- [x] T042 [US4] Implement handleResetToDefaults handler in frontend/src/pages/EventAdminPage.jsx
- [x] T043 [US4] Update UI to show default values after reset in frontend/src/pages/EventAdminPage.jsx
- [x] T044 [US4] Implement immediate reset (no confirmation required) in frontend/src/pages/EventAdminPage.jsx

**Checkpoint**: All user stories should now be independently functional. Admins can configure max rating, customize labels, customize colors, and reset to defaults.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T045 [P] Add unit tests for convertColorToHex in backend/tests/unit/EventService.test.js
- [ ] T046 [P] Add unit tests for generateDefaultRatings in backend/tests/unit/EventService.test.js
- [ ] T047 [P] Add unit tests for rating configuration validation in backend/tests/unit/EventService.test.js
- [ ] T048 [P] Add integration tests for GET rating-configuration endpoint in backend/tests/integration/events.test.js
- [ ] T049 [P] Add integration tests for PATCH rating-configuration endpoint in backend/tests/integration/events.test.js
- [ ] T050 [P] Add integration tests for optimistic locking conflicts in backend/tests/integration/events.test.js
- [ ] T051 [P] Add integration tests for state restrictions in backend/tests/integration/events.test.js
- [ ] T052 [P] Add E2E test for configure max rating flow in frontend/tests/e2e/
- [ ] T053 [P] Add E2E test for customize labels flow in frontend/tests/e2e/
- [ ] T054 [P] Add E2E test for customize colors flow in frontend/tests/e2e/
- [ ] T055 [P] Add E2E test for reset to defaults flow in frontend/tests/e2e/
- [ ] T056 Code cleanup and refactoring (remove unused code, consolidate duplicate logic)
- [ ] T057 Verify mobile responsiveness of rating configuration UI
- [ ] T058 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - can start immediately (infrastructure already exists, just adding new methods)
- **User Stories (Phase 2-5)**: All depend on Foundational phase completion
  - User stories should proceed sequentially in priority order (P1 → P2 → P3)
  - US2 and US3 (both P2) can be done in parallel if needed, but US2 is simpler
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 1) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (needs maxRating to be configured first) - Builds on US1
- **User Story 3 (P2)**: Depends on US1 (needs maxRating to be configured first) - Can be done in parallel with US2
- **User Story 4 (P3)**: Depends on US2 and US3 (needs labels and colors to be customizable first) - Builds on previous stories

### Within Each User Story

- Backend service methods before API endpoints
- API endpoints before frontend API client methods
- API client methods before UI components
- Core implementation before error handling and validation
- Story complete before moving to next priority

### Parallel Opportunities

- Foundational tasks T002 and T003 can run in parallel (different utility functions)
- Foundational tasks T009 and T010 can run in parallel (different API client methods)
- US2 and US3 can potentially run in parallel (different features, same UI component)
- All test tasks in Phase 6 marked [P] can run in parallel
- Backend and frontend work can be done in parallel after foundational phase

---

## Parallel Example: User Story 1

```bash
# Backend and frontend can be worked on in parallel after foundational:
Backend: "Implement updateRatingConfiguration method in backend/src/services/EventService.js (T007)"
Frontend: "Add 'Ratings Configuration' accordion section in frontend/src/pages/EventAdminPage.jsx (T015)"

# Multiple UI elements can be added in parallel:
Task: "Add max rating input field in frontend/src/pages/EventAdminPage.jsx (T016)"
Task: "Add state variables for rating configuration in frontend/src/pages/EventAdminPage.jsx (T018)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (add backend methods and API endpoints)
2. Complete Phase 2: User Story 1 (configure max rating)
3. **STOP and VALIDATE**: Test User Story 1 independently
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (backend focus)
   - Developer B: User Story 1 (frontend focus)
3. Once US1 is done:
   - Developer A: User Story 2 (labels)
   - Developer B: User Story 3 (colors)
4. Developer A: User Story 4 (reset to defaults)
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Backend validation is source of truth, frontend validation is for UX
- Optimistic locking uses event updatedAt timestamp (existing pattern)
- Color conversion happens server-side for security
- Default presets are defined in EventService as constants
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

