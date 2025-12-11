Feature: Similar Users Discovery
  As a user
  I want to discover other users with similar taste preferences
  So that I can find like-minded tasters and discover items I might enjoy

  Background:
    Given an event exists with ID "A5ohYrHe" and name "Test Event"
    And the event is in "started" state
    And the event has rating configuration with maxRating 4
    And there are multiple users who have rated items in the event

  Scenario: Complete user flow - discover similar users
    Given I am authenticated with email "user@example.com"
    And I have rated at least 3 items in the event
    And I navigate to "/event/A5ohYrHe"
    When I click the "Find Similar Tastes" button
    Then I should see the similar users drawer open
    And I should see a loading indicator with message "Running compatibility scanner..."
    When the similar users are loaded
    Then I should see up to 5 similar users displayed
    And each similar user should show their name or email
    And each similar user should show their similarity score
    And each similar user should show rating comparisons for common items

  Scenario: Rating comparison display
    Given I am authenticated with email "user@example.com"
    And I have rated at least 3 items in the event
    And I navigate to "/event/A5ohYrHe"
    When I click the "Find Similar Tastes" button
    And the similar users drawer opens
    Then I should see side-by-side rating comparisons for common items
    And I should see visual indicators for rating alignment
    And I should be able to identify items I haven't rated that similar users rated highly

  Scenario: Button visibility - insufficient ratings
    Given I am authenticated with email "user@example.com"
    And I have rated fewer than 3 items in the event
    And I navigate to "/event/A5ohYrHe"
    Then I should not see the "Find Similar Tastes" button

  Scenario: Button visibility - sufficient ratings
    Given I am authenticated with email "user@example.com"
    And I have rated at least 3 items in the event
    And I navigate to "/event/A5ohYrHe"
    Then I should see the "Find Similar Tastes" button

  Scenario: Empty state - no similar users found
    Given I am authenticated with email "user@example.com"
    And I have rated at least 3 items in the event
    And there are no other users with 3+ common rated items
    And I navigate to "/event/A5ohYrHe"
    When I click the "Find Similar Tastes" button
    Then I should see a message indicating no similar users were found

  Scenario: Rating comparison with >10 items
    Given I am authenticated with email "user@example.com"
    And I have rated at least 3 items in the event
    And there is a similar user with more than 10 common items
    And I navigate to "/event/A5ohYrHe"
    When I click the "Find Similar Tastes" button
    And the similar users drawer opens
    Then I should see prioritized items displayed (top 10)
    And I should see an option to expand and view all items
    When I click to expand the item list
    Then I should see all common items displayed

  Scenario: Visual indicators for rating alignment
    Given I am authenticated with email "user@example.com"
    And I have rated at least 3 items in the event
    And I navigate to "/event/A5ohYrHe"
    When I click the "Find Similar Tastes" button
    And the similar users drawer opens
    Then I should see color coding or icons indicating rating alignment
    And items with identical ratings should be visually highlighted
    And items with large rating differences should be visually distinct
