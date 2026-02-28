/**
 * OTP Authentication Tests
 * 
 * Tests the OTP-based authentication flow including email entry,
 * OTP verification, and JWT token management.
 */

import { test, expect } from './fixtures.js';
import { clearAuth, createTestEvent, deleteTestEvent, addAdminToEvent, setAuthToken } from './helpers.js';

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
    
    // Verify user session exists in localStorage (auth was successful)
    const session = await page.evaluate(() => localStorage.getItem('userSession'));
    expect(session).toBeTruthy();
    const parsed = JSON.parse(session);
    expect(parsed.email).toBeTruthy();
    
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
    
    // Enter wrong OTP
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('999999');
    
    const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
    await expect(verifyButton).toBeVisible({ timeout: 5000 });
    await verifyButton.click();
    
    // Should show error message (matches all backend error variants)
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 });
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
    
    // Wait for OTP input to be visible and enabled (enabled means the OTP request finished)
    const otpInput = page.locator('input#otp');
    await otpInput.waitFor({ state: 'visible', timeout: 5000 });
    await expect(otpInput).toBeEnabled({ timeout: 10000 });
    await otpInput.fill(INVALID_OTP);
    
    // Click verify button and wait for the API response
    const verifyButton = page.getByRole('button', { name: /verify.*otp/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/otp/verify')),
      verifyButton.click(),
    ]);
    
    // Verify error message is displayed (may vary: "Invalid OTP", "OTP not found or expired", or "Too many failed attempts" if rate-limited)
    await expect(page.getByText(/invalid otp|otp not found|too many failed attempts/i)).toBeVisible({ timeout: 10000 });
    
    // Verify user stays on OTP page (not redirected)
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/otp`));
    
    // Verify user session is NOT stored in localStorage (auth failed)
    const session = await page.evaluate(() => localStorage.getItem('userSession'));
    expect(session).toBeFalsy();
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles empty email submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await expect(requestButton).toBeVisible({ timeout: 5000 });
    
    // Button should be disabled with empty email, or show validation error on click
    const isDisabled = await requestButton.isDisabled();
    if (isDisabled) {
      await expect(requestButton).toBeDisabled();
    } else {
      await requestButton.click();
      const validationError = page.getByText(/required|valid.*email|enter.*email|invalid/i);
      await expect(validationError).toBeVisible({ timeout: 5000 });
    }
  });

  test('redirects away from auth page if already authenticated', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const email = 'already-authed@example.com';

    // Set up valid auth token
    const token = await addAdminToEvent(eventId, email);
    await setAuthToken(page, token, email);

    // Navigate to /auth with a target redirect
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');

    // Should redirect to landing page (the default 'from' is '/')
    // and NOT show the sign-in form
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 5000 });
  });
});
