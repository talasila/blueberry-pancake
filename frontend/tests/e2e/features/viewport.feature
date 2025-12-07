Feature: Mobile Viewport Validation
  As a developer
  I want to verify the application renders correctly on mobile viewports
  So that users have a good experience on mobile devices

  Scenario: Application renders at 320px viewport
    Given I am viewing the application at 320px viewport width
    When I navigate to the home page
    Then the application should render correctly at 320px viewport width
    And touch targets should be at least 44px

  Scenario: Application renders at 768px viewport
    Given I am viewing the application at 768px viewport width
    When I navigate to the home page
    Then the application should render correctly at 768px viewport width
    And touch targets should be at least 44px

  Scenario: Responsive design works across breakpoints
    Given the application is running
    When I navigate to the home page
    Then the responsive design should work across breakpoints
