# Quickstart: Privacy Policy Page

**Feature Branch**: `044-privacy-policy-page`
**Date**: 2026-03-24

## What This Feature Does

Adds a `/privacy` page displaying the app's privacy policy and links to it from the guest email entry page and host authentication page.

## Files to Create

1. `frontend/src/pages/PrivacyPolicyPage.jsx` — New page component rendering the privacy policy text in a Card layout.

## Files to Modify

1. `frontend/src/App.jsx` — Add `<Route path="/privacy" element={<PrivacyPolicyPage />} />` as a public route.
2. `frontend/src/pages/EmailEntryPage.jsx` — Add a privacy policy link below the Card.
3. `frontend/src/pages/AuthPage.jsx` — Add a privacy policy link below the Card.

## How to Verify

1. Start the dev server: `npm run dev` (from frontend directory)
2. Navigate to `http://localhost:5173/privacy` — should display the full privacy policy, no login required.
3. Navigate to any event email entry page — should show a privacy policy link below the form.
4. Navigate to `/auth` — should show a privacy policy link below the form.
5. Click any privacy link — should navigate to `/privacy`.
6. Click the Resend privacy policy link — should open in a new tab.
7. Use browser back button after visiting `/privacy` from a form page — form data should be preserved.

## No Backend Changes

This is entirely a frontend feature. No API endpoints, database changes, or server-side code is affected.
