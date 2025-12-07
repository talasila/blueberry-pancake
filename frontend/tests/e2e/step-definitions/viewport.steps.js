import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Step definitions for mobile viewport validation
 */

Given('I am viewing the application at {int}px viewport width', async function (width) {
  const context = await this.browser.newContext({
    viewport: { width, height: 667 },
  });
  this.page = await context.newPage();
  this.context = context;
});

When('I navigate to the home page', async function () {
  await this.page.goto('http://localhost:5173');
});

Then('the application should render correctly at {int}px viewport width', async function (width) {
  const viewportSize = this.page.viewportSize();
  expect(viewportSize?.width).toBe(width);

  // Check that page loads without errors
  const content = await this.page.textContent('body');
  expect(content).toBeTruthy();
  expect(content).toContain('Blind Tasting Events');
});

Then('touch targets should be at least {int}px', async function (minSize) {
  const buttons = await this.page.$$('button, a, input[type="button"], input[type="submit"]');
  
  for (const button of buttons) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(minSize);
      expect(box.width).toBeGreaterThanOrEqual(minSize);
    }
  }
});

Then('the responsive design should work across breakpoints', async function () {
  // Test multiple viewport sizes
  const viewports = [320, 375, 768, 1024];
  
  for (const width of viewports) {
    const context = await this.browser.newContext({
      viewport: { width, height: 667 },
    });
    const page = await context.newPage();
    
    await page.goto('http://localhost:5173');
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    
    // Body should fit within viewport
    expect(bodyWidth).toBeLessThanOrEqual(width + 10); // Allow small margin
    
    await page.close();
    await context.close();
  }
});
