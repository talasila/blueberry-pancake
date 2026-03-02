/**
 * Item Configuration Tests
 * 
 * Tests the item configuration functionality on the admin page
 * including number of items and excluded item IDs.
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
  openBottlesDrawer as openBottlesDrawerBase,
  BASE_URL,
} from './helpers.js';

/**
 * Navigates to admin page and waits for the item-configuration API response.
 * Waits for the Bottles button to confirm the page rendered with data.
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
 * Opens the Bottles drawer and waits for config inputs to be ready.
 */
async function openBottlesDrawer(page) {
  await openBottlesDrawerBase(page);
  await page.locator('[role="dialog"]').getByRole('spinbutton')
    .waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Gets the number of bottles input element, scoped to the drawer.
 */
function getNumberOfBottlesInput(page) {
  return page.locator('[role="dialog"]').getByRole('spinbutton');
}

/**
 * Gets the excluded bottle IDs input element, scoped to the drawer.
 */
function getExcludedBottleIdsInput(page) {
  return page.locator('[role="dialog"]').getByRole('textbox');
}

/**
 * Clicks the save button in the drawer
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function clickSaveButton(page) {
  const saveButton = page.getByRole('button', { name: /save/i });
  const responsePromise = page.waitForResponse(
    resp => resp.url().includes('/item-configuration'),
    { timeout: 10000 }
  );
  await saveButton.click();
  await responsePromise;
  await expect(saveButton).toBeEnabled({ timeout: 5000 });
}

test.describe('Item Configuration', () => {

  // ===================================
  // User Story 1 - Configure Number of Items
  // ===================================

  test('admin page shows Bottles button to access item configuration', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    
    // Look for Bottles button on admin page
    const bottlesButton = page.getByRole('button', { name: /bottles/i });
    await expect(bottlesButton).toBeVisible({ timeout: 10000 });
  });

  test('can set number of bottles', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Find and fill number of bottles input
    const bottlesInput = getNumberOfBottlesInput(page);
    await bottlesInput.fill('25');
    
    // Save configuration
    await clickSaveButton(page);
    
    // Verify success (toast or no error) - scope to drawer to avoid matching event name
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(/error/i)).not.toBeVisible({ timeout: 5000 });
    // Positive check: drawer is still accessible after save
    await expect(drawer).toBeVisible();

    // Verify persistence: reload and check value
    await page.reload();
    await openBottlesDrawer(page);
    await expect(getNumberOfBottlesInput(page)).toHaveValue('25');
  });

  test('default number of bottles is 20', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Check default value
    const bottlesInput = getNumberOfBottlesInput(page);
    await expect(bottlesInput).toHaveValue('20');
  });

  test('validates maximum bottles limit (100)', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);
    
    const bottlesInput = getNumberOfBottlesInput(page);
    await expect(async () => {
      await bottlesInput.fill('150');
      await expect(bottlesInput).toHaveValue('150');
    }).toPass({ timeout: 10000 });
    
    await clickSaveButton(page);
    
    // Backend responds with "Number of items must be an integer between 1 and 100"
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(/must be.*between 1 and 100/i)).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 2 - Configure Excluded Bottle IDs
  // ===================================

  test('can set excluded bottle IDs', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const regularUserEmail = 'user@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Step 1: Admin logs in and sets excluded bottle IDs
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Find and fill excluded bottle IDs input
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('5,10,15');
    
    // Save configuration
    await clickSaveButton(page);
    
    // Verify success (no error visible) - scope to drawer
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(/error/i)).not.toBeVisible({ timeout: 5000 });
    
    // Verify save persisted before switching to user flow (DynamoDB eventual consistency)
    const configResp = page.waitForResponse(
      resp => resp.url().includes('/item-configuration'), { timeout: 10000 }
    );
    await page.reload();
    await configResp;
    await openBottlesDrawer(page);
    await expect(getExcludedBottleIdsInput(page)).toHaveValue(/5/, { timeout: 5000 });
    
    // Step 2: Admin logs out
    await clearAuth(page);
    
    // Step 3: Regular user logs in via PIN entry flow
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Should be redirected to email entry
    await submitEmail(page, regularUserEmail);
    
    // Should be redirected to PIN entry (regular user)
    await page.waitForURL(new RegExp(`/event/${eventId}/pin`), { timeout: 5000 });
    await enterAndSubmitPIN(page, pin);
    
    // Should be redirected to event main page
    await page.waitForURL(new RegExp(`/event/${eventId}$`), { timeout: 5000 });
    
    // Step 4: Wait for bottles to render (positive gate before negative assertions)
    const bottle1 = page.locator('button').filter({ hasText: /^1$/ });
    const bottle2 = page.locator('button').filter({ hasText: /^2$/ });
    const bottle3 = page.locator('button').filter({ hasText: /^3$/ });
    
    await expect(bottle1).toBeVisible({ timeout: 10000 });
    await expect(bottle2).toBeVisible();
    await expect(bottle3).toBeVisible();
    
    // Step 5: Now that the grid is confirmed loaded, verify excluded bottles are absent
    const bottle5 = page.locator('button').filter({ hasText: /^5$/ });
    const bottle10 = page.locator('button').filter({ hasText: /^10$/ });
    const bottle15 = page.locator('button').filter({ hasText: /^15$/ });
    
    await expect(bottle5).not.toBeVisible();
    await expect(bottle10).not.toBeVisible();
    await expect(bottle15).not.toBeVisible();
  });

  test('validates excluded IDs are within range', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);
    
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('25');
    await expect(excludedInput).toHaveValue('25');
    
    await clickSaveButton(page);
    
    // Backend responds with "Invalid item IDs: 25. Must be between 1 and 20"
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(/invalid.*item|must be between/i)).toBeVisible({ timeout: 10000 });
  });

  test('prevents excluding all bottles', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    await openBottlesDrawer(page);
    
    const bottlesInput = getNumberOfBottlesInput(page);
    await expect(async () => {
      await bottlesInput.fill('3');
      await expect(bottlesInput).toHaveValue('3');
    }).toPass({ timeout: 10000 });
    
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('1,2,3');
    await expect(excludedInput).toHaveValue('1,2,3');
    
    // Try to save
    await clickSaveButton(page);
    
    // Should show error - at least one bottle must be available - scope to drawer
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(/error|at least|cannot exclude all/i)).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 3 - View Item Configuration
  // ===================================

  test('displays current bottle configuration in drawer', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await navigateToAdminWithConfig(page, eventId, token, adminEmail);
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Should see current configuration values
    const bottlesInput = getNumberOfBottlesInput(page);
    await expect(bottlesInput).toBeVisible();
    
    const excludedInput = getExcludedBottleIdsInput(page);
    await expect(excludedInput).toBeVisible();
  });

  // ===================================
  // Edge Cases
  // ===================================

  const excludedIdCases = [
    { name: 'handles leading zeros in excluded IDs', input: '05,010', expected: ['5', '10'] },
    { name: 'handles duplicate excluded IDs', input: '5,10,5,10', expected: ['5', '10'] },
    { name: 'handles whitespace in excluded IDs', input: '5 , 10 , 15', expected: ['5', '10', '15'] },
  ];

  for (const { name, input, expected } of excludedIdCases) {
    test(name, async ({ page, testEvent }) => {
      const { eventId } = testEvent;
      const adminEmail = 'admin@example.com';
      const token = await addAdminToEvent(eventId, adminEmail);
      
      await navigateToAdminWithConfig(page, eventId, token, adminEmail);
      await openBottlesDrawer(page);
      
      await getExcludedBottleIdsInput(page).fill(input);
      await clickSaveButton(page);
      
      const drawer = page.locator('[role="dialog"]');
      await expect(drawer.getByText(/error/i)).not.toBeVisible({ timeout: 5000 });

      const configResp = page.waitForResponse(
        resp => resp.url().includes('/item-configuration') && resp.request().method() === 'GET',
        { timeout: 10000 }
      );
      await page.reload();
      await configResp;
      await page.getByRole('button', { name: /bottles/i }).waitFor({ state: 'visible', timeout: 10000 });
      await openBottlesDrawer(page);
      const savedValue = await getExcludedBottleIdsInput(page).inputValue();
      const normalizedIds = savedValue.split(',').map(s => s.trim()).filter(s => s.length > 0).sort((a, b) => +a - +b);
      expect(normalizedIds).toEqual(expected);
    });
  }
});
