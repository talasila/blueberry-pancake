# Research: Redirect to Admin Page After Event Creation

**Feature**: 011-create-event-redirect  
**Date**: 2026-02-24

## Overview

No significant unknowns. All technologies are already in the codebase. This document records the design decisions and patterns to follow.

## Decisions

### 1. Navigation Method: `useNavigate` with `replace: true`

**Decision**: Use `react-router-dom`'s `useNavigate` hook (already available) with `replace: true` to redirect after event creation.

**Rationale**: `replace: true` removes `/create-event` from browser history so the back button skips the completed form. This is the same pattern used in `AuthPage.jsx` (line 79: `navigate(from, { replace: true })`).

**Alternatives considered**:
- `window.location.href`: Causes full page reload, loses React state. Rejected.
- `navigate()` without `replace`: Leaves the create form in history (user can "back" into a stale form). Rejected per FR-004.
- `<Navigate>` component via state: Would require an additional render cycle and is more complex. Rejected.

### 2. Toast Trigger: Navigation State

**Decision**: Pass `{ state: { eventCreated: true } }` via `navigate()` and read it with `useLocation()` in EventAdminPage to trigger the toast.

**Rationale**: This is the established pattern in the codebase. `EventAdminPage.jsx` already uses `navigate()` with state (line 817-821: passes message state after event deletion). `LandingPage.jsx` reads `location.state?.message` on mount to display success messages (line 29). Using navigation state ensures the toast only fires once (on the initial redirect) and not on subsequent visits or page refreshes (since `replaceState` clears it).

**Alternatives considered**:
- URL query parameter (`?created=true`): Visible in URL, requires cleanup, pollutes browser history. Rejected.
- `sessionStorage` flag: Requires manual cleanup, risk of stale flags. Rejected.
- Global state (React context): Overkill for a one-time notification. Rejected.

### 3. Toast Library: `sonner` (existing)

**Decision**: Use `toast.success()` from `sonner` for the post-creation notification.

**Rationale**: Already imported and used in `EventAdminPage.jsx` (line 25: `import { toast } from 'sonner'`). `sonner` toasts auto-dismiss after ~5 seconds by default (satisfies SC-003: visible for at least 3 seconds). No new dependency needed.

**Alternatives considered**:
- Custom banner/Message component: More code, doesn't auto-dismiss. Rejected.
- Native browser notification: Requires permission, not suitable for in-app feedback. Rejected.

### 4. Toast Content

**Decision**: Use `"Event created! Share the PIN with participants to get started"` as the toast message.

**Rationale**: Per clarification, the toast includes a next-step hint to orient the user. "Share the PIN" is the most actionable first step since participants need the PIN to join. The admin page's PIN section is prominently displayed.

### 5. Dead Code Removal

**Decision**: Remove all modal-related code from `CreateEventPage.jsx`: the `successEvent` state, `handleCloseSuccess` function, and the entire modal JSX block (lines 20, 84-87, 95-100, 181-213).

**Rationale**: Per FR-002, no modal is displayed. Keeping dead code violates Constitution Principle III (Maintainability).
