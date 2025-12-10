Feature: Bookmark Flow
  As a user
  I want to bookmark items while rating
  So that I can easily return to them later

  Background:
    Given an event exists with ID "A5ohYrHe" and name "Test Event"
    And the event is in "started" state

  Scenario: Bookmark an item during rating
    Given I am authenticated with email "user@example.com"
    And I navigate to "/event/A5ohYrHe"
    When I click on item button "1"
    Then I should see the rating drawer open
    When I click the bookmark toggle
    Then the bookmark should be marked as active
    And I close the drawer
    Then item button "1" should show a bookmark indicator

  Scenario: Unbookmark an item
    Given I am authenticated with email "user@example.com"
    And item "1" is already bookmarked
    And I navigate to "/event/A5ohYrHe"
    When I click on item button "1"
    Then I should see the bookmark is active
    When I click the bookmark toggle
    Then the bookmark should be marked as inactive
    And I close the drawer
    Then item button "1" should not show a bookmark indicator

  Scenario: Bookmark persists during session
    Given I am authenticated with email "user@example.com"
    And I navigate to "/event/A5ohYrHe"
    When I bookmark item "2"
    And I close the drawer
    Then item button "2" should show a bookmark indicator
    When I refresh the page
    Then item button "2" should still show a bookmark indicator
