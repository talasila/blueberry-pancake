/**
 * OTP Authentication Tests
 * 
 * Tests the OTP-based authentication flow including email entry,
 * OTP verification, and JWT token management.
 */

import { test, expect } from './fixtures.js';
import { clearAuth, addAdminToEvent, setAuthToken, BASE_URL } from './helpers.js';
import { TEST_OTP } from '../e2e-config.js';

test.describe('OTP Authentication', () => {

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });


  test('verifies test OTP successfully in dev environment', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'otpadmin@example.com';
    
    // Add admin to the event (so they're recognized as admin)
    await addAdminToEvent(eventId, adminEmail);
    
    // Navigate to event - should redirect to email entry
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
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
    
    // Dev mode only: the banner showing the generated OTP is not rendered in production.
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
    await expect(page.getByText(/authentication successful/i)).toBeVisible({ timeout: 5000 });
    
    // Should be redirected to event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`), { timeout: 5000 });
    
    // Verify user session exists in localStorage (auth was successful)
    const session = await page.evaluate(() => localStorage.getItem('userSession'));
    expect(session).toBeTruthy();
    let parsed;
    try {
      parsed = JSON.parse(session);
    } catch (e) {
      throw new Error(`Session storage value is not valid JSON: "${session}"`);
    }
    expect(parsed.email).toBe(adminEmail);
    
    // Verify admin can access the admin page
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));
  });

  test('shows error for incorrect OTP', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('otp-incorrect-test@example.com');
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await expect(requestButton).toBeEnabled({ timeout: 5000 });
    await requestButton.click();
    
    // Wait for the OTP input to appear (backend sends OTP, page transitions)
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    await expect(otpInput).toBeVisible({ timeout: 20000 });
    await otpInput.fill('999999');
    
    const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
    await expect(verifyButton).toBeVisible({ timeout: 5000 });
    await verifyButton.click();
    
    // Should show OTP-specific error message
    const errorElement = page.locator('.text-destructive').or(page.locator('[role="alert"]'));
    await expect(errorElement).toBeVisible({ timeout: 10000 });
    await expect(errorElement).toContainText(/invalid.*otp|incorrect.*code|otp.*expired|verification.*failed|too many failed attempts/i, { timeout: 10000 });
  });

  // ===================================
  // User Story 3 - Protected Page Access
  // ===================================

  test('shows error for invalid OTP when admin tries to login', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'invalidotpadmin@example.com';
    const INVALID_OTP = '999999';
    
    // Add admin to the event (so they're recognized as admin)
    await addAdminToEvent(eventId, adminEmail);
    
    // Navigate to event - should redirect to email entry
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
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
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/otp/verify')),
      verifyButton.click(),
    ]);
    
    // Verify error message is displayed — use the same locator pattern as the earlier OTP test
    const errorElement = page.locator('.text-destructive').or(page.locator('[role="alert"]'));
    await expect(errorElement).toBeVisible({ timeout: 10000 });
    
    // Verify user stays on OTP page (not redirected)
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/otp`));
    
    // Verify user session is NOT stored in localStorage (auth failed)
    const session = await page.evaluate(() => localStorage.getItem('userSession'));
    expect(session).toBeFalsy();
  });

  // ===================================
  // Edge Cases
  // ===================================

  // Tests form validation UI only — verifies the submit button is disabled when
  // no email is entered. Does not test actual form submission behavior.
  test('submit button is disabled when email is empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await expect(requestButton).toBeVisible({ timeout: 5000 });
    
    await expect(requestButton).toBeDisabled({ timeout: 5000 });
  });

  test('redirects away from auth page if already authenticated', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const email = 'already-authed@example.com';

    // Set up valid auth token
    const token = await addAdminToEvent(eventId, email);
    await setAuthToken(page, token, email);

    // Navigate to /auth with a target redirect
    await page.goto(`${BASE_URL}/auth`);

    // Should redirect away from /auth to the landing page (default when no 'from' param).
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 5000 });
    await expect(page).toHaveURL(new RegExp(`^${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`));
  });
});
