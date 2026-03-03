# Research: Guest Management (023)

**Feature Branch**: `023-guest-management`  
**Date**: 2026-03-03  
**Purpose**: Resolve technical unknowns and document design decisions for the Guests card and drawer on the event admin page.

## Decision 1: Reuse SideDrawer and Existing Card Pattern

**Decision**: Add the Guests card as a `<button>` element following the exact same pattern as the existing Administrators, PIN, and State cards in EventAdminPage. Open a `<SideDrawer>` component with the same open/close/history pattern used by all other drawers.

**Rationale**: The EventAdminPage already has 7 drawer-based sections, all following the identical pattern of `setOpenDrawer('key')` + `history.pushState`. Reusing this pattern satisfies Constitution II (DRY) and VI (UX Consistency). No custom drawer behavior is needed.

**Alternatives considered**:
- **New GuestManagement component**: Rejected — would fragment the admin page logic across files when all other drawers are inline. EventAdminPage is already 3240 lines; the existing pattern is to keep drawer content inline.
- **Bottom sheet (like UserDetailsDrawer)**: Rejected — bottom sheets are used for detail views from the Dashboard; admin drawers use SideDrawer consistently.

## Decision 2: Extend getAllUsersWithStats() Rather Than Creating New Function

**Decision**: Add `itemNames` to the return object of the existing `getAllUsersWithStats()` function rather than creating a separate guest-specific function.

**Rationale**: `getAllUsersWithStats()` already computes everything the Guests drawer needs (email, name, registeredAt, isAdmin, isOwner, itemsCount) plus the `userItems` array is already computed internally. Adding `itemNames` is a one-line addition. Creating a separate function would duplicate 90% of the logic (Constitution II violation).

**Alternatives considered**:
- **Separate `getGuestsWithDetails()` function**: Rejected — near-complete duplication of `getAllUsersWithStats()`.
- **Compute item names only in the Guests drawer rendering**: Rejected — would require re-filtering items per guest during render; better to compute once in the aggregation function.

## Decision 3: Data Refresh Strategy — Fetch on Open + Manual Refresh Button

**Decision**: When the Guests drawer opens, call `apiClient.getEvent(eventId)` and `itemService.getItems(eventId)` to refresh data. Include a visible "Refresh" button in the drawer that triggers the same fetch. During fetch, show an inline spinner on the Refresh button while keeping the existing list visible.

**Rationale**: Spec clarification requires freshness during pre-event registration influx (FR-021, FR-022, FR-023). This approach matches the pattern already used by the Items drawer (which re-fetches items on open). Auto-refresh on open ensures fresh data every time; the manual Refresh button allows the admin to update without closing the drawer. Polling was rejected per spec (Out of Scope) to avoid unnecessary network overhead.

**Alternatives considered**:
- **No refresh (use page-level data only)**: Rejected — spec explicitly requires drawer-open refresh (FR-021) after clarification session about pre-event influx.
- **Automatic polling every N seconds**: Rejected — out of scope per spec; manual Refresh is simpler and sufficient.
- **WebSocket/SSE push**: Rejected — massive overengineering for the use case; no existing WebSocket infrastructure in the app.

## Decision 4: Search Scope — Name, Email, and Item Names

**Decision**: The search input filters guests by name, email, and registered item names (case-insensitive, partial match), matching the Items Assignment tab search behavior.

**Rationale**: Spec clarification chose this scope to allow admins to answer "who brought the Merlot?" (FR-007). The Items Assignment tab already implements the same three-field search pattern (name, email, item name) in EventAdminPage around lines 1555–1580. Reusing this pattern satisfies Constitution II (DRY) and VI (UX Consistency).

**Alternatives considered**:
- **Name and email only**: Rejected — spec clarification explicitly chose to include item names.
- **Full-text search across all fields**: Rejected — unnecessary complexity; three explicit fields cover the use cases.

## Decision 5: Owner Delete Button — Hidden (Not Disabled)

**Decision**: The owner's guest row does not render a delete button at all (hidden, not disabled/greyed out).

**Rationale**: Spec clarification chose "hidden" to communicate that the owner is immutable and to keep the row clean (FR-009, FR-011). A disabled button would suggest the action is temporarily unavailable, which is misleading — the owner can never be deleted.

**Alternatives considered**:
- **Disabled button**: Rejected — misleading UX; implies the action could become available.
- **Hidden for owner, disabled for last admin**: Considered but spec chose uniform "hidden for owner" and the last-admin case is handled by backend validation (the button is shown but deletion is prevented server-side with an error message).

## Decision 6: Remove Individual Delete from Danger Zone

**Decision**: Remove the "Users Management" section (individual user select dropdown + delete button) from the Danger Zone drawer. Keep "Delete All Users" in Danger Zone unchanged. Remove the `selectedUserEmail` state variable that was only used by the Danger Zone dropdown.

**Rationale**: Spec FR-014 requires removal to avoid redundancy. The Guests drawer provides a better UX for individual deletion (see the user, delete the user — no dropdown). Removing dead code satisfies Constitution III (Maintainability). The `selectedUserEmail` state and its associated logic become dead code once the dropdown is removed.

**Alternatives considered**:
- **Keep both locations**: Rejected — spec explicitly requires removal; two delete locations is confusing.
- **Keep the dropdown as a fallback**: Rejected — no spec requirement; adds maintenance burden for no value.
