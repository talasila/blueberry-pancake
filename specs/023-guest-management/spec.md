# Feature Specification: Guest Management on Event Admin Page

**Feature Branch**: `023-guest-management`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "As an event host (admin), I want a dedicated 'Guests' section on the event admin (settings) page that gives me a consolidated view of all registered guests and an easy way to remove individual guests. A new 'Guests' card appears on the event admin page (between Administrators and Export Data) showing the count of registered guests (excluding administrators). Tapping the card opens a side drawer titled 'Guests' with a searchable list of all registered users. Each guest entry in the list displays: name (if available), email, registration date, number of items (wines/bottles) registered, and the names of those items. Guests who are administrators should show a badge (Owner or Admin) next to their name. The list is sorted with owners first, then admins, then regular guests alphabetically by email. An admin can search/filter the guest list by name or email using a search input at the top of the drawer. A summary line at the top shows the total count and filtered count (e.g. 'Showing 5 of 12 guests'). Each guest row has a delete button (trash icon) that opens the existing delete user confirmation dialog. The confirmation dialog shows items count and ratings count and requires typing 'DELETE USER' to confirm. Owners cannot be deleted. The last remaining administrator cannot be deleted. These rules already exist in the codebase. After a guest is deleted, the list refreshes to reflect the change. The individual user delete functionality currently in the Danger Zone drawer should be removed from there, since it now lives in the Guests drawer. The 'Delete All Users' bulk action should remain in Danger Zone. No new backend API endpoints are needed. All data comes from event.users and the items list already loaded on the admin page. Deletion uses the existing DELETE /events/:eventId/users/:email endpoint."

## Clarifications

### Session 2026-03-03

- Q: Should administrators appear in the guest list or only non-admin guests? → A: All users appear in the list (administrators included) with role badges (Owner, Admin). The card badge count on the admin page shows non-admin guests only, but the drawer list shows everyone so the admin has a complete view.
- Q: Should the guest list show per-user rating counts? → A: No — rating counts are fetched on-demand only when the delete confirmation dialog is opened (existing behavior). Displaying them inline for every guest would require loading all ratings on drawer open, which is unnecessary for the primary use case of browsing guests.
- Q: Should tapping a guest row expand to show more details, or is the summary row sufficient? → A: The summary row is sufficient. Each row shows name, email, registration date, item count, and item names. No expandable details are needed; the focus is on a scannable list with quick delete access.
- Q: Should the delete button be hidden or disabled for the event owner? → A: Hidden — the owner's row has no delete button at all. This communicates that the owner is immutable and keeps the row clean.
- Q: Should item names be truncated when a guest has many registered items? → A: No — show all item names and let them wrap naturally. Rows may be taller for guests with many items, but this keeps the display simple and avoids hiding information.
- Q: Should the guest search also match registered item names, or only guest name and email? → A: Search should match name, email, and item names (case-insensitive, partial match) — same search scope as the existing Items Assignment tab. This allows admins to answer "who brought the Merlot?" directly from the Guests drawer.
- Q: How should the guest list stay fresh during pre-event registration influx? → A: Auto-refresh on drawer open plus a manual refresh button inside the drawer. Every time the Guests drawer is opened, it re-fetches event data and items so the admin always sees the latest list. A visible "Refresh" button inside the drawer lets the admin update the list without closing and reopening. No automatic polling while the drawer is open.
- Q: What should the loading state look like during refresh? → A: Inline loading indicator on the Refresh button — the existing list stays visible and updates when fresh data arrives. This avoids a jarring blank screen and lets the admin continue reading the current list while the refresh completes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Guest List (Priority: P1)

An event administrator opens the event admin (settings) page and sees a "Guests" card showing the number of registered guests (excluding administrators). Tapping the card opens a side drawer titled "Guests" displaying a list of all registered users. Each entry shows the guest's name (if available), email address, registration date, number of items registered, and the names of those items. Administrators in the list are distinguished with a role badge ("Owner" or "Admin"). The list is sorted with owners first, then administrators, then regular guests alphabetically by email.

**Why this priority**: This is the core value of the feature — giving the admin a single, consolidated place to see who has registered for their event and what they brought. Without this, guest information is scattered across the Dashboard Users tab, Items Assignment tab, and nowhere shows it all together.

**Independent Test**: Create an event with several registered users (some with items, some without, at least one additional administrator). Navigate to the event admin page. Verify the Guests card appears between Administrators and Export Data with the correct non-admin guest count. Tap it and verify the drawer opens with all users listed, each showing their name, email, registration date, items count, and item names. Verify administrators have role badges and the sort order is correct.

**Acceptance Scenarios**:

