# Research: Guest Item Registration Nudge

**Branch**: `025-guest-registration-nudge` | **Date**: 2026-03-03

## R1: Bottom Sheet Trigger Mechanism

**Decision**: Pass `location.state.guestJustLoggedIn = true` from `PINEntryPage` navigate call.

**Rationale**: This mirrors the existing admin pattern where `EventAdminPage` reads `location.state?.eventCreated` to trigger `WelcomeBottomSheet`. The state is ephemeral — consumed once, cleared on `history.replaceState`, and does not survive page refresh. This satisfies FR-013 (once per login, not on refresh) with zero persistence overhead.

**Alternatives considered**:
- `localStorage` flag per event+email: Adds persistence complexity. Would require cleanup logic and prevent re-display on fresh PIN login (violates clarification Q2).
- URL query parameter: Survives refresh (violates FR-013) and is visible to the user.

**Current code** (`PINEntryPage.jsx`): `navigate(`/event/${eventId}`, { replace: true })` — no state passed. Must be updated to include `{ state: { guestJustLoggedIn: true }, replace: true }`.

## R2: Item Terminology Alignment

**Decision**: Use the existing `useItemTerminology` hook. Button reads "Register My Bottle" for wine events and "Register My Item" for generic events.

**Rationale**: The spec references "Register My Wine" in acceptance scenario 12, but the codebase consistently uses "Bottle"/"Bottles" for wine-type events (see `ProfilePage` "Add Bottle", "My Bottles"). Using the existing hook ensures consistency with the rest of the app and avoids introducing a parallel terminology system.

**Alternatives considered**:
- Custom label mapping ("Wine" instead of "Bottle"): Inconsistent with rest of app; would require a new terminology variant.
- Hardcoded labels: Violates DRY; doesn't adapt if new item types are added.

## R3: Reuse vs. New Component for Bottom Sheet

**Decision**: Create a new `GuestWelcomeBottomSheet` component that reuses the same animation/overlay pattern from `WelcomeBottomSheet`.

**Rationale**: The admin `WelcomeBottomSheet` has admin-specific content (PIN, defaults summary, customize shortcuts, admin guide link) that doesn't apply to guests. Extracting a shared base component would be premature — the animation pattern is ~30 lines of hooks and CSS classes, and the two sheets have completely different content and props. A direct copy-and-adapt of the animation pattern is simpler and avoids coupling the two sheets' lifecycles.

**Alternatives considered**:
- Shared `BottomSheetBase` component: Would reduce ~30 lines of duplication but couples admin and guest sheets. Viable future refactor after a 3rd bottom sheet variant appears (DRY after 2nd occurrence is constitution guidance, but the structural differences in content make this borderline).
- Render admin sheet with different props: Not viable — content structure is fundamentally different (admin has PIN display, customization rows, guide link; guest has informational bullet points).

## R4: Admin Detection on EventPage

**Decision**: Use the existing `isAdmin` boolean from `useEventContext()`.

**Rationale**: `EventPage` already destructures `isAdmin` from the event context (line 36). This is derived from `isUserAdmin(userEmail, event)` in the context provider. No additional API calls or checks needed. Both the bottom sheet and inline prompt can simply check `!isAdmin`.

## R5: Inline Prompt Placement

**Decision**: Add the inline prompt as a conditional block within the existing `event?.state === 'created'` branch in `EventPage.jsx` (lines 559-562).

**Rationale**: The prompt supplements the existing "Event has not started yet" text (FR-018). The simplest approach is to expand the existing `created` state conditional to include both the status text and the new prompt block, guarded by `!isAdmin`.

## R6: No Backend Changes Required

**Decision**: This feature is entirely frontend. No new API endpoints, no new data storage, no backend modifications.

**Rationale**: The bottom sheet trigger uses ephemeral navigation state. The inline prompt is driven by event state (already available from the event context). Item terminology comes from the event object. Admin status comes from the event context. All data needed is already present on the client.
