/**
 * Item Configuration Tests
 *
 * Tests the item configuration functionality on the admin page:
 * - Setting the highest number (total IDs)
 * - Marking unused numbers via the tap-to-toggle grid
 * - Auto-save behavior
 * - State-based editability (created + started = editable, paused + completed = locked)
 * - Excluded numbers not appearing on the rating screen
 *
 * Note: Item configuration is accessed via the Bottles drawer on the admin page.
 * Default event type is "wine" which uses "Bottles" terminology.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
  changeEventState,
  openBottlesDrawer as openBottlesDrawerBase,
  BASE_URL,
} from './helpers.js';

/**
 * Navigates to admin page and waits for the item-configuration API response.
 */
async function navigateToAdminWithConfig(page, eventId, token, email) {
  await setAuthToken(page, token, email);

  const configResponse = page.waitForResponse(
    resp => resp.url().includes('/item-configuration'),
    { timeout: 10000 }
  );

  await page.goto(`${BASE_URL}/event/${eventId}/admin`);
  await configResponse;

  await page.getByRole('button', { name: /bottles/i }).waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Opens the Bottles drawer and waits for the number input to be ready.
 */
async function openBottlesDrawer(page) {
  await openBottlesDrawerBase(page);
  await page.locator('[role="dialog"]').getByRole('spinbutton')
    .waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Gets the highest number input, scoped to the drawer.
 */
function getHighestNumberInput(page) {
  return page.locator('[role="dialog"]').getByRole('spinbutton');
}

/**
 * Clicks an element and waits for the resulting auto-save PATCH to complete.
 * The response listener is registered *before* the click to avoid race conditions.
 */
async function clickAndWaitForSave(page, locator) {
  const saved = page.waitForResponse(
    resp => resp.url().includes('/item-configuration') && resp.request().method() === 'PATCH',
    { timeout: 10000 }
  );
  await locator.click();
  await saved;
}

test.describe('Item Configuration', () => {

  // ===================================
  // Highest Number
  // ===================================

  test('admin page shows Bottles button to access item configuration', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);

    const bottlesButton = page.getByRole('button', { name: /bottles/i });
    await expect(bottlesButton).toBeVisible({ timeout: 10000 });
  });

  test('default highest number is 20', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    await expect(getHighestNumberInput(page)).toHaveValue('20');
  });

  test('can set highest number and it auto-saves', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    const input = getHighestNumberInput(page);
    const saved = page.waitForResponse(
      resp => resp.url().includes('/item-configuration') && resp.request().method() === 'PATCH',
      { timeout: 15000 }
    );
    await input.fill('25');
    await saved;

    // Verify persistence: reload and check value
    await page.reload();
    await openBottlesDrawer(page);
    await expect(getHighestNumberInput(page)).toHaveValue('25');
  });

  test('grid preview shows correct number of circles', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    const grid = page.locator('[data-testid="config-grid-preview"]');
    await expect(grid).toBeVisible();

    // Default is 20 — should have 20 grid buttons
    const buttons = grid.locator('button');
    await expect(buttons).toHaveCount(20);
  });

  // ===================================
  // Tap-to-Toggle Exclusion Grid
  // ===================================

  test('can mark numbers as unused by tapping grid', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    const drawer = page.locator('[role="dialog"]');

    // Tap numbers 5 and 10 to exclude them
    const btn5 = drawer.locator('[data-testid="config-grid-5"]');
    const btn10 = drawer.locator('[data-testid="config-grid-10"]');

    await clickAndWaitForSave(page, btn5);
    await clickAndWaitForSave(page, btn10);

    // Verify the counter shows 2 unused
    await expect(drawer.getByText(/2 unused/)).toBeVisible();

    // Verify persistence after reload
    await page.reload();
    await openBottlesDrawer(page);
    await expect(page.locator('[data-testid="config-grid-preview"]').getByText(/2 unused/)).not.toBeVisible();
    // Check the counter on the refreshed page
    await expect(page.locator('[role="dialog"]').getByText(/2 unused/)).toBeVisible();
  });

  test('tapping an excluded number re-includes it', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    const drawer = page.locator('[role="dialog"]');
    const btn5 = drawer.locator('[data-testid="config-grid-5"]');

    // Exclude
    await clickAndWaitForSave(page, btn5);
    await expect(drawer.getByText(/1 unused/)).toBeVisible();

    // Re-include
    await clickAndWaitForSave(page, btn5);
    await expect(drawer.getByText(/\d+ unused/)).not.toBeVisible();
  });

  // ===================================
  // Excluded Numbers on Rating Screen
  // ===================================

  test('excluded numbers do not appear on the rating screen', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    // Step 1: Admin excludes numbers 5, 10, 15
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    const drawer = page.locator('[role="dialog"]');
    for (const id of [5, 10, 15]) {
      await clickAndWaitForSave(page, drawer.locator(`[data-testid="config-grid-${id}"]`));
    }

    // Step 2: Start the event so the rating screen is accessible
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);

    // Step 3: Regular user logs in
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await page.waitForURL(new RegExp(`/event/${eventId}/pin`), { timeout: 5000 });
    await enterAndSubmitPIN(page, pin);
    await page.waitForURL(new RegExp(`/event/${eventId}$`), { timeout: 5000 });

    // Step 4: Verify non-excluded bottles are visible
    const bottle1 = page.locator('button').filter({ hasText: /^1$/ });
    const bottle2 = page.locator('button').filter({ hasText: /^2$/ });
    await expect(bottle1).toBeVisible({ timeout: 10000 });
    await expect(bottle2).toBeVisible();

    // Step 5: Verify excluded bottles are absent
    const bottle5 = page.locator('button').filter({ hasText: /^5$/ });
    const bottle10 = page.locator('button').filter({ hasText: /^10$/ });
    const bottle15 = page.locator('button').filter({ hasText: /^15$/ });
    await expect(bottle5).not.toBeVisible();
    await expect(bottle10).not.toBeVisible();
    await expect(bottle15).not.toBeVisible();
  });

  // ===================================
  // State-Based Editability
  // ===================================

  test('configuration is editable in created state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    await expect(getHighestNumberInput(page)).toBeEnabled();
    const gridBtn = page.locator('[data-testid="config-grid-1"]');
    await expect(gridBtn).toBeEnabled();
  });

  test('configuration is editable in started state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    await expect(getHighestNumberInput(page)).toBeEnabled();
    const gridBtn = page.locator('[data-testid="config-grid-1"]');
    await expect(gridBtn).toBeEnabled();
  });

  test('configuration is locked in paused state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);

    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);

    await expect(getHighestNumberInput(page)).toBeDisabled();
    const gridBtn = page.locator('[data-testid="config-grid-1"]');
    await expect(gridBtn).toBeDisabled();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(/locked/i)).toBeVisible();
  });
});
