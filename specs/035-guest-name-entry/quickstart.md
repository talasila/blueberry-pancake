# Quickstart: Collect Guest Name at Event Entry

**Feature**: 035-guest-name-entry
**Date**: 2026-03-19

## What This Feature Does

Adds a mandatory name field to the event entry page. Every guest and admin now provides their name alongside their email when accessing an event. The name is stored server-side and displayed throughout the app. Returning users on the same device get both fields pre-filled from localStorage.

## Files to Modify

### Frontend (6 files)

| File | Change |
|------|--------|
| `frontend/src/pages/EmailEntryPage.jsx` | Add name field, validation, localStorage read/write, sessionStorage write |
| `frontend/src/pages/PINEntryPage.jsx` | Read name from sessionStorage, pass to `verifyPIN` |
| `frontend/src/pages/EventOTPEntryPage.jsx` | Read name from sessionStorage, pass to `verifyOTP` |
| `frontend/src/services/apiClient.js` | Add `name` param to `verifyPIN`; add `name` + `eventId` params to `verifyOTP` |
| `frontend/tests/unit/EmailEntryPage.test.jsx` | New test file for name field behavior |
| `frontend/tests/unit/PINEntryPage.test.jsx` | Update to verify name is passed to API |

### Backend (5 files)

| File | Change |
|------|--------|
| `backend/src/api/events.js` | Extract `name` from verify-pin body, pass to `registerUser`, call `updateUserName` for returning users |
| `backend/src/api/auth.js` | Extract `name` + `eventId` from verify-otp body, call `updateUserName` after success |
| `backend/src/services/EventMemberService.js` | Add optional `name` param to `registerUser`, pass to `registerUserAtomic` |
| `backend/src/data/DataRepository.js` | Add optional `name` param to `registerUserAtomic` signature |
| `backend/src/data/DynamoDBRepository.js` | Include `name` in atomic registration `:userData` |

### Backend tests (2 files)

| File | Change |
|------|--------|
| `backend/tests/integration/api.test.js` | Add tests for verify-pin with name |
| `backend/tests/integration/auth.test.js` | Add tests for verify-otp with name + eventId |

## Implementation Order

1. **Backend data layer**: `DataRepository.js` → `DynamoDBRepository.js` (add name to atomic registration)
2. **Backend service**: `EventMemberService.js` (pass name through)
3. **Backend PIN endpoint**: `events.js` (accept name, save for new + returning users)
4. **Backend OTP endpoint**: `auth.js` (accept name + eventId, save via updateUserName)
5. **Frontend API client**: `apiClient.js` (add name params)
6. **Frontend EmailEntryPage**: Add name field, validation, localStorage, sessionStorage
7. **Frontend PINEntryPage**: Read name, pass to API
8. **Frontend EventOTPEntryPage**: Read name + eventId, pass to API
9. **Tests**: All test files

## How to Test Manually

1. Start dev server: `npm run dev`
2. Open event URL in browser
3. **New guest**: Enter name + email → PIN → verify name appears in ratings table
4. **Returning guest**: Close browser, reopen → verify pre-fill → change name → verify update
5. **Admin**: Enter name + email → OTP → verify name stored
6. **Private browsing**: Open in incognito → verify form works without pre-fill
