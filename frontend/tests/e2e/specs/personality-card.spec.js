/**
 * Tasting Personality Card E2E Tests
 *
 * Verifies that the personality card renders correctly across all three
 * surfaces: My Progress drawer, Similar Users detail view, and Dashboard
 * Summary tab. Also covers the threshold gate and dot-badge notification.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
  getUserToken,
  submitRating,
  startEvent,
  changeEventState,
  configureItems,
  loginAsUserToEvent,
  updateRatingConfig,
  BASE_URL,
} from './helpers.js';

const ITEMS_COUNT = 8;
const RATINGS_BELOW_THRESHOLD = 3;
const RATINGS_AT_THRESHOLD = 4;

/**
 * Submit N identical ratings (value 4) for a user via API.
 * Starts from itemId 1 up to N.
 */
async function submitRatings(eventId, token, count, ratingValue = 4) {
  for (let i = 1; i <= count; i++) {
    const result = await submitRating(eventId, token, i, ratingValue);
    if (!result.ok) throw new Error(`Failed to submit rating for item ${i}: ${JSON.stringify(result.data)}`);
  }
}

/**
 * Set up a started event with configured items. Returns admin token.
 */
async function setupEvent(eventId) {
  const adminEmail = 'admin@example.com';
  const token = await addAdminToEvent(eventId, adminEmail);
  const cfg = await configureItems(eventId, token, ITEMS_COUNT);
  if (!cfg.ok) throw new Error(`Failed to configure items: ${cfg.data}`);
  await startEvent(eventId, token);
  return token;
}

