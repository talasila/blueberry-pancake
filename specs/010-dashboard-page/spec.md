# Feature Specification: Event Dashboard Page

**Feature Branch**: `010-dashboard-page`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "dashboard page"

## Clarifications

### Session 2025-01-27

- Q: How should the dashboard update its data? → A: Manual refresh button - user can click a button to refresh data
- Q: What should happen when a regular user tries to access the dashboard before the event is completed? → A: Redirect to event main page when user tries to access /event/:eventId/dashboard page directly. Also do not display dashboard link/button to regular users.
- Q: How should the system handle the edge cases when C=0 (no users) or when global_avg is undefined (no ratings exist)? → A: Show zero/empty values with clear messaging - display "N/A" or "0" with explanatory text when calculations cannot be performed
- Q: What should be the default sort order for the item ratings table when the dashboard first loads? → A: Sort by Item ID ascending - show items in numerical order (1, 2, 3...)
- Q: How should the dashboard handle loading states and error scenarios? → A: Show loading indicators and error messages - display loading spinners while fetching data, show user-friendly error messages if data cannot be loaded
- Q: How many decimal places should be displayed for average ratings in the table? → A: 2 decimal places - show "3.40" (consistent with weighted average precision)
- Q: What visual details should the rating progression progress bar include? → A: Visual bar only - just the progress bar without any text labels
- Q: Where should the dashboard link/button be located? → A: Provide a link/button in the profile page along with the other buttons on top. For regular users this link should only show up if the event is in "completed" state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Views Dashboard Anytime (Priority: P1)

Administrators can access the dashboard page at any time, regardless of event state, to view event statistics and item rating details.

**Why this priority**: Administrators need real-time visibility into event metrics to monitor progress and make informed decisions throughout the event lifecycle.

**Independent Test**: Can be fully tested by navigating to the dashboard as an administrator when the event is in any state (created, started, paused, or completed) and verifying all statistics and table data are displayed correctly.

**Acceptance Scenarios**:

1. **Given** an event administrator is logged in, **When** they navigate to the dashboard page while the event is in "started" state, **Then** they see all dashboard statistics and the item ratings table
2. **Given** an event administrator is logged in, **When** they navigate to the dashboard page while the event is in "created" state, **Then** they see all dashboard statistics and the item ratings table (may show zero values)
3. **Given** an event administrator is logged in, **When** they navigate to the dashboard page while the event is in "paused" state, **Then** they see all dashboard statistics and the item ratings table
4. **Given** an event administrator is logged in, **When** they navigate to the dashboard page while the event is in "completed" state, **Then** they see all dashboard statistics and the item ratings table

---

### User Story 2 - Regular User Views Dashboard When Event Completed (Priority: P2)

Regular users (non-administrators) can access the dashboard page only when the event is in "completed" state to view final event statistics and item rating results.

**Why this priority**: Regular users should be able to view final results after the event concludes, but should not have access to ongoing statistics during active events.

**Independent Test**: Can be fully tested by attempting to access the dashboard as a regular user in different event states and verifying access is granted only when the event is "completed", with appropriate access denial for other states.

**Acceptance Scenarios**:

1. **Given** a regular user is logged in and the event is in "completed" state, **When** they navigate to the dashboard page, **Then** they see all dashboard statistics and the item ratings table
2. **Given** a regular user is logged in and the event is in "started" state, **When** they attempt to navigate to the dashboard page directly via URL, **Then** they are redirected to the event main page
3. **Given** a regular user is logged in and the event is in "created" state, **When** they attempt to navigate to the dashboard page directly via URL, **Then** they are redirected to the event main page
4. **Given** a regular user is logged in and the event is in "paused" state, **When** they attempt to navigate to the dashboard page directly via URL, **Then** they are redirected to the event main page
5. **Given** a regular user is logged in and the event is not in "completed" state, **When** they view the profile page, **Then** they do not see a dashboard link or button in the top navigation buttons
6. **Given** an event administrator is logged in, **When** they view the profile page, **Then** they see a dashboard link or button in the top navigation buttons regardless of event state
7. **Given** a regular user is logged in and the event is in "completed" state, **When** they view the profile page, **Then** they see a dashboard link or button in the top navigation buttons

---

### User Story 3 - View Summary Statistics (Priority: P1)

Users can view four key summary statistics displayed as large number gadgets: total users, total bottles, total ratings, and average ratings per bottle.

**Why this priority**: Summary statistics provide immediate high-level insights into event participation and engagement, forming the foundation of the dashboard experience.

**Independent Test**: Can be fully tested by accessing the dashboard and verifying all four statistics are displayed correctly with accurate calculations based on event data.

**Acceptance Scenarios**:

