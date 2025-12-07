import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Example step definitions for Gherkin feature files
 * Integrates Playwright with Cucumber
 * Browser/page setup is handled by setup.js Before hook
 */

Given('the application is running', async function () {
  // Browser and page are set up by Before hook in setup.js
  // This step verifies the app is accessible
  const page = this.page;
  await page.goto('http://localhost:5173');
});

When('I navigate to the home page', async function () {
  await this.page.goto('http://localhost:5173');
});

Then('I should see {string} text', async function (text) {
  const content = await this.page.textContent('body');
  expect(content).toContain(text);
});

Then('the page should render without errors', async function () {
  // Check for console errors
  const errors = [];
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Wait a bit for any errors to appear
  await this.page.waitForTimeout(1000);
  
  expect(errors.length).toBe(0);
});

Given('I am using a mobile viewport \\(320px width\\)', async function () {
  // Create new context with mobile viewport
  const context = await this.browser.newContext({
    viewport: { width: 320, height: 667 },
  });
  this.page = await context.newPage();
  this.context = context;
});

Then('the page should be responsive', async function () {
  const bodyWidth = await this.page.evaluate(() => document.body.clientWidth);
  expect(bodyWidth).toBeLessThanOrEqual(768);
});

Then('touch targets should be at least {int}px', async function (minSize) {
  const buttons = await this.page.$$('button, a, input[type="button"]');
  
  for (const button of buttons) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(minSize);
      expect(box.width).toBeGreaterThanOrEqual(minSize);
    }
  }
});
