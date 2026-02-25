# Research: Standalone Page Logout Icon

**Branch**: `017-standalone-logout` | **Date**: 2026-02-25

## Summary

No research was required for this feature. All technical decisions are predetermined by the existing codebase patterns, and there were no NEEDS CLARIFICATION items in the spec or technical context.

## Decisions

### D1: Standalone Page Detection Strategy

**Decision**: Use an array-based path match (`['/my-events', '/create-event'].includes(location.pathname)`) to detect standalone pages.

**Rationale**: The standalone page set is small (2 routes) and unlikely to grow rapidly. An explicit array is more readable and debuggable than a regex or prefix-based approach. Adding a new standalone page requires adding one string to the array — a single-line change.

**Alternatives considered**:
- **Prefix-based match** (e.g., starts with `/standalone/`): Rejected — would require restructuring route paths for a UI-only concern.
- **Route metadata** (e.g., a `standalone: true` flag in route config): Rejected — over-engineered for 2 routes; adds indirection without proportional benefit.
- **Negative match** (not event route, not system route, not landing): Rejected — fragile; any new authenticated route would silently become standalone.

### D2: Logout Handler Selection

**Decision**: Reuse the existing `handleLogout` function for standalone pages (clears JWT, clears bookmarks, navigates to `/`).

**Rationale**: Standalone pages are user-facing, not admin/system pages. The landing page (`/`) is the correct post-logout destination, matching what users expect after logging out from My Events or Create Event.

**Alternatives considered**:
- **New handler**: Rejected — `handleLogout` already does exactly what's needed; creating a wrapper would violate DRY.
- **`handleRootLogout`**: Rejected — redirects to `/system/login`, which is only appropriate for system admin routes.