1. **Given** a user with dashboard access views the dashboard, **When** the page loads, **Then** they see four large number gadgets in two rows: row one shows "Total Users" and "Total Bottles", row two shows "Total Ratings" and "Average Ratings per Bottle"
2. **Given** an event with 30 registered users, **When** a user views the dashboard, **Then** the "Total Users" gadget displays "30"
3. **Given** an event with 35 bottles configured (excluding 2 items), **When** a user views the dashboard, **Then** the "Total Bottles" gadget displays "33" (35 - 2 excluded)
4. **Given** an event with 150 total ratings submitted, **When** a user views the dashboard, **Then** the "Total Ratings" gadget displays "150"
5. **Given** an event with 150 total ratings across 33 bottles, **When** a user views the dashboard, **Then** the "Average Ratings per Bottle" gadget displays "4.55" (150 / 33, rounded appropriately)

---

### User Story 4 - View Item Ratings Table with Sortable Columns (Priority: P1)

Users can view a detailed table of item ratings with columns for item ID, rating progression (progress bar), average rating, and weighted average, with all columns being sortable.

**Why this priority**: The item ratings table is the core feature providing detailed insights into individual item performance, enabling users to identify top-rated items and items needing more ratings.

**Independent Test**: Can be fully tested by accessing the dashboard, viewing the table, and verifying all columns display correctly and sorting works for each column.

**Acceptance Scenarios**:

1. **Given** a user with dashboard access views the dashboard, **When** the page loads, **Then** they see a table with columns: "ID", "Rating Progression", "Average Rating", and "Weighted Average"
2. **Given** an item with ID 5 that has been rated by 15 out of 30 users, **When** a user views the dashboard, **Then** the "Rating Progression" column for item 5 shows a progress bar indicating 50% completion (15/30)
3. **Given** an item with ratings [4, 4, 3, 4, 2], **When** a user views the dashboard, **Then** the "Average Rating" column for that item displays "3.40" (17/5, formatted to 2 decimal places)
4. **Given** a user clicks on the "ID" column header, **When** the table sorts, **Then** items are ordered by ID (ascending or descending based on current sort state)
5. **Given** a user clicks on the "Average Rating" column header, **When** the table sorts, **Then** items are ordered by average rating value
6. **Given** a user clicks on the "Weighted Average" column header, **When** the table sorts, **Then** items are ordered by weighted average value
7. **Given** a user clicks on the "Rating Progression" column header, **When** the table sorts, **Then** items are ordered by the percentage of users who have rated each item

---

### User Story 5 - Calculate Weighted Average Using Bayesian Formula (Priority: P1)

The system calculates weighted average ratings for each item using a Bayesian average formula that accounts for the number of ratings and total users in the event.

**Why this priority**: Weighted averages provide more reliable ratings by preventing items with few ratings from having extreme averages, ensuring fairer comparisons between items.

**Independent Test**: Can be fully tested by verifying the weighted average calculation matches the specified formula for items with varying numbers of ratings.

**Acceptance Scenarios**:

1. **Given** an event with 30 total users (C = 12, which is 40% of 30), **When** an item has 5 ratings with values [4, 4, 3, 4, 2] and global average is 3.0, **Then** the weighted average is calculated as: (12 × 3.0 + 17) / (12 + 5) = 53 / 17 = 3.12
2. **Given** an item with no ratings (n = 0), **When** the weighted average is calculated, **Then** it equals the global average (C × global_avg) / C = global_avg
3. **Given** an item with many ratings (n approaches total_users), **When** the weighted average is calculated, **Then** it approaches the simple average of that item's ratings
4. **Given** the global average changes as more ratings are submitted, **When** weighted averages are recalculated, **Then** all item weighted averages reflect the updated global average

---

### Edge Cases

