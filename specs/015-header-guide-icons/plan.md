# Implementation Plan: Header Guide Icons

**Branch**: `015-header-guide-icons` | **Date**: 2026-02-25 | **Spec**: `specs/015-header-guide-icons/spec.md`
**Input**: Feature specification from `/specs/015-header-guide-icons/spec.md`

## Summary

Move the hosting guide and admin guide entry points from floating action buttons (FABs) to icon buttons in the header bar, eliminating content occlusion while preserving identical drawer behavior. The header icon acts as a toggle (open/close) and swaps between HelpCircle (hosting guide) and BookOpen (admin guide) based on the current route. Admin guide state management is lifted from `EventAdminPage` to `AppLayout` so both guides are controlled at the same level.

## Technical Context

**Language/Version**: JavaScript, React 19.x  
**Primary Dependencies**: React Router DOM 7.x, Tailwind CSS 4.x, Lucide React  
**Storage**: N/A (frontend-only layout change, no persistence)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web — mobile-first, 320px minimum viewport  
**Project Type**: Web application (frontend-only change)  
**Performance Goals**: No measurable regression; icon addition is a single DOM element  
**Constraints**: Header must not overflow at 320px; guide icon must be visible to unauthenticated users  
**Scale/Scope**: 5 files modified, 1 file deleted, 0 new files created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Removing FAB code from two locations, consolidating trigger into Header |
| II. DRY | PASS | Eliminates duplicate FAB patterns (GuideButton + inline admin FAB); single header icon rendering point |
| III. Maintainability | PASS | Deletes `GuideButton.jsx` (dead after migration); removes inline FAB from EventAdminPage |
| IV. Testing Standards | PASS | Existing E2E tests updated to use header icon locators; toggle behavior tested |
| V. Security | PASS | No auth/data changes; guide icon visibility for unauth users preserves existing behavior |
| VI. UX Consistency | PASS | Both guides accessed identically via header; consistent icon position; toggle pattern standard |
| VII. Performance | PASS | Net reduction in DOM elements (removes fixed-position FABs); no new API calls |

No violations. Complexity Tracking not needed.

### Post-Design Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Clear prop interfaces (Header receives 3 props); single toggle callback |
| II. DRY | PASS | Research Decision 3 confirmed single conditional render over two icon components |
| III. Maintainability | PASS | GuideButton.jsx deleted; EventAdminPage simplified by ~20 lines |
| IV. Testing Standards | PASS | E2E tests updated for new locators; toggle behavior covered |
| V. Security | PASS | No changes to auth flow; unauth visibility preserved |
| VI. UX Consistency | PASS | Lucide icons, Tailwind classes, consistent header chrome |
| VII. Performance | PASS | Net DOM reduction; no new API calls or lazy-loaded modules |

All gates pass. No new violations introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/015-header-guide-icons/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A — frontend-only)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A — no API changes)
│   └── README.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx              # Modified: add guide icon button with toggle behavior
│   │   └── guide/
│   │       ├── GuideButton.jsx     # DELETED: FAB no longer needed
│   │       ├── GuideDrawer.jsx     # Existing (unchanged)
│   │       ├── AdminGuideDrawer.jsx # Existing (unchanged)
│   │       └── ...                 # Other guide components unchanged
│   ├── pages/
│   │   └── EventAdminPage.jsx      # Modified: remove admin guide FAB and local state
│   └── App.jsx                     # Modified: lift admin guide state, pass props to Header, remove GuideButton import
└── tests/
    └── e2e/
        └── specs/
            ├── hosting-guide.spec.js  # Modified: update FAB locators to header icon locators
            └── admin-guide.spec.js    # Modified: update FAB locators to header icon locators
```

**Structure Decision**: Frontend-only modification across 5 existing files plus 1 deletion. No new source files.

## Architecture

### State Flow (after change)

```
AppLayout (App.jsx)
├── guideOpen / setGuideOpen          — hosting guide state (existing)
├── adminGuideOpen / setAdminGuideOpen — admin guide state (LIFTED from EventAdminPage)
├── guideVariant                       — 'hosting' | 'admin' | null (NEW, derived from route)
│
├── Header (props: onToggleGuide, guideVariant, isGuideOpen)
│   └── renders icon button: HelpCircle or BookOpen based on guideVariant
│       └── onClick → calls onToggleGuide (toggles open/close)
│
├── GuideDrawer (isOpen=guideOpen, onClose=closeGuide)       — existing, unchanged
└── AdminGuideDrawer (isOpen=adminGuideOpen, onClose=closeAdminGuide) — existing, unchanged
```

### Route → Guide Variant Mapping

| Route Pattern | guideVariant | Icon |
|---------------|-------------|------|
| `/event/:id/admin` and `/event/:id/admin/*` | `'admin'` | BookOpen |
| `/system` and `/system/*` | `null` | (no icon) |
| All other routes | `'hosting'` | HelpCircle |

### Key Design Decisions

1. **Toggle via Header prop**: Header receives `onToggleGuide` callback. A single click opens the appropriate guide; clicking again closes it. Header does not manage open/close state — it only fires the toggle.

2. **Admin guide state lifted to AppLayout**: Currently, `EventAdminPage` owns `adminGuideOpen` state and renders both the FAB and `AdminGuideDrawer`. This state moves to `AppLayout` alongside the existing hosting guide state. `AdminGuideDrawer` is rendered in `AppLayout` (conditionally, when on admin routes) rather than inside `EventAdminPage`.

3. **Route detection broadened**: The existing `isAdminRoute` regex (`/^\/event\/[A-Za-z0-9]+\/admin$/`) matches only the exact admin path. It must be updated to also match sub-routes: `/^\/event\/[A-Za-z0-9]+\/admin(\/.*)?$/`.

4. **GuideButton.jsx deleted**: This component's sole purpose is rendering the hosting guide FAB. With the header icon, it becomes dead code.

5. **Header icon position**: The icon button sits between the event-name/state-icon cluster and the hamburger menu (or right edge). It uses `flex-shrink-0` to prevent compression and has a 40×40 touch target matching other header interactive elements.

6. **Unauthenticated visibility**: The guide icon renders independently of auth state and independently of the hamburger menu. On the landing page (no menu), the icon appears at the right edge of the header.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `Header.jsx` | Modified | Accept `onToggleGuide`, `guideVariant`, `isGuideOpen` props; render icon button conditionally |
| `App.jsx` | Modified | Add `adminGuideOpen` state; compute `guideVariant` from route; build `onToggleGuide` callback; pass props to Header; render `AdminGuideDrawer` in layout; remove `GuideButton` import and usage; broaden `isAdminRoute` regex |
| `EventAdminPage.jsx` | Modified | Remove `adminGuideOpen` state, `openAdminGuide`/`closeAdminGuide` callbacks, `AdminGuideDrawer` import, FAB button, and `AdminGuideDrawer` rendering |
| `GuideButton.jsx` | Deleted | Entire file removed |
| `hosting-guide.spec.js` | Modified | Replace `[data-testid="guide-button"]` locators with header icon locator `[data-testid="guide-icon"]` |
| `admin-guide.spec.js` | Modified | Replace `[data-testid="admin-guide-button"]` locators with header icon locator `[data-testid="guide-icon"]` |
