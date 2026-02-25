# Quickstart: Hosting Guide

**Feature**: 013-hosting-guide  
**Date**: 2026-02-25

## Prerequisites

- Node.js >= 22.12.0
- Frontend dev server running (`npm run dev` from `frontend/`)

## What This Feature Adds

A globally accessible help guide presented as a bottom sheet drawer, triggered by a floating action button. Two role paths: "I'm Hosting" (8 steps) and "I'm a Guest" (4 steps). No backend changes.

## New Files

```text
frontend/src/
├── components/guide/
│   ├── GuideButton.jsx        # Floating action button
│   ├── GuideDrawer.jsx        # Bottom sheet container
│   ├── GuideRoleSelect.jsx    # Role selection view
│   ├── GuideStepCard.jsx      # Individual step card
│   ├── GuideProgress.jsx      # Progress dots/counter
│   └── GuideNavigation.jsx    # Next/Back buttons + swipe handler
├── data/
│   └── guideContent.js        # Static step content
└── ...

frontend/tests/e2e/specs/
└── hosting-guide.spec.js      # E2E test suite
```

## Modified Files

```text
frontend/src/App.jsx           # Add GuideButton to AppLayout
```

## Development Workflow

1. **Start dev server**: `cd frontend && npm run dev`
2. **View the guide**: Floating button visible on every page → tap to open
3. **Run tests**: `cd frontend && npx playwright test tests/e2e/specs/hosting-guide.spec.js`

## Key Patterns

- **Drawer**: Follows `RatingDrawer.jsx` pattern (backdrop + slide-up + z-index layering)
- **Swipe**: Custom touch event handling (`touchstart`/`touchend` with 50px threshold)
- **Icons**: Lucide React icons referenced by name in data, resolved at render
- **Auth check**: `apiClient.isAuthenticated()` for contextual CTA routing
- **Animation**: Tailwind `transform transition-transform duration-300 ease-out`

## Dependencies

No new npm dependencies. Uses existing: React, Tailwind CSS, lucide-react, tailwindcss-animate.
