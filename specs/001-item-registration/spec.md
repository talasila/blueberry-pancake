# Feature Specification: Item Registration and Management

**Feature Branch**: `001-item-registration`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Item registration feature. The initial temporary specification is the \"tmp_spec.md\" file in the root folder. Analyze that create the formal spec."

## Clarifications

### Session 2025-01-27

- Q: How should price data be stored and validated? → A: Store as decimal number, validate/normalize input formats
- Q: What is the maximum length for item names? → A: 200 characters maximum
- Q: What is the maximum length for item descriptions? → A: 1000 characters maximum
- Q: Can item IDs in the excludedItemIds list be assigned to registered items? → A: No, prevent assignment to excluded IDs to maintain intentional gaps
- Q: Are negative price values allowed? → A: No, allow zero and positive values only (prevent negative)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Registers Items on Profile Page (Priority: P1)

Users can register items they're bringing to the event on their profile page, providing item details (name, price, description) that will be revealed after the event is completed.

**Why this priority**: This is the primary way users contribute items to the event. Without this functionality, users cannot register their items, which is a core requirement for the feature.

**Independent Test**: Can be fully tested by navigating to the profile page, adding an item with name (required), price (optional), and description (optional), saving it, and verifying it appears in the user's item list.

**Acceptance Scenarios**:

1. **Given** a user is on the profile page and the event is in "created" state, **When** they add an item with a name, **Then** the item is saved and appears in their items list
2. **Given** a user is on the profile page and the event is in "started" state, **When** they add an item with name, price, and description, **Then** the item is saved with all provided details
3. **Given** a user has registered multiple items, **When** they view the profile page, **Then** they see a list of all their registered items
4. **Given** a user wants to edit an item they registered, **When** they modify the item details and save, **Then** the updated item information is persisted
5. **Given** a user wants to delete an item they registered, **When** they delete the item, **Then** the item is removed from their items list
6. **Given** a user attempts to register an item when the event is in "paused" state, **When** they try to add an item, **Then** the system prevents registration and displays an appropriate message
7. **Given** a user attempts to register an item when the event is in "completed" state, **When** they try to add an item, **Then** the system prevents registration and displays an appropriate message
8. **Given** a user attempts to register an item without providing a name, **When** they try to save, **Then** the system displays a validation error requiring the name field

---

### User Story 2 - Admin Views All Registered Items (Priority: P1)

Event administrators can view all registered items in a dedicated admin page/section, seeing all item details including owner information.

**Why this priority**: Administrators need visibility into all registered items to manage the event and assign item IDs during the paused state. This is essential for the item ID assignment workflow.

**Independent Test**: Can be fully tested by navigating to the admin items page as an administrator and verifying all registered items are displayed with their complete details.

**Acceptance Scenarios**:

1. **Given** an event administrator is logged in, **When** they navigate to the items management page, **Then** they see a list of all registered items with all fields (name, price, description, owner email)
2. **Given** an event has multiple items registered by different users, **When** an administrator views the items page, **Then** they see all items grouped or listed together
3. **Given** an administrator views the items page, **When** they see an item, **Then** they can see who registered it (owner email)
4. **Given** an administrator views the items page, **When** they attempt to edit item details (name, price, description), **Then** the system prevents editing and indicates that admins cannot edit item details
5. **Given** an event has no registered items, **When** an administrator views the items page, **Then** they see an empty state message indicating no items have been registered

---

### User Story 3 - Admin Assigns Item IDs During Paused State (Priority: P1)

Event administrators can assign item IDs to registered items when the event is in "paused" state, mapping each item to a number from 1 to the configured maximum number of items.

**Why this priority**: This is the critical step that maps physical items to system item IDs. Without this, items cannot be properly tracked during the rating process. This must happen during paused state to ensure the admin doesn't know item details during active tasting.

**Independent Test**: Can be fully tested by navigating to the items management page when the event is paused, viewing all items with their details, and assigning item IDs to each item.

**Acceptance Scenarios**:

