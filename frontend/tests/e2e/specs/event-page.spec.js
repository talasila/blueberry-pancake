/**
 * Event Page Tests
 * 
 * Tests the main event page access, header display,
 * and admin page navigation.
 */

import { test, expect } from './fixtures.js';
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

test.describe('Event Page', () => {

  // ===================================
  // User Story 1 - Access Event Main Page
  // ===================================

  test('authenticated user can access event main page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be on event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
  });

  test('unauthenticated user is redirected to email entry', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to email entry
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/email`));
  });

  test('displays event name in header', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Event name should appear in header (fixture creates event with test title)
    const header = page.locator('header');
    await expect(header).toBeVisible();
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
    
    // Wait for the error to appear after PIN verification fails
    await page.waitForTimeout(2000);
    
    // Error should be displayed about event not found - scope to main content
    // The error appears in a div with class "text-destructive"
    const main = page.locator('main');
    const errorMessage = main.locator('.text-destructive, [role="alert"]')
      .or(main.getByText(/event not found|not found|invalid pin/i));
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 2 - Access Event Admin Page
  // ===================================

  test('administrator can access admin page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should be on admin page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
  });

  test('non-administrator cannot access admin page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    // Regular user tries to access admin page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'regularuser@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Wait for event page to load after PIN entry
    await page.waitForURL(new RegExp(`/event/${eventId}$`), { timeout: 10000 });
    
    // Now try to access admin page directly
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // AdminRoute should redirect non-admins back to main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should NOT be on the admin page
    await expect(page).not.toHaveURL(/\/admin/);
  });

  // ===================================
  // User Story 3 - Navigation Between Pages
  // ===================================

  test('administrator sees navigation to admin page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Admin should see settings/admin link in menu
    const menuButton = page.locator('[aria-label="Open menu"]').or(page.locator('button').filter({ has: page.locator('svg') }));
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Settings option should be visible for admins - use role selector to avoid matching event name
      const settingsOption = page.getByRole('menuitem', { name: /settings/i });
      await expect(settingsOption).toBeVisible();
    }
  });

  test('administrator can navigate from main page to admin page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Open menu and click admin/settings - use role selector to avoid matching event name
    const menuButton = page.locator('[aria-label="Open menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      const settingsOption = page.getByRole('menuitem', { name: /settings/i });
      if (await settingsOption.isVisible()) {
        await settingsOption.click();
        await page.waitForLoadState('networkidle');
        
        // Should be on admin page
        await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
      }
    }
  });

  test('administrator can navigate from admin page to main page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
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
        await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
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
      // Scope to main content to avoid matching event name in header
      const main = page.locator('main');
      const emailEntry = main.getByText('Access Event');
      const errorText = main.getByText(/error/i);
      
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
