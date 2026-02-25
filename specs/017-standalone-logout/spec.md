# Feature Specification: Standalone Page Logout Icon

**Feature Branch**: `017-standalone-logout`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "On authenticated non-event pages (/my-events and /create-event), the hamburger menu contains items that are either redundant or non-functional. Extend the system-route logout icon pattern to cover all standalone authenticated pages that lack event context."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Logout from My Events Page (Priority: P1)

An authenticated administrator navigates to the My Events page. Instead of a hamburger menu with redundant and broken items, they see a simple logout icon. Tapping it clears their session and returns them to the landing page.

**Why this priority**: This is the primary pain point — the hamburger menu on `/my-events` contains "My Events" (navigates to the page you're already on) and "Profile" (leads to a route that doesn't resolve). The only useful action is logout, and wrapping a single useful action in a dropdown menu adds unnecessary interaction cost.

**Independent Test**: Can be fully tested by authenticating via OTP, navigating to `/my-events`, verifying a logout icon is displayed instead of a hamburger menu, clicking it, and confirming redirection to the landing page with the session cleared.

**Acceptance Scenarios**:

1. **Given** an OTP-authenticated user is on `/my-events`, **When** the header renders, **Then** a standalone logout icon is displayed (no hamburger menu).
2. **Given** an OTP-authenticated user is on `/my-events`, **When** they click the logout icon, **Then** their JWT token is cleared, bookmarks are cleared, and they are redirected to the landing page (`/`).
3. **Given** an unauthenticated user visits `/my-events`, **When** the header renders, **Then** no logout icon or hamburger menu is shown (authentication guard redirects them before this point).

---

### User Story 2 — Logout from Create Event Page (Priority: P1)

An authenticated administrator navigates to the Create Event page. Instead of a hamburger menu, they see the same standalone logout icon, and tapping it returns them to the landing page.

**Why this priority**: Same UX problem as User Story 1 — the Create Event page is also a standalone authenticated page with no event context, making the hamburger menu equally redundant.

**Independent Test**: Can be fully tested by authenticating via OTP, navigating to `/create-event`, verifying a logout icon is displayed instead of a hamburger menu, clicking it, and confirming redirection to the landing page.

**Acceptance Scenarios**:

1. **Given** an OTP-authenticated user is on `/create-event`, **When** the header renders, **Then** a standalone logout icon is displayed (no hamburger menu).
2. **Given** an OTP-authenticated user is on `/create-event`, **When** they click the logout icon, **Then** their JWT token is cleared, bookmarks are cleared, and they are redirected to the landing page (`/`).

---

### User Story 3 — Event Pages Unaffected (Priority: P1)

Users on event-specific pages (`/event/:eventId/*`) continue to see the full hamburger menu with all contextual items (Back to Event, Profile, Dashboard, Settings, Logout). The change must not alter behavior for any event-scoped route.

**Why this priority**: Equal priority because breaking the existing event-page menu would be a regression.

**Independent Test**: Can be tested by navigating to any event page and verifying the hamburger menu still appears with the same items and behaviors as before.

**Acceptance Scenarios**:

1. **Given** an authenticated user is on `/event/:eventId`, **When** the header renders, **Then** the hamburger menu is displayed with all standard items.
2. **Given** an authenticated user is on `/event/:eventId/profile`, **When** the header renders, **Then** the hamburger menu includes "Back to Event", "Profile", and "Logout" (plus conditional items).

---

### User Story 4 — System Routes Unaffected (Priority: P1)

Users on system routes (`/system/*`) continue to see a standalone logout icon that redirects to `/system/login`. The existing system-route behavior must not change.

**Why this priority**: Equal priority because breaking existing system-route behavior would be a regression.

**Independent Test**: Can be tested by navigating to any system route and verifying the standalone logout icon still appears and redirects to `/system/login`.

**Acceptance Scenarios**:

1. **Given** an authenticated user is on `/system/events`, **When** they click the logout icon, **Then** they are redirected to `/system/login` (not `/`).
2. **Given** an authenticated user is on a system route, **When** the header renders, **Then** no hamburger menu is shown — only the standalone logout icon.

---

### Edge Cases

- **Future standalone pages**: If new authenticated non-event routes are added in the future, they should be easily classifiable as standalone pages by adding their path to the same condition.
- **Direct URL access**: A user who types `/my-events` or `/create-event` directly into the browser address bar (while authenticated) should see the logout icon, not a hamburger menu.
- **Browser back/forward navigation**: Navigating between standalone pages and event pages via browser history should correctly toggle between the logout icon and the hamburger menu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header MUST display a standalone logout icon (instead of a hamburger dropdown menu) on standalone authenticated pages — currently `/my-events` and `/create-event`.
- **FR-002**: Clicking the standalone logout icon on a standalone page MUST clear the JWT token, clear bookmarks, and redirect the user to the landing page (`/`).
- **FR-003**: The standalone-page logout icon MUST NOT redirect to `/system/login` — that behavior is reserved for system routes only.
- **FR-004**: The hamburger dropdown menu MUST NOT render on standalone pages.
- **FR-005**: The hamburger dropdown menu MUST continue to render normally on event-scoped routes (`/event/:eventId/*`).
- **FR-006**: The system-route logout icon MUST continue to work as before, redirecting to `/system/login`.
- **FR-007**: The standalone logout icon MUST be visually identical to the existing system-route logout icon (same icon, same size, same hover behavior).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On `/my-events` and `/create-event`, users can log out in a single tap/click — no menu to open, scan, and select from.
- **SC-002**: Zero redundant or non-functional menu items are visible on standalone pages.
- **SC-003**: Event-page hamburger menus continue to function identically to their pre-change behavior (zero regressions).
- **SC-004**: System-route logout continues to redirect to `/system/login` (zero regressions).
- **SC-005**: The interaction cost for logout on standalone pages is reduced from 3 steps (tap menu → scan items → tap Logout) to 1 step (tap logout icon).

## Scope

### In Scope

- Modifying the header component to detect standalone pages and render a logout icon instead of the hamburger menu.
- Using the existing `handleLogout` function for the standalone-page logout icon.

### Out of Scope

- Backend changes — this is a frontend-only UI change.
- New components or new routes.
- Changes to the authentication flow or JWT handling.
- Changes to the hamburger menu contents on event-scoped pages.
- Introducing a global profile page (the `/profile` route remains unimplemented; this spec removes it from view on standalone pages rather than building it).

## Assumptions

- The set of standalone pages is currently limited to `/my-events` and `/create-event`. New standalone pages can be added in the future by extending the path-matching condition.
- The existing `handleLogout` function (clear JWT, clear bookmarks, navigate to `/`) is the correct logout behavior for standalone pages.
- The visual design of the logout icon on standalone pages matches the existing system-route logout icon exactly — no new design work needed.
