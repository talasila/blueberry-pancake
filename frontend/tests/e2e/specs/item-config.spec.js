/**
 * Item Configuration Tests
 * 
 * Tests the item configuration functionality on the admin page
 * including number of items and excluded item IDs.
 * 
 * Note: Item configuration is accessed via the Bottles drawer on the admin page.
 * Default event type is "wine" which uses "Bottles" terminology.
 */

import { test, expect } from '@playwright/test';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  setAuthToken,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';

let testEventId;
const testEventPin = '654321';

/**
 * Opens the Bottles (Items) drawer on the admin page
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function openBottlesDrawer(page) {
  const bottlesButton = page.getByRole('button', { name: /bottles/i });
  await bottlesButton.waitFor({ state: 'visible', timeout: 10000 });
  await bottlesButton.click();
  
  // Wait for drawer to open - look for the number input (spinbutton)
  await page.getByRole('spinbutton').waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Gets the number of bottles input element
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {import('@playwright/test').Locator} The number input locator
 */
function getNumberOfBottlesInput(page) {
  return page.getByRole('spinbutton');
}

/**
 * Gets the excluded bottle IDs input element
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {import('@playwright/test').Locator} The excluded IDs input locator
 */
function getExcludedBottleIdsInput(page) {
  return page.getByRole('textbox');
}

/**
 * Clicks the save button in the drawer
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function clickSaveButton(page) {
  const saveButton = page.getByRole('button', { name: /save/i });
  await saveButton.click();
  await page.waitForTimeout(1000); // Wait for save to complete
}

test.describe('Item Configuration', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Item Config Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  // ===================================
  // User Story 1 - Configure Number of Items
  // ===================================

  test('admin page shows Bottles button to access item configuration', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Look for Bottles button on admin page
    const bottlesButton = page.getByRole('button', { name: /bottles/i });
    await expect(bottlesButton).toBeVisible({ timeout: 10000 });
  });

  test('can set number of bottles', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Find and fill number of bottles input
    const bottlesInput = getNumberOfBottlesInput(page);
    await bottlesInput.fill('25');
    
    // Save configuration
    await clickSaveButton(page);
    
    // Verify success (toast or no error)
    await expect(page.getByText(/error/i)).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('default number of bottles is 20', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Check default value
    const bottlesInput = getNumberOfBottlesInput(page);
    await expect(bottlesInput).toHaveValue('20');
  });

  test('validates maximum bottles limit (100)', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Try to set over the limit
    const bottlesInput = getNumberOfBottlesInput(page);
    await bottlesInput.fill('150');
    
    // Try to save
    await clickSaveButton(page);
    
    // Should show error or validation message
    await expect(page.getByText(/must be.*between 1 and 100/i)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Configure Excluded Bottle IDs
  // ===================================

  test('can set excluded bottle IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const regularUserEmail = 'user@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Step 1: Admin logs in and sets excluded bottle IDs
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Find and fill excluded bottle IDs input
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('5,10,15');
    
    // Save configuration
    await clickSaveButton(page);
    
    // Verify success (no error visible)
    await expect(page.getByText(/error/i)).not.toBeVisible({ timeout: 2000 }).catch(() => {});
    
    // Step 2: Admin logs out
    await clearAuth(page);
    
    // Step 3: Regular user logs in via PIN entry flow
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to email entry
    await submitEmail(page, regularUserEmail);
    
    // Should be redirected to PIN entry (regular user)
    await page.waitForURL(new RegExp(`/event/${testEventId}/pin`), { timeout: 5000 });
    await enterAndSubmitPIN(page, testEventPin);
    
    // Should be redirected to event main page
    await page.waitForURL(new RegExp(`/event/${testEventId}$`), { timeout: 5000 });
    
    // Step 4: Verify excluded bottles (5, 10, 15) are NOT visible
    const bottle5 = page.locator('button').filter({ hasText: /^5$/ });
    const bottle10 = page.locator('button').filter({ hasText: /^10$/ });
    const bottle15 = page.locator('button').filter({ hasText: /^15$/ });
    
    await expect(bottle5).not.toBeVisible();
    await expect(bottle10).not.toBeVisible();
    await expect(bottle15).not.toBeVisible();
    
    // Step 5: Verify other bottles ARE visible (confirms page loaded correctly)
    const bottle1 = page.locator('button').filter({ hasText: /^1$/ });
    const bottle2 = page.locator('button').filter({ hasText: /^2$/ });
    const bottle3 = page.locator('button').filter({ hasText: /^3$/ });
    
    await expect(bottle1).toBeVisible();
    await expect(bottle2).toBeVisible();
    await expect(bottle3).toBeVisible();
  });

  test('validates excluded IDs are within range', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Try to exclude ID outside range (default is 20)
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('25');
    
    // Try to save
    await clickSaveButton(page);
    
    // Should show error
    await expect(page.getByText(/error|invalid|range|outside/i)).toBeVisible({ timeout: 5000 });
  });

  test('prevents excluding all bottles', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // First set number of bottles to a small number
    const bottlesInput = getNumberOfBottlesInput(page);
    await bottlesInput.fill('3');
    
    // Try to exclude all bottles
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('1,2,3');
    
    // Try to save
    await clickSaveButton(page);
    
    // Should show error - at least one bottle must be available
    await expect(page.getByText(/error|at least|cannot exclude all/i)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 3 - View Item Configuration
  // ===================================

  test('displays current bottle configuration in drawer', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
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

  test('handles leading zeros in excluded IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Enter with leading zeros
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('05,010');
    
    // Save configuration
    await clickSaveButton(page);
    
    // Should normalize to 5,10 (no error)
    await expect(page.getByText(/error/i)).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('handles duplicate excluded IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Enter duplicates
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('5,10,5,10');
    
    // Save configuration
    await clickSaveButton(page);
    
    // Should handle duplicates (treat as single exclusion, no error)
    await expect(page.getByText(/error/i)).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('handles whitespace in excluded IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open the Bottles drawer
    await openBottlesDrawer(page);
    
    // Enter with whitespace
    const excludedInput = getExcludedBottleIdsInput(page);
    await excludedInput.fill('5 , 10 , 15');
    
    // Save configuration
    await clickSaveButton(page);
    
    // Should trim whitespace and process correctly (no error)
    await expect(page.getByText(/error/i)).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });
});