1. **Given** an event with registered users, **When** the admin views the event admin page, **Then** a "Guests" card is visible between the Administrators card and the Export Data card, displaying the count of non-administrator guests as a badge (e.g., "8 registered").
2. **Given** the admin taps the Guests card, **When** the side drawer opens, **Then** it is titled "Guests" and displays a list of all registered users (including administrators).
3. **Given** a guest has a name set, **When** the admin views the guest list, **Then** the guest's name is displayed prominently with their email below it.
4. **Given** a guest has no name set, **When** the admin views the guest list, **Then** the guest's email is displayed as the primary identifier.
5. **Given** a guest has registered items for the event, **When** the admin views that guest's entry, **Then** the entry shows the number of items registered and their names (e.g., "2 items: Château Margaux, Opus One").
6. **Given** a guest has registered zero items, **When** the admin views that guest's entry, **Then** the entry shows "0 items" or equivalent with no item names.
7. **Given** the guest list contains administrators, **When** the admin views the list, **Then** each administrator has a visible badge indicating their role ("Owner" or "Admin").
8. **Given** the guest list contains a mix of owners, administrators, and regular guests, **When** the admin views the list, **Then** the list is sorted with owners first, then administrators, then regular guests, with each group sorted alphabetically by email.
9. **Given** each guest entry, **When** the admin reads it, **Then** the registration date is displayed in a human-readable format (e.g., "Mar 1, 2026").
10. **Given** an event with zero registered users, **When** the admin opens the Guests drawer, **Then** an empty state message is shown (e.g., "No guests registered yet").
11. **Given** the Guests drawer is already open, **When** the admin taps the "Refresh" button, **Then** the guest list re-fetches the latest event data and items and updates the display.
12. **Given** the Guests drawer was previously closed, **When** the admin re-opens it, **Then** the list displays freshly fetched data (not cached from the previous open).

---

### User Story 2 - Search and Filter Guests (Priority: P2)

An event administrator opens the Guests drawer and uses a search input at the top to filter the guest list by name or email. A summary line shows the total count and the filtered count so the admin always knows how many guests match their search.

**Why this priority**: With many guests, scanning the full list becomes impractical. Search enables the admin to quickly find a specific guest by name or email. This is independently valuable even without the delete functionality.

**Independent Test**: Create an event with 10+ registered users with varied names and emails. Open the Guests drawer. Type a partial name or email in the search input. Verify the list filters in real time and the summary line updates (e.g., "Showing 3 of 12 guests"). Clear the search and verify all guests reappear.

**Acceptance Scenarios**:

1. **Given** the Guests drawer is open, **When** the admin views the top of the drawer, **Then** a search input is visible with appropriate placeholder text (e.g., "Search by name, email, or item...").
2. **Given** the admin types a search term, **When** the term matches one or more guest names, email addresses, or registered item names (case-insensitive, partial match), **Then** the list filters to show only matching guests.
3. **Given** the admin types a search term that matches no guests, **When** the list filters, **Then** an empty state message is shown (e.g., "No guests match your search").
4. **Given** the guest list is filtered, **When** the admin views the summary line, **Then** it shows both the filtered count and the total count (e.g., "Showing 3 of 12 guests").
5. **Given** no search term is entered, **When** the admin views the summary line, **Then** it shows only the total count (e.g., "12 guests").
6. **Given** the admin clears the search input, **When** the list updates, **Then** all guests are shown again and the summary line reflects the full count.
7. **Given** a guest registered an item named "Merlot", **When** the admin types "Merlot" in the search input, **Then** that guest appears in the filtered list.

---

### User Story 3 - Delete Individual Guest (Priority: P2)

An event administrator opens the Guests drawer, locates a guest, and deletes them using a delete button on the guest's row. The existing delete user confirmation dialog opens, showing the guest's items count and ratings count and requiring the admin to type "DELETE USER" to confirm. After deletion, the guest list refreshes to reflect the change.

**Why this priority**: This provides a more accessible and intuitive way to remove a guest compared to the current Danger Zone dropdown. It pairs naturally with the guest list (see the guest, decide to remove them, remove them — all in one place). This has equal priority with search because both are essential companion features to the guest list.

**Independent Test**: Create an event with several registered users (including at least one with items and ratings). Open the Guests drawer. Click the delete button on a regular guest's row. Verify the confirmation dialog appears showing the correct items count and ratings count. Type "DELETE USER" and confirm. Verify the guest disappears from the list and the count updates. Verify the guest's items and ratings are also removed.

**Acceptance Scenarios**:

