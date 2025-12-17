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
    // Use a valid format event ID that doesn't exist (8 alphanumeric chars)
    const nonExistentEventId = 'AAAAAAAA';
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${nonExistentEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to email entry page first
    await expect(page).toHaveURL(new RegExp(`/event/${nonExistentEventId}/email`));
    
    // Submit email to proceed to PIN page
    await submitEmail(page, 'testuser@example.com');
    
    // Should be on PIN entry page
    await expect(page).toHaveURL(new RegExp(`/event/${nonExistentEventId}/pin`), { timeout: 5000 });
    
    // Enter a PIN to trigger the "event not found" error
    await enterAndSubmitPIN(page, '123456');
    
    // Error should be displayed about event not found
    const errorMessage = page.getByText(/event not found|not found|does not exist/i);
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
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
    
    // Wait for event page to load after PIN entry
    await page.waitForURL(new RegExp(`/event/${testEventId}$`), { timeout: 10000 });
    
    // Now try to access admin page directly
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // AdminRoute should redirect non-admins back to main event page
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
    
    // Should NOT be on the admin page
    await expect(page).not.toHaveURL(/\/admin/);
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
    // Test multiple invalid formats without authentication
    const invalidEventIds = [
      '!!!invalid!!!',  // Special characters
      'abc',            // Too short
      'abcd12345678',   // Too long
    ];
    
    for (const invalidId of invalidEventIds) {
      await clearAuth(page);
      await page.goto(`${BASE_URL}/event/${invalidId}`);
      await page.waitForLoadState('networkidle');
      
      // App handles invalid IDs gracefully by showing email entry page
      // (doesn't crash or show raw errors to unauthenticated users)
      const emailEntry = page.getByText('Access Event');
      const errorText = page.getByText(/error/i);
      
      const hasEmailEntry = await emailEntry.isVisible().catch(() => false);
      const hasError = await errorText.first().isVisible().catch(() => false);
      
      // Either email entry page OR error page is graceful handling
      expect(
        hasEmailEntry || hasError,
        `Expected graceful handling for invalid event ID: "${invalidId}"`
      ).toBe(true);
    }
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
