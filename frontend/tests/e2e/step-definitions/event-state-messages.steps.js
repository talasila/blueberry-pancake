import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Step definitions for Event State Messages feature (T086)
 */

Then('I should see a message {string}', async function (messageText) {
  const message = this.page.locator(`text=/${messageText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i`);
  await expect(message).toBeVisible({ timeout: 5000 });
});

Then('I should not see the rating form', async function () {
  const ratingForm = this.page.locator('form').or(this.page.locator('textarea'));
  await expect(ratingForm).not.toBeVisible();
});

Then('I should see the rating form', async function () {
  const ratingForm = this.page.locator('form').or(this.page.locator('textarea'));
  await expect(ratingForm).toBeVisible({ timeout: 5000 });
});

Then('I should not see a state message', async function () {
  const stateMessages = this.page.locator('text=/not started|paused|completed/i');
  await expect(stateMessages).not.toBeVisible();
});