- What happens when an event has no registered users? (Total Users = 0, C = 0 in Bayesian formula - weighted averages display "N/A" with tooltip/help icon showing "Insufficient data: No users registered in this event")
- What happens when an event has no ratings submitted? (Total Ratings = 0, all items show 0% progression, global average and weighted averages display "N/A" with tooltip/help icon showing "No ratings submitted yet")
- What happens when an item has no ratings? (Progress bar shows 0%, average rating shows "N/A" or "0", weighted average equals global average if available, otherwise "N/A")
- How does the system handle excluded items in the dashboard? (Excluded items are filtered out from both the Total Bottles count and the item ratings table, consistent with itemConfiguration)
- What happens when a user sorts a column that contains progress bars? (Sorting should use the underlying percentage value, not visual representation)
- How does the system handle very large numbers of users or ratings? (Performance: Caching ensures calculations remain efficient. Display formatting: Numbers are displayed as-is without commas or abbreviations - this is acceptable for the current scope. If formatting is needed in the future, it can be added as an enhancement)
- What happens when the global average calculation results in division by zero? (No ratings exist in the event - display "N/A" with tooltip/help icon showing "No ratings submitted yet")
- What happens when dashboard data is loading? (Display LoadingSpinner component - consistent with existing patterns. Skeleton screens are optional and not required)
- What happens when dashboard data fails to load? (Display user-friendly error message with retry option or guidance)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a new dashboard page accessible via a dedicated route
- **FR-002**: System MUST allow event administrators to access the dashboard page at any time, regardless of event state
- **FR-003**: System MUST restrict regular users (non-administrators) from accessing the dashboard page unless the event is in "completed" state
- **FR-003a**: System MUST redirect regular users to the event main page when they attempt to access the dashboard route directly while the event is not in "completed" state
- **FR-003b**: System MUST NOT display dashboard link or button to regular users unless the event is in "completed" state
- **FR-003c**: System MUST provide a dashboard link or button in the profile page, displayed alongside other top navigation buttons (Back, Admin, Logout)
- **FR-003d**: System MUST display the dashboard link/button in the profile page for administrators at all times, regardless of event state
- **FR-003e**: System MUST display the dashboard link/button in the profile page for regular users only when the event is in "completed" state
- **FR-004**: System MUST display four summary statistics as large number gadgets: Total Users, Total Bottles, Total Ratings, and Average Ratings per Bottle
- **FR-005**: System MUST display "Total Users" as the count of all registered users in the event
- **FR-006**: System MUST display "Total Bottles" as the count of configured items minus excluded items (numberOfItems - excludedItemIds.length)
- **FR-007**: System MUST display "Total Ratings" as the total count of all rating submissions in the event
- **FR-008**: System MUST display "Average Ratings per Bottle" as the total ratings count divided by the total bottles count, formatted to 2 decimal places (e.g., "4.55")
- **FR-009**: System MUST display a table with columns: Item ID, Rating Progression, Average Rating, and Weighted Average
- **FR-010**: System MUST display Rating Progression as a visual progress bar showing the percentage of users who have rated each item (number_of_raters / total_users), displayed as a visual bar only without text labels
- **FR-011**: System MUST display Average Rating as the arithmetic mean of all rating values for each item, formatted to 2 decimal places (e.g., "3.40")
- **FR-012**: System MUST calculate Weighted Average using the Bayesian formula: (C × global_avg + Σ(ratings)) / (C + n), where C = 40% of total_users, n = number_of_raters, and global_avg = average rating across all items in the event
- **FR-013**: System MUST make all table columns sortable (ID, Rating Progression, Average Rating, Weighted Average)
- **FR-014**: System MUST support ascending and descending sort order for each column
- **FR-014a**: System MUST display items sorted by Item ID in ascending order (1, 2, 3...) as the default when the dashboard first loads
- **FR-015**: System MUST handle the case when C = 0 (no users) by displaying "N/A" or "0" for weighted average calculations with explanatory text indicating insufficient data. The explanatory text MUST be displayed as a tooltip or help icon (e.g., Info icon from lucide-react) next to the "N/A" value, with the message "Insufficient data: No users registered in this event"
- **FR-016**: System MUST handle the case when global_avg is undefined (no ratings exist) by displaying "N/A" for weighted average and global average with explanatory text indicating no ratings have been submitted. The explanatory text MUST be displayed as a tooltip or help icon next to the "N/A" value, with the message "No ratings submitted yet"
- **FR-017**: System MUST display items in the table based on itemConfiguration, excluding items listed in excludedItemIds (only items from 1 to numberOfItems that are not in excludedItemIds should appear)
- **FR-018**: System MUST provide a manual refresh button that allows users to update dashboard statistics to reflect current event data
- **FR-019**: System MUST load dashboard data when the page is first accessed or navigated to
- **FR-020**: System MUST display loading indicators while dashboard data is being fetched. The primary approach is to use LoadingSpinner component (consistent with existing patterns). Skeleton screens are optional and not required for MVP - LoadingSpinner is sufficient
- **FR-021**: System MUST display user-friendly error messages if dashboard data cannot be loaded, with guidance on how to resolve the issue (e.g., retry button or contact support)

### Key Entities *(include if feature involves data)*

- **Dashboard Statistics**: Represents aggregated event metrics. Key attributes: total users count, total bottles count, total ratings count, average ratings per bottle. Calculated from event configuration and ratings data.

- **Item Rating Summary**: Represents aggregated rating data for a single item. Key attributes: item ID, number of raters, average rating value, weighted average value, rating progression percentage. Derived from ratings data filtered by itemId.

- **Global Average**: Represents the average rating value across all items in the event. Calculated as the mean of all rating values in the event, used as a baseline in the Bayesian weighted average formula.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can access the dashboard page within 2 seconds of navigation, regardless of event state
- **SC-002**: Regular users attempting to access the dashboard when event is not "completed" are denied access within 1 second
- **SC-003**: Dashboard page loads and displays all four summary statistics within 3 seconds for events with up to 1000 ratings
- **SC-004**: Item ratings table displays all items and calculates all metrics correctly for events with up to 100 items
- **SC-005**: Table column sorting responds to user clicks within 500 milliseconds and maintains sort state during user session
- **SC-006**: Weighted average calculations match the specified Bayesian formula with accuracy to 2 decimal places for all test cases
- **SC-007**: Dashboard handles edge cases gracefully (zero users, zero ratings, items with no ratings) without errors or crashes
- **SC-008**: 95% of dashboard page loads complete successfully without data calculation errors
