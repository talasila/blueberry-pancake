/**
 * E2E test setup for test isolation
 * Ensures cleanup between tests, mock external dependencies, independent test state
 */
import { Before, After } from '@cucumber/cucumber';
import { chromium } from 'playwright';

let browser;
let context;
let page;

/**
 * Setup before each scenario
 */
Before(async function () {
  // Each scenario gets a fresh browser context
  browser = await chromium.launch();
  context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // Default mobile viewport
  });
  page = await context.newPage();

  // Store in world for step definitions
  this.browser = browser;
  this.context = context;
  this.page = page;
});

/**
 * Cleanup after each scenario
 */
After(async function () {
  // Clean up browser resources
  if (this.page) {
    await this.page.close();
  }
  if (this.context) {
    await this.context.close();
  }
  if (this.browser) {
    await this.browser.close();
  }

  // Clear any stored state
  this.browser = null;
  this.context = null;
  this.page = null;
});

/**
 * Mock external dependencies if needed
 * Example: Mock API calls, localStorage, etc.
 */
export function setupMocks(page) {
  // Example: Mock fetch API if needed
  // page.route('**/api/**', route => route.fulfill({ status: 200, body: '{}' }));
}

/**
 * Clean up mocks
 */
export function cleanupMocks(page) {
  // Unroute any mocked routes
  // page.unroute('**/api/**');
}
