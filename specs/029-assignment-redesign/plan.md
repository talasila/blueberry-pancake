# Implementation Plan: Assignment Tab Redesign (Number-First Grid)

**Branch**: `029-assignment-redesign` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/029-assignment-redesign/spec.md`

## Summary

Redesign the Bottles/Items Assignment tab from a bottle-first expandable accordion to a number-first circular button grid that matches the host's physical blind tasting workflow. The host taps a number, selects a bottle from a bottom sheet — 2 taps per assignment instead of 3-4. Implementation is frontend-only: a single shared `AssignmentView` component replaces ~200 lines of duplicated code across `EventAdminPage` and `ItemAssignmentPage`, with no backend changes.

## Technical Context

**Language/Version**: JavaScript (ES2022+) / React 19.2  
**Primary Dependencies**: React 19, React Router 7, Radix UI primitives, class-variance-authority, lucide-react, sonner (toasts)  
**Storage**: N/A (frontend-only; backend uses DynamoDB — no changes)  
**Testing**: Vitest + @testing-library/react (unit), Playwright (e2e)  
**Target Platform**: Mobile-first web (320px+ width), served via Vite 6 dev / production builds  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: Optimistic UI — assignment reflects in <100ms visually; bottom sheet opens in <200ms  
**Constraints**: No new backend endpoints; no data model changes; 3-column grid matching rating page; 60px circular buttons  
**Scale/Scope**: Single shared component + 2 supporting components; modifies 2 existing pages; ~400 lines new, ~400 lines removed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | New shared component with clear single responsibility. Props interface is well-defined. |
| II. DRY | ✅ PASS | Core goal: eliminate ~200 lines of duplicated assignment code between EventAdminPage and ItemAssignmentPage. Also consolidates the repeated bottom sheet pattern into a reusable component. |
| III. Maintainability | ✅ PASS | Single source of truth for assignment UI. Old accordion code fully removed (FR-018). Component architecture documented. |
| IV. Testing | ✅ PASS | Unit tests for the new shared component. Existing EventAdminPage tests updated. |
| V. Security | ✅ PASS | No new endpoints. Assignment still requires JWT + admin role. Event state validation enforced by backend. |
| VI. UX Consistency | ✅ PASS | Reuses ItemButton visual pattern (60px circle, 3-col grid), follows same instructional text pattern as rating page, uses same color system (gray/green). |
| VII. Performance | ✅ PASS | Optimistic UI for assignment. Bottom sheet uses CSS transitions (same as existing sheets). No additional API calls beyond what exists today. |

**Gate result**: All principles satisfied. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/029-assignment-redesign/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Phase 1 data model (no changes)
├── quickstart.md        # Phase 1 developer quickstart
├── contracts/           # Phase 1 API contracts (existing endpoints)
│   └── existing-endpoints.md
├── checklists/          # Spec quality checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── AssignmentView.jsx       # NEW: Shared assignment UI (grid + sheet + progress + bottle list)
│   │   ├── AssignmentButton.jsx     # NEW: Circular button for assignment grid
│   │   ├── BottomSheetPicker.jsx    # NEW: Reusable bottom sheet (extracted pattern)
│   │   ├── ItemButton.jsx           # REFERENCE: Visual pattern source (60px circle)
│   │   ├── ItemDetailsDrawer.jsx    # REFERENCE: Bottom sheet animation pattern
│   │   └── SideDrawer.jsx           # REFERENCE: Drawer that hosts AssignmentView in admin page
│   ├── pages/
│   │   ├── EventAdminPage.jsx       # MODIFY: Replace assignment tab content with <AssignmentView>
│   │   ├── ItemAssignmentPage.jsx   # MODIFY: Replace with <AssignmentView> in full-page layout
│   │   └── EventPage.jsx            # REFERENCE: Rating page grid layout to match
│   └── services/
│       ├── itemService.js           # REFERENCE: assignItemId(), getItems()
│       └── apiClient.js             # REFERENCE: transitionEventState()
└── tests/
    └── unit/
        ├── AssignmentView.test.jsx  # NEW: Tests for shared component
        └── EventAdminPage.test.jsx  # MODIFY: Update mocks for new component structure
```

**Structure Decision**: Web application (Option 2). All changes are in the `frontend/` directory. No backend modifications.

## Component Design

### AssignmentView (shared root component)

**Responsibilities**: Orchestrates the entire assignment tab — renders the instructional text, progress indicator, number button grid, bottom sheet picker, and registered bottles verification list. Manages which bottom sheet is open and which number was tapped.

