Feature: Rating Flow
  As a user
  I want to rate items in an event
  So that I can provide feedback on items

  Background:
    Given an event exists with ID "A5ohYrHe" and name "Test Event"
    And the event is in "started" state
    And the event has rating configuration with maxRating 4

  Scenario: Complete rating flow - submit new rating
    Given I am authenticated with email "user@example.com"
    And I navigate to "/event/A5ohYrHe"
    When I click on item button "1"
    Then I should see the rating drawer open
    And I should see rating options
    When I select rating "3"
    And I enter note "This is a test note"
    And I click "Submit Rating"
    Then I should see a success message
    And the drawer should close
    And item button "1" should be colored with the rating color

  Scenario: Complete rating flow - update existing rating
    Given I am authenticated with email "user@example.com"
    And I have already rated item "1" with rating "2"
    And I navigate to "/event/A5ohYrHe"
    When I click on item button "1"
    Then I should see the rating drawer open
    And I should see my existing rating "2" selected
    When I select rating "4"
    And I update note to "Updated note"
    And I click "Update Rating"
    Then I should see a success message
    And the drawer should close
    And item button "1" should be colored with the new rating color

  Scenario: Rating validation - rating required
    Given I am authenticated with email "user@example.com"
    And I navigate to "/event/A5ohYrHe"
    When I click on item button "1"
    And I enter note "Test note without rating"
    And I click "Submit Rating"
    Then I should see an error message
    And the error message should contain "Please select a rating"
    And the rating should not be submitted

  Scenario: Rating validation - note length limit
    Given I am authenticated with email "user@example.com"
    And I navigate to "/event/A5ohYrHe"
    When I click on item button "1"
    And I select rating "3"
    And I enter a note longer than 500 characters
    Then I should see a character count warning
    And I should not be able to submit the rating
