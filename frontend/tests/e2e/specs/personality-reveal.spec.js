/**
 * Personality Reveal Sheet E2E Tests
 *
 * Verifies that the celebratory bottom sheet appears once the user
 * crosses the personality threshold by submitting a new rating through
 * the RatingDrawer, and that the sheet correctly opens My Progress.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  getUserToken,
  submitRating,
  startEvent,
  configureItems,
  loginAsUserToEvent,
} from './helpers.js';

const ITEMS_COUNT = 8;
const RATINGS_BELOW_THRESHOLD = 3;

async function submitRatings(eventId, token, count, ratingValue = 4) {
  for (let i = 1; i <= count; i++) {
    const result = await submitRating(eventId, token, i, ratingValue);
    if (!result.ok) throw new Error(`Failed to submit rating for item ${i}`);
  }
}

async function setupEvent(eventId) {
  const adminEmail = 'admin@example.com';
  const token = await addAdminToEvent(eventId, adminEmail);
  const cfg = await configureItems(eventId, token, ITEMS_COUNT);
  if (!cfg.ok) throw new Error(`Failed to configure items: ${cfg.data}`);
  await startEvent(eventId, token);
  return token;
}

test.describe('Personality Reveal Sheet', () => {

  test('reveal sheet appears after threshold-crossing rating and opens My Progress', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'reveal@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_BELOW_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    // Wait for item buttons to be visible
    const itemButton = page.getByRole('button', { name: new RegExp(`^Item ${RATINGS_BELOW_THRESHOLD + 1}\\b`) });
    await expect(itemButton).toBeVisible({ timeout: 10000 });

    // Open the RatingDrawer for the next unrated item
    await itemButton.click();

    const ratingDrawer = page.locator('[role="dialog"]');
    await expect(ratingDrawer).toBeVisible({ timeout: 5000 });

    // Select a rating (first radio option)
    const ratingOption = ratingDrawer.getByRole('radio').first();
    await ratingOption.click();

    // Submit the rating
    const submitBtn = ratingDrawer.getByRole('button', { name: /submit/i });
    await submitBtn.click();

    // Wait for the reveal sheet to appear (drawer closes, ratings refresh, then delay)
    const revealSheet = page.getByTestId('personality-reveal-sheet');
    await expect(revealSheet).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Your tasting personality is ready')).toBeVisible();

    // Tap "Reveal My Personality"
    await page.getByTestId('personality-reveal-btn').click();

    // The reveal sheet should dismiss
    await expect(revealSheet).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });

    // My Progress drawer should open
    const progressDrawer = page.locator('[role="dialog"][aria-hidden="false"]');
    await expect(progressDrawer).toBeVisible({ timeout: 5000 });
    const card = progressDrawer.locator('[aria-label*="tasting personality" i]');
    await expect(card).toBeVisible({ timeout: 5000 });
  });

  test('reveal sheet does NOT appear on subsequent drawer closes', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'norepeat@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_BELOW_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    // Submit threshold-crossing rating via UI
    const itemButton = page.getByRole('button', { name: new RegExp(`^Item ${RATINGS_BELOW_THRESHOLD + 1}\\b`) });
    await expect(itemButton).toBeVisible({ timeout: 10000 });
    await itemButton.click();

    const ratingDrawer = page.locator('[role="dialog"]');
    await expect(ratingDrawer).toBeVisible({ timeout: 5000 });
    await ratingDrawer.getByRole('radio').first().click();
    await ratingDrawer.getByRole('button', { name: /submit/i }).click();

    // Wait for reveal sheet and dismiss it
    const revealSheet = page.getByTestId('personality-reveal-sheet');
    await expect(revealSheet).toBeVisible({ timeout: 15000 });
    await page.getByTestId('personality-reveal-dismiss-btn').click();
    await expect(revealSheet).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });

    // Open and close another rating drawer — reveal should NOT reappear
    const nextItem = page.getByRole('button', { name: new RegExp(`^Item ${RATINGS_BELOW_THRESHOLD + 2}\\b`) });
    await expect(nextItem).toBeVisible({ timeout: 5000 });
    await nextItem.click();
    const ratingDrawer2 = page.locator('[role="dialog"][aria-labelledby="drawer-title"]');
    await expect(ratingDrawer2).toBeVisible({ timeout: 5000 });

    // Close without submitting
    await ratingDrawer2.getByRole('button', { name: /close drawer/i }).click();

    // Verify the reveal sheet does NOT reappear
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('personality-reveal-sheet')).not.toBeVisible();
  });

  test('"Maybe later" dismisses without opening My Progress', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'later@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_BELOW_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const itemButton = page.getByRole('button', { name: new RegExp(`^Item ${RATINGS_BELOW_THRESHOLD + 1}\\b`) });
    await expect(itemButton).toBeVisible({ timeout: 10000 });
    await itemButton.click();

    const ratingDrawer = page.locator('[role="dialog"]');
    await expect(ratingDrawer).toBeVisible({ timeout: 5000 });
    await ratingDrawer.getByRole('radio').first().click();
    await ratingDrawer.getByRole('button', { name: /submit/i }).click();

    const revealSheet = page.getByTestId('personality-reveal-sheet');
    await expect(revealSheet).toBeVisible({ timeout: 15000 });

    // Tap "Maybe later"
    await page.getByTestId('personality-reveal-dismiss-btn').click();
    await expect(revealSheet).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });

    // Verify My Progress drawer did NOT open
    await page.waitForTimeout(1000);
    const progressCard = page.locator('[aria-label*="tasting personality" i]');
    await expect(progressCard).not.toBeVisible();
  });
});
