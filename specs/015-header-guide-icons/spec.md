# Feature Specification: Header Guide Icons

**Feature Branch**: `015-header-guide-icons`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "The icons for the admin and hosting guides hover at the bottom right of the screen. This sometimes covers up the page content and looks bad. We should probably move to having the help/guide icons in the header."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access the Hosting Guide from the Header (Priority: P1)

A user on any page (landing, auth, event, profile, dashboard) sees a help icon in the header bar that opens the hosting guide. The icon is always visible in the header chrome, never obscures page content, and behaves identically to the current floating action button — opening the same bottom sheet drawer with role selection and step-by-step content.

**Why this priority**: The hosting guide is the most broadly visible guide (appears on all non-admin pages) and is the primary entry point for new users learning how to host or join an event. Moving it to the header eliminates the content occlusion problem for the majority of pages.

**Independent Test**: Can be fully tested by navigating to any non-admin page, tapping the header help icon, and confirming the hosting guide drawer opens with role selection.

**Acceptance Scenarios**:

1. **Given** a user on any non-admin page, **When** they look at the header, **Then** they see a help icon that is clearly tappable
2. **Given** a user on any non-admin page, **When** they tap the header help icon, **Then** the hosting guide bottom sheet opens with the role selection screen
3. **Given** a user with the hosting guide open, **When** they close the guide, **Then** the header help icon remains visible and the page content beneath is unchanged
4. **Given** a user on the landing page (unauthenticated), **When** they look at the header, **Then** the help icon is still visible — it does not require authentication

---

### User Story 2 - Access the Admin Guide from the Header (Priority: P1)

An admin on the event admin page sees a guide icon in the header that opens the admin guide. The icon replaces the hosting guide icon when on admin pages (same header position, different icon and behavior). The admin guide bottom sheet opens with state-aware content, identical to the current admin guide experience.

**Why this priority**: The admin guide FAB suffers from the same content occlusion issue as the hosting guide, and the admin page has particularly dense content (settings, state management, user lists) where a floating button is most disruptive.

**Independent Test**: Can be fully tested by navigating to the admin page, confirming the header shows the admin guide icon (not the hosting guide icon), and tapping it to open the state-aware admin guide.

**Acceptance Scenarios**:

1. **Given** an admin on the event admin page, **When** they look at the header, **Then** they see an admin guide icon (visually distinct from the hosting guide icon)
2. **Given** an admin on the event admin page, **When** they tap the header guide icon, **Then** the admin guide opens with content matching the current event state
3. **Given** an admin on the event admin page, **When** they look at the header, **Then** the hosting guide icon is NOT present — only the admin guide icon is shown
4. **Given** an admin who navigates from the admin page to the main event page, **When** they look at the header, **Then** the guide icon switches back to the hosting guide icon

---

### User Story 3 - No Content Occlusion on Any Page (Priority: P1)

All pages in the application are free of floating overlay elements that obscure content. The bottom-right area of every page is fully usable — no buttons, icons, or interactive elements hover over page content. The guide entry points live entirely within the header bar, which is part of the page chrome and does not overlap the content area.

**Why this priority**: Content occlusion is the core problem motivating this change. This story validates the "why" — every page should have a clean, unobstructed content area.

**Independent Test**: Can be fully tested by visiting each major page type (landing, auth, event, admin, dashboard, profile) at 320px width and confirming no floating elements appear over the content area.

**Acceptance Scenarios**:

1. **Given** any page in the application, **When** the user scrolls to the bottom, **Then** no floating elements obscure the last items of page content
2. **Given** the admin page with all sections expanded, **When** the user scrolls through the settings, **Then** the bottom-right corner of the viewport is free of floating buttons
3. **Given** the event page with rating drawers open, **When** the user interacts with the drawer, **Then** no guide button overlaps the drawer controls

---

### User Story 4 - Guide Icon Visibility for Unauthenticated Users (Priority: P2)

An unauthenticated user visiting the landing page, auth page, or event entry flow (email/PIN pages) sees the hosting guide help icon in the header. The icon is visible regardless of whether the user is logged in, because the hosting guide is designed for pre-event discovery ("How does blind tasting work?").

**Why this priority**: The hosting guide is intentionally available to unauthenticated users. Moving it to the header must preserve this — the icon cannot be hidden inside the authenticated-only hamburger menu.

**Independent Test**: Can be fully tested by opening the app in a fresh incognito window, navigating to the landing page, and confirming the help icon is visible in the header without logging in.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on the landing page, **When** they look at the header, **Then** the hosting guide icon is visible even though no hamburger menu is shown
2. **Given** an unauthenticated user on the email entry page for an event, **When** they tap the hosting guide icon, **Then** the guide opens normally