1. **Given** the Guests drawer is open with a list of guests, **When** the admin views a guest row, **Then** a delete button (trash icon) is visible on the row.
2. **Given** the admin clicks the delete button for a guest, **When** the confirmation dialog opens, **Then** it shows the guest's email, name (if available), items count, and ratings count, and requires typing "DELETE USER" to confirm.
3. **Given** the admin confirms deletion by typing "DELETE USER" and clicking the confirm button, **When** the deletion completes, **Then** the guest is removed from the list, the guest count updates, and a success message is shown.
4. **Given** the admin cancels the deletion dialog, **When** the dialog closes, **Then** no guest is deleted and the list remains unchanged.
5. **Given** the guest being deleted is an administrator (but not the owner and not the last administrator), **When** the admin confirms deletion, **Then** the administrator is deleted and removed from both the guest list and the administrators list.
6. **Given** the guest is the event owner, **When** the admin views the owner's row, **Then** no delete button is shown on the owner's row.
7. **Given** the guest being deleted is the last remaining administrator, **When** the admin attempts to delete them, **Then** the system prevents the deletion and the administrator remains in the list.
8. **Given** a guest is successfully deleted, **When** the admin views the guest list, **Then** the summary count updates to reflect the new total.

---

### User Story 4 - Remove Individual User Delete from Danger Zone (Priority: P3)

The individual user delete functionality (the dropdown-based "Users Management" section) is removed from the Danger Zone drawer since it now lives in the Guests drawer. The "Delete All Users" bulk action remains in Danger Zone.

**Why this priority**: This is a cleanup task that removes redundancy. It depends on User Stories 1 and 3 being implemented first. Without removing the old location, admins would have two places to delete individual users, which is confusing.

**Independent Test**: Navigate to the event admin page. Open the Danger Zone drawer. Verify the "Users Management" section (individual user delete with dropdown) is no longer present. Verify the "Delete All Users" section is still present and functional.

**Acceptance Scenarios**:

1. **Given** the admin opens the Danger Zone drawer, **When** they view the contents, **Then** the "Users Management" section (individual user select dropdown and delete button) is not present.
2. **Given** the admin opens the Danger Zone drawer, **When** they view the contents, **Then** the "Delete All Users" section is still present and functional.
3. **Given** the admin wants to delete an individual user, **When** they look for the functionality, **Then** it is available only in the Guests drawer (not in Danger Zone).

---

### Edge Cases

