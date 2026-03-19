# Quickstart: Themed Event Entry Pages

**Feature**: 036-themed-entry-pages
**Date**: 2026-03-19

## What This Feature Does

Makes event entry pages (email, PIN, OTP) display the event's name, apply the host's chosen theme colors, and show contextual copy (e.g., "join the wine tasting"). Also updates the AuthPage to use friendly, jargon-free language.

## Files to Modify

### Backend (1 file + 1 test)

| File | Change |
|------|--------|
| `backend/src/api/events.js` | Add `GET /:eventId/public-info` endpoint returning `{ name, typeOfItem, theme, state }` with rate limiting |
| `backend/tests/integration/api.test.js` | Add tests for public-info endpoint (success, 404, rate limiting) |

### Frontend (7 files + 3 tests)

| File | Change |
|------|--------|
| `frontend/src/services/apiClient.js` | Add `getEventPublicInfo(eventId)` method |
| `frontend/src/hooks/useEventPublicInfo.js` | New shared hook: fetches public info, returns `{ name, typeOfItem, theme, state, loading, error }` |
| `frontend/src/pages/EmailEntryPage.jsx` | Use hook, display event name in title, apply theme CSS vars, show contextual copy, handle not-found/ended |
| `frontend/src/pages/PINEntryPage.jsx` | Use hook, display event name, apply theme CSS vars |
| `frontend/src/pages/EventOTPEntryPage.jsx` | Use hook, display event name, apply theme CSS vars |
| `frontend/src/pages/AuthPage.jsx` | Update title, description, button text, add visible email label |
| `frontend/tests/unit/useEventPublicInfo.test.js` | New test file for hook behavior |
| `frontend/tests/unit/EmailEntryPage.test.jsx` | Update tests for themed rendering |
| `frontend/tests/unit/AuthPage.test.jsx` | New test file for updated copy |

## Implementation Order

1. **Backend endpoint**: `events.js` — add public-info route
2. **Frontend API client**: `apiClient.js` — add getEventPublicInfo method
3. **Shared hook**: `useEventPublicInfo.js` — fetch + state management
4. **EmailEntryPage**: Use hook, themed rendering, contextual copy
5. **PINEntryPage**: Use hook, themed rendering
6. **EventOTPEntryPage**: Use hook, themed rendering
7. **AuthPage**: Copy updates (independent of theming)
8. **Tests**: All test files

## How to Test Manually

1. Start dev server: `npm run dev`
2. Create events with different themes (cellar, ocean, rose, etc.)
3. **Themed email page**: Navigate to `/event/{eventId}/email` — verify event name, theme colors, and contextual description
4. **Themed PIN page**: Submit email form → verify PIN page has same theme and event name
5. **Themed OTP page**: Submit admin email → verify OTP page has same theme and event name
6. **Classic theme**: Test with default "classic" theme — should look identical to pre-feature behavior
7. **Dark mode**: Toggle dark mode — verify themed pages use dark palette
8. **Invalid event**: Navigate to `/event/BADID123/email` — verify "Event not found" message
9. **Completed event**: Set an event to completed state → verify "ended" banner on entry page
10. **Auth page**: Navigate to `/auth` — verify "Welcome back" title, "Send verification code" button, visible email label, no "OTP" text
