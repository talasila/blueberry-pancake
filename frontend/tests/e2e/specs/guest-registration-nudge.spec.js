/**
 * Guest Registration Nudge E2E Tests
 *
 * Tests the post-login guest welcome bottom sheet and the
 * inline registration prompt on the event page.
 */

import { test, expect } from './fixtures.js';
import {
  loginAsUserToEvent,
  addAdminToEvent,
  setAuthToken,
  startEvent,
  BASE_URL,
} from './helpers.js';

const NO_AUTO_DISMISS = { dismissWelcome: false };

test.describe('Guest Registration Nudge', () => {

  // ===================================
  // US1 — Guest Welcome Bottom Sheet
  // ===================================

  test('bottom sheet appears after guest PIN login (created state)', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin, NO_AUTO_DISMISS);

    const sheet = page.locator('[data-testid="guest-welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await expect(sheet).toContainText('Welcome to');
    await expect(sheet).toContainText('Why register?');
    await expect(sheet).toContainText('Good to know');
    await expect(sheet).toContainText('optional');
    await expect(sheet).toContainText('more than one');
    await expect(sheet).toContainText('only one person');
    await expect(sheet).toContainText('any time');
  });

  test('bottom sheet appears after guest PIN login (started state)', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminToken = await addAdminToEvent(eventId, 'admin@example.com');
    await startEvent(eventId, adminToken);

    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin, NO_AUTO_DISMISS);

    const sheet = page.locator('[data-testid="guest-welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });
  });

  test('"Register" button opens My Bottles sheet', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin, NO_AUTO_DISMISS);

    const welcomeSheet = page.locator('[data-testid="guest-welcome-bottom-sheet"]');
    await expect(welcomeSheet).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="guest-welcome-register-btn"]').click();
    await expect(welcomeSheet).not.toBeVisible({ timeout: 3000 });

    const myBottlesSheet = page.locator('[data-testid="my-bottles-sheet"]');
    await expect(myBottlesSheet).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
  });

  test('"Skip for now" dismisses the sheet', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin, NO_AUTO_DISMISS);

    const sheet = page.locator('[data-testid="guest-welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="guest-welcome-skip-btn"]').click();
    await expect(sheet).not.toBeVisible({ timeout: 3000 });
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
  });

  test('tapping backdrop dismisses the sheet', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin, NO_AUTO_DISMISS);

    const sheet = page.locator('[data-testid="guest-welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="guest-welcome-backdrop"]').click({ force: true });
    await expect(sheet).not.toBeVisible({ timeout: 3000 });
  });

  test('bottom sheet does NOT reappear after page refresh', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin, NO_AUTO_DISMISS);

    const sheet = page.locator('[data-testid="guest-welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="guest-welcome-skip-btn"]').click();
    await expect(sheet).not.toBeVisible({ timeout: 3000 });

    await page.reload();
    await expect(sheet).not.toBeVisible({ timeout: 3000 });
  });

  // ===================================
  // US2 — Inline Registration Prompt
  // ===================================

  test('inline prompt visible in created state for guests', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin);

    const inlinePrompt = page.locator('[data-testid="guest-inline-registration-prompt"]');
    await expect(inlinePrompt).toBeVisible({ timeout: 5000 });
    await expect(inlinePrompt).toContainText('Brought a');
  });

  test('inline prompt "Register" button opens My Bottles sheet', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin);

    const registerBtn = page.locator('[data-testid="guest-inline-register-btn"]');
    await expect(registerBtn).toBeVisible({ timeout: 5000 });
    await registerBtn.click();

    const myBottlesSheet = page.locator('[data-testid="my-bottles-sheet"]');
    await expect(myBottlesSheet).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
  });

  test('inline prompt NOT visible in started state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminToken = await addAdminToEvent(eventId, 'admin@example.com');
    await startEvent(eventId, adminToken);

    await loginAsUserToEvent(page, eventId, 'guest@example.com', pin);

    const inlinePrompt = page.locator('[data-testid="guest-inline-registration-prompt"]');
    await expect(inlinePrompt).not.toBeVisible({ timeout: 3000 });
  });

  // ===================================
  // US3 — Admin Exclusion
  // ===================================

  test('admin does NOT see guest welcome sheet or inline prompt', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);

    await page.waitForURL(new RegExp(`/event/${eventId}`), { timeout: 5000 });

    const sheet = page.locator('[data-testid="guest-welcome-bottom-sheet"]');
    const inlinePrompt = page.locator('[data-testid="guest-inline-registration-prompt"]');

    await expect(sheet).not.toBeVisible({ timeout: 3000 });
    await expect(inlinePrompt).not.toBeVisible({ timeout: 3000 });
  });
});
