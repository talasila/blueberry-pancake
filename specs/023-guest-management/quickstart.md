# Quickstart: Guest Management (023)

**Feature Branch**: `023-guest-management`

## Manual Test Steps

1. **Open Event Admin**  
   Log in as an admin and open an event with several registered users (some with items, some without, at least one additional administrator).

2. **Verify Guests card**  
   - The event admin page shows a "Guests" card between the Administrators card and the Export Data card.
   - The card displays a badge with the count of non-administrator guests (e.g., "8 registered").
   - Verify the count excludes administrators.

3. **Open Guests drawer**  
   - Tap the Guests card. A side drawer titled "Guests" opens.
   - The list shows all registered users (including administrators).
   - Each entry displays: name (or email if no name), email, registration date, items count, and item names.
   - Administrators have "Owner" or "Admin" badges.
   - Sort order: owners first, then admins, then regular guests alphabetically by email.

4. **Search guests**  
   - Type a partial name in the search input → list filters to matching guests.
   - Type a partial email → list filters to matching guests.
   - Type an item name (e.g., "Merlot") → the guest who registered that item appears.
   - Summary line updates (e.g., "Showing 3 of 12 guests").
   - Clear search → all guests reappear.
   - Search with no matches → empty state message shown.

5. **Delete a guest**  
   - Click the trash icon on a regular guest's row.
   - Confirmation dialog appears showing email, name, items count, and ratings count.
   - Type "DELETE USER" and confirm → guest disappears from list, counts update, success message shown.
   - Cancel the dialog → no deletion occurs.

6. **Owner protection**  
   - Verify the owner's row does NOT show a delete button.

7. **Last admin protection**  
   - If there is only one administrator, verify that deleting them is prevented (backend returns error).

8. **Refresh button**  
   - With the drawer open, tap the Refresh button.
   - The Refresh button shows an inline spinner while fetching.
   - The existing list stays visible during refresh.
   - After fetch completes, the list updates with fresh data.

9. **Auto-refresh on open**  
   - Register a new guest (from another browser/session).
   - Close and re-open the Guests drawer.
   - The new guest appears in the list without manual refresh.

10. **Danger Zone cleanup**  
    - Open the Danger Zone drawer.
    - Verify the "Users Management" section (individual user select dropdown + delete button) is NOT present.
    - Verify the "Delete All Users" section is still present and functional.

11. **Empty state**  
    - On an event with zero registered users, open the Guests drawer.
    - Verify an empty state message is shown (e.g., "No guests registered yet").

12. **Terminology**  
    - For a wine event, item references should say "wines" or "bottles."
    - For a non-wine event, item references should say "items."

## Implementation Entry Points

- **Guests card**: `frontend/src/pages/EventAdminPage.jsx` — add new card button between Administrators card (~line 1861) and Export Data card (~line 1863). Uses `getNonAdminUserCount()` for badge count. Opens `setOpenDrawer('guests')`.

- **Guests SideDrawer**: `frontend/src/pages/EventAdminPage.jsx` — add new `<SideDrawer>` after Administrators drawer (~line 2786). Contains search input, summary line, guest list, and Refresh button.

- **Guest list data**: `frontend/src/pages/EventAdminPage.jsx` — extend `getAllUsersWithStats()` (~line 753) to include `itemNames` in its return object.

- **Search filtering**: New `guestSearchQuery` state + `useMemo` filter in EventAdminPage. Follows same pattern as Items Assignment tab search (~lines 1555–1580).

- **Refresh on open**: Add `useEffect` watching for `openDrawer === 'guests'` that fetches event + items + administrators. New `isRefreshingGuests` state for the Refresh button spinner.

- **Delete flow**: Reuse existing `handleOpenDeleteUserDialog()` and `handleDeleteUser()` functions; reuse existing `<DeleteUserDialog>` component already rendered in EventAdminPage.

- **Danger Zone cleanup**: Remove "Users Management" section (~lines 3007–3071) and `selectedUserEmail` state. Keep "Delete All Users" section and all its state/handlers.

- **E2E tests**: New `frontend/tests/e2e/specs/guest-management.spec.js` covering all 4 user stories: guest list display, search, delete, and Danger Zone cleanup. Use existing `testEvent` fixture, `helpers.js` utilities, and Playwright locators.
