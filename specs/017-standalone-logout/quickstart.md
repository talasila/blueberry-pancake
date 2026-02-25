# Quickstart: Standalone Page Logout Icon

**Branch**: `017-standalone-logout` | **Date**: 2026-02-25

## Prerequisites

- Node.js installed
- Frontend dev server runnable (`npm run dev` from `frontend/`)

## Verification Steps

### 1. Start the development server

```bash
cd frontend
npm run dev
```

### 2. Verify standalone page logout icon

1. Navigate to the landing page (`/`)
2. Authenticate via OTP (click "Create Event" or "My Events" → enter email → verify OTP)
3. Navigate to `/my-events`
4. **Verify**: A logout icon (not a hamburger menu) appears in the header
5. Click the logout icon
6. **Verify**: You are redirected to the landing page (`/`) and the session is cleared

### 3. Verify Create Event page

1. Re-authenticate via OTP
2. Navigate to `/create-event`
3. **Verify**: A logout icon (not a hamburger menu) appears in the header
4. Click the logout icon
5. **Verify**: You are redirected to the landing page (`/`)

### 4. Verify event pages are unaffected

1. Re-authenticate and navigate to any event page (`/event/:eventId`)
2. **Verify**: The hamburger menu still appears with all standard items (My Events, Profile, Dashboard, Settings, Logout — conditional on role/state)
3. Open the menu and verify all items navigate correctly

### 5. Verify system routes are unaffected

1. Navigate to `/system/login` and authenticate as root
2. Navigate to any system route (e.g., `/system/events`)
3. **Verify**: The standalone logout icon appears (no hamburger menu)
4. Click the logout icon
5. **Verify**: You are redirected to `/system/login` (not `/`)

## Running E2E Tests

```bash
cd frontend
npx playwright test tests/e2e/specs/my-events.spec.js
```
