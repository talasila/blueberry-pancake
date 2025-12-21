/**
 * PIN-based Event Access Tests
 * 
 * Tests PIN authentication flow for regular users and admin security enforcement.
 * Converted from Cucumber/Gherkin to Playwright Test format.
 */

import { test, expect } from './fixtures.js';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  clearAuth,
  setAuthToken,
  submitEmail,
  enterPIN,
  submitPIN,
  enterAndSubmitPIN,
  getErrorMessage,
  isSubmitButtonDisabled,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test.describe('PIN-based Event Access', () => {

  // ===================================
  // User Story 1 - Regular User Access
  // ===================================
  
  test('regular user enters valid PIN and accesses event', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Should see PIN entry screen
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/email`));
    
    // Enter email and PIN
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should see event main page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
  });
  
  test('regular user enters invalid PIN', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, '999999');
    
    // Should see error message and stay on PIN page
    const errorMsg = await getErrorMessage(page);
    expect(errorMsg).toContain('Invalid PIN');
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/pin`));
  });
  
  test('regular user enters PIN with incorrect format', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterPIN(page, '123'); // Only 3 digits
    
    // Submit button should be disabled (validation)
    const isDisabled = await isSubmitButtonDisabled(page);
    expect(isDisabled).toBe(true);
  });
  
  test('PIN verification persists within session', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Enter PIN and access event
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Navigate away and back
    await page.goto(`${BASE_URL}/event/${eventId}/profile`);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Should not see PIN entry screen (session persists)
    await expect(page).not.toHaveURL(new RegExp('/pin$'));
    await expect(page).not.toHaveURL(new RegExp('/email$'));
  });
  
  test('PIN verification required for different events', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    // Create second event (backend generates its own ID)
    const secondEventId = await createTestEvent(null, 'Second Event', '654321');
    
    try {
      await clearAuth(page);
      
      // Access first event
      await page.goto(`${BASE_URL}/event/${eventId}`);
      await submitEmail(page, 'user@example.com');
      await enterAndSubmitPIN(page, pin);
      await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
      
      // Access second event - should require PIN again
      await page.goto(`${BASE_URL}/event/${secondEventId}`);
      
      // This test will fail until app is fixed
      await expect(page).toHaveURL(new RegExp(`/event/${secondEventId}/email`));
    } finally {
      await deleteTestEvent(secondEventId);
    }
  });

  // ===================================
  // User Story 2 - Administrator Security
  // ===================================
  
  test('administrator cannot login via PIN (security enforcement)', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(eventId, adminEmail);
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}/email`);
    await submitEmail(page, adminEmail);
    
    // Should be redirected to OTP, not PIN
    await expect(page).toHaveURL(new RegExp('/otp'));
    await expect(page).not.toHaveURL(new RegExp('/pin'));
  });
  
  test('administrator blocked from PIN entry if they bypass email flow', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(eventId, adminEmail);
    
    await clearAuth(page);
    
    // Try to directly access PIN page
    await page.evaluate((email) => {
      sessionStorage.setItem('email', email);
    }, adminEmail);
    
    await page.goto(`${BASE_URL}/event/${eventId}/pin`);
    
    // Should be redirected away from PIN page
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/pin');
  });
  
  test('administrator receives error if trying to use PIN via API', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(eventId, adminEmail);
    
    // Attempt PIN verification via API
    const response = await page.request.post(`${API_URL}/api/events/${eventId}/verify-pin`, {
      data: {
        email: adminEmail,
        pin: pin,
      },
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Administrators must use OTP authentication');
  });
  
  test('administrator with OTP can access both event and admin pages', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Set auth token (passing email is important)
    await setAuthToken(page, token, adminEmail);
    
    // Access event page
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be on event page (not PIN or email page)
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/event/${eventId}`);
    expect(currentUrl).not.toContain('/pin');
    expect(currentUrl).not.toContain('/email');
    
    // Access admin page
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
  });

  // ===================================
  // User Story 3 - PIN Regeneration
  // ===================================
  
  test('administrator views current PIN on admin page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the admin page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
    
    // Look for any button with "PIN" text (case insensitive, more flexible)
    const pinButton = page.getByRole('button', { name: /pin/i });
    await pinButton.waitFor({ state: 'visible', timeout: 10000 });
    await pinButton.click();
    await page.waitForTimeout(1000); // Give drawer time to open
    
    // Should see the PIN displayed in the drawer
    const pinDisplay = page.locator('.font-mono.text-lg.font-semibold');
    await expect(pinDisplay).toBeVisible();
    await expect(pinDisplay).toHaveText(pin);
  });
  
  test('administrator regenerates PIN', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open PIN drawer
    const pinButton = page.getByRole('button', { name: /pin/i });
    await pinButton.waitFor({ state: 'visible', timeout: 10000 });
    await pinButton.click();
    await page.waitForTimeout(1000);
    
    // Click regenerate button
    const regenerateButton = page.getByRole('button', { name: /regenerate pin/i });
    await regenerateButton.waitFor({ state: 'visible', timeout: 5000 });
    await regenerateButton.click();
    await page.waitForTimeout(2000);
    
    // Should see new PIN
    const pinDisplay = page.locator('.font-mono.text-lg.font-semibold');
    const newPin = await pinDisplay.textContent();
    
    expect(newPin).toHaveLength(6);
    expect(newPin).not.toBe(pin);
  });

  // ===================================
  // Edge Cases
  // ===================================
  
  test('PIN entry for non-existent event', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/NONEXIST`);
    
    await submitEmail(page, 'test@example.com');
    await enterAndSubmitPIN(page, '123456');
    
    // Should see error message
    const errorMsg = await getErrorMessage(page);
    expect(errorMsg).toContain('not found');
  });
});