---

### Edge Cases

- What happens when the header is crowded (long event name + state icon + guide icon + hamburger menu) at 320px width? The event name already truncates; the guide icon must not cause layout overflow.
- What happens on pages where no guide applies (e.g., `/system` admin pages)? No guide icon should be shown.
- What happens when the guide drawer is open and the user taps the header guide icon again? The icon acts as a toggle — tapping it while the guide is open closes the guide. This is the standard toolbar-icon interaction pattern.
- What happens when the user navigates to a different route category while a guide is open (e.g., hosting guide open → navigate to admin page)? The guide drawer unmounts when the route no longer matches its rendering condition, cleanly closing it without requiring explicit state reset.
- The header guide icon relies on icon recognition alone (no tooltip, pulse, or first-visit affordance). The HelpCircle and BookOpen icons are standard help/guide symbols. This keeps the header clean and consistent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The hosting guide MUST be accessible via an icon button in the header bar on all non-admin pages, replacing the current floating action button
- **FR-002**: The admin guide MUST be accessible via an icon button in the header bar on all `/event/:id/admin/*` routes (including the main admin page and any sub-routes), replacing the current floating action button
- **FR-003**: The header MUST show at most one guide icon at a time — either the hosting guide icon or the admin guide icon, never both
- **FR-004**: The guide icon MUST be visible to unauthenticated users on pages where the hosting guide is available (landing, auth, event entry flow)
- **FR-005**: The guide icon MUST be positioned in the header between the event name area and the hamburger menu (or at the right edge if no menu is present)
- **FR-006**: The header guide icon MUST NOT cause layout overflow or push other header elements off-screen at 320px minimum viewport width
- **FR-007**: The floating action buttons for both guides MUST be removed — no fixed-position guide buttons should remain in the application
- **FR-008**: The guide drawers (bottom sheets) MUST continue to function identically — same content, same navigation, same animation, same keyboard and swipe support
- **FR-009**: The guide icon for the hosting guide MUST be visually distinct from the admin guide icon so users on admin pages can tell which guide they are opening
- **FR-010**: On pages where no guide is applicable (e.g., `/system` routes), no guide icon MUST be shown in the header
- **FR-011**: The header guide icon MUST have appropriate accessibility attributes (`aria-label`, keyboard focusable, screen reader announcement)
- **FR-012**: When the guide drawer is open, the header guide icon MUST remain visible and act as a toggle — tapping it again closes the guide
- **FR-013**: The admin guide icon MUST appear on all routes matching `/event/:id/admin` and its sub-routes (e.g., `/event/:id/admin/items/assign`), not only the exact admin path

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No floating overlay elements exist in the bottom-right corner of any page in the application (validated by visual inspection and E2E test across all major page types)
- **SC-002**: The hosting guide is accessible from the header on 100% of non-admin, non-system pages — same coverage as the current FAB
- **SC-003**: The admin guide is accessible from the header on all admin routes (including sub-routes per FR-013) — expanded from the current single-page FAB
- **SC-004**: The header layout does not overflow at 320px viewport width on any page with the guide icon present (validated at minimum viewport)
- **SC-005**: All existing hosting guide E2E tests pass after updating the trigger mechanism (from FAB to header icon)
- **SC-006**: All existing admin guide E2E tests pass after updating the trigger mechanism (from FAB to header icon)
- **SC-007**: The guide icon is visible and functional without authentication on the landing page and event entry pages (validated via E2E test in unauthenticated state)

## Clarifications

### Session 2026-02-25

- Q: Should the header guide icon act as a toggle (tap to close) or a no-op when the guide is already open? → A: Toggle — tapping the icon while the guide is open closes the guide.
- Q: Should the admin guide icon appear on all `/event/:id/admin/*` sub-routes or only the exact `/event/:id/admin` path? → A: All admin sub-routes show the admin guide icon.

## Assumptions

- The guide drawers (bottom sheets) themselves are unchanged — only the trigger mechanism (FAB to header icon) is being moved.
- The hosting guide icon uses a recognizable help symbol (e.g., a question mark or help circle icon). The admin guide icon uses a book or guide symbol to differentiate.
- The header has sufficient horizontal space for one additional icon button at 320px width. The event name truncation (already in place) accommodates this.
- The existing `GuideButton.jsx` component (which only renders the hosting guide FAB) will be removed or replaced.
- The admin guide state management (open/close) will be lifted from `EventAdminPage` to the app layout level to match the hosting guide's architecture.
- No new backend endpoints or data changes are required — this is a frontend-only layout change.
- The hamburger menu is not a suitable location for the guide icon because the hosting guide must be visible to unauthenticated users who do not see the menu.
