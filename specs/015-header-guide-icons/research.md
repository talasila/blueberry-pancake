# Research: Header Guide Icons

**Feature**: `015-header-guide-icons`  
**Date**: 2026-02-25

## Overview

This feature is a frontend-only layout refactor — moving guide entry points from floating action buttons to the header bar. No NEEDS CLARIFICATION items exist in the Technical Context. Research focuses on validating design decisions against the existing codebase.

## Decision 1: State Lifting for Admin Guide

**Decision**: Lift `adminGuideOpen` state from `EventAdminPage` to `AppLayout`.

**Rationale**: The hosting guide state already lives in `AppLayout`. For the header to toggle both guides, both must be controllable from the same scope that renders `Header`. This also simplifies `EventAdminPage` by removing guide-related concerns.

**Alternatives considered**:
- **Keep state in EventAdminPage, use ref/callback forwarding**: Rejected — breaks the pattern established by the hosting guide and adds unnecessary complexity for cross-component communication.
- **Use a shared GuideContext**: Rejected — overkill for two boolean states that are already colocated in `AppLayout`. Would add a new context provider for minimal benefit.

## Decision 2: Route Detection Strategy

**Decision**: Use a single regex `/^\/event\/[A-Za-z0-9]+\/admin(\/.*)?$/` to detect all admin routes (including sub-routes like `/event/:id/admin/items/assign`).

**Rationale**: The spec clarification (session 2026-02-25) confirmed the admin guide icon must appear on all `/event/:id/admin/*` routes. A single regex is simpler than maintaining a list of admin sub-paths and automatically covers future admin sub-routes.

**Alternatives considered**:
- **Exact path list**: Rejected — fragile; would need updating every time a new admin sub-route is added.
- **`startsWith` check**: Viable but less precise than regex (would match `/event/X/administrator` if such a route existed). Regex is already the existing pattern in `App.jsx`.

## Decision 3: Header Icon Rendering

**Decision**: Header receives `guideVariant` prop (`'hosting'` | `'admin'` | `null`) and conditionally renders the appropriate icon. When `null`, no icon is shown.

**Rationale**: The header doesn't need to know about route logic — `AppLayout` computes the variant and passes it down. This keeps `Header` a presentational component with minimal logic.

**Alternatives considered**:
- **Header reads route internally**: Rejected — duplicates route detection logic already in `AppLayout`. Violates single-responsibility.
- **Two separate icon components**: Rejected — the icons are identical in behavior (toggle a drawer); only the icon glyph differs. A single conditional render is simpler and DRY.

## Decision 4: Toggle Behavior Implementation

**Decision**: `AppLayout` provides a single `onToggleGuide` callback to `Header`. Internally, it checks `guideVariant` and the current open state to determine whether to open or close.

**Rationale**: The header icon acts as a toggle per the spec clarification. A single callback keeps the Header API clean. The toggle logic lives in `AppLayout` where the state lives.

**Alternatives considered**:
- **Separate onOpen/onClose props**: Rejected — Header would need to track open state to decide which to call, duplicating state.
- **Header manages open state**: Rejected — state must live in `AppLayout` where drawers are rendered.

## Decision 5: AdminGuideDrawer Rendering Location

**Decision**: Render `AdminGuideDrawer` in `AppLayout` (conditionally, when `isAdminRoute` is true), alongside `GuideDrawer`.

**Rationale**: Since state is lifted to `AppLayout`, the drawer must be rendered there too. Conditional rendering on `isAdminRoute` ensures `AdminGuideDrawer` only mounts when `EventContext` provides the event state it needs.

**Alternatives considered**:
- **Always render AdminGuideDrawer**: Rejected — it reads `event.state` from `EventContext`, which is only available on event routes. Rendering it on non-event routes would cause errors or show empty state.
- **Keep AdminGuideDrawer in EventAdminPage**: Rejected — state has been lifted, so the drawer's `isOpen`/`onClose` props must come from `AppLayout`.

## Decision 6: GuideButton.jsx Deletion

**Decision**: Delete `GuideButton.jsx` entirely.

**Rationale**: The component's sole purpose is rendering the hosting guide FAB. With the migration to header icons, it has no remaining callers. Dead code must be deleted per Constitution Principle III (Maintainability).

**Alternatives considered**:
- **Repurpose for header icon**: Rejected — the header icon is rendered inline in `Header.jsx` with different styling, position, and behavior (toggle vs. open-only). Repurposing would require near-total rewrite.
