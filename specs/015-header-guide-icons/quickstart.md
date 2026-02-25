# Quickstart: Header Guide Icons

**Feature**: `015-header-guide-icons`  
**Date**: 2026-02-25

## Prerequisites

- Node.js (see `.nvmrc`)
- Frontend dev server: `cd frontend && npm run dev`
- Backend dev server (for admin guide E2E tests): `cd backend && npm run dev`

## Development

### Running locally

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`. The guide icon should appear in the header:
- **Landing page**: HelpCircle icon (hosting guide) at right edge
- **Event page**: HelpCircle icon between event name and hamburger menu
- **Admin page**: BookOpen icon (admin guide) in the same header position
- **System page**: No guide icon

### Key files to modify

| File | Purpose |
|------|---------|
| `frontend/src/components/Header.jsx` | Add guide icon button rendering |
| `frontend/src/App.jsx` | Lift admin guide state, compute variant, wire toggle |
| `frontend/src/pages/EventAdminPage.jsx` | Remove admin guide FAB and local state |
| `frontend/src/components/guide/GuideButton.jsx` | Delete (dead code) |

### Testing

```bash
# Unit tests
cd frontend && npx vitest run

# E2E tests (requires both frontend and backend running)
cd frontend && npx playwright test tests/e2e/specs/hosting-guide.spec.js
cd frontend && npx playwright test tests/e2e/specs/admin-guide.spec.js
```

### Validation checklist

1. Open landing page at 320px width — HelpCircle icon visible in header, no FAB anywhere
2. Tap icon — hosting guide drawer opens; tap icon again — drawer closes (toggle)
3. Navigate to admin page — icon switches to BookOpen
4. Tap BookOpen — admin guide opens with state-aware content
5. Navigate to `/system` — no guide icon visible
6. Scroll any page to bottom — no floating elements obscure content
