Feature: Event State Messages
  As a user
  I want to see appropriate messages based on event state
  So that I understand when rating is available

  Background:
    Given an event exists with ID "A5ohYrHe" and name "Test Event"

  Scenario: View message when event is in "created" state
    Given I am authenticated with email "user@example.com"
    And the event is in "created" state
    When I navigate to "/event/A5ohYrHe"
    And I click on item button "1"
    Then I should see the rating drawer open
    And I should see a message "This event has not started yet. Rating is not available."
    And I should not see the rating form

  Scenario: View message when event is in "paused" state
    Given I am authenticated with email "user@example.com"
    And the event is in "paused" state
    When I navigate to "/event/A5ohYrHe"
    And I click on item button "1"
    Then I should see the rating drawer open
    And I should see a message "This event is currently paused. Rating is not available."
    And I should not see the rating form

  Scenario: View message when event is in "completed" state
    Given I am authenticated with email "user@example.com"
    And the event is in "completed" state
    When I navigate to "/event/A5ohYrHe"
    And I click on item button "1"
    Then I should see the rating drawer open
    And I should see a message "This feature is yet to be built."
    And I should not see the rating form

  Scenario: View rating form when event is in "started" state
    Given I am authenticated with email "user@example.com"
    And the event is in "started" state
    When I navigate to "/event/A5ohYrHe"
    And I click on item button "1"
    Then I should see the rating drawer open
    And I should see the rating form
    And I should see rating options
    And I should not see a state message
