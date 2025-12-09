# Feature Specification: Item Configuration in Event Admin

**Feature Branch**: `008-item-configuration`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Item configuration in event admin

1. This section defines the details of the items that are being rated

2. Define the number of items. Default is 20. Since it is a blind tasting event items will be numbered, item id, from 1 to <the number above>. 

3. Provide a option to define a comma separate list of item ids that are to be excluded from the event. When the list of item ids are displayed on the main event page these excluded numbers will not be shown."

## Clarifications

### Session 2025-01-27

- Q: When an administrator reduces the number of items and some excluded item IDs are now outside the valid range, what should happen? → A: Automatically remove invalid excluded IDs and display a warning message to the administrator
- Q: When an administrator enters excluded item IDs that are outside the valid range during initial entry, what should happen? → A: Reject the save and display a clear error message listing the invalid item IDs
- Q: Should there be a maximum limit on the number of items an administrator can configure? → A: Maximum limit of 100 items
- Q: What should happen when an administrator excludes all item IDs? → A: Prevent the save and display an error message indicating at least one item must be available
- Q: How should the system handle excluded item IDs with leading zeros (e.g., "05,010")? → A: Normalize by removing leading zeros and treat as standard integers (e.g., "05" becomes 5)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Number of Items (Priority: P1)

An event administrator navigates to the event admin screen and configures the total number of items for the blind tasting event. The system allows setting a number that determines how many items will be available for rating, with items numbered sequentially from 1 to the specified number.

**Why this priority**: This is the foundational configuration that determines the scope of items available for rating. Without defining the number of items, the event cannot properly display or manage items. This must work independently to enable the core item configuration functionality.

**Independent Test**: Can be fully tested by navigating to the event admin screen, accessing the item configuration section, setting a number of items (e.g., 20), saving the configuration, and verifying that the number is persisted and used to generate item IDs from 1 to the specified number.

**Acceptance Scenarios**:

1. **Given** an event administrator is on the event admin screen, **When** they access the item configuration section and set the number of items to a value (e.g., 20), **Then** the system saves the configuration and items are numbered from 1 to the specified number
2. **Given** an event administrator configures the number of items, **When** no value is specified, **Then** the system uses the default value of 20
3. **Given** an event administrator sets the number of items, **When** they save the configuration, **Then** the system persists the value and it is available for use on the main event page
4. **Given** an event administrator changes the number of items, **When** the new number is less than the previous number and some excluded item IDs are now outside the valid range, **Then** the system automatically removes the invalid excluded item IDs, updates the available item range, and displays a warning message indicating which item IDs were removed
5. **Given** an event administrator sets the number of items to a value, **When** they view the main event page, **Then** the system displays item IDs from 1 to the configured number (excluding any excluded item IDs)

---

### User Story 2 - Configure Excluded Item IDs (Priority: P2)

An event administrator navigates to the event admin screen and specifies which item IDs should be excluded from the event. The system allows entering a comma-separated list of item IDs that will not be displayed or available for rating on the main event page.

**Why this priority**: This enables administrators to exclude specific items from the event, which is essential for blind tasting scenarios where certain items may need to be removed. This builds on the number of items configuration but can be tested independently by verifying exclusion functionality.

**Independent Test**: Can be fully tested by navigating to the event admin screen, accessing the item configuration section, entering a comma-separated list of item IDs to exclude (e.g., "5,10,15"), saving the configuration, and verifying that these item IDs are not displayed on the main event page.

**Acceptance Scenarios**:

1. **Given** an event administrator is on the event admin screen, **When** they access the item configuration section and enter a comma-separated list of item IDs to exclude (e.g., "5,10,15"), **Then** the system saves the excluded item IDs
2. **Given** an event administrator has configured excluded item IDs, **When** users view the main event page, **Then** the excluded item IDs are not displayed in the list of available items
3. **Given** an event administrator enters excluded item IDs, **When** they enter item IDs that are outside the valid range (e.g., greater than the number of items), **Then** the system rejects the save and displays a clear error message listing the invalid item IDs
4. **Given** an event administrator clears the excluded item IDs field, **When** they save the configuration, **Then** all item IDs within the configured range are displayed on the main event page
5. **Given** an event administrator enters excluded item IDs with extra whitespace (e.g., "5, 10 , 15"), **Then** the system trims whitespace and processes the list correctly
8. **Given** an event administrator enters excluded item IDs with leading zeros (e.g., "05,010"), **Then** the system normalizes by removing leading zeros and treats them as standard integers (e.g., "05" becomes 5, "010" becomes 10)
6. **Given** an event administrator enters duplicate item IDs in the exclusion list (e.g., "5,10,5"), **Then** the system handles duplicates appropriately (treats as single exclusion)
7. **Given** an event administrator attempts to exclude all item IDs (e.g., excluding all IDs from 1 to the configured number), **When** they save the configuration, **Then** the system prevents the save and displays an error message indicating at least one item must be available

