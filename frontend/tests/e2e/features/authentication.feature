Feature: OTP Authentication
  As a user
  I want to authenticate using OTP codes sent to my email
  So that I can access protected pages and features

  # User Story 1: Request OTP via Email
  Scenario: User Story 1 - Request OTP with valid email
    Given I am on the authentication page
    When I enter email "test@example.com"
    And I click the "Request OTP" button
    Then I should see a success message
    And an OTP email should be sent to "test@example.com"

  Scenario: User Story 1 - Request OTP with invalid email format
    Given I am on the authentication page
    When I enter email "invalid-email"
    And I click the "Request OTP" button
    Then I should see an error message
    And the error message should contain "Invalid email"

  Scenario: User Story 1 - Rate limit exceeded for email
    Given I am on the authentication page
    When I request OTP 4 times for "ratelimit@example.com"
    Then I should see a rate limit error message

  # User Story 2: Verify OTP and Receive JWT Token
  Scenario: User Story 2 - Verify valid OTP and receive token
    Given I have requested an OTP for "verify@example.com"
    When I enter the OTP code I received
    And I click the "Verify OTP" button
    Then I should see a success message
    And I should receive a JWT token
    And I should be redirected to the originally requested page or landing page

  Scenario: User Story 2 - Verify invalid OTP
    Given I have requested an OTP for "invalid@example.com"
    When I enter OTP "999999"
    And I click the "Verify OTP" button
    Then I should see an error message
    And the error message should contain "Invalid"

  Scenario: User Story 2 - Test OTP bypass in development
    Given I am in a development environment
    And I am on the authentication page
    When I enter email "any@example.com"
    And I enter OTP "123456"
    And I click the "Verify OTP" button
    Then I should receive a JWT token
    And I should be authenticated

  # User Story 3: Access Protected Pages with Authentication
  Scenario: User Story 3 - Access protected page with valid token
    Given I am authenticated with a valid JWT token
    When I navigate to a protected page
    Then I should see the protected page content
    And I should not be redirected

  Scenario: User Story 3 - Access protected page without token
    Given I am not authenticated
    When I navigate to a protected page
    Then I should be redirected to the landing page

  Scenario: User Story 3 - Access landing page without authentication
    Given I am not authenticated
    When I navigate to the landing page
    Then I should see the landing page content
    And I should not be redirected
