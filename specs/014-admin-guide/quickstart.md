# Quickstart: Admin Guide

**Feature**: 014-admin-guide  
**Date**: 2026-02-25

## Prerequisites

- Node.js >=22.12.0
- Existing development environment set up (`npm install` in `frontend/`)
- Familiarity with the existing hosting guide implementation (feature 013)

## Development Setup

```bash
cd frontend
npm run dev
```

Navigate to any event admin page (`/event/:eventId/admin`) to see the admin guide FAB. The hosting guide FAB should be hidden on this route.

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/data/adminGuideContent.js` | Static guide content keyed by event state |
| `frontend/src/components/guide/AdminGuideDrawer.jsx` | Bottom sheet drawer with state-aware content |
| `frontend/src/pages/EventAdminPage.jsx` | Integration point — renders FAB + drawer |
| `frontend/src/App.jsx` | Modified — hides hosting guide FAB on admin routes |

## Architecture Overview

```
EventAdminPage
├── AdminGuideButton (FAB, bottom-right)
│   └── onClick → opens AdminGuideDrawer
└── AdminGuideDrawer (bottom sheet)
    ├── reads event.state from EventContext
    ├── selects adminGuideContent[state]
    ├── GuideStepCard (reused from hosting guide)
    ├── GuideProgress (reused from hosting guide)
    ├── GuideNavigation (reused from hosting guide)
    └── Informational CTA on final step
```

## Content Editing

To update guide text, edit `frontend/src/data/adminGuideContent.js`. Each state key (`created`, `started`, `paused`, `completed`) contains an array of step objects:

```javascript
{
  id: 'created-1',       // Unique ID (state-index format)
  heading: 'Name Your Event',
  description: 'Give your event a name guests will recognize.',
  icon: 'Edit3',         // Must be a valid lucide-react icon export name
}
```

After editing, run unit tests to validate content integrity:

```bash
cd frontend
npx vitest run tests/unit/adminGuideContent.test.js
```

## Testing

```bash
# Unit tests (content data integrity)
cd frontend
npx vitest run tests/unit/adminGuideContent.test.js

# E2E tests (all user stories)
cd frontend
npx playwright test tests/e2e/specs/admin-guide.spec.js
```

## Design Decisions

See [research.md](./research.md) for detailed rationale on:
- Component reuse strategy (which hosting guide components are reused)
- FAB coexistence (how hosting/admin guide FABs are swapped)
- Drawer architecture (why a new drawer vs extending the existing one)
- CTA behavior (informational only, no state transitions)