---

### User Story 3 - View Item Configuration (Priority: P3)

An event administrator navigates to the event admin screen and views the current item configuration, including the number of items and the list of excluded item IDs.

**Why this priority**: This provides visibility into the current item configuration settings. While important for administrators to understand the current state, it depends on the configuration functionality being available. This can be tested independently by verifying the display of configuration values.

**Independent Test**: Can be fully tested by navigating to the event admin screen, accessing the item configuration section, and verifying that the current number of items and excluded item IDs are displayed correctly.

**Acceptance Scenarios**:

1. **Given** an event administrator navigates to the event admin screen, **When** they access the item configuration section, **Then** the system displays the current number of items (or default value of 20 if not configured)
2. **Given** an event administrator views the item configuration, **When** excluded item IDs have been configured, **Then** the system displays the list of excluded item IDs
3. **Given** an event administrator views the item configuration, **When** no excluded item IDs have been configured, **Then** the system displays an empty field or indicates that no items are excluded
4. **Given** an event administrator views the item configuration, **When** the configuration is updated, **Then** the displayed values reflect the current configuration state

---

### Edge Cases

- What happens when an administrator sets the number of items to 0 or a negative number? (System validates and prevents invalid values, minimum is 1)
- What happens when an administrator sets the number of items to a very large number? (System validates and prevents values greater than 100, displays error message)
- How does the system handle excluded item IDs that include non-numeric values? (System rejects the save and displays an error message indicating non-numeric values are not allowed)
- What happens when an administrator excludes all item IDs? (System prevents the save and displays an error message indicating at least one item must be available)
- How does the system handle excluded item IDs when the number of items is changed to a value less than some excluded IDs? (System automatically removes excluded IDs that are outside the new range and displays a warning message to the administrator)
- What happens when an administrator enters an empty string for excluded item IDs? (Should treat as no exclusions)
- How does the system handle excluded item IDs with leading zeros (e.g., "05,010")? (System normalizes by removing leading zeros and treats as standard integers, e.g., "05" becomes 5)
- What happens when an administrator saves item configuration while the event is in a started or completed state? (Should allow or prevent based on business rules - assume configuration can be updated regardless of event state unless specified otherwise)
- How does the system handle concurrent updates to item configuration by multiple administrators? (Should handle gracefully with appropriate conflict resolution)
- What happens when an administrator enters excluded item IDs in different formats (e.g., "5-10" for range vs "5,6,7,8,9,10")? (Should support only comma-separated list format, not ranges)
- How does the system handle item configuration when the event has no items configured yet? (Should use default value of 20)
- What happens when an administrator attempts to exclude item ID 0? (Should validate that item IDs start from 1)
- How does the system handle item configuration display when data is being loaded? (Should show loading state or default values)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an item configuration section on the event admin screen for configuring items that are being rated
- **FR-002**: System MUST allow event administrators to configure the total number of items for the event
- **FR-003**: System MUST use a default value of 20 for the number of items when no value is specified
- **FR-004**: System MUST number items sequentially from 1 to the configured number of items (item IDs: 1, 2, 3, ..., N where N is the configured number)
- **FR-005**: System MUST allow event administrators to specify a comma-separated list of item IDs to exclude from the event
- **FR-006**: System MUST exclude specified item IDs from being displayed on the main event page
- **FR-007**: System MUST persist item configuration (number of items and excluded item IDs) as part of the event configuration
- **FR-008**: System MUST validate that the number of items is a positive integer (minimum value of 1, maximum value of 100)
- **FR-009**: System MUST validate that excluded item IDs are numeric values within the valid range (1 to the configured number of items)
- **FR-010**: System MUST handle whitespace in comma-separated excluded item IDs lists (trim whitespace before processing)
- **FR-011**: System MUST handle duplicate item IDs in the exclusion list (treat duplicates as a single exclusion)
- **FR-012**: System MUST display the current item configuration (number of items and excluded item IDs) in the item configuration section
- **FR-013**: System MUST allow event administrators to update the item configuration at any time
- **FR-014**: System MUST display only non-excluded item IDs on the main event page (item IDs from 1 to the configured number, excluding the specified excluded item IDs)
- **FR-015**: System MUST handle empty excluded item IDs list (treat as no exclusions, display all item IDs from 1 to the configured number)
- **FR-016**: System MUST display appropriate error messages when item configuration validation fails
- **FR-017**: System MUST display appropriate success messages when item configuration is saved successfully
- **FR-018**: System MUST validate that only authenticated event administrators can access and modify item configuration
- **FR-019**: System MUST automatically remove excluded item IDs that are outside the valid range when the number of items is reduced, and display a warning message to the administrator indicating which item IDs were removed
- **FR-020**: System MUST reject saving excluded item IDs that are outside the valid range during initial entry and display a clear error message listing the invalid item IDs
- **FR-021**: System MUST prevent saving item configuration when all item IDs are excluded and display an error message indicating at least one item must be available
- **FR-022**: System MUST normalize excluded item IDs with leading zeros by removing leading zeros and treating them as standard integers (e.g., "05" becomes 5, "010" becomes 10)

