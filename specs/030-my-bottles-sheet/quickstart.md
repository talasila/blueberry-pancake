# Quickstart: My Bottles Bottom Sheet

**Feature**: 030-my-bottles-sheet  
**Date**: 2026-03-13

## Prerequisites

- Node.js 18+
- Frontend dev server running (`npm run dev` from `frontend/`)
- Backend API running (see root README)

## Development Workflow

### 1. Start the dev server

```bash
cd frontend
npm run dev
```

### 2. Create a test event

Use the app UI or API to create an event. Note the event ID and PIN.

### 3. Test the feature

1. **As a guest**: Log in with the event PIN and an email. The guest welcome sheet should appear during `created`/`started` states.
2. **From hamburger menu**: Open the menu → tap "My Bottles" → the bottom sheet opens.
3. **From welcome sheet**: Tap "Register My Bottle" → the welcome sheet closes, "My Bottles" sheet opens.
4. **From inline prompt** (created state only): Tap the registration link → the sheet opens.
5. **Add a bottle**: Fill in name (required), optionally price and description → tap Add.
6. **Edit a bottle**: Tap the edit icon on a bottle card → modify fields → save.
7. **Delete a bottle**: Tap the delete icon → bottle disappears, undo toast appears → let it expire or tap Undo.
8. **Edit name**: Change the name field → tap outside (blur) → toast confirms "Name updated".
9. **Read-only mode**: Pause the event → open the sheet → verify no add/edit/delete buttons, "Registration is closed" message shown.
10. **Completed state**: Complete the event → open the sheet → verify assigned item numbers are shown on bottles, "The event has ended" message shown.

### 4. Run unit tests

```bash
cd frontend
npx vitest run tests/unit/MyBottlesSheet.test.jsx
npx vitest run tests/unit/ItemForm.test.jsx
npx vitest run tests/unit/GuestWelcomeBottomSheet.test.jsx
```

### 5. Run e2e tests

```bash
cd frontend
npx playwright test tests/e2e/specs/guest-registration-nudge.spec.js
npx playwright test tests/e2e/specs/item-assignment.spec.js
npx playwright test tests/e2e/specs/my-bottles-sheet.spec.js
```

### 6. Run full test suite

```bash
cd frontend
npx vitest run
npx playwright test
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/MyBottlesSheet.jsx` | Main bottom sheet component |
| `src/components/ItemForm.jsx` | Shared add/edit form |
| `src/utils/itemFormValidation.js` | Validation logic |
| `src/pages/EventPage.jsx` | Sheet state owner, entry point wiring |
| `src/components/Header.jsx` | "My Bottles" menu item |
| `src/components/GuestWelcomeBottomSheet.jsx` | Contextual CTA text |

## Verification Checklist

- [ ] `/event/:eventId/profile` returns 404 or redirects (Profile page deleted)
- [ ] No "Profile" text in hamburger menu
- [ ] "My Bottles" opens from all three entry points
- [ ] Bottles display using ListCard component
- [ ] Add/edit/delete work during `created`/`started`
- [ ] Sheet is read-only during `paused`/`completed`
- [ ] Assigned item number shows during `completed`
- [ ] Name auto-saves on blur with toast
- [ ] Delete uses undo toast (no `window.confirm`)
- [ ] Dynamic terminology adapts to event type
- [ ] All unit tests pass
- [ ] All e2e tests pass
- [ ] No codebase references to ProfilePage or `/profile` route
