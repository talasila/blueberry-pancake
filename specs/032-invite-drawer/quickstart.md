# Quickstart: Unified Invite Drawer

**Branch**: `032-invite-drawer` | **Date**: 2026-03-13

## Prerequisites

- Node.js (already configured in project)
- Frontend dev server running (`npm run dev` from `frontend/`)

## Setup

1. Install the new dependency:

```bash
cd frontend
npm install qrcode.react
```

2. Start the dev server:

```bash
npm run dev
```

3. Navigate to any event's Settings page as an admin to see the Invite drawer.

## New Files

| File | Purpose |
|------|---------|
| `frontend/src/components/InviteQRCard.jsx` | QR code + PIN display card component |
| `frontend/src/utils/inviteUtils.js` | `formatInvitationMessage()` and `downloadQRImage()` helpers |
| `frontend/tests/unit/InviteQRCard.test.jsx` | Unit tests for QR card |

## Modified Files

| File | Change |
|------|--------|
| `frontend/src/pages/EventAdminPage.jsx` | Remove Share button, PIN row/drawer. Add Invite row and drawer. |
| `frontend/tests/unit/EventAdminPage.test.jsx` | Remove PIN/Share tests, add Invite row assertions |
| `frontend/tests/e2e/specs/pin-access.spec.js` | Update PIN drawer references to Invite drawer |

## Running Tests

```bash
# Unit tests
cd frontend
npx vitest run tests/unit/EventAdminPage.test.jsx
npx vitest run tests/unit/InviteQRCard.test.jsx

# E2E tests
npm run test:e2e
```

## Key Design Decisions

- **QR encodes event URL only** (not PIN) — guests still need to enter email on join screen
- **`QRCodeSVG`** for in-drawer display (crisp), **`QRCodeCanvas`** offscreen for PNG export
- **`navigator.share()`** conditionally shown on supporting devices; "Copy Invitation" is the universal fallback
- **PIN regeneration** only affects new logins, not currently logged-in guests