**Props**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | `string` | Yes | Event identifier for API calls |
| `event` | `object` | Yes | Event object (`state`, `itemConfiguration`, `users`) |
| `items` | `array` | Yes | Registered items array from `itemService.getItems()` |
| `isLoadingItems` | `boolean` | Yes | Whether items are being fetched |
| `onAssignItem` | `(bottleId, numberToAssign) => Promise` | Yes | Assignment handler — `bottleId` is the item's nanoid, `numberToAssign` is the tasting number (1-N) or null to clear. Calls `itemService.assignItemId` API. |
| `onPauseEvent` | `() => Promise` | No | Pause handler for inline CTA (US5) |
| `onItemsChange` | `(items) => void` | Yes | Callback to update parent's items state after assignment |

**Internal State**:

| State | Type | Purpose |
|-------|------|---------|
| `selectedNumber` | `number \| null` | Which number button was tapped (opens bottom sheet) |
| `assigningNumber` | `number \| null` | Which number is currently saving (loading indicator) |
| `bottleListExpanded` | `boolean` | Whether the registered bottles section is expanded |

**Computed Values** (no state, derived per render):

| Value | Derivation |
|-------|------------|
| `availableIds` | `[1..numberOfItems]` minus `excludedItemIds` |
| `assignedMap` | `Map<number, item>` from `items.filter(i => i.itemId != null)` |
| `unassignedBottles` | `items.filter(i => i.itemId == null)` |
| `assignedCount` | `assignedMap.size` |
| `totalSlots` | `availableIds.length` |

### AssignmentButton

**Responsibilities**: Renders a single 60px circular button matching `ItemButton`'s visual style, with color fill based on assignment state.

**Props**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `itemId` | `number` | Yes | The number to display |
| `isAssigned` | `boolean` | Yes | Whether this number has been assigned |
| `isDisabled` | `boolean` | No | Whether the button is non-interactive (event not paused) |
| `isLoading` | `boolean` | No | Show spinner while saving |
| `onClick` | `(itemId) => void` | Yes | Tap handler |

**Visual States**:
- **Unassigned + enabled**: Gray background (`bg-muted`), white text, pointer cursor
- **Assigned + enabled**: Green/accent background (`bg-green-500` or similar), white text, pointer cursor
- **Disabled**: Gray background with reduced opacity (`opacity-50`), no cursor
- **Loading**: Spinner replaces number text

### BottomSheetPicker

**Responsibilities**: A reusable slide-up panel. Extracted from the pattern used in `ItemDetailsDrawer`, `WelcomeBottomSheet`, etc.

**Props**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onClose` | `() => void` | Yes | Close handler (backdrop tap, swipe down) |
| `title` | `string` | No | Header text (e.g., "Assign #3") |
| `children` | `ReactNode` | Yes | Content to render inside the sheet |

**Behavior**:
- Backdrop: `fixed inset-0 bg-black/50 z-40`
- Sheet: `fixed bottom-0 left-0 right-0 max-h-[75vh] rounded-t-2xl bg-background z-50`
- Animation: `translate-y-full` → `translate-y-0` (300ms transition)
- Close on backdrop tap or swipe down

### Bottom Sheet Content (rendered inside BottomSheetPicker by AssignmentView)

Two modes based on whether the tapped number is assigned or unassigned:

**Unassigned number**:
- Header: "Assign #{number}"
- Search input (if 6+ unassigned bottles)
- Scrollable list of unassigned bottles: `{name} — {ownerDisplayName}`
- Empty state if no unassigned bottles remain

**Assigned number**:
- Header: "#{number} — {assignedBottleName}"
- Current assignment display with owner
- "Change" button → switches to unassigned bottle picker
- "Clear" button → clears assignment after confirmation

## Rendering Flow

```
1. Host opens Assignment tab
2. AssignmentView receives event + items props
3. Compute availableIds, assignedMap, unassignedBottles
4. Render:
   a. Instructional text (based on event.state)
   b. Progress indicator: "{assignedCount} of {totalSlots} assigned · {unassignedBottles.length} bottles remaining"
   c. If event.state !== 'paused': show overlay/disable + optional pause CTA
   d. 3-column grid of AssignmentButton (one per availableId)
   e. Collapsible "Registered Bottles" section (collapsed by default)

5. Host taps button #3 (unassigned)
6. selectedNumber = 3, BottomSheetPicker opens
7. Sheet shows unassigned bottles list
8. Host taps "Cabernet Sauvignon — Sarah M."
9. Sheet closes immediately (optimistic)
10. AssignmentButton #3 shows loading state
11. onAssignItem(bottleId, 3) called
12. On success: button turns green, progress updates
13. On failure: button reverts to gray, error toast shown
```

## Complexity Tracking

No constitution violations. No entries needed.
