# Quickstart: Assignment Tab Redesign

**Branch**: `029-assignment-redesign` | **Date**: 2026-03-13

## Prerequisites

- Node.js >= 22.12.0
- npm (workspace root has lockfile)

## Setup

```bash
git checkout 029-assignment-redesign
npm install              # from repo root
```

## Development

```bash
cd frontend
npx vite                 # dev server with HMR
```

Navigate to an event's admin page → Items drawer → Assignment tab to see the redesigned UI.

## Testing

```bash
# Unit tests for the new components
cd frontend
npx vitest run tests/unit/AssignmentView.test.jsx
npx vitest run tests/unit/AssignmentButton.test.jsx
npx vitest run tests/unit/BottomSheetPicker.test.jsx

# Existing assignment-related tests
npx vitest run tests/unit/EventAdminPage.test.jsx

# E2E tests
npx playwright test tests/e2e/specs/item-assignment.spec.js
```

## Key Files

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/components/AssignmentView.jsx` | Shared assignment UI (grid + bottom sheet + progress + bottle list) |
| `frontend/src/components/AssignmentButton.jsx` | Circular button for assignment grid (wraps ItemButton visual) |
| `frontend/src/components/BottomSheetPicker.jsx` | Reusable bottom sheet component |
| `frontend/tests/unit/AssignmentView.test.jsx` | Unit tests for the shared component |
| `frontend/tests/unit/AssignmentButton.test.jsx` | Unit tests for the assignment button |
| `frontend/tests/unit/BottomSheetPicker.test.jsx` | Unit tests for the bottom sheet primitive |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/pages/EventAdminPage.jsx` | Replace assignment tab content (~200 lines) with `<AssignmentView>` |
| `frontend/src/pages/ItemAssignmentPage.jsx` | Replace entire assignment UI with `<AssignmentView>` |
| `frontend/tests/unit/EventAdminPage.test.jsx` | Update mocks/assertions for new component structure |

### Reference Files (read-only)
| File | Why |
|------|-----|
| `frontend/src/components/ItemButton.jsx` | Visual pattern to match (60px circle, 3-col grid) |
| `frontend/src/components/ItemDetailsDrawer.jsx` | Bottom sheet slide-up animation pattern |
| `frontend/src/pages/EventPage.jsx` | Rating page grid layout (lines 676-692) to replicate |
| `frontend/src/services/itemService.js` | `assignItemId()` and `getItems()` API methods |
| `frontend/src/services/apiClient.js` | `transitionEventState()` for pause CTA |
| `backend/src/services/ItemService.js` | Assignment validation logic (reference) |

## Component Architecture

```
EventAdminPage (drawer)          ItemAssignmentPage (full page)
        │                                │
        └──────── AssignmentView ─────────┘
                       │
           ┌───────────┼───────────────┐
           │           │               │
    AssignmentButton   │    BottomSheetPicker
    (grid of circles)  │    (bottle list)
                       │
              Progress indicator
              Instructional text
              Registered Bottles list
```

## Props Interface (AssignmentView)

```jsx
<AssignmentView
  eventId={eventId}
  event={event}                    // Event object with state, itemConfiguration, users
  items={items}                    // Registered items array
  isLoadingItems={isLoadingItems}  // Loading state
  onAssignItem={handleAssignItemId}  // (itemId, itemIdToAssign) => Promise
  onPauseEvent={handlePauseEvent}    // () => Promise (optional, for inline pause CTA)
  onItemsChange={setItems}           // (items) => void (to update parent state after assignment)
/>
```
