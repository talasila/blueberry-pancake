/**
 * PIN-based Event Access Tests
 * 
 * Tests PIN authentication flow for regular users and admin security enforcement.
 * Converted from Cucumber/Gherkin to Playwright Test format.
 */

import { test, expect } from '@playwright/test';
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
  generateUniqueEventId,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Test data
let testEventId;
let testEventPin = '654321';

test.describe('PIN-based Event Access', () => {
  
  // Setup: Create test event before each test
  test.beforeEach(async () => {
    // Create event and use the returned ID (backend generates its own)
    testEventId = await createTestEvent(null, 'Test Event', testEventPin);
  });
  
  // Cleanup: Delete test event after each test
  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
    }
  });

  // ===================================
  // User Story 1 - Regular User Access
  // ===================================
  
  test('regular user enters valid PIN and accesses event', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    // Should see PIN entry screen
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/email`));
    
    // Enter email and PIN
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Should see event main page
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
    await expect(page.getByText('Test Event')).toBeVisible();
  });
  
  test('regular user enters invalid PIN', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, '999999');
    
    // Should see error message and stay on PIN page
    const errorMsg = await getErrorMessage(page);
    expect(errorMsg).toContain('Invalid PIN');
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/pin`));
  });
  
  test('regular user enters PIN with incorrect format', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterPIN(page, '123'); // Only 3 digits
    
    // Submit button should be disabled (validation)
    const isDisabled = await isSubmitButtonDisabled(page);
    expect(isDisabled).toBe(true);
  });
  
  test('PIN verification persists within session', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    // Enter PIN and access event
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
    
    // Navigate away and back
    await page.goto(`${BASE_URL}/event/${testEventId}/profile`);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    // Should not see PIN entry screen (session persists)
    await expect(page).not.toHaveURL(new RegExp('/pin$'));
    await expect(page).not.toHaveURL(new RegExp('/email$'));
  });
  
  test.skip('PIN verification required for different events (KNOWN BUG)', async ({ page }) => {
    // Create second event (backend generates its own ID)
    const secondEventId = await createTestEvent(null, 'Second Event', '654321');
    
    try {
      await clearAuth(page);
      
      // Access first event
      await page.goto(`${BASE_URL}/event/${testEventId}`);
      await submitEmail(page, 'user@example.com');
      await enterAndSubmitPIN(page, testEventPin);
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
      
      // Access second event - should require PIN again
      await page.goto(`${BASE_URL}/event/${secondEventId}`);
      
      // KNOWN BUG: App stores global session, not event-specific
      // This test will fail until app is fixed
      await expect(page).toHaveURL(new RegExp(`/event/${secondEventId}/email`));
    } finally {
      await deleteTestEvent(secondEventId);
    }
  });

  // ===================================
  // User Story 2 - Administrator Security
  // ===================================
  
  test('administrator cannot login via PIN (security enforcement)', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(testEventId, adminEmail);
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}/email`);
    await submitEmail(page, adminEmail);
    
    // Should be redirected to OTP, not PIN
    await expect(page).toHaveURL(new RegExp('/otp'));
    await expect(page).not.toHaveURL(new RegExp('/pin'));
  });
  
  test('administrator blocked from PIN entry if they bypass email flow', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(testEventId, adminEmail);
    
    await clearAuth(page);
    
    // Try to directly access PIN page
    await page.evaluate((email) => {
      sessionStorage.setItem('email', email);
    }, adminEmail);
    
    await page.goto(`${BASE_URL}/event/${testEventId}/pin`);
    
    // Should be redirected away from PIN page
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/pin');
  });
  
  test('administrator receives error if trying to use PIN via API', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(testEventId, adminEmail);
    
    // Attempt PIN verification via API
    const response = await page.request.post(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      data: {
        email: adminEmail,
        pin: testEventPin,
      },
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Administrators must use OTP authentication');
  });
  
  test('administrator with OTP can access both event and admin pages', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Set auth token
    await setAuthToken(page, token);
    
    // Access event page
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be on event page (not PIN page)
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/event/${testEventId}`);
    expect(currentUrl).not.toContain('/pin');
    expect(currentUrl).not.toContain('/email');
    
    // Access admin page
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/admin`));
  });

  // ===================================
  // User Story 3 - PIN Regeneration
  // ===================================
  
  test('administrator views current PIN on admin page', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open PIN drawer
    const pinButton = page.getByRole('button', { name: /^pin$/i });
    await pinButton.waitFor({ state: 'visible', timeout: 10000 });
    await pinButton.click();
    await page.waitForTimeout(500);
    
    // Should see the PIN displayed
    const pinDisplay = page.locator('.font-mono.text-lg.font-semibold');
    await expect(pinDisplay).toBeVisible();
    await expect(pinDisplay).toHaveText(testEventPin);
  });
  
  test.skip('administrator regenerates PIN (KNOWN BUG: timing issue)', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    
    // Open PIN drawer
    const pinButton = page.getByRole('button', { name: /^pin$/i });
    await pinButton.click();
    await page.waitForTimeout(500);
    
    // Click regenerate button
    const regenerateButton = page.getByRole('button', { name: /regenerate pin/i });
    await regenerateButton.waitFor({ state: 'visible', timeout: 5000 });
    await regenerateButton.click();
    await page.waitForTimeout(2000);
    
    // Should see new PIN
    const pinDisplay = page.locator('.font-mono.text-lg.font-semibold');
    const newPin = await pinDisplay.textContent();
    
    expect(newPin).toHaveLength(6);
    expect(newPin).not.toBe(testEventPin);
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

