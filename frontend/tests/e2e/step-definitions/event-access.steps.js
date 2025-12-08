import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Step definitions for Event Access feature
 * Integrates Playwright with Cucumber for E2E testing
 */

// Store authentication state
let authenticatedEmail = null;
let jwtToken = null;

Given('I am authenticated with email {string}', async function (email) {
  // In a real scenario, we'd authenticate via the auth flow
  // For E2E tests, we can use test OTP or mock authentication
  authenticatedEmail = email;
  
  // Navigate to auth page and authenticate
  await this.page.goto('http://localhost:5173/auth');
  await this.page.waitForLoadState('networkidle');
  
  // Enter email
  const emailInput = this.page.locator('input[type="email"], input[placeholder*="email" i]');
  await emailInput.fill(email);
  
  // Request OTP
  const requestButton = this.page.getByRole('button', { name: /request otp/i });
  await requestButton.click();
  await this.page.waitForTimeout(1000);
  
  // Use test OTP in development
  const otpInput = this.page.locator('input[placeholder*="otp" i], input[type="text"]').first();
  await otpInput.fill('123456');
  
  // Verify OTP
  const verifyButton = this.page.getByRole('button', { name: /verify|submit/i });
  await verifyButton.click();
  
  // Wait for authentication to complete
  await this.page.waitForTimeout(2000);
  
  // Store token from localStorage
  jwtToken = await this.page.evaluate(() => localStorage.getItem('jwtToken'));
});

Given('I am not authenticated', async function () {
  authenticatedEmail = null;
  jwtToken = null;
  
  // Clear authentication
  await this.page.evaluate(() => {
    localStorage.removeItem('jwtToken');
  });
});

Given('an event exists with ID {string} and name {string}', async function (eventId, eventName) {
  // In a real scenario, we'd create the event via API or database
  // For E2E tests, we assume the event exists in the test data
  this.testEventId = eventId;
  this.testEventName = eventName;
});

Given('an event exists with ID {string} and state {string}', async function (eventId, state) {
  this.testEventId = eventId;
  this.testEventState = state;
  // Event should exist in test data with the specified state
});

Given('an event exists with ID {string} and administrator {string}', async function (eventId, administrator) {
  this.testEventId = eventId;
  this.testAdministrator = administrator;
  // Event should exist in test data with the specified administrator
});

Given('an event with ID {string} does not exist', async function (eventId) {
  this.testEventId = eventId;
  // Event should not exist in test data
});

Given('I am on the event page {string}', async function (path) {
  await this.page.goto(`http://localhost:5173${path}`);
  await this.page.waitForLoadState('networkidle');
});

Given('I am on the admin page {string}', async function (path) {
  await this.page.goto(`http://localhost:5173${path}`);
  await this.page.waitForLoadState('networkidle');
});

When('I navigate to {string}', async function (path) {
  await this.page.goto(`http://localhost:5173${path}`);
  await this.page.waitForLoadState('networkidle');
});

When('I click the {string} button', async function (buttonText) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await button.click();
  await this.page.waitForLoadState('networkidle');
});

When('the administrator changes the event state to {string}', async function (state) {
  // In a real scenario, we'd make an API call to update the event state
  // For E2E tests, we can simulate this by directly updating the event data
  // or by navigating to the admin page and changing the state
  this.testEventState = state;
  
  // Wait a bit to simulate the state change
  await this.page.waitForTimeout(1000);
});

Then('I should see the event page', async function () {
  // Check for event page content
  const eventContent = this.page.locator('text=/event|rating|test event/i');
  await expect(eventContent.first()).toBeVisible({ timeout: 5000 });
});

Then('I should see {string} in the header', async function (text) {
  const header = this.page.locator('header');
  await expect(header).toContainText(text, { timeout: 5000 });
});

Then('I should see the event details', async function () {
  // Check for event details
  const eventId = this.page.locator(`text=/${this.testEventId}/i`);
  await expect(eventId).toBeVisible({ timeout: 5000 });
});

Then('I should not be redirected', async function () {
  // Check that we're still on the event page
  const currentUrl = this.page.url();
  expect(currentUrl).toContain('/event/');
});

Then('I should be redirected to the authentication page', async function () {
  await this.page.waitForURL('**/auth', { timeout: 5000 });
  const currentUrl = this.page.url();
  expect(currentUrl).toContain('/auth');
});

Then('I should see an error message', async function () {
  const errorMessage = this.page.locator('text=/error|not found|failed/i');
  await expect(errorMessage).toBeVisible({ timeout: 5000 });
});

Then('the error message should contain {string}', async function (text) {
  const errorMessage = this.page.locator(`text=/${text}/i`);
  await expect(errorMessage).toBeVisible({ timeout: 5000 });
});

Then('I should see the event in {string} state', async function (state) {
  const stateText = this.page.locator(`text=/${state}/i`);
  await expect(stateText).toBeVisible({ timeout: 5000 });
});

Then('within {int} seconds I should see the event state change to {string}', async function (seconds, state) {
  // Wait for polling to detect the state change
  const stateText = this.page.locator(`text=/${state}/i`);
  await expect(stateText).toBeVisible({ timeout: seconds * 1000 });
});

Then('I should see a message that rating is not available', async function () {
  const message = this.page.locator('text=/rating.*not available|not available.*rating/i');
  await expect(message).toBeVisible({ timeout: 5000 });
});

Then('I should see that rating is not available', async function () {
  const message = this.page.locator('text=/rating.*not available|not available.*rating|paused|finished/i');
  await expect(message).toBeVisible({ timeout: 5000 });
});

Then('I should see a message about the event being paused', async function () {
  const message = this.page.locator('text=/paused|rating is not available/i');
  await expect(message).toBeVisible({ timeout: 5000 });
});

Then('I should see the admin page', async function () {
  const adminContent = this.page.locator('text=/event administration|admin/i');
  await expect(adminContent.first()).toBeVisible({ timeout: 5000 });
});

Then('I should see {string} heading', async function (heading) {
  const headingElement = this.page.getByRole('heading', { name: new RegExp(heading, 'i') });
  await expect(headingElement).toBeVisible({ timeout: 5000 });
});

Then('I should be redirected to {string}', async function (path) {
  await this.page.waitForURL(`**${path}`, { timeout: 5000 });
  const currentUrl = this.page.url();
  expect(currentUrl).toContain(path);
});

Then('I should not see the admin page', async function () {
  const adminContent = this.page.locator('text=/event administration/i');
  await expect(adminContent).not.toBeVisible({ timeout: 2000 });
});

Then('I should not see the {string} button', async function (buttonText) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await expect(button).not.toBeVisible({ timeout: 2000 });
});

Then('I should be navigated to {string}', async function (path) {
  await this.page.waitForURL(`**${path}`, { timeout: 5000 });
  const currentUrl = this.page.url();
  expect(currentUrl).toContain(path);
});