1. **Given** an event is in "paused" state and an administrator is on the items management page, **When** they view the items list, **Then** they see all registered items with an interface to assign item IDs
2. **Given** an administrator is assigning item IDs, **When** they select an item and assign an item ID (e.g., 5), **Then** the item ID is saved and associated with that item
3. **Given** an administrator assigns item IDs, **When** they assign an item ID that is already assigned to another item, **Then** the system prevents the duplicate assignment and displays an error
4. **Given** an administrator assigns item IDs, **When** they assign an item ID outside the valid range (less than 1 or greater than maximum number of items), **Then** the system prevents the assignment and displays a validation error
5. **Given** an administrator assigns item IDs, **When** they attempt to assign an item ID that is in the excludedItemIds list, **Then** the system prevents the assignment and displays a validation error indicating the ID is excluded
6. **Given** an administrator has assigned item IDs to some items, **When** they view the items list, **Then** they can see which items have item IDs assigned and which do not
7. **Given** an administrator attempts to assign item IDs when the event is not in "paused" state, **When** they try to assign an item ID, **Then** the system prevents assignment and displays an appropriate message
8. **Given** an event has items without assigned item IDs, **When** an administrator views the items page, **Then** the system flags these items (e.g., with a warning indicator) but does not prevent other operations

---

### User Story 4 - View Item Details After Event Completion (Priority: P1)

Users can view item details (name, price, description, owner) when the event is in "completed" state by clicking on item numbers or dashboard table rows.

**Why this priority**: This is the reveal moment where users discover what they've been tasting. This is a core value proposition of the blind tasting feature - the reveal after completion.

**Independent Test**: Can be fully tested by completing an event, navigating to the event page or dashboard, clicking on an item number or table row, and verifying the item details drawer displays correctly.

**Acceptance Scenarios**:

1. **Given** an event is in "completed" state and a user is on the main event page, **When** they click on an item number, **Then** a drawer opens displaying the item details (name, price, description, owner)
2. **Given** an event is in "completed" state and a user is on the dashboard page, **When** they click on a row in the Ratings table, **Then** a drawer opens displaying the item details for that item
3. **Given** a user views item details in the drawer, **When** the item has a price, **Then** the price is displayed in the drawer
4. **Given** a user views item details in the drawer, **When** the item has a description, **Then** the description is displayed in the drawer
5. **Given** a user views item details in the drawer, **When** the item has an owner, **Then** the owner information (name or email) is displayed
6. **Given** an event is not in "completed" state, **When** a user clicks on an item number, **Then** the item details drawer does not open or displays a message that details are not yet available
7. **Given** a user views item details, **When** the item has optional fields that are empty (price or description), **Then** the drawer displays the available information without showing empty fields or shows "N/A" for missing optional fields

---

### User Story 5 - Validation: Maximum Items Cannot Be Less Than Registered Items (Priority: P2)

The system prevents administrators from setting the maximum number of items to a value less than the total number of registered items.

**Why this priority**: This ensures data integrity and prevents situations where there aren't enough item IDs available to assign to all registered items. This validation is critical for the item ID assignment workflow.

**Independent Test**: Can be fully tested by registering multiple items, then attempting to set the maximum number of items to a value less than the item count, and verifying the system prevents the change.

**Acceptance Scenarios**:

1. **Given** an event has 15 registered items, **When** an administrator attempts to set the maximum number of items to 10, **Then** the system prevents the change and displays an error message indicating the maximum must be at least 15
2. **Given** an event has 20 registered items, **When** an administrator sets the maximum number of items to 25, **Then** the system allows the change (since 25 > 20)
3. **Given** an event has 10 registered items, **When** an administrator sets the maximum number of items to 10, **Then** the system allows the change (exact match is allowed)
4. **Given** an administrator attempts to reduce the maximum number of items below the registered item count, **When** the validation fails, **Then** the system displays a clear error message explaining the constraint

---

### Edge Cases

