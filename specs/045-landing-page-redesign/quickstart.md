# Quickstart: Landing Page Redesign

**Branch**: `045-landing-page-redesign`

## Prerequisites

- Node.js >= 22.12.0
- npm (workspaces enabled)
- Docker (for DynamoDB Local, needed for E2E tests only)

## Setup

```bash
git checkout 045-landing-page-redesign
npm install
```

## Development

```bash
# Start frontend dev server
npm run dev --workspace=frontend

# Visit landing page
open http://localhost:5173
```

## Testing

```bash
# Unit tests (Vitest)
npm test --workspace=frontend -- --run frontend/tests/unit/LandingPage.test.jsx

# All unit tests
npm test

# E2E tests (Playwright) — requires backend + DynamoDB Local running
docker compose up -d          # Start DynamoDB Local
npm run dev --workspace=backend &  # Start backend
npx playwright test frontend/tests/e2e/specs/landing-page.spec.js
```

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/pages/LandingPage.jsx` | Rewrite | New layout with hero, steps, CTAs |
| `frontend/tests/unit/LandingPage.test.jsx` | Rewrite | Unit tests matching new UI |
| `frontend/tests/e2e/specs/landing-page.spec.js` | Rewrite | E2E tests matching new UI |

## Verification Checklist

- [ ] Landing page shows headline, subtitle, three-step strip
- [ ] Warm gradient visible in light mode (rose/peach)
- [ ] Dark mode shows burgundy gradient variant
- [ ] "Host a Tasting" button has warm accent color
- [ ] "Host a Tasting" navigates to auth (logged out) or create-event (logged in)
- [ ] "My Events" navigates to auth (logged out) or my-events (logged in)
- [ ] "Have an event code?" reveals inline input on click
- [ ] Event code input auto-focuses and submits correctly
- [ ] Success message from navigation state still displays
- [ ] Mobile viewport (375px) shows all hero content above fold
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Lint passes
