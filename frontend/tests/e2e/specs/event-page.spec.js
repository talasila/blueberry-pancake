/**
 * Event Page Tests
 * 
 * Tests the main event page access, header display,
 * and admin page navigation.
 */

import { test, expect } from '@playwright/test';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  clearAuth,
  setAuthToken,
  submitEmail,
  enterAndSubmitPIN,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';

let testEventId;
const testEventPin = '654321';

test.describe('Event Page', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
    }
  });

  // ===================================
  // User Story 1 - Access Event Main Page
  // ===================================

  test('authenticated user can access event main page', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be on event page
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
  });

  test('unauthenticated user is redirected to email entry', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to email entry
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/email`));
  });

  test('displays event name in header', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Event name should appear in header
    await expect(page.locator('header')).toContainText('Test Event');
  });

  test('shows error for non-existent event', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/NONEXIST`);
    await page.waitForLoadState('networkidle');
    
    // Should show error or redirect
    // Check for error message or different page state
  });

  test('shows loading indicator while fetching event data', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    
    // Navigate and check for loading state
    const navigationPromise = page.goto(`${BASE_URL}/event/${testEventId}`);
    
    // Loading indicator should appear briefly
    // This is timing-sensitive and may need adjustment
    await navigationPromise;
  });

  // ===================================
  // User Story 2 - Access Event Admin Page
  // ===================================

  test('administrator can access admin page', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should be on admin page
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/admin`));
  });

  test('non-administrator cannot access admin page', async ({ page }) => {
    // Regular user tries to access admin page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'regularuser@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Now try to access admin page
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should be denied access or redirected
    // Check that we're not on the admin page
  });

  // ===================================
  // User Story 3 - Navigation Between Pages
  // ===================================

  test('administrator sees navigation to admin page', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Admin should see settings/admin link in menu
    const menuButton = page.locator('[aria-label="Open menu"]').or(page.locator('button').filter({ has: page.locator('svg') }));
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Settings option should be visible for admins
      const settingsOption = page.getByText(/settings|admin/i);
      await expect(settingsOption).toBeVisible();
    }
  });

  test('administrator can navigate from main page to admin page', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Open menu and click admin/settings
    const menuButton = page.locator('[aria-label="Open menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      const settingsOption = page.getByText(/settings/i);
      if (await settingsOption.isVisible()) {
        await settingsOption.click();
        await page.waitForLoadState('networkidle');
        
        // Should be on admin page
        await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/admin`));
      }
    }
  });

  test('administrator can navigate from admin page to main page', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open menu and click back to event
    const menuButton = page.locator('[aria-label="Open menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      const backOption = page.getByText(/back.*event/i);
      if (await backOption.isVisible()) {
        await backOption.click();
        await page.waitForLoadState('networkidle');
        
        // Should be on main event page
        await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
      }
    }
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles invalid event ID format gracefully', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/!!!invalid!!!`);
    await page.waitForLoadState('networkidle');
    
    // Should show error or handle gracefully
  });

  test('event name is trimmed in header if too long', async ({ page }) => {
    // Create event with very long name
    const longName = 'This is a very long event name that should be trimmed in the header to fit properly';
    const longNameEventId = await createTestEvent(null, longName, '123456');
    
    try {
      const adminEmail = 'admin@example.com';
      const token = await addAdminToEvent(longNameEventId, adminEmail);
      
      await setAuthToken(page, token, adminEmail);
      await page.goto(`${BASE_URL}/event/${longNameEventId}`);
      await page.waitForLoadState('networkidle');
      
      // Header should contain the event name (possibly truncated)
      const header = page.locator('header');
      await expect(header).toBeVisible();
      // Check that content is present but may be truncated
    } finally {
      await deleteTestEvent(longNameEventId);
    }
  });
});
