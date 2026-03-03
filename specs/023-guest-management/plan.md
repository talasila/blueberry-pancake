# Implementation Plan: Guest Management on Event Admin Page

**Branch**: `023-guest-management` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/023-guest-management/spec.md`

## Summary

Add a dedicated "Guests" card and side drawer to the event admin page that consolidates guest registration information (name, email, registration date, registered items) into a single searchable list with per-row delete. The drawer auto-refreshes data on open and provides a manual Refresh button for freshness during pre-event registration influx. Move individual user delete out of Danger Zone into this new drawer. No new backend endpoints; all data comes from existing `event.users` and `itemService.getItems()`, and deletion uses the existing `DELETE /events/:eventId/users/:email` endpoint.

## Technical Context

**Language/Version**: JavaScript (ESM), Node.js >=22.12.0  
**Primary Dependencies**: React 19, Vite, Radix UI, Tailwind CSS, lucide-react, react-router-dom (frontend)  
**Storage**: N/A (reads existing event data from DynamoDB via existing APIs; no new storage)  
**Testing**: Vitest (unit), Playwright (e2e); existing patterns in `frontend/tests/`  
**Target Platform**: Web (mobile-first)  
**Project Type**: Web application (frontend + backend; this feature is frontend-only)  
**Performance Goals**: Drawer open with fresh data in <3s; search filtering is synchronous client-side  
**Constraints**: No new backend endpoints; reuse existing SideDrawer, DeleteUserDialog, Badge, Message, Button, Input components; follow existing EventAdminPage drawer patterns  
**Scale/Scope**: One new drawer card + SideDrawer content in EventAdminPage; extend `getAllUsersWithStats()`; new E2E test spec; remove Danger Zone "Users Management" section

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle                     | Status | Notes                                                                                                                                                          |
|-------------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| I. Code Quality               | Pass   | New drawer follows established card→SideDrawer pattern; clear single responsibility (guest list + delete)                                                     |
| II. DRY                       | Pass   | Reuses SideDrawer, DeleteUserDialog, Badge, Message, Button, Input; extends existing `getAllUsersWithStats()` rather than duplicating; search mirrors Items Assignment tab pattern |
| III. Maintainability          | Pass   | Removes redundant individual-delete from Danger Zone; consolidates guest management in one place; dead code eliminated                                         |
| IV. Testing Standards         | Pass   | E2E tests for guest list, search, delete, refresh, Danger Zone cleanup; unit test not required (no new pure logic — list aggregation is UI-level)             |
| V. Security                   | Pass   | No new endpoints; existing auth gates on admin page; existing backend delete endpoint validates permissions                                                    |
| VI. UX Consistency            | Pass   | Same SideDrawer pattern, same Badge/Button/Input components, same Tailwind classes as other admin drawers                                                     |
| VII. Performance              | Pass   | Refresh fetches same endpoints already used by admin page; client-side search with no new API calls; inline loading indicator avoids blocking UI               |

## Project Structure

### Documentation (this feature)

```text
specs/023-guest-management/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 (README only; no new API)
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── SideDrawer.jsx           # Existing — reuse for Guests drawer
│   │   ├── DeleteUserDialog.jsx     # Existing — reuse for per-row delete confirmation
│   │   ├── Message.jsx              # Existing — reuse for error/success messages
│   │   └── ui/
│   │       ├── badge.tsx            # Existing — Owner/Admin role badges
│   │       ├── button.tsx           # Existing — Refresh button, delete button
│   │       └── input.tsx            # Existing — search input
│   ├── pages/
│   │   └── EventAdminPage.jsx       # MODIFIED — add Guests card, Guests SideDrawer, remove Users Management from Danger Zone
│   └── utils/
│       └── itemTerminology.js       # Existing — use for item type labels
└── tests/
    └── e2e/
        └── specs/
            └── guest-management.spec.js  # NEW — E2E tests for all 4 user stories