test.describe('Tasting Personality Card', () => {

  // ───────────────────────────────────────────
  // My Progress drawer
  // ───────────────────────────────────────────

  test('personality card does NOT appear before rating threshold', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'early@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_BELOW_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const progressBtn = page.getByRole('button', { name: /my progress/i });
    await expect(progressBtn).toBeVisible({ timeout: 10000 });
    await progressBtn.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    await expect(drawer.getByText(/tasting personality/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('personality card appears in My Progress after reaching threshold', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'threshold@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_AT_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const progressBtn = page.getByRole('button', { name: /my progress/i });
    await expect(progressBtn).toBeVisible({ timeout: 10000 });
    await progressBtn.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const card = drawer.locator('[aria-label*="tasting personality" i]');
    await expect(card).toBeVisible({ timeout: 5000 });
    await expect(card.getByText(/your tasting personality/i)).toBeVisible();
  });

  // ───────────────────────────────────────────
  // Dot-badge notification
  // ───────────────────────────────────────────

  test('dot badge appears on My Progress button when personality becomes available', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'badgeuser@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_AT_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const progressBtn = page.getByRole('button', { name: /my progress/i });
    await expect(progressBtn).toBeVisible({ timeout: 10000 });

    const badge = progressBtn.locator('[data-testid="personality-badge"]');
    await expect(badge).toBeVisible({ timeout: 5000 });
  });

  // ───────────────────────────────────────────
  // Similar Users list subtitle
  // ───────────────────────────────────────────

  test('personality name shows as subtitle in Similar Users list', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const currentEmail = 'current@example.com';
    const currentToken = await getUserToken(eventId, currentEmail, pin);
    await submitRatings(eventId, currentToken, RATINGS_AT_THRESHOLD);

    const otherEmail = 'other@example.com';
    const otherToken = await getUserToken(eventId, otherEmail, pin);
    await submitRatings(eventId, otherToken, RATINGS_AT_THRESHOLD);

    await loginAsUserToEvent(page, eventId, currentEmail, pin);

    const similarBtn = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarBtn).toBeVisible({ timeout: 10000 });
    await similarBtn.click();

    const otherName = otherEmail.split('@')[0];
    const otherUserBtn = page.getByRole('button', { name: new RegExp(otherName, 'i') });
    await expect(otherUserBtn).toBeVisible({ timeout: 10000 });

    await expect(otherUserBtn.getByText(/The \w+/)).toBeVisible({ timeout: 5000 });
  });

  // ───────────────────────────────────────────
  // Sticky quote (localStorage persistence)
  // ───────────────────────────────────────────

  test('personality quote is the same across multiple drawer opens', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await setupEvent(eventId);

    const userEmail = 'sticky@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_AT_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const progressBtn = page.getByRole('button', { name: /my progress/i });
    await expect(progressBtn).toBeVisible({ timeout: 10000 });

    // First open — capture the quote
    await progressBtn.click();
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    const quoteEl = drawer.locator('[aria-label*="tasting personality" i] .italic');
    await expect(quoteEl).toBeVisible({ timeout: 5000 });
    const firstQuote = await quoteEl.textContent();

    // Close drawer via its close button
    await drawer.getByRole('button', { name: /close user details/i }).click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });

    // Second open — quote must be identical
    await progressBtn.click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    const secondQuoteEl = drawer.locator('[aria-label*="tasting personality" i] .italic');
    await expect(secondQuoteEl).toBeVisible({ timeout: 5000 });
    const secondQuote = await secondQuoteEl.textContent();

    expect(firstQuote).toBe(secondQuote);
  });

  // ───────────────────────────────────────────
  // Dashboard Summary tab
  // ───────────────────────────────────────────

  test('Personality appears on user card in Dashboard Users tab', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminToken = await setupEvent(eventId);

    const userEmail = 'dashuser@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_AT_THRESHOLD);

    await changeEventState(eventId, 'completed', 'started', adminToken);

    const adminEmail = 'admin@example.com';
    await setAuthToken(page, adminToken, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Click People tab
    const peopleTab = page.getByRole('tab', { name: /people/i });
    await peopleTab.click();

    // Verify the user card shows the username and a personality
    const userCard = page.locator('button').filter({ hasText: new RegExp(userEmail.split('@')[0], 'i') });
    await expect(userCard.first()).toBeVisible({ timeout: 10000 });
    await expect(userCard.first()).toContainText(/The \w+/, { timeout: 5000 });
  });

  // ───────────────────────────────────────────
  // Personality disabled via personalityEnabled toggle
  // ───────────────────────────────────────────

  test('personality name does NOT show in Similar Users when personalityEnabled is false', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    await configureItems(eventId, token, ITEMS_COUNT);
    await updateRatingConfig(eventId, token, { personalityEnabled: false });
    await startEvent(eventId, token);

    const currentEmail = 'nosimcurrent@example.com';
    const currentToken = await getUserToken(eventId, currentEmail, pin);
    await submitRatings(eventId, currentToken, RATINGS_AT_THRESHOLD);

    const otherEmail = 'nosimother@example.com';
    const otherToken = await getUserToken(eventId, otherEmail, pin);
    await submitRatings(eventId, otherToken, RATINGS_AT_THRESHOLD);

    await loginAsUserToEvent(page, eventId, currentEmail, pin);

    const similarBtn = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarBtn).toBeVisible({ timeout: 10000 });
    await similarBtn.click();

    const otherName = otherEmail.split('@')[0];
    const otherUserBtn = page.getByRole('button', { name: new RegExp(otherName, 'i') });
    await expect(otherUserBtn).toBeVisible({ timeout: 10000 });

    // Should show "X common" but no personality name (no "The ...")
    await expect(otherUserBtn.getByText(/common/i)).toBeVisible({ timeout: 5000 });
    await expect(otherUserBtn.getByText(/The \w+/)).not.toBeVisible();
  });

  test('personality card does NOT appear in My Progress when personalityEnabled is false', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    await configureItems(eventId, token, ITEMS_COUNT);
    await updateRatingConfig(eventId, token, { personalityEnabled: false });
    await startEvent(eventId, token);

    const userEmail = 'nopersonality@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_AT_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const progressBtn = page.getByRole('button', { name: /my progress/i });
    await expect(progressBtn).toBeVisible({ timeout: 10000 });
    await progressBtn.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Personality card should NOT appear even though threshold is met
    await expect(drawer.getByText(/tasting personality/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('dot badge does NOT appear when personalityEnabled is false', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    await configureItems(eventId, token, ITEMS_COUNT);
    await updateRatingConfig(eventId, token, { personalityEnabled: false });
    await startEvent(eventId, token);

    const userEmail = 'nobadge@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_AT_THRESHOLD);

    await loginAsUserToEvent(page, eventId, userEmail, pin);

    const progressBtn = page.getByRole('button', { name: /my progress/i });
    await expect(progressBtn).toBeVisible({ timeout: 10000 });

    // Badge should NOT appear
    const badge = progressBtn.locator('[data-testid="personality-badge"]');
    await expect(badge).not.toBeVisible({ timeout: 3000 });
  });

  test('personality does NOT appear in Dashboard when personalityEnabled is false', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    await configureItems(eventId, token, ITEMS_COUNT);
    await updateRatingConfig(eventId, token, { personalityEnabled: false });
    await startEvent(eventId, token);

    const userEmail = 'nodashpersonality@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRatings(eventId, userToken, RATINGS_AT_THRESHOLD);

    await changeEventState(eventId, 'completed', 'started', token);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Click People tab
    const peopleTab = page.getByRole('tab', { name: /people/i });
    await peopleTab.click();

    // User card should show username but NO personality (no · separator)
    const userCard = page.locator('button').filter({ hasText: new RegExp(userEmail.split('@')[0], 'i') });
    await expect(userCard.first()).toBeVisible({ timeout: 10000 });
    await expect(userCard.first()).not.toContainText(/·/);
  });
});
