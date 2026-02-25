# Tasks: My Events Page

**Input**: Design documents from `/specs/016-my-events/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included because the constitution (Principle IV) requires unit tests for new service methods, integration tests for new endpoints, and E2E tests for full user flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Backend + Frontend Infrastructure)

**Purpose**: Core backend changes (JWT authMethod, event summaries service and endpoint) and frontend apiClient methods that MUST be complete before any user story UI work can begin.

**CRITICAL**: No user story work can begin until this phase is complete.

### JWT authMethod Support

- [X] T001 Modify `generateToken()` and `addEventToToken()` in `backend/src/middleware/jwtAuth.js` — include `authMethod` in token payload when provided in the input, and preserve `authMethod` from decoded token when adding events to an existing token
- [X] T002 [P] Pass `authMethod: 'otp'` to `generateToken` in `backend/src/api/auth.js` at both OTP verify (line ~219) and token refresh (line ~342) call sites
- [X] T003 [P] Pass `authMethod: 'pin'` to `generateToken` in `backend/src/api/events.js` at PIN verify call sites (line ~159 fallback token and line ~166 new token)

### Event Summaries Service + Endpoint

- [X] T004 [P] Add `getEventSummariesByAdministrator(email)` method in `backend/src/services/EventService.js` — reuse existing admin-checking logic from `getEventsByAdministrator` but return event summary objects (`{ eventId, name, state, createdAt }`) instead of just IDs. Sort results by `createdAt` descending (most recent first)
- [X] T005 Add unit tests for `getEventSummariesByAdministrator` in `backend/tests/unit/EventService.test.js` — test with admin who has multiple events (verify all returned, sorted by createdAt desc), admin with no events (verify empty array), and error handling for unloadable events
- [X] T006 Add `GET /mine` route in `backend/src/api/events.js` — use `requireAuth` middleware, call `eventService.getEventSummariesByAdministrator(req.user.email)`, return `{ events: [...] }` with 200 status. Handle errors with `handleApiError`. Place route BEFORE `/:eventId` routes to avoid `mine` being captured as an eventId parameter
- [X] T007 [P] Add integration tests for `GET /api/events/mine` in `backend/tests/integration/events.test.js` — test authenticated request returns admin events, empty array for user with no events, and 401 for unauthenticated request. Also verify that OTP-authenticated tokens contain `authMethod: 'otp'` and PIN-authenticated tokens contain `authMethod: 'pin'` in their JWT payloads

### Frontend API Client

- [X] T008 [P] Add `getMyEvents()` and `getAuthMethod()` methods in `frontend/src/services/apiClient.js` — `getMyEvents()` calls `this.get('/events/mine')` and returns the response. `getAuthMethod()` decodes the JWT payload and returns the `authMethod` field (or `null` if not present)

**Checkpoint**: Backend generates JWTs with authMethod, serves event summaries at GET /api/events/mine, and frontend apiClient can call both. All backend tests pass.

---

## Phase 2: User Story 1 — View My Events After Re-Authentication (Priority: P1) MVP

**Goal**: An administrator can click "My Events" on the landing page, authenticate via OTP, and see a list of all their events with links to each event's admin page.

**Independent Test**: Create an event, log out, click "My Events" on landing page, authenticate, verify the event appears in the list with name, event ID, state, and creation date, and click through to the admin page.

### Implementation for User Story 1

- [X] T009 [US1] Create `MyEventsPage` component in `frontend/src/pages/MyEventsPage.jsx` — fetch events via `apiClient.getMyEvents()` on mount. Display event list using Card components showing event name, event ID, state badge, and creation date. Each event links to `/event/{eventId}/admin`. Handle loading state (spinner), error state (message + retry button), and empty state (message + link to create event page). Follow existing page patterns from `CreateEventPage.jsx` and use established shadcn/ui Card components
- [X] T010 [P] [US1] Add "My Events" card on landing page in `frontend/src/pages/LandingPage.jsx` — add a third Card below "Create an event" with title "My Events", description "Find your previously created events", and a button that navigates to `/auth` with `{ state: { from: { pathname: '/my-events' } } }`, following the same auth redirect pattern as the "Create" card
- [X] T011 [US1] Add `/my-events` protected route in `frontend/src/App.jsx` — add a `Route` for path `/my-events` wrapped in `ProtectedRoute`, rendering `MyEventsPage`. Place alongside the existing `/create-event` protected route

**Checkpoint**: Full landing page → auth → My Events → event admin page flow works end-to-end. Events display with correct details and sort order.

---

## Phase 3: User Story 2 — Access My Events From Header Menu (Priority: P1)

**Goal**: An OTP-authenticated administrator can access the My Events page via the header dropdown menu. PIN-authenticated participants do not see this menu item.

**Independent Test**: Log in via OTP, navigate to an event admin page, open the header menu, click "My Events", and verify the events list is displayed. Log in via PIN as a participant and verify "My Events" does not appear in the header menu.

### Implementation for User Story 2

- [X] T012 [US2] Add "My Events" menu item in header dropdown in `frontend/src/components/Header.jsx` — add a `DropdownMenuItem` with a list icon (e.g., `List` from lucide-react) as the first item in the dropdown menu, before the existing "Back to Event" item. Conditionally render only when `apiClient.getAuthMethod() === 'otp'`. On click, navigate to `/my-events`. Do not show when `authMethod` is `'pin'` or absent

**Checkpoint**: OTP-authenticated admins see "My Events" in the header menu and can navigate to the events list. PIN-authenticated participants do not see it.

---

## Phase 4: User Story 3 — Empty State When No Events Exist (Priority: P2)

**Goal**: A user with no events sees a friendly empty state with a clear path to event creation.

**Independent Test**: Authenticate with an email that has no associated events and verify the empty state message and create-event link are displayed.

### Implementation for User Story 3

No additional implementation tasks — the empty state is built into `MyEventsPage` as part of T009 (all page states: loading, event list, empty, error are implemented together as a single component). This phase serves as the independent test checkpoint for the empty state behavior.

**Checkpoint**: Authenticating with a no-events email shows "You haven't created any events yet" message with a working link to the create event page.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests covering all user flows and final validation.

- [X] T013 [P] Add E2E tests for My Events feature in `frontend/tests/e2e/specs/my-events.spec.js` — test the following flows: (1) landing page card → OTP auth → My Events list with created event, (2) header menu "My Events" link for OTP-auth user, (3) empty state for user with no events, (4) "My Events" menu item NOT visible for PIN-authenticated participant, (5) click event in list navigates to admin page
- [X] T014 Run `quickstart.md` verification scenarios end-to-end — create event via OTP auth → verify in My Events list; log out → My Events card → re-auth → verify list; header menu → My Events; empty state with create link; PIN participant cannot see menu item

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
  - T001 must complete before T002/T003 (auth.js and events.js depend on jwtAuth.js changes)
  - T002, T003, T004, T008 can run in parallel (different files, independent concerns)
  - T005 depends on T004 (unit tests require the method to exist)
  - T006 depends on T004 (endpoint calls the service method)
  - T007 depends on T006 (integration tests require the endpoint)
- **US1 (Phase 2)**: Depends on Phase 1 completion (needs endpoint + apiClient methods)
  - T010 can run in parallel with T009 (different files, no import dependency)
  - T011 depends on T009 (route imports MyEventsPage component)
- **US2 (Phase 3)**: Depends on Phase 1 completion (needs `getAuthMethod()` in apiClient)
  - Can run in parallel with US1 (different files: Header.jsx vs MyEventsPage/LandingPage/App)
- **US3 (Phase 4)**: No tasks — covered by T009. Serves as verification checkpoint
- **Polish (Phase 5)**: Depends on all phases complete

### Test Coverage (Constitution Principle IV)

- **Foundational**: T005 (unit tests for service method), T007 (integration tests for endpoint)
- **E2E**: T013 (full user flow tests covering all stories)

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 1 only. Core page + landing page entry point.
- **User Story 2 (P1)**: Depends on Phase 1 only. Can run in parallel with US1. Header menu entry point.
- **User Story 3 (P2)**: No additional tasks — covered by US1's page component (T009).

### Parallel Opportunities

Phase 1 parallel group (after T001):
```
T002 (auth.js)  |  T003 (events.js PIN)  |  T004 (EventService.js)  |  T008 (apiClient.js)
```

Phase 1 sequential chain:
```
T004 → T005 → T006 → T007
```

US1 + US2 parallel group (after Phase 1):
```
T009 (MyEventsPage)  |  T010 (LandingPage card)  |  T012 (Header menu item)
```

Then sequential:
```
T011 (App.jsx route — depends on T009)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001–T008)
2. Complete Phase 2: US1 (T009–T011)
3. **STOP and VALIDATE**: Create event → log out → My Events card → auth → verify event list
4. Deploy/demo if ready — administrators can recover their events

### Incremental Delivery

1. Phase 1 → Backend + apiClient ready
2. Add US1 (T009–T011) → Landing page entry point works → Validate (MVP!)
3. Add US2 (T012) → Header menu entry point works → Validate
4. Verify US3 → Empty state works → Validate
5. Polish (T013–T014) → E2E tests + final verification

### Parallel Strategy

With two developers:

1. Both complete Phase 1 together (T001 first, then parallel tasks)
2. Once Phase 1 is done:
   - Developer A: US1 (MyEventsPage + LandingPage + route)
   - Developer B: US2 (Header menu item) + start E2E tests
3. Both complete Polish together

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- T006 route placement is critical: `GET /mine` MUST be defined before `GET /:eventId` in events.js to prevent Express from matching "mine" as an eventId parameter
- T009 builds the complete MyEventsPage with all four states (loading, list, empty, error) — this covers US1 and US3 in a single component
- T012 uses `apiClient.getAuthMethod()` to distinguish OTP vs PIN auth — this is the key mechanism for FR-002 compliance
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
