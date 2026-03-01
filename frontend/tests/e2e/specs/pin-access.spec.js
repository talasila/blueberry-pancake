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
  enterAndSubmitPIN,
  getErrorMessage,
  BASE_URL,
  API_URL,
} from './helpers.js';
import { DEFAULT_TEST_PIN } from '../e2e-config.js';

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
    const { eventId } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, '999999');
    
    // Should see error message and stay on PIN page
    const errorMsg = await getErrorMessage(page);
    expect(errorMsg).not.toBeNull();
    expect(errorMsg).toMatch(/invalid pin/i);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/pin`));
  });
  
  test('regular user enters PIN with incorrect format', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterPIN(page, '123'); // Only 3 digits
    
    // Submit button should be disabled (validation)
    const submitButton = page.getByRole('button', { name: /access event/i });
    await expect(submitButton).toBeDisabled({ timeout: 5000 });
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
    const secondEventId = await createTestEvent('Second Event', DEFAULT_TEST_PIN);
    
    try {
      await clearAuth(page);
      
      // Access first event
      await page.goto(`${BASE_URL}/event/${eventId}`);
      await submitEmail(page, 'user@example.com');
      await enterAndSubmitPIN(page, pin);
      await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
      
      // Access second event - should require fresh PIN verification
      await page.goto(`${BASE_URL}/event/${secondEventId}`);
      await expect(page).toHaveURL(new RegExp(`/event/${secondEventId}/email`));
    } finally {
      await deleteTestEvent(secondEventId);
    }
  });

  // ===================================
  // User Story 2 - Administrator Security
  // ===================================
  
  test('administrator cannot login via PIN (security enforcement)', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
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
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(eventId, adminEmail);
    
    await clearAuth(page);
    
    // Implementation-coupled: directly sets sessionStorage to simulate bypassing the email flow.
    // If the app changes how it stores the email, this test will need updating.
    await page.evaluate((email) => {
      sessionStorage.setItem('email', email);
    }, adminEmail);
    
    await page.goto(`${BASE_URL}/event/${eventId}/pin`);
    
    // Should be redirected away from PIN page
    await expect(page).not.toHaveURL(/\/pin/, { timeout: 10000 });
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
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Set auth token (passing email is important)
    await setAuthToken(page, token, adminEmail);
    
    // Access event page
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Should be on event page (not PIN or email page)
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}`));
    await expect(page).not.toHaveURL(/\/pin/);
    await expect(page).not.toHaveURL(/\/email/);
    
    // Access admin page
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
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
    
    // Verify we're on the admin page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
    
    // Look for any button with "PIN" text (case insensitive, more flexible)
    const pinButton = page.getByRole('button', { name: /pin/i });
    await pinButton.waitFor({ state: 'visible', timeout: 10000 });
    await pinButton.click();
    
    // Should see the PIN displayed in the drawer
    // TODO: Replace with data-testid when available
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
    
    // Open PIN drawer
    const pinButton = page.getByRole('button', { name: /pin/i });
    await pinButton.waitFor({ state: 'visible', timeout: 10000 });
    await pinButton.click();
    
    const regenerateButton = page.getByRole('button', { name: /regenerate pin/i });
    await regenerateButton.waitFor({ state: 'visible', timeout: 5000 });
    await regenerateButton.click();

    // Wait for the UI to update with the new PIN
    // TODO: Replace with data-testid when available
    const pinDisplay = page.locator('.font-mono.text-lg.font-semibold');
    await expect(pinDisplay).not.toHaveText(pin, { timeout: 10000 });

    await expect(pinDisplay).not.toHaveText('', { timeout: 5000 });
    await expect(async () => {
      const newPin = await pinDisplay.textContent();
      expect(newPin).toHaveLength(6);
      expect(newPin).not.toBe(pin);
    }).toPass({ timeout: 5000 });
  });

  // ===================================
  // Edge Cases
  // ===================================
  
  test('PIN entry for non-existent event', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/NONEXIST`);
    
    await submitEmail(page, 'test@example.com');
    await enterAndSubmitPIN(page, '123456');
    
    const errorMsg = await getErrorMessage(page);
    expect(errorMsg).not.toBeNull();
    expect(errorMsg).toMatch(/not found/i);
  });
});
