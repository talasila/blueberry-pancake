# Implementation Plan: Unified Invite Drawer

**Branch**: `032-invite-drawer` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-invite-drawer/spec.md`

## Summary

Consolidate the floating "Share" button and PIN SettingsRow/drawer into a single "Invite" SettingsRow and side drawer. The drawer features a hero QR code card (client-side generated via `qrcode.react`), a formatted invitation copy/share flow, a downloadable QR PNG, and PIN regeneration. No backend changes required — entirely frontend.

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 19, JSX  
**Primary Dependencies**: React 19, Vite 6, Tailwind CSS 4, Radix UI, lucide-react, sonner (toasts), qrcode.react (new)  
**Storage**: N/A (no data model changes)  
**Testing**: Vitest + @testing-library/react (unit), Playwright (e2e)  
**Target Platform**: Web (desktop + mobile browsers)  
**Project Type**: Web application (frontend only for this feature)  
**Performance Goals**: QR code renders instantly (client-side SVG/canvas), no perceptible delay  
**Constraints**: QR must be scannable at ~200×200px on screen; PNG download works on all modern browsers  
**Scale/Scope**: Single page change (EventAdminPage.jsx), 1 new dependency, ~5 test files impacted

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New component follows existing patterns (SideDrawer, SettingsRow) |
| II. DRY | PASS | Reuses SideDrawer, SettingsRow, Badge, Button, toast. QR generation via battle-tested package |
| III. Maintainability | PASS | Dead code removed (Share button, PIN drawer, unused state/handlers). Clear separation |
| IV. Testing Standards | PASS | Unit + e2e tests updated. Stale tests removed |
| V. Security | PASS | PIN displayed to admins only (existing auth). No new attack surface |
| VI. UX Consistency | PASS | Uses existing SideDrawer, SettingsRow, Button, Badge, toast patterns |
| VII. Performance | PASS | qrcode.react is ~5KB gzipped, renders SVG client-side. No API calls added |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/032-invite-drawer/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no data changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (empty — no API changes)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   └── EventAdminPage.jsx       # MODIFY: Remove Share button, PIN row/drawer; add Invite row/drawer
│   ├── components/
│   │   ├── SideDrawer.jsx            # REUSE: Existing drawer component
│   │   ├── SettingsRow.jsx           # REUSE: Existing row component
│   │   └── InviteQRCard.jsx          # NEW: QR code + PIN display card (extracted for testability)
│   └── utils/
│       └── inviteUtils.js            # NEW: formatInvitationMessage(), downloadQRImage() helpers
├── tests/
│   ├── unit/
│   │   ├── EventAdminPage.test.jsx   # MODIFY: Remove PIN/Share tests, add Invite row tests
│   │   ├── InviteQRCard.test.jsx     # NEW: QR card rendering, PIN display
│   │   └── inviteUtils.test.js       # NEW: formatInvitationMessage, downloadQRImage tests
│   └── e2e/
│       └── specs/
│           ├── pin-access.spec.js    # MODIFY: Update PIN drawer references to Invite drawer
│           └── welcome-bottom-sheet.spec.js  # ALREADY FIXED: Uses 'Mood' instead of 'Settings'
```

**Structure Decision**: Frontend-only change. New component `InviteQRCard` extracted from drawer content for testability and reuse. Utility functions extracted to `inviteUtils.js` for the formatted message and canvas-based PNG download logic.

## Constitution Check — Post-Design

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | InviteQRCard is a focused, single-responsibility component. inviteUtils.js keeps logic testable and separate from UI |
| II. DRY | PASS | `formatInvitationMessage()` used by both Copy and Share actions. `QRCodeCanvas` reused for both display ref and PNG export |
| III. Maintainability | PASS | 2 new files, clear purpose. Old PIN/Share code fully removed — no dead code |
| IV. Testing Standards | PASS | InviteQRCard gets dedicated unit tests. EventAdminPage tests updated. E2E covers drawer flow |
| V. Security | PASS | QR encodes event URL only (not PIN). PIN visible to admins only. No new data exposure |
| VI. UX Consistency | PASS | SideDrawer, SettingsRow, Button, Badge, toast — all existing patterns. QR card uses project's Tailwind tokens |
| VII. Performance | PASS | qrcode.react renders SVG synchronously. PNG export is on-demand (user-triggered). No impact on page load |

All gates pass post-design. No complexity violations.

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Spec | `specs/032-invite-drawer/spec.md` | Complete |
| Plan | `specs/032-invite-drawer/plan.md` | Complete |
| Research | `specs/032-invite-drawer/research.md` | Complete |
| Data Model | `specs/032-invite-drawer/data-model.md` | Complete (no changes needed) |
| Quickstart | `specs/032-invite-drawer/quickstart.md` | Complete |
| Contracts | `specs/032-invite-drawer/contracts/` | Empty (no API changes) |
| Agent Context | `.cursor/rules/specify-rules.mdc` | Updated |
