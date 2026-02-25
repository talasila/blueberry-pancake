# Quickstart: Redirect to Admin Page After Event Creation

**Feature**: Redirect to Admin Page After Event Creation (011-create-event-redirect)  
**Date**: 2026-02-24

## Overview

Replace the success modal in `CreateEventPage` with an immediate redirect to the event admin page, and show a toast notification with a next-step hint. This is a frontend-only change touching 3 files.

## Prerequisites

- Feature branch `011-create-event-redirect` checked out
- Frontend dev server running (`npm run dev:frontend`)
- Backend dev server running (`npm run dev:backend`)

## Implementation Checklist

### Frontend

- [ ] Modify `CreateEventPage.jsx`: add `useNavigate`, replace modal with redirect + toast
- [ ] Modify `EventAdminPage.jsx`: read navigation state to trigger toast on first load
- [ ] Update E2E tests in `create-event.spec.js` to assert redirect instead of modal

## Key Changes

### 1. CreateEventPage.jsx — Replace Modal with Redirect

**File**: `frontend/src/pages/CreateEventPage.jsx`

**Add imports**:
```javascript
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
```

**Add hook**:
```javascript
const navigate = useNavigate();
```

**Replace success handling** (inside `handleSubmit`, after `await apiClient.createEvent(...)`):
```javascript
const event = await apiClient.createEvent({
  name: trimmedName,
  typeOfItem
});

// Redirect to admin page with creation flag for toast
navigate(`/event/${event.eventId}/admin`, {
  replace: true,
  state: { eventCreated: true }
});
```

**Remove**:
- `successEvent` state (`useState(null)`)
- `handleCloseSuccess` function
- Entire success modal JSX block (`{successEvent && (...)}`)
- Form reset lines (`setName('')`, `setTypeOfItem('wine')`) — no longer needed since we navigate away

### 2. EventAdminPage.jsx — Show Toast on Creation Redirect

**File**: `frontend/src/pages/EventAdminPage.jsx`

**Add import**:
```javascript
import { useParams, useNavigate, useLocation } from 'react-router-dom';
```

**Add hook** (near other hooks at top of component):
```javascript
const location = useLocation();
```

**Add effect** (after the existing auth check effect):
```javascript
useEffect(() => {
  if (location.state?.eventCreated) {
    toast.success('Event created! Share the PIN with participants to get started');
    // Clear the state so toast doesn't re-fire on refresh/back-forward
    window.history.replaceState({}, document.title);
  }
}, [location.state]);
```

### 3. E2E Tests — Update for Redirect Behavior

**File**: `frontend/tests/e2e/specs/create-event.spec.js`

Tests that currently assert the success modal must be updated to assert:
- URL changes to `/event/{eventId}/admin` after creation
- Toast notification is visible (text: "Event created")
- No modal overlay is present
- Admin page content is loaded (event name, PIN section visible)

**Key test changes**:

For `'newly created event has "created" state'` test:
```javascript
// OLD: Wait for success popup
// const successPopup = page.getByText(/event created successfully/i);
// await expect(successPopup).toBeVisible({ timeout: 10000 });

// NEW: Wait for redirect to admin page
await page.waitForURL(/\/event\/[A-Za-z0-9]{8}\/admin/, { timeout: 10000 });

// Verify toast notification
const toast = page.getByText(/event created/i);
await expect(toast).toBeVisible({ timeout: 5000 });
```

For `'prevents duplicate event creation on rapid clicks'` test:
```javascript
// OLD: Wait for success popup
// NEW: Wait for single redirect to admin page
await page.waitForURL(/\/event\/[A-Za-z0-9]{8}\/admin/, { timeout: 10000 });
```

For `'handles special characters in event name'` test:
```javascript
// OLD: Check no success popup visible
// NEW: Check URL is still /create-event (no redirect)
await expect(page).toHaveURL(/\/create-event/);
```

## Data Flow (updated)

1. **User fills form** → Name and type of item
2. **Form submission** → Client-side validation → API call
3. **API response** → Event created with `eventId`
4. **Redirect** → `navigate('/event/{eventId}/admin', { replace: true, state: { eventCreated: true } })`
5. **Admin page loads** → Reads `location.state.eventCreated`, shows toast
6. **Toast auto-dismisses** → User interacts with admin controls

## Testing Strategy

### E2E Tests (Playwright)

- **Redirect on success**: Create event → verify URL is `/event/{eventId}/admin`
- **Toast visible**: Verify toast text "Event created" appears
- **No modal**: Verify no overlay/modal is rendered
- **Error stays on page**: Submit invalid form → verify URL is still `/create-event`
- **Back button**: After redirect, back → verify URL is not `/create-event`
- **Rapid clicks**: Multiple clicks → single redirect to admin page

### Manual Smoke Test

1. Go to `http://localhost:3000`
2. Click "Create" → authenticate via OTP (email: any, OTP: 123456)
3. Enter event name, click "Create Event"
4. Verify: redirected to admin page, toast visible, PIN section shows
5. Click browser back → verify you're on landing page (not create form)

## Common Issues

### Toast Not Appearing

**Cause**: Navigation state not passed or consumed too early.
**Fix**: Ensure `useEffect` reads `location.state?.eventCreated` and `window.history.replaceState` is called after showing toast.

### Back Button Returns to Create Form

**Cause**: `replace: true` not passed to `navigate()`.
**Fix**: Verify the navigate call includes `{ replace: true }`.

### Admin Page Redirects to Auth

**Cause**: JWT doesn't contain the new event yet.
**Fix**: The backend adds the event to the JWT cookie in the create API response. Verify the cookie is set before the redirect fires (it should be, since `apiClient.createEvent()` awaits the response which includes the `Set-Cookie` header).

## References

- [Specification](./spec.md)
- [Research](./research.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/README.md)
