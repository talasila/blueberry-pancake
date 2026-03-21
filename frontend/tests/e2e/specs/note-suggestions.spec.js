/**
 * Note Suggestions Toggle E2E Tests
 *
 * Verifies that the noteSuggestionsEnabled toggle controls whether
 * tasting quip suggestions appear in the rating drawer for wine events.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  getUserToken,
  submitRating,
  startEvent,
  configureItems,
  loginAsUserToEvent,
  updateRatingConfig,
} from './helpers.js';

const ITEMS_COUNT = 8;

async function setupEvent(eventId, { noteSuggestionsEnabled = true } = {}) {
  const adminEmail = 'admin@example.com';
  const token = await addAdminToEvent(eventId, adminEmail);
  await configureItems(eventId, token, ITEMS_COUNT);
  if (!noteSuggestionsEnabled) {
    const result = await updateRatingConfig(eventId, token, { noteSuggestionsEnabled: false });
    if (!result.ok) throw new Error(`Failed to disable note suggestions: ${result.data}`);
  }
  await startEvent(eventId, token);
  return token;
}

test.describe('Note Suggestions Toggle', () => {

  test('suggestions appear when noteSuggestionsEnabled is true (default)', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'suggestions@example.com';
    await getUserToken(eventId, userEmail, pin);
    await loginAsUserToEvent(page, eventId, userEmail, pin);

    // Open rating drawer for item 1
    const itemButton = page.getByRole('button', { name: /^Item 1\b/ });
    await expect(itemButton).toBeVisible({ timeout: 10000 });
    await itemButton.click();

    const ratingDrawer = page.locator('[role="dialog"]');
    await expect(ratingDrawer).toBeVisible({ timeout: 5000 });

    // Select a rating to trigger suggestion load
    await ratingDrawer.getByRole('radio').first().click();

    // Suggestions section should appear
    await expect(page.getByText('Tap a suggestion or write your own')).toBeVisible({ timeout: 5000 });

    // At least one suggestion button should be visible
    const suggestionBtn = ratingDrawer.getByRole('button', { name: /add to note/i }).first();
    await expect(suggestionBtn).toBeVisible({ timeout: 5000 });
  });

  test('suggestions do NOT appear when noteSuggestionsEnabled is false', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId, { noteSuggestionsEnabled: false });

    const userEmail = 'nosuggestions@example.com';
    await getUserToken(eventId, userEmail, pin);
    await loginAsUserToEvent(page, eventId, userEmail, pin);

    // Open rating drawer for item 1
    const itemButton = page.getByRole('button', { name: /^Item 1\b/ });
    await expect(itemButton).toBeVisible({ timeout: 10000 });
    await itemButton.click();

    const ratingDrawer = page.locator('[role="dialog"]');
    await expect(ratingDrawer).toBeVisible({ timeout: 5000 });

    // Select a rating
    await ratingDrawer.getByRole('radio').first().click();

    // Wait a moment for suggestions to potentially load
    await page.waitForTimeout(1000);

    // Suggestions section should NOT appear
    await expect(page.getByText('Tap a suggestion or write your own')).not.toBeVisible();

    // Textarea should still work (free-text notes remain available)
    const textarea = ratingDrawer.locator('textarea');
    await expect(textarea).toBeVisible();
  });

  test('tapping a suggestion appends text to the note', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'tapsuggestion@example.com';
    await getUserToken(eventId, userEmail, pin);
    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const itemButton = page.getByRole('button', { name: /^Item 1\b/ });
    await expect(itemButton).toBeVisible({ timeout: 10000 });
    await itemButton.click();

    const ratingDrawer = page.locator('[role="dialog"]');
    await expect(ratingDrawer).toBeVisible({ timeout: 5000 });

    // Select a rating
    await ratingDrawer.getByRole('radio').first().click();

    // Wait for suggestions to load
    const suggestionBtn = ratingDrawer.getByRole('button', { name: /add to note/i }).first();
    await expect(suggestionBtn).toBeVisible({ timeout: 5000 });

    // Tap the suggestion
    await suggestionBtn.click();

    // Textarea should contain text
    const textarea = ratingDrawer.locator('textarea');
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});