- What happens when the admin searches and then deletes a guest from the filtered list? (The list should refresh with the search filter still applied; the deleted guest should disappear and counts should update.)
- What happens when all guests matching a search are deleted? (The list should show the "no guests match your search" empty state; clearing the search should show remaining guests.)
- What happens when the event has only administrators and no regular guests? (The Guests card should show "0 registered"; the drawer should show only the administrators with their role badges.)
- What happens when a guest has a very long name or many registered items? (Long names should truncate with ellipsis. Item names should all be shown and wrap naturally — rows may be taller for guests with many items.)
- What happens when a guest's registration date is missing or invalid? (A fallback such as "Unknown" or no date should be displayed instead of a broken date.)
- What happens when the admin deletes a guest while the guest list is still loading? (Delete actions should be disabled while the list is loading.)
- What happens when deletion fails due to a network error? (An error message should be displayed and the guest should remain in the list; the admin can retry.)
- What happens when an admin who is also a guest is deleted from the Guests drawer? (The administrator is removed from both the administrators list and the users list, consistent with existing behavior.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a "Guests" card on the event admin page, positioned between the Administrators card and the Export Data card.
- **FR-002**: The Guests card MUST show a badge with the count of registered guests excluding administrators.
- **FR-003**: Tapping the Guests card MUST open a side drawer titled "Guests" displaying all registered users (including administrators).
- **FR-004**: Each guest entry MUST display: name (if available), email address, registration date, number of items registered, and the names of registered items.
- **FR-005**: Administrator guests MUST display a role badge indicating "Owner" or "Admin" next to their name or email.
- **FR-006**: The guest list MUST be sorted with owners first, then administrators, then regular guests, with each group sorted alphabetically by email.
- **FR-007**: The Guests drawer MUST include a search input at the top that filters the list by guest name, email, or registered item names (case-insensitive, partial match), consistent with the search behavior in the Items Assignment tab.
- **FR-008**: The Guests drawer MUST display a summary line showing the total guest count and, when filtered, the filtered count (e.g., "Showing 5 of 12 guests").
- **FR-009**: Each guest row MUST include a delete button (trash icon) that opens the existing delete user confirmation dialog. The event owner's row MUST NOT display a delete button (owner deletion is prevented both client-side and server-side).
- **FR-010**: The delete confirmation dialog MUST show the guest's email, name (if available), items count, and ratings count, and MUST require typing "DELETE USER" to confirm.
- ~~**FR-011**~~: _Consolidated into FR-009._ The owner delete-button suppression and server-side protection are fully covered by FR-009.
- **FR-012**: The system MUST prevent deletion of the last remaining administrator.
- **FR-013**: After a guest is successfully deleted, the guest list and summary count MUST refresh to reflect the change without requiring the admin to close and reopen the drawer.
- **FR-014**: The individual user delete functionality ("Users Management" section with dropdown) MUST be removed from the Danger Zone drawer.
- **FR-015**: The "Delete All Users" bulk action MUST remain in the Danger Zone drawer unchanged.
- **FR-016**: The system MUST display an appropriate empty state message when no guests are registered.
- **FR-017**: The system MUST display an appropriate empty state message when a search yields no matching guests.
- **FR-018**: The system MUST display an error message when guest deletion fails and allow the admin to retry.
- **FR-019**: The Guests card and drawer MUST only be visible to authenticated event administrators.
- **FR-020**: Item terminology in the guest list (e.g., "wines", "bottles", "items") MUST match the event's configured item type, consistent with existing terminology patterns throughout the application.
- **FR-021**: The Guests drawer MUST re-fetch event data and items each time it is opened, so the admin always sees the latest guest list.
- **FR-022**: The Guests drawer MUST include a visible "Refresh" button that re-fetches event data and items on demand without requiring the drawer to be closed and reopened.
- **FR-023**: During a refresh (on open or via the Refresh button), the system MUST show an inline loading indicator on the Refresh button while keeping the existing guest list visible. The list MUST update in place once fresh data arrives.

### Key Entities

- **Guest**: A registered user of the event. Key attributes: email address (unique identifier), name (optional display name), registration date (when they joined the event), registered items (list of items they brought to the event), administrator status (whether they are an owner, administrator, or regular guest). Guests are a subset of the broader "users" entity already tracked by the system.

- **Guest List**: An aggregated view combining user registration data with item registration data to present a per-guest summary. Derived from existing event user data and item data — not a new data entity.

## Assumptions

- Event data and items are re-fetched each time the Guests drawer is opened and when the admin taps the Refresh button, ensuring freshness during active registration periods. Between refreshes, the drawer operates on client-side data.
- Ratings count per guest is loaded on-demand only when the delete confirmation dialog is opened, not preloaded for the entire list.
- The existing delete user confirmation dialog and its behavior (typing "DELETE USER" to confirm) remain unchanged.
- The existing deletion protection rules (cannot delete owner, cannot delete last administrator) remain unchanged and are enforced by both the UI and the backend.
- The delete endpoint (`DELETE /events/:eventId/users/:email`) already handles cleanup of associated data (items, ratings, bookmarks, profile).
- No new backend API endpoints are needed for this feature.
- The search filter operates client-side on already-loaded data.
- The Guests card is visible to all authenticated event administrators regardless of event state (created, started, paused, completed).
- The guest count on the card excludes administrators to give the admin a quick read of "how many non-admin guests are coming," while the drawer shows everyone for a complete picture.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can view the complete guest list (open admin page, tap Guests card, see all guests) in under 3 seconds from page load.
- **SC-002**: Administrators can locate a specific guest by name or email using the search input in under 5 seconds.
- **SC-003**: Administrators can delete an individual guest (find guest, tap delete, confirm, see updated list) in under 15 seconds from opening the Guests drawer.
- **SC-004**: 100% of guest entries display email, registration date, and items count without requiring navigation to another page or drawer.
- **SC-005**: The guest list displays role badges for all administrators in 100% of views.
- **SC-006**: The individual user delete functionality is no longer present in the Danger Zone drawer after implementation.
- **SC-007**: Guest list correctly reflects deletions immediately without requiring page refresh or drawer close/reopen.
- **SC-008**: The "Delete All Users" functionality in Danger Zone continues to work identically to its current behavior.

## Dependencies

- Event admin page (existing) for hosting the new Guests card and drawer
- Side drawer component (existing) for the Guests drawer UI
- Delete user confirmation dialog component (existing) for deletion confirmation
- Event user data and item data (already loaded on admin page) for populating the guest list
- Delete user endpoint (existing) for executing guest deletion
- Item terminology utility (existing) for matching event-specific item naming

## Out of Scope

- Bulk guest deletion from the Guests drawer (remains in Danger Zone as "Delete All Users")
- Guest invitation or notification system
- Guest profile editing from the admin page
- Guest rating details or progress within the Guests drawer (available on Dashboard Users tab)
- Export functionality from the Guests drawer (available in Export Data drawer)
- Guest sorting controls beyond the default sort order (owners → admins → alphabetical)
- Pagination of the guest list (client-side filtering is sufficient for typical event sizes)
- Automatic polling or real-time push updates while the drawer is open (manual Refresh button is provided instead)
