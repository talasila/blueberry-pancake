Feature: Event Page Access
  As a user
  I want to access event pages
  So that I can view event details and participate in ratings

  # User Story 1: Access Event Main Page
  Scenario: User Story 1 - Authenticated user accesses event page
    Given I am authenticated with email "user@example.com"
    And an event exists with ID "A5ohYrHe" and name "Test Event"
    When I navigate to "/event/A5ohYrHe"
    Then I should see the event page
    And I should see "Test Event" in the header
    And I should see the event details
    And I should not be redirected

  Scenario: User Story 1 - Unauthenticated user tries to access event page
    Given I am not authenticated
    When I navigate to "/event/A5ohYrHe"
    Then I should be redirected to the authentication page

  Scenario: User Story 1 - User accesses non-existent event
    Given I am authenticated with email "user@example.com"
    And an event with ID "NONEXIST" does not exist
    When I navigate to "/event/NONEXIST"
    Then I should see an error message
    And the error message should contain "not found"

  Scenario: User Story 1 - Event state synchronization via polling
    Given I am authenticated with email "user@example.com"
    And an event exists with ID "A5ohYrHe" and state "started"
    When I navigate to "/event/A5ohYrHe"
    Then I should see the event in "started" state
    When the administrator changes the event state to "paused"
    Then within 60 seconds I should see the event state change to "paused"
    And I should see a message that rating is not available

  Scenario: User Story 1 - State validation before action
    Given I am authenticated with email "user@example.com"
    And an event exists with ID "A5ohYrHe" and state "paused"
    When I navigate to "/event/A5ohYrHe"
    Then I should see that rating is not available
    And I should see a message about the event being paused

  # User Story 2: Access Event Admin Page
  Scenario: User Story 2 - Administrator accesses admin page
    Given I am authenticated with email "admin@example.com"
    And an event exists with ID "A5ohYrHe" and administrator "admin@example.com"
    When I navigate to "/event/A5ohYrHe/admin"
    Then I should see the admin page
    And I should see "Event Administration" heading
    And I should see the event details
    And I should not be redirected

  Scenario: User Story 2 - Non-administrator tries to access admin page
    Given I am authenticated with email "user@example.com"
    And an event exists with ID "A5ohYrHe" and administrator "admin@example.com"
    When I navigate to "/event/A5ohYrHe/admin"
    Then I should be redirected to "/event/A5ohYrHe"
    And I should not see the admin page

  Scenario: User Story 2 - Case-insensitive email comparison for admin access
    Given I am authenticated with email "ADMIN@EXAMPLE.COM"
    And an event exists with ID "A5ohYrHe" and administrator "admin@example.com"
    When I navigate to "/event/A5ohYrHe/admin"
    Then I should see the admin page
    And I should not be redirected

  # User Story 3: Navigation between pages
  Scenario: User Story 3 - Administrator navigates from event page to admin page
    Given I am authenticated with email "admin@example.com"
    And an event exists with ID "A5ohYrHe" and administrator "admin@example.com"
    And I am on the event page "/event/A5ohYrHe"
    When I click the "Admin" button
    Then I should be navigated to "/event/A5ohYrHe/admin"
    And I should see the admin page

  Scenario: User Story 3 - Administrator navigates from admin page to event page
    Given I am authenticated with email "admin@example.com"
    And an event exists with ID "A5ohYrHe" and administrator "admin@example.com"
    And I am on the admin page "/event/A5ohYrHe/admin"
    When I click the "Back to Event" button
    Then I should be navigated to "/event/A5ohYrHe"
    And I should see the event page

  Scenario: User Story 3 - Non-administrator does not see admin navigation button
    Given I am authenticated with email "user@example.com"
    And an event exists with ID "A5ohYrHe" and administrator "admin@example.com"
    And I am on the event page "/event/A5ohYrHe"
    Then I should not see the "Admin" button
