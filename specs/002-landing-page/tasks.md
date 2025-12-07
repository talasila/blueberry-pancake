# Tasks: Landing Page

**Input**: Design documents from `/specs/002-landing-page/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per Constitution Principle IV (Testing Standards) - unit tests (Vitest) and E2E tests (Playwright/Cucumber) are required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`
- Component location: `frontend/src/pages/LandingPage.jsx` (page component for route)
- Tests: `frontend/tests/unit/` and `frontend/tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure verification and component directory creation

- [x] T001 Verify frontend project structure exists at `frontend/src/`
- [x] T002 [P] Create `frontend/src/pages/` directory for page components
- [x] T003 [P] Verify React Router DOM 7.10.1 is installed and configured in `frontend/src/App.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core component structure that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create LandingPage component structure in `frontend/src/pages/LandingPage.jsx` with basic React functional component skeleton
- [x] T005 Update React Router in `frontend/src/App.jsx` to use LandingPage component at root route "/"

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Landing Page with Join Event Interface (Priority: P1) 🎯 MVP

**Goal**: Display event ID input field and Join button with visual feedback, no functional behavior

**Independent Test**: Load landing page at "/" and verify event ID input field and Join button are visible and clickable. Verify no network requests or navigation occur when Join button is clicked.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Write unit test for LandingPage component rendering in `frontend/tests/unit/LandingPage.test.jsx` - verify event ID input and Join button are visible
- [x] T007 [P] [US1] Write unit test for event ID input field in `frontend/tests/unit/LandingPage.test.jsx` - verify controlled input accepts text
- [x] T008 [P] [US1] Write unit test for Join button click in `frontend/tests/unit/LandingPage.test.jsx` - verify no functional actions triggered
- [x] T009 [P] [US1] Write E2E test for User Story 1 in `frontend/tests/e2e/features/landing-page.feature` - Given/When/Then scenarios for event ID input and Join button visibility and interaction

### Implementation for User Story 1

- [x] T010 [US1] Add useState hook for event ID input value in `frontend/src/pages/LandingPage.jsx`
- [x] T011 [US1] Implement event ID input field (controlled input) in `frontend/src/pages/LandingPage.jsx` with placeholder text "Enter event ID"
- [x] T012 [US1] Implement Join button in `frontend/src/pages/LandingPage.jsx` with onClick handler that prevents default and provides visual feedback only
- [x] T013 [US1] Apply Tailwind CSS classes for styling event ID input field in `frontend/src/pages/LandingPage.jsx` using existing theme colors
- [x] T014 [US1] Apply Tailwind CSS classes for Join button styling with hover and active states in `frontend/src/pages/LandingPage.jsx` (hover:bg-primary/90, active:scale-95, transition-all)
- [x] T015 [US1] Verify no navigation or API calls occur when Join button is clicked (manual testing and E2E test validation)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Event ID input and Join button are visible, interactive, and provide visual feedback with no functional behavior.

---

## Phase 4: User Story 2 - View Create Event Interface (Priority: P2)

**Goal**: Display Create button with visual feedback, no functional behavior

**Independent Test**: Load landing page and verify Create button is visible and clickable. Verify no network requests or navigation occur when Create button is clicked.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T016 [P] [US2] Write unit test for Create button rendering in `frontend/tests/unit/LandingPage.test.jsx` - verify Create button is visible
- [x] T017 [P] [US2] Write unit test for Create button click in `frontend/tests/unit/LandingPage.test.jsx` - verify no functional actions triggered
- [x] T018 [P] [US2] Write E2E test for User Story 2 in `frontend/tests/e2e/features/landing-page.feature` - Given/When/Then scenarios for Create button visibility and interaction

### Implementation for User Story 2

- [x] T019 [US2] Implement Create button in `frontend/src/pages/LandingPage.jsx` with onClick handler that prevents default and provides visual feedback only
- [x] T020 [US2] Apply Tailwind CSS classes for Create button styling with hover and active states in `frontend/src/pages/LandingPage.jsx` (consistent with Join button styling)
- [x] T021 [US2] Verify no navigation or API calls occur when Create button is clicked (manual testing and E2E test validation)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Event ID input with Join button and Create button are all visible and interactive.

---

## Phase 5: User Story 3 - View Sign In Interface (Priority: P3)

