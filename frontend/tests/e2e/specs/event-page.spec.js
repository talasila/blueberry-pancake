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
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Should be on event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated user is redirected to email entry', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Should be redirected to email entry
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/email`));
  });

  test('displays event name in header', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    const header = page.locator('header');
    await expect(header).toContainText(/test/i, { timeout: 10000 });
  });

  test('shows error for non-existent event', async ({ page }) => {
    // Use a valid format event ID that doesn't exist (8 alphanumeric chars)
    const nonExistentEventId = 'AAAAAAAA';
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${nonExistentEventId}`);
    
    // Should be redirected to email entry page first
    await expect(page).toHaveURL(new RegExp(`/event/${nonExistentEventId}/email`));
    
    // Submit email to proceed to PIN page
    await submitEmail(page, 'testuser@example.com');
    
    // Should be on PIN entry page
    await expect(page).toHaveURL(new RegExp(`/event/${nonExistentEventId}/pin`), { timeout: 5000 });
    
    // Enter a PIN to trigger the "event not found" error
    await enterAndSubmitPIN(page, '123456');
    
    // Error should be displayed about event not found
    const errorLocator = page.getByText(/event not found|not found|invalid/i).first();
    await expect(errorLocator).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 2 - Access Event Admin Page
  // ===================================

  test('administrator can access admin page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Should be on admin page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
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
    
    // AdminRoute should redirect non-admins back to main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should NOT be on the admin page
    await expect(page).not.toHaveURL(/\/admin/);
  });

  // ===================================
  // User Story 3 - Navigation Between Pages
  // ===================================

  test('administrator sees navigation to admin page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    const menuButton = page.locator('[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    const settingsOption = page.getByRole('menuitem', { name: /settings/i });
    await expect(settingsOption).toBeVisible({ timeout: 5000 });
  });

  test('administrator can navigate from main page to admin page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    const menuButton = page.locator('[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    const settingsOption = page.getByRole('menuitem', { name: /settings/i });
    await expect(settingsOption).toBeVisible({ timeout: 5000 });
    await settingsOption.click();
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
  });

  test('administrator can navigate from admin page to main page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    const menuButton = page.locator('[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    const backOption = page.getByText(/back.*event/i);
    await expect(backOption).toBeVisible({ timeout: 5000 });
    await backOption.click();
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
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
      
      // App handles invalid IDs gracefully — either email entry or error page
      const main = page.locator('main');
      const gracefulElement = main.getByText('Access Event')
        .or(main.getByText(/error/i));
      await expect(gracefulElement.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('event name is trimmed in header if too long', async ({ page }) => {
    // Create event with very long name
    const longName = 'This is a very long event name that should be trimmed in the header to fit properly';
    const longNameEventId = await createTestEvent(longName, '123456');
    
    try {
      const adminEmail = 'admin@example.com';
      const token = await addAdminToEvent(longNameEventId, adminEmail);
      
      await setAuthToken(page, token, adminEmail);
      await page.goto(`${BASE_URL}/event/${longNameEventId}`);
      
      // Header should contain (a portion of) the event name
      const header = page.locator('header');
      await expect(header).toContainText(longName.substring(0, 20), { timeout: 10000 });
    } finally {
      await deleteTestEvent(longNameEventId);
    }
  });
});
