Feature: Performance Validation
  As a developer
  I want to verify mobile network optimization
  So that the application performs well on mobile devices

  Scenario: Payload size is optimized
    Given the application is running
    When I load the home page
    Then the page payload should be less than 100KB
    And the page should load in under 3 seconds

  Scenario: Bundle size is within limits
    Given the application is built
    When I check the bundle sizes
    Then no chunk should exceed 500KB
    And the total bundle size should be optimized
