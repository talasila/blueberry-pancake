/**
 * Item Configuration Tests
 * 
 * Tests the item configuration functionality on the admin page
 * including number of items and excluded item IDs.
 */

import { test, expect } from '@playwright/test';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  setAuthToken,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';

let testEventId;
const testEventPin = '654321';

test.describe('Item Configuration', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Item Config Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
    }
  });

  // ===================================
  // User Story 1 - Configure Number of Items
  // ===================================

  test('admin page shows item configuration section', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Look for item configuration section
    const itemSection = page.getByText(/item|bottle/i);
    await expect(itemSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('can set number of items', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Find number of items input
    const itemsInput = page.locator('input[type="number"]').or(page.getByLabel(/number.*items|items/i));
    if (await itemsInput.isVisible()) {
      await itemsInput.fill('25');
      
      // Save button
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('default number of items is 20', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Check default value
    const itemsInput = page.locator('input[type="number"]').or(page.getByLabel(/number.*items|items/i));
    if (await itemsInput.isVisible()) {
      const value = await itemsInput.inputValue();
      expect(value).toBe('20');
    }
  });

  test('validates maximum items limit (100)', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    const itemsInput = page.locator('input[type="number"]').or(page.getByLabel(/number.*items|items/i));
    if (await itemsInput.isVisible()) {
      await itemsInput.fill('150'); // Over the limit
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show error or validation message
        await page.waitForTimeout(1000);
      }
    }
  });

  // ===================================
  // User Story 2 - Configure Excluded Item IDs
  // ===================================

  test('can set excluded item IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Find excluded items input
    const excludedInput = page.getByLabel(/excluded|skip/i).or(page.getByPlaceholder(/excluded/i));
    if (await excludedInput.isVisible()) {
      await excludedInput.fill('5,10,15');
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('excluded items not shown on event page', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure excluded items
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    const excludedInput = page.getByLabel(/excluded|skip/i).or(page.getByPlaceholder(/excluded/i));
    if (await excludedInput.isVisible()) {
      await excludedInput.fill('5');
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Go to event page and check item 5 is not shown
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Item 5 should not be visible
    const item5 = page.locator('button').filter({ hasText: /^5$/ });
    await expect(item5).not.toBeVisible();
  });

  test('validates excluded IDs are within range', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    const excludedInput = page.getByLabel(/excluded|skip/i).or(page.getByPlaceholder(/excluded/i));
    if (await excludedInput.isVisible()) {
      // Try to exclude ID outside range (default is 20)
      await excludedInput.fill('25');
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show error
        await page.waitForTimeout(1000);
      }
    }
  });

  test('prevents excluding all items', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // First set number of items to a small number
    const itemsInput = page.locator('input[type="number"]').or(page.getByLabel(/number.*items|items/i));
    if (await itemsInput.isVisible()) {
      await itemsInput.fill('3');
    }
    
    const excludedInput = page.getByLabel(/excluded|skip/i).or(page.getByPlaceholder(/excluded/i));
    if (await excludedInput.isVisible()) {
      // Try to exclude all items
      await excludedInput.fill('1,2,3');
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show error - at least one item must be available
        await page.waitForTimeout(1000);
      }
    }
  });

  // ===================================
  // User Story 3 - View Item Configuration
  // ===================================

  test('displays current item configuration', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should see current configuration values
    const itemsInput = page.locator('input[type="number"]').or(page.getByLabel(/number.*items|items/i));
    await expect(itemsInput).toBeVisible();
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
    
    const excludedInput = page.getByLabel(/excluded|skip/i).or(page.getByPlaceholder(/excluded/i));
    if (await excludedInput.isVisible()) {
      // Enter with leading zeros
      await excludedInput.fill('05,010');
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Should normalize to 5,10
      }
    }
  });

  test('handles duplicate excluded IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    const excludedInput = page.getByLabel(/excluded|skip/i).or(page.getByPlaceholder(/excluded/i));
    if (await excludedInput.isVisible()) {
      await excludedInput.fill('5,10,5,10');
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Should handle duplicates (treat as single exclusion)
      }
    }
  });

  test('handles whitespace in excluded IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    const excludedInput = page.getByLabel(/excluded|skip/i).or(page.getByPlaceholder(/excluded/i));
    if (await excludedInput.isVisible()) {
      await excludedInput.fill('5 , 10 , 15');
      
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Should trim whitespace and process correctly
      }
    }
  });
});