**Goal**: Display Sign in button with visual feedback, no functional behavior

**Independent Test**: Load landing page and verify Sign in button is visible and clickable. Verify no network requests or navigation occur when Sign in button is clicked.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US3] Write unit test for Sign in button rendering in `frontend/tests/unit/LandingPage.test.jsx` - verify Sign in button is visible
- [x] T023 [P] [US3] Write unit test for Sign in button click in `frontend/tests/unit/LandingPage.test.jsx` - verify no functional actions triggered
- [x] T024 [P] [US3] Write E2E test for User Story 3 in `frontend/tests/e2e/features/landing-page.feature` - Given/When/Then scenarios for Sign in button visibility and interaction

### Implementation for User Story 3

- [x] T025 [US3] Implement Sign in button in `frontend/src/pages/LandingPage.jsx` with onClick handler that prevents default and provides visual feedback only
- [x] T026 [US3] Apply Tailwind CSS classes for Sign in button styling with hover and active states in `frontend/src/pages/LandingPage.jsx` (consistent with other buttons)
- [x] T027 [US3] Verify no navigation or API calls occur when Sign in button is clicked (manual testing and E2E test validation)

**Checkpoint**: All user stories should now be independently functional. All three interface elements (event ID input with Join button, Create button, Sign in button) are visible and interactive.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect all user stories and ensure success criteria

- [x] T028 [P] Implement responsive design layout in `frontend/src/pages/LandingPage.jsx` using Tailwind responsive utilities (xs: 320px, sm: 640px, md: 768px, lg: 1024px) to meet SC-004
- [x] T029 [P] Verify all elements remain visible across viewport sizes 320px to 2560px width in `frontend/src/pages/LandingPage.jsx` (manual testing and E2E viewport tests)
- [x] T030 [P] Add accessibility attributes (ARIA labels, keyboard navigation support) to input field and buttons in `frontend/src/pages/LandingPage.jsx`
- [x] T031 [P] Verify event ID input field handles up to 1000 characters without breaking layout in `frontend/src/pages/LandingPage.jsx` (test with long text input)
- [x] T032 [P] Verify page load time meets SC-001 (<2 seconds) using browser DevTools
- [x] T033 [P] Verify button interaction feedback meets SC-002 (<100ms) using CSS transitions in `frontend/src/pages/LandingPage.jsx`
- [x] T034 [P] Run all unit tests: `cd frontend && npm test` - ensure all tests pass
- [x] T035 [P] Run all E2E tests: `cd frontend && npm run test:e2e` - ensure all scenarios pass
- [x] T036 [P] Verify no network requests occur on any button click using browser DevTools Network tab (SC-003 validation)
- [x] T037 Code cleanup: Remove any unused imports or dead code in `frontend/src/pages/LandingPage.jsx`
- [x] T038 Documentation: Update component with JSDoc comments in `frontend/src/pages/LandingPage.jsx` describing view-only behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P2 → P3)
  - Or in parallel if multiple developers (each story is independent)
- **Polish (Phase 6)**: Depends on all user stories (Phase 3-5) being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1, but all elements must be visible simultaneously (FR-008)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2, but all elements must be visible simultaneously (FR-008)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD approach)
- Component implementation before styling
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks T002 and T003 marked [P] can run in parallel
- All test tasks within a user story marked [P] can run in parallel
- User stories (Phase 3-5) can be worked on in parallel by different team members after Foundational phase
- Polish phase tasks marked [P] can run in parallel (different aspects: responsive, accessibility, performance, testing)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write unit test for LandingPage component rendering in frontend/tests/unit/LandingPage.test.jsx"
Task: "Write unit test for event ID input field in frontend/tests/unit/LandingPage.test.jsx"
Task: "Write unit test for Join button click in frontend/tests/unit/LandingPage.test.jsx"
Task: "Write E2E test for User Story 1 in frontend/tests/e2e/features/landing-page.feature"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Event ID input + Join button)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Polish phase → Final validation → Deploy
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Event ID input + Join button)
   - Developer B: User Story 2 (Create button) - can start in parallel
   - Developer C: User Story 3 (Sign in button) - can start in parallel
3. Stories complete and integrate independently
4. All developers collaborate on Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All three interface elements must be visible simultaneously (FR-008)
- No functional behavior (no navigation, API calls, or state changes beyond visual feedback)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
