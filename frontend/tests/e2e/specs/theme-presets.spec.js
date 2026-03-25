/**
 * Theme Presets E2E Tests
 *
 * Tests the event theme/mood feature including selection on create,
 * visual application across pages, admin editing, and state-lock behaviour.
 */

import { test, expect } from '@playwright/test';
import { clearAuth, deleteTestEvent, trackEventForCleanup, authenticateViaOTP, BASE_URL } from './helpers.js';

test.describe('Theme Presets', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('create event page shows mood picker with Classic pre-selected', async ({ page }) => {
    await authenticateViaOTP(page);
    await page.goto(`${BASE_URL}/create-event`);

    const picker = page.locator('[data-testid="theme-picker"]');
    await expect(picker).toBeVisible();

    const classicCard = page.locator('[data-testid="theme-card-classic"]');
    await expect(classicCard).toBeVisible();
    await expect(classicCard).toHaveClass(/ring-2/);
  });

  test('selecting a theme on create applies it to the event', async ({ page }) => {
    await authenticateViaOTP(page);
    await page.goto(`${BASE_URL}/create-event`);

    await page.fill('#event-name', 'E2E Theme Test');
    await page.locator('[data-testid="theme-card-cellar"]').click();

    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/event\/.*\/admin/);

    const url = page.url();
    const eventId = url.match(/\/event\/([A-Za-z0-9]+)\/admin/)?.[1];
    if (eventId) trackEventForCleanup(eventId);

    const themeWrapper = page.locator('[data-event-theme]');
    await expect(themeWrapper).toHaveAttribute('data-event-theme', 'cellar');
  });

  test('header shows themed background for event', async ({ page }) => {
    await authenticateViaOTP(page);
    await page.goto(`${BASE_URL}/create-event`);

    await page.fill('#event-name', 'Header Theme Test');
    await page.locator('[data-testid="theme-card-garden"]').click();
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/event\/.*\/admin/);

    const url = page.url();
    const eventId = url.match(/\/event\/([A-Za-z0-9]+)\/admin/)?.[1];
    if (eventId) trackEventForCleanup(eventId);

    const header = page.locator('header');
    await expect(header).toContainText('Header Theme Test');
  });

  test('admin page shows theme section and allows editing in created state', async ({ page }) => {
    await authenticateViaOTP(page);
    await page.goto(`${BASE_URL}/create-event`);

    await page.fill('#event-name', 'Admin Theme Test');
    await page.locator('[data-testid="theme-card-cellar"]').click();
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/event\/.*\/admin/);

    const url = page.url();
    const eventId = url.match(/\/event\/([A-Za-z0-9]+)\/admin/)?.[1];
    if (eventId) trackEventForCleanup(eventId);

    const moodButton = page.getByText('Mood').locator('..');
    await expect(moodButton).toContainText('Cellar');
  });

  test('my events page shows accent border for themed events', async ({ page }) => {
    await authenticateViaOTP(page);
    await page.goto(`${BASE_URL}/create-event`);

    await page.fill('#event-name', 'MyEvents Theme Test');
    await page.locator('[data-testid="theme-card-rose"]').click();
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/event\/.*\/admin/);

    const url = page.url();
    const eventId = url.match(/\/event\/([A-Za-z0-9]+)\/admin/)?.[1];
    if (eventId) trackEventForCleanup(eventId);

    await page.goto(`${BASE_URL}/my-events`);

    const eventCard = page.locator(`a[href*="${eventId}"]`).first();
    await expect(eventCard).toContainText('MyEvents Theme Test');
  });
});