```

**Structure Decision**: Web app; feature is frontend-only. All changes in `frontend/`: Guests card + drawer in `EventAdminPage.jsx`, new E2E spec. No backend changes, no new components, no new utilities.

## Implementation Design

### Guests Card (between Administrators and Export Data)

- Insert a new `<button>` card at ~line 1862 (after Administrators card, before Export Data card)
- Uses `getNonAdminUserCount()` for the badge count (already exists)
- Opens drawer via `setOpenDrawer('guests')` + `history.pushState`

### Guests SideDrawer

- New `<SideDrawer isOpen={openDrawer === 'guests'} title="Guests" width="w-full max-w-2xl">`
- Placed after the Administrators SideDrawer (~line 2786)

### Data Fetching & Refresh (FR-021, FR-022, FR-023)

- **On drawer open**: When `openDrawer` transitions to `'guests'`, trigger a refresh:
  - Call `apiClient.getEvent(eventId)` → `setEvent(refreshedEvent)`
  - Call `itemService.getItems(eventId)` → `setItems(allItems)`
  - Call `fetchAdministrators()` to ensure admin badges are current
- **Refresh button**: Inside drawer header area, a `<Button>` with `<RefreshCw>` icon
  - On click, same fetch sequence as above
  - During fetch: show `<RefreshCw className="animate-spin">` on the button (inline loading indicator per FR-023)
  - State: `const [isRefreshingGuests, setIsRefreshingGuests] = useState(false);`
- Existing guest list stays visible during refresh; updates in place when data arrives

### Guest List (FR-003–FR-006)

- Extend `getAllUsersWithStats()` to also return `itemNames` (array of item name strings):

```javascript
const userItemNames = userItems.map(item => item.name).filter(Boolean);
return {
  ...existingFields,
  itemNames: userItemNames,
};
```

- Render each guest as a row with:
  - Name (bold, truncate with ellipsis for long names) + email below; item names wrap naturally (no truncation)
  - If no name: email as primary identifier
  - Registration date: `new Date(registeredAt).toLocaleDateString()` with "Unknown" fallback
  - Items: `"{count} {terminology}: {names joined by comma}"` — names wrap naturally
  - Role badge: `<Badge variant="outline">Owner</Badge>` or `<Badge variant="outline">Admin</Badge>`
  - Delete button: `<Button variant="ghost" size="icon"><Trash2 /></Button>` — hidden for owner

### Search (FR-007)

- New state: `const [guestSearchQuery, setGuestSearchQuery] = useState('');`
- Filter logic (matching Items Assignment tab pattern):

```javascript
const filteredGuests = useMemo(() => {
  const allGuests = getAllUsersWithStats();
  if (!guestSearchQuery.trim()) return allGuests;
  const query = guestSearchQuery.trim().toLowerCase();
  return allGuests.filter(guest => {
    if (guest.name?.toLowerCase().includes(query)) return true;
    if (guest.email.toLowerCase().includes(query)) return true;
    if (guest.itemNames.some(name => name.toLowerCase().includes(query))) return true;
    return false;
  });
}, [event?.users, items, administrators, guestSearchQuery]);
```

### Summary Line (FR-008)

- When filtered: `"Showing {filtered.length} of {all.length} guests"`
- When unfiltered: `"{all.length} guests"`

### Delete (FR-009–FR-013)

- Reuse existing `handleOpenDeleteUserDialog(email, name, isAdministrator)` — fetches items count and ratings count on demand
- Reuse existing `handleDeleteUser()` — calls `apiClient.deleteUser`, refreshes event + items + admins
- Reuse existing `<DeleteUserDialog>` component (already rendered at bottom of EventAdminPage)
- Owner rows: no delete button rendered (FR-011)
- Last-admin protection: handled by existing `handleOpenDeleteUserDialog` logic and backend validation

### Danger Zone Cleanup (FR-014, FR-015)

- Remove the "Users Management" section (~lines 3007–3071 in EventAdminPage.jsx):
  - The `<select>` dropdown for choosing a user
  - The "Delete User" button
  - The associated `selectedUserEmail` state and related error/success messages
- Keep "Delete All Users" section unchanged
- Keep `deleteUserSuccess` and `deleteUserError` state (still used by Guests drawer delete flow)
- Remove `selectedUserEmail` state (no longer needed)

### State Variables (new)

| Variable              | Type    | Purpose                                    |
|-----------------------|---------|--------------------------------------------|
| `guestSearchQuery`    | string  | Search input value for guest filtering     |
| `isRefreshingGuests`  | boolean | Loading state for Refresh button indicator |

### State Variables (removed)

| Variable              | Reason                                              |
|-----------------------|-----------------------------------------------------|
| `selectedUserEmail`   | Was for Danger Zone dropdown; no longer needed       |

## Complexity Tracking

No violations. No new components, no new backend endpoints, no new utilities. The feature composes existing building blocks.
