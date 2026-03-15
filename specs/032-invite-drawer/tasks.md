# Tasks: Unified Invite Drawer

**Input**: Design documents from `/specs/032-invite-drawer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included — spec explicitly requires unit and e2e test updates (US6, FR-018).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install new dependency and create foundational files

- [X] T001 Install `qrcode.react` dependency in `frontend/package.json`
- [X] T002 [P] Create `frontend/src/utils/inviteUtils.js` with `formatInvitationMessage(eventName, eventUrl, pin)` helper that returns the formatted invitation string
- [X] T003 [P] Create `frontend/src/components/InviteQRCard.jsx` — renders QR code via `QRCodeSVG` (~200×200px) and PIN in large spaced monospace text, within a subtle rounded card container. Props: `eventUrl`, `pin`. Handle missing PIN gracefully (placeholder)

**Checkpoint**: New files created, dependency installed. Ready for integration.

---

## Phase 2: User Story 1 + 5 — Invite Drawer & Settings Cleanup (Priority: P1) 🎯 MVP

**Goal**: Replace floating Share button and PIN SettingsRow/drawer with a single "Invite" SettingsRow that opens a drawer containing the InviteQRCard. Settings page is clean with no duplicate sharing elements.

**Independent Test**: Open Settings page → tap Invite row → drawer opens with QR code and PIN displayed. No Share button or PIN row visible.

### Implementation

- [X] T004 [US1] [US5] Remove the floating Share button JSX, `handleCopyEventLink` function, and `linkCopied`/`setLinkCopied` state from `frontend/src/pages/EventAdminPage.jsx`
- [X] T005 [US1] [US5] Remove the PIN `SettingsRow`, PIN `SideDrawer`, `copied`/`setCopied` state, and `KeyRound`/`Share2` icon imports from `frontend/src/pages/EventAdminPage.jsx`
- [X] T006 [US1] [US5] Add the "Invite" `SettingsRow` as the first row after the stepper card in `frontend/src/pages/EventAdminPage.jsx` — use `UserPlus` icon, display PIN as a badge, open drawer via `openDrawerWithHistory('invite')`
- [X] T007 [US1] Add the Invite `SideDrawer` in `frontend/src/pages/EventAdminPage.jsx` with title "Invite", description "How guests join your event.", and render `InviteQRCard` as the drawer body content

**Checkpoint**: Invite row and drawer functional. QR code + PIN visible. Old Share/PIN UI removed. MVP complete.

---

## Phase 3: User Story 2 — Copy and Share Invitation (Priority: P1)

**Goal**: Host can copy a formatted invitation message or share it via the native share sheet.

**Independent Test**: Open Invite drawer → tap "Copy Invitation" → verify toast and clipboard. On mobile, tap "Share" → OS share sheet opens.

### Implementation

- [X] T008 [US2] Add "Copy Invitation" button in the Invite drawer in `frontend/src/pages/EventAdminPage.jsx` — uses `formatInvitationMessage()` from `inviteUtils.js`, copies to clipboard via `navigator.clipboard.writeText()`, shows toast "Invitation copied." Handle clipboard failure with error toast
- [X] T009 [US2] Add "Share" button in the Invite drawer in `frontend/src/pages/EventAdminPage.jsx` — conditionally rendered when `navigator.canShare?.()` is true, calls `navigator.share()` with formatted text. Silently catch `AbortError` (user cancelled). Buttons side by side at equal width; Copy Invitation spans full width when Share is hidden

**Checkpoint**: Digital sharing fully functional — copy and native share both work.

---

## Phase 4: User Story 3 — Download QR Code as PNG (Priority: P2)

**Goal**: Host can download a PNG image containing the QR code, event name, and PIN for printing or sharing as an attachment.

**Independent Test**: Open Invite drawer → tap "Download QR" → PNG file downloads. Open the PNG → QR code, event name, and PIN are all visible.

### Implementation

- [X] T010 [US3] Add `downloadQRImage(canvasElement, eventName, pin)` function to `frontend/src/utils/inviteUtils.js` — accepts a canvas element (from a hidden `QRCodeCanvas` ref in `InviteQRCard`), composites it onto a larger canvas with event name and PIN drawn as text below, exports via `canvas.toBlob()` → `URL.createObjectURL()` → programmatic `<a>` download. Truncate long event names. Update `InviteQRCard` to render a hidden `QRCodeCanvas` alongside the visible `QRCodeSVG` and expose the canvas ref via a prop/callback
- [X] T011 [US3] Add "Download QR" button (full-width, outline) below the Copy/Share buttons in the Invite drawer in `frontend/src/pages/EventAdminPage.jsx` — calls `downloadQRImage()` on click

**Checkpoint**: QR download works. Host can print or email the image.

---

## Phase 5: User Story 4 — Regenerate PIN (Priority: P2)

**Goal**: Host can regenerate the event PIN from within the Invite drawer, with the updated PIN reflected everywhere.

**Independent Test**: Open Invite drawer → scroll to bottom → tap "Regenerate PIN" → PIN updates in the QR card and SettingsRow badge.

### Implementation

- [X] T012 [US4] Move existing PIN regeneration logic (`isRegenerating`, `regenerateError`, `regenerateSuccess`, `apiClient.regeneratePIN()` call, event state update) into the Invite drawer section of `frontend/src/pages/EventAdminPage.jsx` — render below a subtle divider with explanatory text "Creates a new PIN. Only affects new logins." Use ghost/secondary button styling. Preserve loading state, error/success feedback

**Checkpoint**: PIN regeneration works within the Invite context. All drawer functionality complete.

---

## Phase 6: User Story 6 — Test Coverage (Priority: P1)

**Goal**: All unit and e2e tests updated — no stale references, new Invite drawer covered, full suite green.

**Independent Test**: Run `npx vitest run` (unit) and `npm run test:e2e` (e2e) — all pass.

### Unit Tests

- [X] T013 [P] [US6] Create `frontend/tests/unit/InviteQRCard.test.jsx` — test QR card renders with correct event URL, PIN displayed in spaced monospace, missing PIN shows placeholder
- [X] T014 [P] [US6] Create `frontend/tests/unit/inviteUtils.test.js` — test `formatInvitationMessage()` returns correct formatted string with event name, URL, and PIN
- [X] T015 [US6] Update `frontend/tests/unit/EventAdminPage.test.jsx` — remove tests referencing old PIN drawer, Share button, `linkCopied`, `handleCopyEventLink`. Add assertions: Invite SettingsRow renders with label "Invite", UserPlus icon, PIN badge

### E2E Tests

- [X] T016 [US6] Update `frontend/tests/e2e/specs/pin-access.spec.js` — change PIN drawer references to Invite drawer (open "Invite" row instead of "PIN" row, verify PIN is displayed in the QR card area). Update regeneration tests to use the new drawer context
- [X] T017 [US6] Scan all other e2e specs for references to the old PIN drawer or Share button text and update as needed (check `admin-guide.spec.js`, `welcome-bottom-sheet.spec.js`, `system.spec.js`)
- [X] T018 [US6] Run full test suite (`npx vitest run` from `frontend/` and `npm run test:e2e`) — verify all tests pass with zero failures

**Checkpoint**: Full test suite green. No stale references.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [X] T019 Remove any remaining dead code: unused imports, orphaned state variables, commented-out PIN/Share code across `frontend/src/pages/EventAdminPage.jsx`
- [X] T020 Verify edge cases: missing PIN fallback in Invite row badge and QR card, clipboard denial toast, share cancellation silence, long event name truncation in PNG
- [X] T021 Run linter (`ReadLints`) on all modified files and fix any errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **US1+US5 (Phase 2)**: Depends on Phase 1 (T002, T003 for InviteQRCard and inviteUtils)
- **US2 (Phase 3)**: Depends on Phase 2 (drawer must exist to add buttons)
- **US3 (Phase 4)**: Depends on Phase 2 (drawer must exist for T011 button). T010 utility can start after Phase 1, but full story requires Phase 2
- **US4 (Phase 5)**: Depends on Phase 2 (drawer must exist to add regeneration section)
- **US6 (Phase 6)**: Depends on Phases 2–5 (all features implemented before testing)
- **Polish (Phase 7)**: Depends on Phase 6

### User Story Dependencies

- **US1 + US5 (P1)**: Core MVP. Depends only on Setup.
- **US2 (P1)**: Depends on US1 drawer existing. Can be built immediately after.
- **US3 (P2)**: Can start after Setup — only needs `inviteUtils.js` and access to the drawer.
- **US4 (P2)**: Depends on US1 drawer existing. Can run in parallel with US2 and US3.
- **US6 (P1)**: Depends on all implementation stories being complete.

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- US3 T010 (utility) can start in parallel with US2 (T008–T009) — different files. T011 (button) requires drawer from Phase 2
- US4 (T012) can start in parallel with US2 and US3 — different section of same file, but logically independent
- T013, T014 can run in parallel (different test files)

---

## Parallel Example: Phase 1 Setup

```bash
# These can run in parallel (different files):
Task T002: "Create inviteUtils.js in frontend/src/utils/inviteUtils.js"
Task T003: "Create InviteQRCard.jsx in frontend/src/components/InviteQRCard.jsx"
```

## Parallel Example: Phase 6 Unit Tests

```bash
# These can run in parallel (different test files):
Task T013: "Create InviteQRCard.test.jsx in frontend/tests/unit/"
Task T014: "Create inviteUtils.test.js in frontend/tests/unit/"
```

---

## Implementation Strategy

### MVP First (Phases 1–2)

1. Complete Phase 1: Setup (install dep, create InviteQRCard + inviteUtils)
2. Complete Phase 2: US1+US5 (Invite drawer + cleanup)
3. **STOP and VALIDATE**: Open Settings → Invite drawer → QR + PIN visible, old UI gone
4. This alone delivers the core value

### Incremental Delivery

1. Setup → InviteQRCard + inviteUtils ready
2. Add US1+US5 → Invite drawer works, Settings cleaned up → **MVP!**
3. Add US2 → Copy/Share buttons functional → Digital sharing complete
4. Add US3 → Download QR → Physical sharing complete
5. Add US4 → Regenerate PIN in drawer → Full feature complete
6. Add US6 → Tests green → Ship-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US5 are combined in Phase 2 because they are tightly coupled (you must remove old UI to add the new Invite row)
- Commit after each phase for clean incremental history
- The `downloadQRImage()` function uses an offscreen canvas approach — it renders `QRCodeCanvas` to get image data, then composites with text on a larger canvas
