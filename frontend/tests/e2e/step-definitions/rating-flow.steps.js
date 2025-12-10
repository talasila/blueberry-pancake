import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Step definitions for Rating Flow feature (T084)
 */

Given('I have already rated item {string} with rating {string}', async function (itemId, rating) {
  // Navigate to event page
  await this.page.goto(`http://localhost:5173/event/A5ohYrHe`);
  await this.page.waitForLoadState('networkidle');
  
  // Click on item button
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  await itemButton.click();
  await this.page.waitForTimeout(500);
  
  // Select rating
  const ratingButton = this.page.locator(`button:has-text("${rating}")`).first();
  await ratingButton.click();
  
  // Submit rating
  const submitButton = this.page.getByRole('button', { name: /submit rating/i });
  await submitButton.click();
  await this.page.waitForTimeout(1000);
});

When('I click on item button {string}', async function (itemId) {
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  await itemButton.click();
  await this.page.waitForTimeout(500); // Wait for drawer animation
});

Then('I should see the rating drawer open', async function () {
  const drawer = this.page.locator('[role="dialog"]').or(this.page.locator('.fixed.right-0'));
  await expect(drawer).toBeVisible();
});

Then('I should see rating options', async function () {
  // Check for rating buttons/options
  const ratingOptions = this.page.locator('button').filter({ hasText: /^[1-4]$/ });
  await expect(ratingOptions.first()).toBeVisible();
});

When('I select rating {string}', async function (rating) {
  const ratingButton = this.page.locator(`button:has-text("${rating}")`).filter({ hasText: new RegExp(`^${rating}$`) });
  await ratingButton.first().click();
});

When('I enter note {string}', async function (note) {
  const noteTextarea = this.page.locator('textarea').or(this.page.locator('input[type="text"]'));
  await noteTextarea.fill(note);
});

When('I enter a note longer than 500 characters', async function () {
  const longNote = 'a'.repeat(501);
  const noteTextarea = this.page.locator('textarea');
  await noteTextarea.fill(longNote);
});

When('I update note to {string}', async function (note) {
  const noteTextarea = this.page.locator('textarea');
  await noteTextarea.clear();
  await noteTextarea.fill(note);
});

When('I click {string}', async function (buttonText) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await button.click();
  await this.page.waitForTimeout(500);
});

Then('I should see a success message', async function () {
  const successMessage = this.page.locator('text=/success/i').or(this.page.locator('.text-green-600'));
  await expect(successMessage).toBeVisible({ timeout: 5000 });
});

Then('the drawer should close', async function () {
  await this.page.waitForTimeout(1000); // Wait for close animation
  const drawer = this.page.locator('[role="dialog"]');
  await expect(drawer).not.toBeVisible({ timeout: 2000 });
});

Then('item button {string} should be colored with the rating color', async function (itemId) {
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  const backgroundColor = await itemButton.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  // Check that button has a background color (not default gray)
  expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(backgroundColor).not.toContain('rgb(243, 244, 246)'); // Default gray
});

Then('item button {string} should be colored with the new rating color', async function (itemId) {
  // Same as above
  const itemButton = this.page.locator(`button:has-text("${itemId}")`).first();
  const backgroundColor = await itemButton.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
});

Then('I should see my existing rating {string} selected', async function (rating) {
  const ratingButton = this.page.locator(`button:has-text("${rating}")`).first();
  const isSelected = await ratingButton.evaluate((el) => {
    return el.classList.contains('border-primary') || 
           window.getComputedStyle(el).borderWidth !== '0px';
  });
  expect(isSelected).toBeTruthy();
});

Then('I should see a character count warning', async function () {
  const warning = this.page.locator('text=/character/i').or(this.page.locator('.text-destructive'));
  await expect(warning).toBeVisible();
});

Then('I should not be able to submit the rating', async function () {
  const submitButton = this.page.getByRole('button', { name: /submit rating/i });
  await expect(submitButton).toBeDisabled();
});
