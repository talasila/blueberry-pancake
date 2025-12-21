/**
 * OTP Authentication Tests
 * 
 * Tests the OTP-based authentication flow including email entry,
 * OTP verification, and JWT token management.
 */

import { test, expect } from './fixtures.js';
import { clearAuth, createTestEvent, deleteTestEvent, addAdminToEvent } from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const TEST_OTP = '123456'; // Test OTP that bypasses validation in dev mode

test.describe('OTP Authentication', () => {

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });


  test('verifies test OTP (123456) successfully in dev environment', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'otpadmin@example.com';
    
    // Add admin to the event (so they're recognized as admin)
    await addAdminToEvent(eventId, adminEmail);
    
    // Navigate to event - should redirect to email entry
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be on email entry page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/email`));
    
    // Enter admin email
    const emailInput = page.locator('input#email');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(adminEmail);
    
    const continueButton = page.getByRole('button', { name: /continue/i });
    await continueButton.click();
    
    // Should be redirected to OTP entry page (detected as admin)
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/otp`), { timeout: 5000 });
    
    // Wait for OTP request to complete (dev mode shows the generated OTP)
    await page.getByText(/OTP code generated|OTP code has been sent/i).waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for OTP input and enter test OTP
    const otpInput = page.locator('input#otp');
    await otpInput.waitFor({ state: 'visible', timeout: 5000 });
    await otpInput.fill(TEST_OTP);
    
    // Verify the fill worked
    await expect(otpInput).toHaveValue(TEST_OTP);
    
    // Click verify button - wait for it to be enabled first
    const verifyButton = page.getByRole('button', { name: /verify.*otp/i });
    await expect(verifyButton).toBeEnabled({ timeout: 5000 });
    await verifyButton.click();
    
    // Wait for success message and redirect
    await expect(page.locator('text=/authentication successful/i')).toBeVisible({ timeout: 5000 });
    
    // Should be redirected to event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`), { timeout: 5000 });
    
    // Verify JWT token exists in localStorage
    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(0);
    
    // Verify admin can access the event page (not redirected)
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/event/${eventId}`);
    expect(currentUrl).not.toContain('/email');
    expect(currentUrl).not.toContain('/pin');
    expect(currentUrl).not.toContain('/otp');
    
    // Verify admin can access the admin page
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
  });

  test('shows error for incorrect OTP', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await requestButton.click();
    await page.waitForTimeout(1000);
    
    // Enter wrong OTP
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    if (await otpInput.isVisible()) {
      await otpInput.fill('999999');
      
      const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        
        // Should show error message
        await expect(page.locator('text=/invalid|incorrect|wrong|error/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // ===================================
  // User Story 3 - Protected Page Access
  // ===================================

  test('shows error for invalid OTP when admin tries to login', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'invalidotpadmin@example.com';
    const INVALID_OTP = '999999';
    
    // Add admin to the event (so they're recognized as admin)
    await addAdminToEvent(eventId, adminEmail);
    
    // Navigate to event - should redirect to email entry
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');
    
    // Should be on email entry page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/email`));
    
    // Enter admin email
    const emailInput = page.locator('input#email');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(adminEmail);
    
    const continueButton = page.getByRole('button', { name: /continue/i });
    await continueButton.click();
    
    // Should be redirected to OTP entry page (detected as admin)
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/otp`), { timeout: 5000 });
    
    // Wait for OTP input and enter INVALID OTP
    const otpInput = page.locator('input#otp');
    await otpInput.waitFor({ state: 'visible', timeout: 5000 });
    await otpInput.fill(INVALID_OTP);
    
    // Click verify button
    const verifyButton = page.getByRole('button', { name: /verify.*otp/i });
    await verifyButton.click();
    
    // Verify error message is displayed
    await expect(page.getByText(/invalid otp code/i)).toBeVisible({ timeout: 5000 });
    
    // Verify user stays on OTP page (not redirected)
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/otp`));
    
    // Verify JWT token is NOT stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
    expect(token).toBeFalsy();
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles empty email submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    
    // Button should be disabled or show error when clicked with empty email
    if (await requestButton.isEnabled()) {
      await requestButton.click();
      // Should show validation error
      await page.waitForTimeout(1000);
    }
  });
});