- What happens when a user registers an item but the event transitions to "paused" state before they finish? (Item registration should be prevented once event is paused, but items already registered should remain)
- What happens when an administrator assigns item IDs but some items remain unassigned? (System flags unassigned items but doesn't prevent event state transitions)
- What happens when the maximum number of items is changed after some items already have item IDs assigned? (System should validate that new maximum is >= current assigned item IDs, and warn if reducing below highest assigned ID)
- What happens when an administrator attempts to assign an item ID that is in the excludedItemIds list? (System prevents assignment to excluded IDs to maintain intentional gaps for randomness)
- What happens when a user deletes an item that already has an item ID assigned? (System should allow deletion, item ID becomes available for reassignment)
- What happens when duplicate items are registered by different users? (System allows duplicates - each is a separate item with its own ID)
- What happens when an item is registered but the owner's email changes? (Item owner is set at registration time and doesn't change)
- What happens when item details contain special characters or very long text? (System validates name length (max 200 characters) and description length (max 1000 characters) and handles special characters appropriately)
- What happens when an administrator views items but the event has no registered items? (Display empty state message)
- What happens when item details are viewed but some optional fields are missing? (Display available information, show "N/A" or omit missing optional fields)
- What happens when a user tries to register an item with a very long name? (System validates name length (maximum 200 characters) and provides appropriate feedback)
- What happens when price is entered in different formats (e.g., "$50", "50.00", "50")? (System normalizes input to decimal number format for storage)
- What happens when a user enters a negative price value? (System prevents negative values and displays validation error, allowing zero and positive values only)
- What happens when an administrator assigns the same item ID to multiple items? (System prevents duplicate assignment)
- What happens when an administrator attempts to assign an item ID that is in the excludedItemIds list? (System prevents assignment to excluded IDs to maintain intentional gaps)
- What happens when item details drawer is opened but item data is missing or corrupted? (System should handle gracefully with error message)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to register items on the profile page when the event is in "created" or "started" state
- **FR-002**: System MUST prevent users from registering items when the event is in "paused" or "completed" state
- **FR-003**: System MUST require item name as a mandatory field when registering an item, with maximum length of 200 characters
- **FR-004**: System MUST allow item price as an optional field when registering an item, stored as a decimal number with normalized input formats, allowing zero and positive values only (preventing negative values)
- **FR-005**: System MUST allow item description as an optional field when registering an item, with maximum length of 1000 characters
- **FR-006**: System MUST persist all registered items for the duration of the event
- **FR-007**: System MUST track item owner (email) for each registered item
- **FR-008**: System MUST store registration timestamp for each item
- **FR-009**: System MUST generate a unique identifier for each registered item
- **FR-010**: System MUST allow users to edit items they have registered (when event is in "created" or "started" state)
- **FR-011**: System MUST allow users to delete items they have registered (when event is in "created" or "started" state)
- **FR-012**: System MUST display a list of user's registered items on the profile page
- **FR-013**: System MUST provide a dedicated admin page/section for viewing all registered items
- **FR-014**: System MUST display all item fields (name, price, description, owner) to administrators on the items management page
- **FR-015**: System MUST prevent administrators from editing item details (name, price, description) on the items management page
- **FR-016**: System MUST allow administrators to assign item IDs to registered items when the event is in "paused" state
- **FR-017**: System MUST prevent administrators from assigning item IDs when the event is not in "paused" state
- **FR-018**: System MUST validate that assigned item IDs are within the valid range (1 to maximum number of items) and are not in the excludedItemIds list
- **FR-019**: System MUST prevent duplicate item ID assignments (each item ID can only be assigned to one item)
- **FR-020**: System MUST provide a simple table or list interface for item ID assignment
- **FR-021**: System MUST flag items that are registered but do not have an item ID assigned (without preventing other operations)
- **FR-022**: System MUST validate that the maximum number of items cannot be set to a value less than the total number of registered items
- **FR-023**: System MUST allow the maximum number of items to be greater than the total number of registered items (for intentional gaps/randomness)
- **FR-024**: System MUST reveal item details (name, price, description, owner) only when the event is in "completed" state
- **FR-025**: System MUST provide an item details display component that opens when clicking item numbers on the main event page (when event is completed)
- **FR-026**: System MUST provide an item details display component that opens when clicking rows in the dashboard Ratings table (when event is completed)
- **FR-027**: System MUST display item owner information (name or email) in the item details display
- **FR-028**: System MUST handle missing optional fields (price, description) gracefully in the item details display
- **FR-029**: System MUST allow users to see who brought each item after the event is completed
- **FR-030**: System MUST allow duplicate items to be registered (same name by different users)
- **FR-031**: System MUST not impose limits on the number of items a user can register
- **FR-032**: System MUST store item data with the following attributes: unique identifier, name (required, maximum 200 characters), price (optional decimal number, zero or positive values only), description (optional, maximum 1000 characters), owner email, registration timestamp, item ID (optional, assigned during paused state)