### Key Entities *(include if feature involves data)*

- **Item Configuration**: Represents the configuration settings for items in a blind tasting event. Key attributes: numberOfItems (total number of items available for rating, default value 20, minimum 1, maximum 100), excludedItemIds (comma-separated list of item IDs to exclude from display and rating, stored as array of integers). Item configuration is part of the event configuration and determines which item IDs are available for rating. Items are numbered sequentially from 1 to numberOfItems. Excluded item IDs are not displayed on the main event page. The configuration can be updated by event administrators at any time.

- **Event**: Represents a user-created event that includes item configuration. Key attributes: eventId (unique identifier), itemConfiguration (object containing numberOfItems and excludedItemIds). The item configuration determines the available item IDs for rating. Item IDs are displayed on the main event page, excluding any item IDs specified in the excludedItemIds list. The item configuration uses default values (20 items, no exclusions) when not explicitly configured.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can configure the number of items for an event (set value, save, see confirmation) in under 30 seconds from accessing the item configuration section
- **SC-002**: Administrators can configure excluded item IDs for an event (enter list, save, see confirmation) in under 30 seconds
- **SC-003**: 100% of configured item configurations (number of items and excluded item IDs) are persisted and available on subsequent page loads
- **SC-004**: 100% of excluded item IDs are not displayed on the main event page when item configuration is saved
- **SC-005**: System displays all non-excluded item IDs (from 1 to configured number) on the main event page in 100% of cases
- **SC-006**: Item configuration validation displays clear error messages within 500 milliseconds of submission attempt with invalid data
- **SC-007**: Item configuration section displays current configuration values within 1 second of loading the event admin screen
- **SC-008**: 95% of item configuration save attempts with valid data result in successful configuration updates
- **SC-009**: System handles whitespace in comma-separated excluded item IDs lists correctly in 100% of cases
- **SC-010**: System handles duplicate item IDs in exclusion lists correctly (treats as single exclusion) in 100% of cases
- **SC-011**: Administrators can view the complete item configuration for their event without errors in 100% of attempts
- **SC-012**: Default value of 20 items is used when no number of items is configured in 100% of cases

## Assumptions

- The event admin screen already exists and is accessible to event administrators (from existing features)
- Item configuration is displayed as a separate card component on the event admin screen (similar to "PIN Management" and "Administrators" card structures)
- Item IDs are displayed on the main event page in a list or similar format for users to select and rate
- The main event page can access and filter item IDs based on the item configuration
- Item configuration can be updated regardless of event state (created, started, paused, completed)
- Excluded item IDs are stored as an array of integers in the event configuration
- The number of items is stored as an integer in the event configuration
- Item configuration uses default values (20 items, no exclusions) when not explicitly configured
- Item IDs are displayed in numeric order on the main event page (excluding excluded IDs)
- Validation for excluded item IDs checks that values are within the valid range (1 to numberOfItems)
- Administrators must be authenticated (via OTP/JWT) to access item configuration features
- The item configuration section can be saved independently of other event configuration sections
- Comma-separated excluded item IDs are parsed and stored as an array of integers
- Empty excluded item IDs field or empty string means no items are excluded

## Dependencies

- Event admin screen/page (existing feature) for item configuration interface
- Event main page (existing feature) for displaying item IDs based on configuration
- Authentication system (OTP/JWT) for verifying administrator permissions
- Event data repository infrastructure for persisting item configuration data
- Frontend form components and validation utilities for number input and comma-separated list input
- Backend endpoints for saving and retrieving item configuration
- Event configuration data structure that supports itemConfiguration object (numberOfItems and excludedItemIds)

## Out of Scope

- Bulk item configuration import or export
- Item configuration templates or presets
- Item configuration history or versioning
- Item-specific metadata beyond item IDs (names, descriptions, categories)
- Item configuration validation based on event state (e.g., preventing changes when event is started)
- Range notation for excluded item IDs (e.g., "5-10" to exclude items 5 through 10)
- Item configuration sharing or copying between events
- Item configuration preview or simulation
- Advanced item configuration rules or constraints
- Item configuration analytics or reporting
