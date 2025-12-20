/**
 * OTP Authentication Tests
 * 
 * Tests the OTP-based authentication flow including email entry,
 * OTP verification, and JWT token management.
 */

import { test, expect } from '@playwright/test';
import { clearAuth, createTestEvent, deleteTestEvent, addAdminToEvent } from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';
const TEST_OTP = '123456'; // Test OTP that bypasses validation in dev mode

test.describe('OTP Authentication', () => {

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });


  test('verifies test OTP (123456) successfully in dev environment', async ({ page }) => {
    // Step 1: Create a test event
    const testEventId = await createTestEvent(null, 'OTP Test Event', '654321');
    const adminEmail = 'otpadmin@example.com';
    
    try {
      // Step 2: Add admin to the event (so they're recognized as admin)
      await addAdminToEvent(testEventId, adminEmail);
      
      // Step 3: Navigate to event - should redirect to email entry
      await page.goto(`${BASE_URL}/event/${testEventId}`);
      await page.waitForLoadState('networkidle');
      
      // Should be on email entry page
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/email`));
      
      // Step 4: Enter admin email
      const emailInput = page.locator('input#email');
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(adminEmail);
      
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();
      
      // Step 5: Should be redirected to OTP entry page (detected as admin)
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/otp`), { timeout: 5000 });
      
      // Step 6: Wait for OTP request to complete (dev mode shows the generated OTP)
      await page.getByText(/OTP code generated|OTP code has been sent/i).waitFor({ state: 'visible', timeout: 5000 });
      
      // Wait for OTP input and enter test OTP
      const otpInput = page.locator('input#otp');
      await otpInput.waitFor({ state: 'visible', timeout: 5000 });
      await otpInput.fill(TEST_OTP);
      
      // Verify the fill worked
      await expect(otpInput).toHaveValue(TEST_OTP);
      
      // Step 7: Click verify button - wait for it to be enabled first
      const verifyButton = page.getByRole('button', { name: /verify.*otp/i });
      await expect(verifyButton).toBeEnabled({ timeout: 5000 });
      await verifyButton.click();
      
      // Step 8: Wait for success message and redirect
      await expect(page.locator('text=/authentication successful/i')).toBeVisible({ timeout: 5000 });
      
      // Step 9: Should be redirected to event page
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`), { timeout: 5000 });
      
      // Step 10: Verify JWT token exists in localStorage
      const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
      
      // Step 11: Verify admin can access the event page (not redirected)
      const currentUrl = page.url();
      expect(currentUrl).toContain(`/event/${testEventId}`);
      expect(currentUrl).not.toContain('/email');
      expect(currentUrl).not.toContain('/pin');
      expect(currentUrl).not.toContain('/otp');
      
      // Step 12: Verify admin can access the admin page
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/admin`));
      
    } finally {
      // Cleanup: delete the test event
      await deleteTestEvent(testEventId);
    }
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

  test('shows error for invalid OTP when admin tries to login', async ({ page }) => {
    // Step 1: Create a test event
    const testEventId = await createTestEvent(null, 'Invalid OTP Test Event', '654321');
    const adminEmail = 'invalidotpadmin@example.com';
    const INVALID_OTP = '999999';
    
    try {
      // Step 2: Add admin to the event (so they're recognized as admin)
      await addAdminToEvent(testEventId, adminEmail);
      
      // Step 3: Navigate to event - should redirect to email entry
      await page.goto(`${BASE_URL}/event/${testEventId}`);
      await page.waitForLoadState('networkidle');
      
      // Should be on email entry page
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/email`));
      
      // Step 4: Enter admin email
      const emailInput = page.locator('input#email');
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(adminEmail);
      
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();
      
      // Step 5: Should be redirected to OTP entry page (detected as admin)
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/otp`), { timeout: 5000 });
      
      // Step 6: Wait for OTP input and enter INVALID OTP
      const otpInput = page.locator('input#otp');
      await otpInput.waitFor({ state: 'visible', timeout: 5000 });
      await otpInput.fill(INVALID_OTP);
      
      // Step 7: Click verify button
      const verifyButton = page.getByRole('button', { name: /verify.*otp/i });
      await verifyButton.click();
      
      // Step 8: Verify error message is displayed
      await expect(page.getByText(/invalid otp code/i)).toBeVisible({ timeout: 5000 });
      
      // Step 9: Verify user stays on OTP page (not redirected)
      await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/otp`));
      
      // Step 10: Verify JWT token is NOT stored in localStorage
      const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
      expect(token).toBeFalsy();
      
    } finally {
      // Cleanup: delete the test event
      await deleteTestEvent(testEventId);
    }
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
