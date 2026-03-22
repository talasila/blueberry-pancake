# Quickstart: Email Privacy — Opaque User Identity for Guests

**Feature**: 041-email-privacy-opaque-id
**Date**: 2026-03-22

## What This Feature Does

Removes email addresses from all non-admin API responses and frontend display. Guests are identified by an opaque, event-scoped `userId` and their display name. Admins retain email visibility on the admin page and in data exports. Guest session tokens no longer contain email. Existing events are handled transparently via lazy backfill.

## Key Files to Modify

### Backend — Identity Generation
- `backend/src/utils/userIdUtils.js` — NEW: nanoid wrapper for generating `u_` prefixed user IDs
- `backend/src/services/EventMemberService.js` — Generate userId on registration, lazy backfill existing users
- `backend/src/services/EventConfigService.js` — Enforce mandatory name, lazy backfill name from email prefix

### Backend — JWT & Auth
- `backend/src/middleware/jwtAuth.js` — Role-dependent JWT payloads (guest: userId, admin: email), backward compat for old tokens
- `backend/src/api/events.js` — Verify-PIN response returns userId+name (no email), generate userId at registration
- `backend/src/api/auth.js` — OTP flow generates userId for admin's event-scoped identity

### Backend — API Response Sanitization
- `backend/src/services/DashboardService.js` — Return userId+name in userSummaries, no email
- `backend/src/api/similarUsers.js` — Return userId+name, not email
- `backend/src/api/ratings.js` — Add `?mine=true` support, admin-gated email in CSV, non-admin gets userId
- `backend/src/api/dashboard.js` — Pass isAdmin flag to DashboardService

### Frontend — Session & Identity
- `frontend/src/services/apiClient.js` — Store userId+name from verify-PIN, getUserId() method
- `frontend/src/services/ratingService.js` — Parse userId from CSV, support ?mine=true

### Frontend — Components
- `frontend/src/pages/EventPage.jsx` — Identify current user by userId
- `frontend/src/pages/DashboardPage.jsx` — Pass userId to drawers
- `frontend/src/components/UserRatingsTable.jsx` — Key by userId, display name, remove trimEmail()
- `frontend/src/components/UserDetailsDrawer.jsx` — Accept userId, use ?mine=true for current user
- `frontend/src/components/SimilarUsersDrawer.jsx` — Use userId for keys, name for display

### Tests
- `backend/tests/unit/userIdUtils.test.js` — NEW: userId generation tests
- `backend/tests/unit/EventMemberService.test.js` — Test userId in registration
- `backend/tests/unit/DashboardService.test.js` — Test userId in summaries, no email
- `frontend/tests/e2e/specs/email-privacy.spec.js` — NEW: E2E tests for email sanitization

## Implementation Order

1. Backend: Create userId utility, add userId generation to registration
2. Backend: Modify JWT to be role-dependent, add backward compatibility
3. Backend: Enforce mandatory name, add lazy backfill
4. Backend: Sanitize dashboard, similar users, and ratings API responses
5. Frontend: Update session management (userId instead of email)
6. Frontend: Update components to use userId and name
7. Tests: Unit and E2E for privacy guarantees

## How to Verify

1. Create a wine event, register two guests with names
2. Start the event, have both guests rate items
3. As Guest A, open the dashboard — confirm Guest B appears by name only, no email in network responses
4. As Guest A, open Similar Users — confirm no emails in the response
5. As Guest A, open My Progress — confirm only your ratings in the response, no other user data
6. As an admin, navigate to the admin page people section — confirm emails are visible
7. As an admin, download the ratings CSV — confirm emails are present
8. As Guest A, inspect the network response for any API call — confirm zero email addresses in any response
9. Create a second event, register as the same guest — confirm a different userId is generated (event-scoped)
10. Access an old event with a pre-existing user — confirm it works transparently with lazy backfill
