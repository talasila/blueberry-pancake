import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Step definitions for Bookmark Flow feature (T085)
 */

When('I click the bookmark toggle', async function () {
  const bookmarkButton = this.page.locator('button').filter({ 
    hasText: /bookmark/i 
  }).or(this.page.locator('[aria-label*="bookmark" i]'));
  await bookmarkButton.click();
  await this.page.waitForTimeout(300);
});

Then('the bookmark should be marked as active', async function () {
  const bookmarkIcon = this.page.locator('svg').filter({ 
    has: this.page.locator('path[fill="yellow"]') 
  }).or(this.page.locator('.text-yellow-400'));
  await expect(bookmarkIcon).toBeVisible();
});

Then('the bookmark should be marked as inactive', async function () {
  // Check that bookmark icon is not filled/active
  const activeBookmark = this.page.locator('.text-yellow-400, [fill="yellow"]');
  await expect(activeBookmark).not.toBeVisible();
});

When('I close the drawer', async function () {
  const closeButton = this.page.getByRole('button', { name: /close/i }).or(
    this.page.locator('button').filter({ has: this.page.locator('svg') })
  );
  await closeButton.click();
  await this.page.waitForTimeout(500); // Wait for close animation
});

Then('item button {string} should show a bookmark indicator', async function (itemId) {
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  const bookmarkIcon = itemButton.locator('svg').or(itemButton.locator('[aria-label*="bookmark" i]'));
  await expect(bookmarkIcon).toBeVisible();
});

Then('item button {string} should not show a bookmark indicator', async function (itemId) {
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  const bookmarkIcon = itemButton.locator('svg[aria-label*="bookmark" i]');
  await expect(bookmarkIcon).not.toBeVisible();
});

Given('item {string} is already bookmarked', async function (itemId) {
  // Navigate to event and bookmark the item
  await this.page.goto(`http://localhost:5173/event/A5ohYrHe`);
  await this.page.waitForLoadState('networkidle');
  
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  await itemButton.click();
  await this.page.waitForTimeout(500);
  
  await this.page.locator('button').filter({ hasText: /bookmark/i }).click();
  await this.page.waitForTimeout(300);
  
  // Close drawer
  const closeButton = this.page.getByRole('button', { name: /close/i }).first();
  await closeButton.click();
  await this.page.waitForTimeout(500);
});

When('I bookmark item {string}', async function (itemId) {
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  await itemButton.click();
  await this.page.waitForTimeout(500);
  
  await this.page.locator('button').filter({ hasText: /bookmark/i }).click();
  await this.page.waitForTimeout(300);
  
  const closeButton = this.page.getByRole('button', { name: /close/i }).first();
  await closeButton.click();
  await this.page.waitForTimeout(500);
});

When('I refresh the page', async function () {
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});
