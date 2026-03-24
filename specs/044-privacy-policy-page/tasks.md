# Tasks: Privacy Policy Page

**Input**: Design documents from `/specs/044-privacy-policy-page/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Included per constitution principle IV (Testing Standards).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No setup required — no new dependencies, no project initialization needed. All required packages (React Router, Radix UI, Tailwind CSS) are already installed.

*(No tasks in this phase)*

---

## Phase 2: Foundational

**Purpose**: No foundational infrastructure required — this feature uses only existing UI components (Card, Link) and routing patterns.

*(No tasks in this phase)*

---

## Phase 3: User Story 1 - View Privacy Policy (Priority: P1) MVP

**Goal**: Users can navigate to `/privacy` and read the full privacy policy. The page is publicly accessible, styled consistently, and the Resend external link opens in a new tab.

**Independent Test**: Navigate to `/privacy` without authentication — full policy text renders with all 6 sections.

### Implementation for User Story 1

- [x] T001 [US1] Create privacy policy page component in `frontend/src/pages/PrivacyPolicyPage.jsx` — render the agreed-upon policy text using Card layout (CardHeader + CardContent), with section headings, bullet lists, bold text, and the Resend external link with `target="_blank"` and `rel="noopener noreferrer"`. Use the standard centered layout pattern (`flex items-center justify-center` + `max-w-md` container). Include "Last updated" date. Use `text-muted-foreground` for secondary text to support dark mode.
- [x] T002 [US1] Add `/privacy` route to `frontend/src/App.jsx` — import `PrivacyPolicyPage` and add `<Route path="/privacy" element={<PrivacyPolicyPage />} />` as a public route (no `ProtectedRoute` wrapper), alongside existing public routes like `/` and `/auth`.

### Tests for User Story 1

- [x] T003 [US1] Write E2E test for privacy policy page in `frontend/tests/e2e/specs/privacy-policy.spec.js` — verify: (1) `/privacy` renders without authentication, (2) all 6 sections are present (What we collect, Third-party services, Cookies, Data retention, Your rights, Contact), (3) Resend link has `target="_blank"`, (4) page is responsive on mobile viewport.

**Checkpoint**: Privacy policy page is live at `/privacy`, publicly accessible, and independently testable.

---

## Phase 4: User Story 2 - Discover Privacy Policy from Guest Email Entry (Priority: P2)

**Goal**: Guests see a privacy policy link below the email entry form before providing their email address.

**Independent Test**: Navigate to an event's email entry page — a privacy policy link is visible below the form and navigates to `/privacy`.

### Implementation for User Story 2

- [x] T004 [P] [US2] Add privacy policy link to `frontend/src/pages/EmailEntryPage.jsx` — add a centered `<Link to="/privacy">` below the Card component (outside the form, within the max-width container). Use `text-muted-foreground text-sm` styling. Text: "By continuing, you agree to our Privacy Policy" with "Privacy Policy" as the link. The link must be informational only — it must not block form submission.

### Tests for User Story 2

- [x] T005 [US2] Add E2E test for privacy link on email entry page in `frontend/tests/e2e/specs/privacy-policy.spec.js` — verify: (1) privacy link is visible on the email entry page, (2) clicking it navigates to `/privacy`, (3) browser back button returns to email entry page.

**Checkpoint**: Guests can discover and read the privacy policy from the email entry page.

---

## Phase 5: User Story 3 - Discover Privacy Policy from Host Login (Priority: P3)

**Goal**: Hosts see a privacy policy link below the authentication form before providing their email address.

**Independent Test**: Navigate to `/auth` — a privacy policy link is visible below the form and navigates to `/privacy`.

### Implementation for User Story 3

- [x] T006 [P] [US3] Add privacy policy link to `frontend/src/pages/AuthPage.jsx` — same pattern as T004: centered `<Link to="/privacy">` below the Card, `text-muted-foreground text-sm` styling, same informational text. Must not block form submission.

### Tests for User Story 3

- [x] T007 [US3] Add E2E test for privacy link on auth page in `frontend/tests/e2e/specs/privacy-policy.spec.js` — verify: (1) privacy link is visible on `/auth`, (2) clicking it navigates to `/privacy`.

**Checkpoint**: Hosts can discover and read the privacy policy from the authentication page.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [x] T008 Write unit test for PrivacyPolicyPage component in `frontend/tests/unit/PrivacyPolicyPage.test.jsx` — verify: (1) component renders all 6 sections, (2) external Resend link has `target="_blank"` and `rel="noopener noreferrer"`, (3) "Last updated" date is present (FR-004), (4) page uses Card layout for visual consistency (FR-009).
- [x] T009 Run `quickstart.md` validation — execute all verification steps from quickstart.md to confirm end-to-end feature completeness.
- [x] T010 Update `SYSTEM_DOCUMENTATION.md` — add `/privacy` to the list of frontend routes and note it as a public (no-auth) page.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — nothing to set up
- **Foundational (Phase 2)**: Skipped — no blocking prerequisites
- **User Story 1 (Phase 3)**: Can start immediately — creates the privacy page and route
- **User Story 2 (Phase 4)**: Depends on US1 (T001, T002) — the `/privacy` page must exist for the link to work
- **User Story 3 (Phase 5)**: Depends on US1 (T001, T002) — same dependency as US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — can start immediately
- **User Story 2 (P2)**: Depends on US1 completion (needs `/privacy` route to exist)
- **User Story 3 (P3)**: Depends on US1 completion (needs `/privacy` route to exist). Can run in parallel with US2.

### Parallel Opportunities

- T004 (US2) and T006 (US3) can run in parallel once US1 is complete — they modify different files
- T005 (US2 test) and T007 (US3 test) can run in parallel — they add to the same test file but test different pages

---

## Parallel Example: After US1 Complete

```bash
# Launch US2 and US3 implementation in parallel (different files):
Task: "Add privacy link to EmailEntryPage.jsx"
Task: "Add privacy link to AuthPage.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 + T002 (create page + add route)
2. Complete T003 (E2E test)
3. **STOP and VALIDATE**: Navigate to `/privacy` — page renders with all sections
4. Deploy/demo if ready — privacy policy is accessible

### Incremental Delivery

1. US1 → Privacy page live → Deploy (MVP!)
2. US2 → Link on email entry → Deploy
3. US3 → Link on auth page → Deploy
4. Polish → Unit tests, docs, quickstart validation → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US2 and US3 are small, single-file changes — each is one task plus one test
- All E2E tests go in one file (`privacy-policy.spec.js`) organized by describe blocks per user story
- Contact email and last-updated date are deployment-time values per spec assumptions
- Commit after each task or logical group
