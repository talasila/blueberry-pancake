Feature: Landing Page
  As a user
  I want to see the landing page with interactive elements
  So that I can understand the application interface

  # User Story 1: View Landing Page with Join Event Interface
  Scenario: User Story 1 - Event ID input and Join button are visible
    Given I am on the landing page
    When the page loads
    Then I should see an event ID input field
    And I should see a "Join" button

  Scenario: User Story 1 - Event ID input accepts text
    Given I am on the landing page
    When I type "test-event-123" into the event ID input field
    Then the event ID input field should display "test-event-123"

  Scenario: User Story 1 - Join button provides visual feedback without navigation
    Given I am on the landing page
    When I click the "Join" button
    Then the button should provide visual feedback
    And no navigation should occur
    And no network requests should be made

  # User Story 2: View Create Event Interface
  Scenario: User Story 2 - Create button is visible
    Given I am on the landing page
    When the page loads
    Then I should see a "Create" button

  Scenario: User Story 2 - Create button provides visual feedback without navigation
    Given I am on the landing page
    When I click the "Create" button
    Then the button should provide visual feedback
    And no navigation should occur
    And no network requests should be made

  # User Story 3: View Sign In Interface
  Scenario: User Story 3 - Sign in button is visible
    Given I am on the landing page
    When the page loads
    Then I should see a "Sign in" button

  Scenario: User Story 3 - Sign in button provides visual feedback without navigation
    Given I am on the landing page
    When I click the "Sign in" button
    Then the button should provide visual feedback
    And no navigation should occur
    And no network requests should be made
