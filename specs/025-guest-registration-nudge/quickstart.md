# Quickstart: Guest Item Registration Nudge

**Branch**: `025-guest-registration-nudge`

## Prerequisites

- Node.js >=22.12.0
- Frontend dev server: `cd frontend && npm run dev`

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/GuestWelcomeBottomSheet.jsx` | Welcome bottom sheet component |
| `frontend/tests/unit/components/GuestWelcomeBottomSheet.test.jsx` | Unit tests for the bottom sheet |
| `frontend/tests/e2e/specs/guest-registration-nudge.spec.js` | E2E tests for both features |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/pages/PINEntryPage.jsx` | Add `state: { guestJustLoggedIn: true }` to post-verification navigate call |
| `frontend/src/pages/EventPage.jsx` | Import and render `GuestWelcomeBottomSheet`; add inline prompt in `created` state block; add `useLocation` import |

## Development Flow

1. **Create `GuestWelcomeBottomSheet.jsx`** — adapt animation/overlay pattern from `WelcomeBottomSheet.jsx`, add guest-specific content (five bullet points, register button, skip link)
2. **Modify `PINEntryPage.jsx`** — one-line change to pass location state on navigate
3. **Modify `EventPage.jsx`** — wire up the bottom sheet (state, render, dismiss handler) and add the inline prompt in the `created` state block
4. **Write unit tests** — test rendering, dismiss behavior, admin suppression, state-driven visibility
5. **Write E2E tests** — test full PIN login → bottom sheet flow, inline prompt visibility across event states

## Verification

```bash
# Unit tests
cd frontend && npx vitest run tests/unit/components/GuestWelcomeBottomSheet.test.jsx

# E2E tests
cd frontend && npx playwright test tests/e2e/specs/guest-registration-nudge.spec.js

# Manual test
# 1. Start frontend dev server
# 2. Create an event, get PIN
# 3. Open event URL in incognito, enter PIN
# 4. Verify bottom sheet appears
# 5. Dismiss, refresh — verify it doesn't reappear
# 6. With event in "created" state, verify inline prompt below "Event has not started yet"
```
