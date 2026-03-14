# Research: My Bottles Bottom Sheet

**Feature**: 030-my-bottles-sheet  
**Date**: 2026-03-13

## R1: Bottom Sheet Base Component

**Decision**: Use existing `BottomSheetPicker` component as the base shell.

**Rationale**: `BottomSheetPicker` is already extracted and standardized in the codebase. It provides: slide-up animation (`translate-y-full` → `translate-y-0`), backdrop overlay, drag handle, optional header with title and close button, scrollable content area, and `aria-modal` accessibility. Max height is 75vh which is appropriate for a form + list view.

**Alternatives considered**:
- `GuestWelcomeBottomSheet` pattern (custom sheet with `history.pushState`): Rejected because it duplicates BottomSheetPicker's infrastructure. However, we should add history integration to handle the back button, since GuestWelcomeBottomSheet demonstrates this is important for mobile UX.
- Full-height `SideDrawer`: Rejected because side drawers are used for admin functions (Guests, Administrators). Bottom sheets are the established pattern for guest interactions (welcome, ratings).

## R2: Form Validation Extraction

**Decision**: Extract `validateItemForm(data)` into `frontend/src/utils/itemFormValidation.js`.

**Rationale**: The existing ProfilePage contains two near-identical validation functions (`validateItemForm` and `validateEditForm`). Both enforce the same rules:
- `name`: Required, 1–200 characters
- `description`: Optional, max 1000 characters
- `price`: Optional, non-negative, accepts flexible formats (`$50`, `50.00`, `50`, empty string)

A single exported function returning `{ isValid: boolean, errors: { name?, price?, description? } }` serves both add and edit flows. The `isEditing` distinction is unnecessary since validation rules are identical.

**Alternatives considered**:
- Using a form validation library (e.g., zod, yup): Rejected because the project has no form library dependency and the validation is simple enough for a plain function. Adding a library for 3 field validations adds unnecessary weight.

## R3: Undo Toast Pattern with Sonner

**Decision**: Use sonner's `toast()` with `action` parameter for optimistic delete with undo.

**Rationale**: Sonner (v2.0.7, already installed) supports action buttons on toasts natively:
```javascript
toast('Bottle deleted', {
  action: { label: 'Undo', onClick: () => restoreItem(item) },
  duration: 5000,
});
```

**Implementation pattern**:
1. On delete button tap: Remove item from local `items` state (optimistic update), store deleted item in a ref
2. Show undo toast with 5-second duration
3. On undo tap: Restore item to local state, clear the pending delete timer
4. On toast dismiss/timeout: Call `itemService.deleteItem(eventId, itemId)` to persist
5. On API error: Restore item to local state, show error toast

This approach ensures the UI feels instant while keeping the backend in sync.

**Alternatives considered**:
- Styled confirmation dialog (AlertDialog from Radix): Rejected per clarification — undo toast is less disruptive for a reversible action.
- `window.confirm`: Explicitly rejected — this is the pattern we're replacing.

## R4: Name Field Auto-Save on Blur

**Decision**: Auto-save the name field when it loses focus (blur event), using a debounce-like guard to prevent duplicate saves.

**Rationale**: The Configuration tab already uses auto-save with debounce for the `numberOfItems` field, establishing the pattern. For the name field, blur-based saving is more appropriate than debounce-while-typing because:
- The name is a single short field (not continuous input)
- Saving on every keystroke would be excessive
- The user expects "put it down and move on" behavior

**Implementation**:
1. Track a `nameRef` with the last saved value
2. On blur: Compare current value to `nameRef`. If changed, call `apiClient.updateUserProfile(eventId, name)` and show "Name updated" toast
3. On success: Update `nameRef` to the new value
4. On error: Show error toast, revert input to `nameRef` value

**Alternatives considered**:
- Debounced auto-save while typing: Rejected — unnecessary for a single name field. Blur is sufficient and avoids network chatter.
- Explicit Save button: Rejected — the spec explicitly excludes this. No forced navigation or explicit save.

## R5: Assigned Item Number in Completed State

**Decision**: Display the `itemId` field from the item data model as a Badge on each ListCard during `completed` state.

**Rationale**: The item API (`GET /events/:eventId/items?ownItemsOnly=true`) already returns the `itemId` field, which is set by the host during assignment (paused state) via `PATCH /events/:eventId/items/:itemId/assign-item-id`. No new API endpoint or data model change is needed.

**Display**: Use the existing `Badge` component with `variant="outline"` to show `#3` (matching how AssignmentView already renders assigned numbers). Only shown during `completed` state per clarification.

**Alternatives considered**:
- Showing during both `paused` and `completed`: Rejected per clarification — hidden during `paused` to avoid influencing guest behavior during the tasting.

## R6: Header-to-Sheet Communication

**Decision**: Pass an `onMyBottlesClick` callback from `EventPage` to `Header` as a prop.

**Rationale**: `Header` is rendered inside `EventPage`'s component tree. A callback prop is the simplest communication pattern and avoids introducing React context or global state for a single toggle. This mirrors how other actions in the hamburger menu work (e.g., navigation handlers).

**Implementation**: `Header` already accepts props for customizing menu behavior. Adding `onMyBottlesClick` follows the same pattern. `Header` calls this callback instead of `navigate(profilePath)`.

**Alternatives considered**:
- React Context for sheet state: Rejected — over-engineering for a single boolean toggle between parent and child.
- Custom event / EventEmitter: Rejected — anti-pattern in React; props are the idiomatic solution.

## R7: Guest Welcome Sheet Contextual CTA

**Decision**: Pass `userItemCount` (or a boolean `hasItems`) to `GuestWelcomeBottomSheet` to drive contextual CTA text.

**Rationale**: `EventPage` already has access to event data which includes user items count. Passing this as a prop keeps the welcome sheet stateless (it doesn't fetch its own data).

**CTA text logic**:
- `hasItems === false`: "Register My {singular}" (existing text)
- `hasItems === true`: "View My {plural}" (new contextual text)

**Alternatives considered**:
- Having the welcome sheet fetch item count itself: Rejected — adds an unnecessary API call. The parent already has this data.
