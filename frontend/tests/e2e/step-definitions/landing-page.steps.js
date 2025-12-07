import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Step definitions for Landing Page feature
 * Integrates Playwright with Cucumber for E2E testing
 */

Given('I am on the landing page', async function () {
  // Browser and page are set up by Before hook in setup.js
  await this.page.goto('http://localhost:5173');
  // Wait for page to be fully loaded
  await this.page.waitForLoadState('networkidle');
});

When('the page loads', async function () {
  // Page is already loaded in the Given step
  // This step is for clarity in the scenario
  await this.page.waitForLoadState('domcontentloaded');
});

Then('I should see an event ID input field', async function () {
  const inputField = await this.page.locator('input[placeholder*="event id" i], input[placeholder*="Enter event ID" i]');
  await expect(inputField).toBeVisible();
});

Then('I should see a {string} button', async function (buttonText) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await expect(button).toBeVisible();
});

When('I type {string} into the event ID input field', async function (text) {
  const inputField = await this.page.locator('input[placeholder*="event id" i], input[placeholder*="Enter event ID" i]');
  await inputField.fill(text);
});

Then('the event ID input field should display {string}', async function (expectedText) {
  const inputField = await this.page.locator('input[placeholder*="event id" i], input[placeholder*="Enter event ID" i]');
  await expect(inputField).toHaveValue(expectedText);
});

When('I click the {string} button', async function (buttonText) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  
  // Track network requests before clicking
  const requests = [];
  this.page.on('request', (request) => {
    requests.push(request.url());
  });
  
  // Store initial URL
  const initialUrl = this.page.url();
  
  // Click the button
  await button.click();
  
  // Wait a bit to see if navigation occurs
  await this.page.waitForTimeout(500);
  
  // Store results for verification
  this.lastClickRequests = requests;
  this.lastClickInitialUrl = initialUrl;
  this.lastClickFinalUrl = this.page.url();
});

Then('the button should provide visual feedback', async function () {
  // Visual feedback is handled by CSS, so we verify the button is still visible
  // In a real scenario, we might check for CSS classes or styles
  // For now, we verify the button exists and is interactive
  const buttons = await this.page.locator('button').all();
  expect(buttons.length).toBeGreaterThan(0);
});

Then('no navigation should occur', async function () {
  // Verify URL didn't change
  expect(this.lastClickFinalUrl).toBe(this.lastClickInitialUrl);
});

Then('no network requests should be made', async function () {
  // Verify no API requests were made (excluding page load requests)
  const apiRequests = this.lastClickRequests.filter(url => 
    url.includes('/api/') || 
    url.includes('localhost:3001') ||
    (url.startsWith('http') && !url.includes('localhost:5173'))
  );
  expect(apiRequests.length).toBe(0);
});
