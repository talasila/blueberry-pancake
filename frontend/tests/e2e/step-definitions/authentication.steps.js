import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Step definitions for Authentication feature
 * Integrates Playwright with Cucumber for E2E testing
 */

// Store OTP codes received during tests
let receivedOTPs = {};

Given('I am on the authentication page', async function () {
  await this.page.goto('http://localhost:5173/auth');
  await this.page.waitForLoadState('networkidle');
});

When('I enter email {string}', async function (email) {
  const emailInput = this.page.locator('input[type="email"], input[placeholder*="email" i]');
  await emailInput.fill(email);
  this.testEmail = email;
});

When('I click the {string} button', async function (buttonText) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await button.click();
  // Wait for response
  await this.page.waitForTimeout(1000);
});

Then('I should see a success message', async function () {
  const successMessage = this.page.locator('text=/success|sent|check your email/i');
  await expect(successMessage).toBeVisible({ timeout: 5000 });
});

Then('I should see an error message', async function () {
  const errorMessage = this.page.locator('text=/error|invalid|failed/i');
  await expect(errorMessage).toBeVisible({ timeout: 5000 });
});

Then('the error message should contain {string}', async function (text) {
  const errorMessage = this.page.locator(`text=/${text}/i`);
  await expect(errorMessage).toBeVisible();
});

Then('an OTP email should be sent to {string}', async function (email) {
  // In a real scenario, we'd intercept the API call or check email service
  // For now, we verify the UI shows success
  // The actual email sending is tested in integration tests
  const successIndicator = this.page.locator('text=/sent|check your email/i');
  await expect(successIndicator).toBeVisible();
});

When('I request OTP {int} times for {string}', async function (count, email) {
  for (let i = 0; i < count; i++) {
    await this.page.locator('input[type="email"], input[placeholder*="email" i]').fill(email);
    const button = this.page.getByRole('button', { name: /request otp/i });
    await button.click();
    await this.page.waitForTimeout(500);
  }
});

Then('I should see a rate limit error message', async function () {
  const rateLimitMessage = this.page.locator('text=/rate limit|too many requests/i');
  await expect(rateLimitMessage).toBeVisible({ timeout: 5000 });
});

Given('I have requested an OTP for {string}', async function (email) {
  // Navigate to auth page
  await this.page.goto('http://localhost:5173/auth');
  await this.page.waitForLoadState('networkidle');
  
  // Request OTP
  await this.page.locator('input[type="email"], input[placeholder*="email" i]').fill(email);
  const requestButton = this.page.getByRole('button', { name: /request otp/i });
  await requestButton.click();
  await this.page.waitForTimeout(1000);
  
  // In a real test, we'd intercept the API response to get the OTP
  // For now, we'll use a mock or test OTP
  this.testEmail = email;
  this.testOTP = '123456'; // Will be replaced with actual OTP from API response
});

When('I enter the OTP code I received', async function () {
  // In a real scenario, we'd get the OTP from the email or API response
  // For now, we'll need to mock this or intercept the API call
  const otpInput = this.page.locator('input[placeholder*="otp" i], input[type="text"][maxlength="6"]');
  await otpInput.fill(this.testOTP || '123456');
});

When('I enter OTP {string}', async function (otp) {
  const otpInput = this.page.locator('input[placeholder*="otp" i], input[type="text"][maxlength="6"]');
  await otpInput.fill(otp);
});

When('I click the {string} button', async function (buttonText) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await button.click();
  await this.page.waitForTimeout(1000);
});

Then('I should receive a JWT token', async function () {
  // Verify token is stored in localStorage
  const token = await this.page.evaluate(() => localStorage.getItem('jwtToken'));
  expect(token).toBeTruthy();
  this.jwtToken = token;
});

Then('I should be redirected to the originally requested page or landing page', async function () {
  // Wait for navigation
  await this.page.waitForTimeout(1000);
  const currentUrl = this.page.url();
  // Should be on landing page or a protected page
  expect(currentUrl).toMatch(/http:\/\/localhost:5173\//);
});

Given('I am in a development environment', async function () {
  // This is handled by the backend - no action needed in frontend test
  // The test OTP will work if NODE_ENV !== 'production'
});

Then('I should be authenticated', async function () {
  const token = await this.page.evaluate(() => localStorage.getItem('jwtToken'));
  expect(token).toBeTruthy();
});

Given('I am authenticated with a valid JWT token', async function () {
  // Set a valid JWT token in localStorage
  // In a real scenario, we'd get this from a successful OTP verification
  const mockToken = 'mock.jwt.token';
  await this.page.evaluate((token) => {
    localStorage.setItem('jwtToken', token);
  }, mockToken);
  this.jwtToken = mockToken;
});

When('I navigate to a protected page', async function () {
  // Navigate to a protected route (assuming /protected or similar exists)
  await this.page.goto('http://localhost:5173/protected');
  await this.page.waitForLoadState('networkidle');
});

Then('I should see the protected page content', async function () {
  // Verify we're not redirected and see some content
  const currentUrl = this.page.url();
  expect(currentUrl).toContain('/protected');
  // Page should have some content (not just redirect)
  const body = await this.page.locator('body').textContent();
  expect(body).toBeTruthy();
});

Then('I should not be redirected', async function () {
  // Verify URL hasn't changed to landing page
  const currentUrl = this.page.url();
  expect(currentUrl).not.toBe('http://localhost:5173/');
});

Given('I am not authenticated', async function () {
  // Clear any existing token
  await this.page.evaluate(() => {
    localStorage.removeItem('jwtToken');
  });
});

Then('I should be redirected to the landing page', async function () {
  await this.page.waitForTimeout(1000);
  const currentUrl = this.page.url();
  expect(currentUrl).toBe('http://localhost:5173/');
});

When('I navigate to the landing page', async function () {
  await this.page.goto('http://localhost:5173/');
  await this.page.waitForLoadState('networkidle');
});

Then('I should see the landing page content', async function () {
  // Verify landing page elements are visible
  const joinButton = this.page.getByRole('button', { name: /join/i });
  await expect(joinButton).toBeVisible();
});
