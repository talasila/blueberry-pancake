Feature: Application Health Check
  As a developer
  I want to verify the application is running
  So that I can confirm the baseline setup is working

  Scenario: Application loads successfully
    Given the application is running
    When I navigate to the home page
    Then I should see "Blind Tasting Events" text
    And the page should render without errors

  Scenario: Mobile viewport renders correctly
    Given I am using a mobile viewport (320px width)
    When I navigate to the home page
    Then the page should be responsive
    And touch targets should be at least 44px
