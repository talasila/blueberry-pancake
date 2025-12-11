# Feature Specification: Similar Users Discovery

**Feature Branch**: `001-similar-users`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "at a blind tasting party when there are many people and folks are walking around rating items it would be interesting to show them a list of 3 to 5 other users whose tastes are very similar to theirs."

## Clarifications

### Session 2025-01-27

- Q: How should other users be identified when displaying similar users? → A: Show name if available, or full email otherwise
- Q: How should the system handle loading state during similarity calculation? → A: Show loading indicator in drawer with message "Running compatibility scanner..."
- Q: How should the system break ties when multiple users have identical similarity scores? → A: Secondary sort by number of common items (descending), then alphabetical by user identifier
- Q: How should the system handle correlation calculation failures (e.g., insufficient variance)? → A: Exclude user from similar users list silently (no error message)
- Q: How should similar users list refresh when current user submits new ratings? → A: Always require user to click button again to see updated list
- Q: When should the "Find Similar Tastes" button be visible? → A: Only show button when user has rated 3+ items

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Similar Tastes (Priority: P1)

During an active blind tasting event, a user wants to discover other participants whose rating patterns are similar to their own. This helps them find like-minded tasters and potentially discover items they might enjoy based on similar preferences.

**Why this priority**: This is the core value proposition of the feature - enabling social discovery during the event when users are actively rating items. It enhances engagement and provides immediate value.

**Independent Test**: Can be fully tested by having multiple users rate items during an event, then verifying that users with similar rating patterns are correctly identified and displayed. Delivers value by showing users who share their taste preferences.

**Acceptance Scenarios**:

1. **Given** a user has rated at least 3 items in an active event, **When** they click the "Find Similar Tastes" button, **Then** the drawer opens showing a loading indicator with message "Running compatibility scanner..." and then displays up to 5 other users with similar rating patterns, ranked by similarity
2. **Given** a user has rated fewer than 3 items, **When** they view the event rating page, **Then** the "Find Similar Tastes" button is not visible
3. **Given** there are no other users with at least 3 common rated items, **When** a user clicks the "Find Similar Tastes" button, **Then** they see a message indicating no similar users were found
4. **Given** a user views the similar users drawer, **When** they examine a similar user's entry, **Then** they can see a visual comparison showing how both users rated the items they have in common

---

### User Story 2 - Compare Ratings with Similar Users (Priority: P2)

A user wants to understand how their ratings compare to similar users for specific items they've both rated, helping them validate their preferences and discover items they might have missed.

**Why this priority**: The comparison view provides actionable insights that help users understand why certain users are considered similar and what items they might want to try based on similar users' preferences.

**Independent Test**: Can be tested independently by displaying rating comparisons for common items between the current user and each similar user. Delivers value by showing concrete examples of taste alignment.

**Acceptance Scenarios**:

1. **Given** a user is viewing the similar users drawer, **When** they look at a similar user's entry, **Then** they see a list of items both users have rated, with side-by-side rating comparisons
2. **Given** a user is viewing rating comparisons, **When** they see an item they haven't rated that a similar user rated highly, **Then** they can identify items they might want to try
3. **Given** there are more than 10 common items between users, **When** the comparison is displayed, **Then** the most relevant items are shown (e.g., highest rated by similar user, or items with largest rating differences)

---

### Edge Cases

- What happens when a user has rated exactly 3 items and there are multiple users with exactly 3 common items?
- How does the system handle users who have rated all items identically (perfect correlation)?
- What happens when correlation calculation results in identical similarity scores for multiple users? → Resolved: Ties are broken by number of common items (descending), then alphabetical by user identifier
- How does the system handle users who have rated items but have no overlap with the current user's rated items?
- What happens when the event has fewer than 5 other users total?
- How does the system handle users who have rated items but the current user hasn't rated any items yet?
- What happens when correlation calculation cannot be performed (e.g., insufficient variance in ratings)? → Resolved: User is excluded from similar users list silently without error message

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate taste similarity between the current user and all other users in the event using a statistical correlation method. If correlation cannot be calculated for a user pair (e.g., insufficient variance in ratings), that user MUST be excluded from the similar users list silently without displaying an error message
- **FR-002**: System MUST only consider users who have rated at least 3 items in common with the current user for similarity calculation
- **FR-003**: System MUST display up to 5 users with the highest similarity scores, ranked from most similar to least similar, showing each user's name if available, otherwise their full email address. When multiple users have identical similarity scores, ties MUST be broken by sorting by number of common items (descending), then alphabetically by user identifier
- **FR-004**: System MUST provide a button at the bottom of the event rating page that opens a drawer component to display similar users. The button MUST only be visible when the current user has rated at least 3 items
- **FR-011**: System MUST display a loading indicator with the message "Running compatibility scanner..." in the drawer while similarity calculation is in progress
- **FR-005**: System MUST display a visual comparison showing the current user's rating and each similar user's rating for all items they have rated in common
- **FR-006**: System MUST handle cases where fewer than 5 similar users are found (display all available similar users)
- **FR-007**: System MUST display an appropriate message when no similar users are found (e.g., insufficient common ratings, no other users meet criteria)
- **FR-008**: System MUST hide the "Find Similar Tastes" button when the current user has rated fewer than 3 items (button becomes visible once user reaches 3 ratings)
- **FR-009**: System MUST recalculate similar users list when the user clicks the "Find Similar Tastes" button after submitting new ratings. The list does NOT automatically refresh; users MUST click the button again to see updated results based on their latest ratings
- **FR-010**: System MUST only show similar users functionality during active events (when users can view and rate items)

### Key Entities *(include if feature involves data)*

- **User Rating Profile**: Represents a user's complete set of ratings for items in an event, used to calculate similarity with other users
- **Similarity Score**: A numerical value representing how similar two users' rating patterns are, calculated using correlation analysis
- **Common Items**: Items that both the current user and another user have rated, forming the basis for similarity calculation
- **Rating Comparison**: A side-by-side view showing how the current user and a similar user rated the same items
- **User Display Identifier**: The name of a user if available, otherwise their full email address, used to identify similar users in the interface

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can discover similar users within 2 seconds of clicking the "Find Similar Tastes" button
- **SC-002**: Similarity calculation accurately identifies users with matching taste preferences (validated by manual review of rating patterns)
- **SC-003**: 90% of users who have rated 5+ items can find at least one similar user (assuming event has 10+ participants)
- **SC-004**: Rating comparisons are displayed clearly enough that users can identify taste alignment patterns in under 10 seconds
- **SC-005**: Feature enhances user engagement during events, measured by users viewing similar users at least once per event session

## Assumptions

- Users are identified by their email addresses (existing authentication system)
- Rating data is available in real-time during active events
- The statistical correlation method (Pearson correlation) is appropriate for measuring taste similarity based on rating patterns
- Minimum threshold of 3 common rated items provides sufficient data for meaningful similarity calculation
- Displaying up to 5 similar users provides value without overwhelming the user interface
- The drawer component pattern is appropriate for displaying similar users information without disrupting the main rating flow
- Visual comparison of ratings helps users understand why certain users are considered similar

## Dependencies

- Existing rating system that stores user ratings per item
- Event state management to determine when similar users feature should be available
- User authentication system to identify the current user
- Drawer component infrastructure (may reuse existing RatingDrawer pattern or create new component)

## Out of Scope

- Recommending specific items based on similar users' preferences (discovery only, not recommendations)
- Direct messaging or communication between users
- Historical similarity tracking across multiple events
- Similarity calculation methods other than the specified correlation approach
- Displaying similar users outside of the event rating page context
- Similarity calculation for users who have not rated the minimum required number of items
