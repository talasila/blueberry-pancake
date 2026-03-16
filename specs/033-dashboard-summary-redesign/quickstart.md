# Quickstart: Dashboard Summary Redesign

## Prerequisites

- Node.js (see `.nvmrc`)
- Frontend dev server: `cd frontend && npm run dev`
- Backend dev server: `cd backend && npm run dev`

## Development Workflow

### 1. Start the app

```bash
cd frontend && npm run dev
cd backend && npm run dev    # in a separate terminal
```

### 2. Create a test event with data

To see the full Summary tab in action, you need an event with:
- At least 2 users with ratings (for personality detection)
- At least 3 ratings per item (for Most Divisive to appear)
- Multiple items configured

Use the admin guide flow or the e2e test helpers to set up a populated event.

### 3. Navigate to Dashboard

As an admin: visit `/event/{eventId}/dashboard` — accessible in any event state.
As a regular user: only accessible when the event is in `completed` state.

### 4. Files to modify

| File | Change |
|------|--------|
| `frontend/src/pages/DashboardPage.jsx` | Rewrite Summary tab layout |
| `frontend/src/components/StatisticsCard.jsx` | Add `accentColor` prop |
| `frontend/src/components/PersonalitySummaryStrip.jsx` | New component |
| `frontend/tests/e2e/specs/dashboard.spec.js` | Update summary stat assertions |
| `frontend/tests/unit/DashboardPage.test.jsx` | Expand for new features |

### 5. Run tests

```bash
# Unit tests
cd frontend && npx vitest run tests/unit/DashboardPage.test.jsx

# E2e tests (dashboard only)
cd frontend && npx playwright test tests/e2e/specs/dashboard.spec.js

# StatisticsCard unit tests (if they exist)
cd frontend && npx vitest run tests/unit/StatisticsCard.test.jsx
```

### 6. Key decisions

- **No backend changes** — all data already available in `getDashboardData()` response
- **Color palette** — uses `--chart-1` through `--chart-5` CSS variables for stat card accents
- **Hero card** — light tint of `--primary` for background
- **Progress bar** — single `--primary` color, no dynamic transitions
- **Personality strip** — Tailwind color classes per personality ID
- **StatisticsCard** — enhanced with optional `accentColor` prop, fully backward-compatible