### Key Entities *(include if feature involves data)*

- **Item**: Represents a physical item brought to the event for rating. Key attributes: unique identifier, name (required, maximum 200 characters), price (optional decimal number, normalized from various input formats, zero or positive values only), description (optional, maximum 1000 characters), owner email (email of user who registered it), registration timestamp, item ID (optional integer, assigned during paused state, range 1 to maximum number of items). Items are registered by users during "created" or "started" state, assigned item IDs by administrators during "paused" state, and their details are revealed to all users after event completion.

- **Event (Extended)**: Represents a user-created event that includes item registration. Key attributes: event identifier, items collection (array of Item objects). The items collection contains all registered items for the event. Item registration is available during "created" and "started" states. Item ID assignment occurs during "paused" state. Item details are revealed during "completed" state. The maximum number of items configuration must be at least equal to the total number of registered items.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can register an item on the profile page (enter name, optional price/description, save) in under 30 seconds
- **SC-002**: 100% of registered items are persisted and remain available throughout the event lifecycle
- **SC-003**: Administrators can view all registered items on the items management page within 2 seconds of navigation
- **SC-004**: Administrators can assign item IDs to all registered items during paused state in under 5 minutes for events with up to 50 items
- **SC-005**: Item details display opens and shows complete item information within 500 milliseconds of clicking an item number or dashboard row
- **SC-006**: System prevents the maximum number of items from being set below the registered item count in 100% of validation attempts
- **SC-007**: System flags unassigned items correctly in 100% of cases
- **SC-008**: Item details are revealed only when event is in "completed" state in 100% of cases
- **SC-009**: Users can edit and delete their own registered items successfully in 95% of attempts
- **SC-010**: Item registration is prevented during "paused" and "completed" states in 100% of attempts

## Assumptions

- The profile page already exists and can be extended with item registration functionality
- The event admin page already exists and can be extended with an items management section
- Item details display component can be created as a reusable component similar to existing display components
- The event data structure can be extended to include an items collection
- Unique identifier generation is available in the system
- Item ID assignment interface can be implemented as a simple form/table
- Item details display can reuse existing display component patterns from the codebase
- The dashboard Ratings table already exists and can trigger the item details display
- The main event page item buttons already exist and can trigger the item details display
- Validation for maximum number of items can be integrated into the existing item configuration update flow

## Dependencies

- Profile page (existing feature) for user item registration interface
- Event admin page (existing feature) for admin items management interface
- Event state management (existing feature) for state-based access control
- Item configuration feature (existing feature) for maximum number of items validation
- Authentication system for user identification and authorization
- Event data repository infrastructure for persisting items
- Frontend form components and validation utilities for item registration
- Backend endpoints for item CRUD operations
- Display component patterns (existing) for item details display
- Dashboard page (existing feature) for item details display integration
- Main event page (existing feature) for item details display integration

## Out of Scope

- Drag-and-drop interface for item ID assignment
- Bulk item import or export functionality
- Item registration via email or external systems
- Item approval workflow (items are automatically included upon registration)
- Item categories or tags
- Item images or attachments
- Item history or versioning
- Item templates or presets
- Advanced item search or filtering
- Item registration notifications or reminders
- Item assignment to specific users (all items are available to all users for rating)
- Item details editing by administrators
- Item deletion by administrators (only item owners can delete their items)
- Item details revealed before event completion
- Item ID auto-assignment (must be manual by administrator)
- Item registration limits or quotas per user
- Item price currency conversion (price normalization handles format variations)
- Item description formatting or rich text
- Item sharing or copying between events
