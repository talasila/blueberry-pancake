# Implementation Plan: My Bottles Bottom Sheet

**Branch**: `030-my-bottles-sheet` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-my-bottles-sheet/spec.md`

## Summary

Replace the standalone Profile page (`/event/:eventId/profile`) with a "My Bottles" bottom sheet that opens directly on the event page. The sheet handles display name editing (auto-save on blur), bottle registration CRUD (add/edit/delete with undo toast), and state-gated read-only mode. Three existing entry points (hamburger menu, guest welcome sheet CTA, inline registration prompt) are rewired to open the sheet instead of navigating to the Profile page. The Profile page, its route, and all dead code are removed. All unit and e2e tests are updated.

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 19.2  
**Primary Dependencies**: react-router-dom 7.10, sonner 2.0, lucide-react 0.556, Radix UI primitives, Tailwind CSS 4, class-variance-authority, clsx, tailwind-merge  
**Storage**: Backend API (REST) — no frontend storage changes  
**Testing**: Vitest 3 + @testing-library/react (unit), Playwright (e2e)  
**Target Platform**: Web (mobile-first responsive)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: Sheet opens instantly (no route navigation); API calls complete in standard latency  
**Constraints**: No new persistent UI elements on the event page; existing API endpoints unchanged  
**Scale/Scope**: ~10 files modified/created, ~2 files deleted

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New component follows established patterns (BottomSheetPicker, ListCard). Clean separation of concerns. |
| II. DRY | PASS | Form validation extracted into shared utility (FR-016). Add/edit forms share a single render path (FR-017). Duplicated ProfilePage logic consolidated. |
| III. Maintainability | PASS | Dead code removed (FR-020). Profile page and all references deleted. Clear naming with dynamic terminology. |
| IV. Testing Standards | PASS | New unit tests for MyBottlesSheet (FR-018). E2e tests rewritten (FR-019). No stale test references. |
| V. Security | PASS | No new auth flows. Same API endpoints with existing authorization. No sensitive data handling changes. |
| VI. UX Consistency | PASS | Uses ListCard (consistent with Guests/Admins drawers), BottomSheetPicker (consistent with existing sheets), sonner toasts (consistent with app-wide pattern). |
| VII. Performance | PASS | Eliminates a full page navigation in favor of a sheet overlay. No additional API calls beyond what ProfilePage already made. |

## Project Structure

### Documentation (this feature)

```text
specs/030-my-bottles-sheet/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── item-api.md      # Existing API contract documentation
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── MyBottlesSheet.jsx         # NEW — main bottom sheet component
│   │   ├── ItemForm.jsx               # NEW — shared add/edit form component
│   │   ├── BottomSheetPicker.jsx      # EXISTING — base sheet (reused)
│   │   ├── ListCard.jsx               # EXISTING — card component (reused)
│   │   ├── GuestWelcomeBottomSheet.jsx # MODIFIED — contextual CTA text, callback change
│   │   └── Header.jsx                 # MODIFIED — "Profile" → "My Bottles", callback instead of navigate
│   ├── pages/
│   │   ├── EventPage.jsx              # MODIFIED — wire up sheet state, update entry points
│   │   └── ProfilePage.jsx            # DELETED
│   ├── utils/
│   │   └── itemFormValidation.js      # NEW — extracted shared validation
│   ├── services/
│   │   ├── itemService.js             # EXISTING — no changes (getItems, registerItem, updateItem, deleteItem)
│   │   └── apiClient.js               # EXISTING — no changes (getUserProfile, updateUserProfile)
│   └── App.jsx                        # MODIFIED — remove /profile route and ProfilePage import
└── tests/
    ├── unit/
    │   ├── MyBottlesSheet.test.jsx          # NEW
    │   ├── ItemForm.test.jsx                # NEW
    │   ├── GuestWelcomeBottomSheet.test.jsx # MODIFIED
    │   └── EventPage.test.jsx               # MODIFIED (if profile navigation assertions exist)
    └── e2e/
        └── specs/
            ├── guest-registration-nudge.spec.js # MODIFIED — sheet assertions replace /profile URL
            ├── item-assignment.spec.js          # MODIFIED — registration via sheet instead of profile page
            └── my-bottles-sheet.spec.js         # NEW — comprehensive sheet e2e tests
