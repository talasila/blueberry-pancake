/**
 * Participation Ring E2E Tests
 *
 * Verifies the SVG participation ring renders only for admins during the
 * 'started' event state and never for regular guests.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
  changeEventState,
  startEvent,
  loginAsUserToEvent,
  getUserToken,
  submitRating,
  BASE_URL,
} from './helpers.js';

const RING_SELECTOR = '[data-testid="participation-ring"]';

test.describe('Participation Ring Visibility', () => {

  test('ring is not visible in created state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'viewer@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.locator('button >> text=/^1$/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(RING_SELECTOR)).toHaveCount(0);
  });

  test('ring is visible for admin in started state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    await startEvent(eventId, adminToken);

    // Submit a rating via API so participation data exists
    const raterToken = await getUserToken(eventId, 'rater@example.com', pin);
    await submitRating(eventId, raterToken, 1, 3);

    // Log in as admin and navigate to the guest-facing event page
    await setAuthToken(page, adminToken, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await expect(page.locator(RING_SELECTOR).first()).toBeVisible({ timeout: 10000 });
  });

  test('ring is NOT visible for guest in started state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    await startEvent(eventId, adminToken);

    // Submit a rating via API so participation data exists
    const raterToken = await getUserToken(eventId, 'rater@example.com', pin);
    await submitRating(eventId, raterToken, 1, 3);

    // Log in as a regular guest — ring should NOT appear
    await loginAsUserToEvent(page, eventId, 'viewer@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.locator('button >> text=/^1$/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(RING_SELECTOR)).toHaveCount(0);
  });

  test('ring disappears when event transitions to paused', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    await startEvent(eventId, adminToken);

    const raterToken = await getUserToken(eventId, 'rater@example.com', pin);
    await submitRating(eventId, raterToken, 1, 3);

    // Log in as admin — ring should be visible
    await setAuthToken(page, adminToken, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await expect(page.locator(RING_SELECTOR).first()).toBeVisible({ timeout: 10000 });

    // Pause the event
    await changeEventState(eventId, 'paused', 'started', adminToken);

    // Wait for polling to pick up the state change (up to 35s)
    await expect(page.locator(RING_SELECTOR)).toHaveCount(0, { timeout: 40000 });
  });

  test('ring is not visible in completed state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    await startEvent(eventId, adminToken);

    const raterToken = await getUserToken(eventId, 'rater@example.com', pin);
    await submitRating(eventId, raterToken, 1, 3);

    // Transition through to completed
    await changeEventState(eventId, 'completed', 'started', adminToken);

    // Even admin should not see ring in completed state
    await setAuthToken(page, adminToken, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.locator('button >> text=/^1$/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(RING_SELECTOR)).toHaveCount(0);
  });
});
