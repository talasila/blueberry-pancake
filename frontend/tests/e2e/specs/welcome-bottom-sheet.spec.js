/**
 * Welcome Bottom Sheet E2E Tests
 *
 * Tests the post-creation welcome bottom sheet that replaces the old toast.
 * The bottom sheet is read-only — it orients the user but all actions
 * happen on the admin page itself.
 */

import { test, expect } from '@playwright/test';
import { clearAuth, deleteTestEvent, trackEventForCleanup, authenticateViaOTP } from './helpers.js';

const BASE_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createEventViaUI(page, eventName = 'Welcome Sheet Test') {
  await page.goto(`${BASE_URL}/create-event`);
  await page.waitForLoadState('networkidle');

  const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
  await expect(nameInput).toBeVisible({ timeout: 5000 });
  await nameInput.fill(eventName);

  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/api/events') &&
      resp.request().method() === 'POST' &&
      !resp.url().includes('verify-pin'),
  );

  const createButton = page.getByRole('button', { name: /create event/i });
  await createButton.click();

  const response = await responsePromise;
  let eventId = null;
  try {
    const data = await response.json();
    eventId = data.eventId;
    if (eventId) trackEventForCleanup(eventId);
  } catch {
    /* ignore */
  }

  await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });
  return eventId;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Welcome Bottom Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await authenticateViaOTP(page);
  });

  test('appears after event creation with correct read-only content', async ({ page }) => {
    const eventId = await createEventViaUI(page, 'Bottom Sheet Test');

    const sheet = page.locator('[data-testid="welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Title
    await expect(page.getByText('Your event is ready!')).toBeVisible();

    // Sharing section with PIN
    const sharing = page.locator('[data-testid="welcome-sharing"]');
    await expect(sharing).toBeVisible();
    await expect(page.locator('[data-testid="welcome-pin"]')).not.toBeEmpty();

    // Defaults section
    const defaults = page.locator('[data-testid="welcome-defaults"]');
    await expect(defaults).toBeVisible();
    await expect(defaults).toContainText('wines');
    await expect(defaults).toContainText('scale');

    // Start info
    await expect(page.locator('[data-testid="welcome-start-info"]')).toContainText('State');

    // Guide link
    await expect(page.locator('[data-testid="welcome-open-guide"]')).toContainText('setup guide');

    // No toast should be visible
    await expect(page.getByText(/event created.*share the pin/i)).not.toBeVisible();

    if (eventId) await deleteTestEvent(eventId);
  });

  test('dismisses on "Got it" and admin page is interactive', async ({ page }) => {
    const eventId = await createEventViaUI(page, 'Dismiss Test');

    const sheet = page.locator('[data-testid="welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="welcome-got-it"]').click();
    await expect(sheet).not.toBeVisible({ timeout: 3000 });

    await expect(page.getByText('Settings')).toBeVisible({ timeout: 5000 });

    if (eventId) await deleteTestEvent(eventId);
  });

  test('does NOT reappear after page refresh', async ({ page }) => {
    const eventId = await createEventViaUI(page, 'Refresh Test');

    const sheet = page.locator('[data-testid="welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="welcome-got-it"]').click();
    await expect(sheet).not.toBeVisible({ timeout: 3000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(sheet).not.toBeVisible({ timeout: 3000 });

    if (eventId) await deleteTestEvent(eventId);
  });

  test('"Show me the setup guide" opens admin guide', async ({ page }) => {
    const eventId = await createEventViaUI(page, 'Guide Link Test');

    const sheet = page.locator('[data-testid="welcome-bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="welcome-open-guide"]').click();
    await expect(sheet).not.toBeVisible({ timeout: 3000 });

    await expect(page.locator('[role="dialog"][aria-label="Admin guide"]')).toBeVisible({
      timeout: 5000,
    });

    if (eventId) await deleteTestEvent(eventId);
  });
});