```

**Structure Decision**: Web application with separate frontend/backend. All changes in this feature are frontend-only. The backend API endpoints remain unchanged.

## Design Decisions

### 1. Compose BottomSheetPicker vs. Custom Sheet

**Decision**: Compose `BottomSheetPicker` as the base shell for `MyBottlesSheet`.

**Rationale**: `BottomSheetPicker` already handles the slide-up animation, backdrop, close button, drag handle, header, and scrollable content area. It's the standardized base used by other sheets. Composing it avoids duplicating the 84 lines of sheet infrastructure.

**Alternative rejected**: Building a custom sheet from scratch (like `GuestWelcomeBottomSheet` does). This would duplicate animation/backdrop/scroll logic that's already extracted.

### 2. Shared ItemForm Component vs. Inline JSX

**Decision**: Extract a standalone `ItemForm.jsx` component used by `MyBottlesSheet` for both add and edit flows.

**Rationale**: The old ProfilePage had ~80 lines of near-identical JSX for add and edit forms. A single `ItemForm` with an `isEditing` flag and `initialValues` prop eliminates this duplication (Constitution II). The form also becomes independently testable.

### 3. Validation Utility Extraction

**Decision**: Extract `validateItemForm(data)` into `utils/itemFormValidation.js`, returning `{ isValid, errors }`.

**Rationale**: The old ProfilePage had two copies of validation logic (`validateItemForm` and `validateEditForm`) with near-identical rules. A single shared function is reused by `ItemForm` regardless of add/edit mode.

**Validation rules** (from existing ProfilePage):
- `name`: Required, 1–200 characters
- `description`: Optional, max 1000 characters
- `price`: Optional, non-negative, flexible format (`$50`, `50.00`, `50`)

### 4. Undo Toast for Delete (vs. Confirmation Dialog)

**Decision**: Use sonner's `toast()` with an `action` parameter for undo.

**Implementation approach**:
1. On delete tap → optimistically remove the item from local state
2. Show `toast('Bottle deleted', { action: { label: 'Undo', onClick: restoreItem } })`
3. On toast dismiss (timeout) → call `itemService.deleteItem(eventId, itemId)`
4. On undo tap → restore item to local state, cancel the pending delete

**Rationale**: Undo toasts are less disruptive than modals and already consistent with the sonner pattern used throughout the app.

### 5. Sheet State Management

**Decision**: `EventPage` owns the `isMyBottlesOpen` state and passes it as a prop to `MyBottlesSheet`. The sheet fetches its own data (items, profile) on open.

**Rationale**: Keeps EventPage's responsibility minimal (just toggle visibility). The sheet is self-contained with its own loading/error states. This mirrors how `GuestWelcomeBottomSheet` is integrated.

**State flow**:
- `EventPage` holds `isMyBottlesOpen` (boolean) and `setIsMyBottlesOpen`
- Three entry points call `setIsMyBottlesOpen(true)`
- `MyBottlesSheet` receives `isOpen`, `onClose`, `event`, `eventId`
- On open, the sheet calls `itemService.getItems(eventId, true)` and `apiClient.getUserProfile(eventId)`
- Name auto-save calls `apiClient.updateUserProfile(eventId, name)` on blur
- Item CRUD calls the respective `itemService` methods

### 6. Header Communication Pattern

**Decision**: `Header` receives an `onMyBottlesClick` callback prop from `EventPage`.

**Rationale**: The Header is rendered inside EventPage's layout. A callback prop is the simplest way to trigger the sheet from the menu without introducing context or global state. This mirrors how other menu actions work in the app.

### 7. Assigned Item Number Display

**Decision**: During `completed` state, display the `itemId` field (already returned by `getItems` API) as a Badge on each bottle card.

**Rationale**: The `itemId` is set by the host during assignment (paused state) and is already part of the item data model. No new API endpoint is needed. Display only during `completed` (per clarification — hidden during `paused` to avoid influencing guest behavior).

## Complexity Tracking

> No constitution violations to justify. All design decisions align with the 7 principles.
