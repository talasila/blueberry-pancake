/**
 * Test Helper Functions for E2E Tests
 * Provides reusable functions for common test operations
 * 
 * Event Naming Convention:
 * - API-created events: TEST0001, TEST0002, etc. (auto-generated)
 * - UI-created events: Random IDs, tracked in .e2e-tracked-events.json
 */

import { expect } from '@playwright/test';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Path to tracking file for UI-created events (relative to project root)
const TRACKING_FILE = join(process.cwd(), '..', '.e2e-tracked-events.json');

/**
 * Reset the test event counter on the backend
 * Call this at the start of a test run
 */
export async function resetTestEventCounter() {
  try {
    await fetch(`${API_URL}/api/test/reset-counter`, { method: 'POST' });
  } catch (error) {
    console.warn('Failed to reset test counter:', error.message);
  }
}

/**
 * Track a UI-created event ID for cleanup
 * Used for events created through the UI (not via test helper API)
 */
export function trackEventForCleanup(eventId) {
  if (!eventId) return;
  
  let tracked = [];
  if (existsSync(TRACKING_FILE)) {
    try {
      tracked = JSON.parse(readFileSync(TRACKING_FILE, 'utf-8'));
    } catch {
      tracked = [];
    }
  }
  
  if (!tracked.includes(eventId)) {
    tracked.push(eventId);
    writeFileSync(TRACKING_FILE, JSON.stringify(tracked, null, 2));
  }
}

/**
 * Get all tracked UI-created event IDs
 */
export function getTrackedEvents() {
  if (!existsSync(TRACKING_FILE)) return [];
  try {
    return JSON.parse(readFileSync(TRACKING_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Clear the tracking file
 */
export function clearTrackedEvents() {
  if (existsSync(TRACKING_FILE)) {
    unlinkSync(TRACKING_FILE);
  }
}

/**
 * Create a test event via API
 * Backend auto-generates TEST#### IDs
 * @param {string} _eventId - DEPRECATED, ignored (kept for backwards compatibility)
 * @param {string} name - Event name
 * @param {string} pin - 6-digit PIN
 * @returns {string} The created event ID (TEST####)
 */
export async function createTestEvent(_eventId, name, pin) {
  const body = { name, pin };
  
  const response = await fetch(`${API_URL}/api/test/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create test event: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.eventId;
}

/**
 * Delete a test event via API
 */
export async function deleteTestEvent(eventId) {
  const response = await fetch(`${API_URL}/api/test/events/${eventId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    console.warn(`Failed to delete test event ${eventId}`);
  }
}

/**
 * Add an administrator to an event and get JWT token
 */
export async function addAdminToEvent(eventId, email) {
  const response = await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add admin: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.token;
}

/**
 * Extract JWT from the Set-Cookie header of a fetch response.
 * The backend sets the JWT as an httpOnly cookie on auth responses.
 */
export function extractJWTFromCookie(response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/jwt_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Get a user JWT token via PIN verification.
 * Extracts the token from the response's Set-Cookie header.
 */
export async function getUserToken(eventId, email, pin) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, email }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get user token: ${await response.text()}`);
  }
  const token = extractJWTFromCookie(response);
  if (!token) {
    throw new Error('No JWT cookie found in verify-pin response');
  }
  return token;
}

/**
 * Clear authentication (localStorage, sessionStorage, and httpOnly cookies)
 */
export async function clearAuth(page) {
  // First, call logout endpoint to clear httpOnly cookies (JWT, refresh token, CSRF)
  // This is necessary because httpOnly cookies cannot be cleared from JavaScript
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Ignore errors - server might not be running yet
  }
  
  // Clear browser cookies directly via Playwright
  await page.context().clearCookies();
  
  // Navigate and clear client-side storage
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set authentication token as httpOnly cookie and user session in localStorage.
 * The cookie is used for backend auth; localStorage is used for frontend state.
 */
export async function setAuthToken(page, token, email = 'admin@example.com') {
  await page.goto(BASE_URL);

  // Decode JWT payload to extract exp and authMethod
  let exp;
  let authMethod = null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    exp = payload.exp;
    authMethod = payload.authMethod || null;
  } catch {
    exp = Math.floor(Date.now() / 1000) + 86400;
  }

  // Set JWT as httpOnly cookie (backend reads this for auth via Vite proxy)
  await page.context().addCookies([{
    name: 'jwt_token',
    value: token,
    url: 'http://localhost:3000',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
  }]);

  // Set user session in localStorage (frontend reads this for UI state)
  await page.evaluate(({ email, exp, authMethod }) => {
    localStorage.setItem('userSession', JSON.stringify({ email, exp, authMethod }));
    sessionStorage.setItem('email', email);
  }, { email, exp, authMethod });
}

/**
 * Navigate and wait for the email entry page, then enter email and submit
 * Handles the case where the page is already past the email step (on PIN page)
 */
export async function submitEmail(page, email) {
  // Check if we're already on PIN page (email step already completed)
  const currentUrl = page.url();
  if (currentUrl.includes('/pin')) {
    // Already past email entry, nothing to do
    return;
  }
  
  // Check if email input exists
  const emailInput = page.locator('input#email');
  const isEmailInputVisible = await emailInput.isVisible().catch(() => false);
  
  if (!isEmailInputVisible) {
    // Check if we're on PIN page by looking for PIN input
    const pinInput = page.locator('input#pin')
      .or(page.locator('input[type="text"][maxlength="6"]'))
      .first();
    if (await pinInput.isVisible().catch(() => false)) {
      // Already on PIN page, skip email entry
      return;
    }
  }
  
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(email);
  
  const continueButton = page.getByRole('button', { name: /continue/i });
  await continueButton.click();
  await page.waitForURL(/\/(pin|otp)$/, { timeout: 10000 });
}

/**
 * Enter a PIN in the PIN input field
 */
export async function enterPIN(page, pin) {
  // Check if we're on email page first
  const currentUrl = page.url();
  if (currentUrl.includes('/email')) {
    await submitEmail(page, 'testuser@example.com');
    await page.waitForURL(/\/pin$/, { timeout: 5000 });
  }
  
  // Enter PIN using input field (supports both old InputOTP and new Input component)
  const pinInput = page.locator('input#pin')
    .or(page.locator('input[type="text"][maxlength="6"]'))
    .or(page.locator('[data-input-otp]'))
    .first();
  
  await pinInput.waitFor({ state: 'attached', timeout: 5000 });
  await pinInput.click();
  await pinInput.fill(pin);
}

/**
 * Submit the PIN form
 */
export async function submitPIN(page) {
  const submitButton = page.getByRole('button', { name: /access event/i });
  
  // Wait for button to be visible first
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  
  // Wait for button to become enabled (PIN validation must pass)
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  
  await submitButton.click();
  
  // Wait for navigation or content change after submission
  await page.waitForURL((url) => !url.pathname.endsWith('/pin'), { timeout: 10000 }).catch(() => {});
}

/**
 * Enter PIN and submit in one action
 */
export async function enterAndSubmitPIN(page, pin) {
  await enterPIN(page, pin);
  await submitPIN(page);
}

/**
 * Get error message from page (if visible)
 */
export async function getErrorMessage(page) {
  const errorSelectors = [
    '.text-destructive',
    '.text-red-500',
    '[role="alert"]',
    'text=/error/i',
    'text=/invalid/i',
  ];
  
  for (const selector of errorSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      return await element.textContent();
    }
  }
  
  return null;
}

/**
 * Check if submit button is disabled (used for validation checks)
 */
export async function isSubmitButtonDisabled(page) {
  const submitButton = page.getByRole('button', { name: /access event/i });
  return await submitButton.isDisabled();
}

/**
 * Generate a unique event ID for testing
 */
export function generateUniqueEventId(baseId) {
  const timestamp = Date.now();
  return `${baseId.slice(0, 4)}${timestamp.toString().slice(-4)}`;
}

/**
 * Get a root admin JWT token
 * Note: The email must be in the rootAdmins config array for actual root access
 * @param {string} email - Root admin email address
 * @returns {Promise<string>} JWT token
 */
export async function getRootAdminToken(email) {
  const response = await fetch(`${API_URL}/api/test/root-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get root token: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.token;
}

/**
 * Set up root admin authentication for a page
 * @param {Page} page - Playwright page
 * @param {string} email - Root admin email address
 */
export async function setupRootAdmin(page, email) {
  const token = await getRootAdminToken(email);
  await setAuthToken(page, token, email);
}

// ===================================
// Event State & Rating Helpers
// ===================================

/**
 * Submit a rating for an item via API.
 * Returns raw response shape so callers can inspect ok/status for error scenarios.
 * @returns {{ ok: boolean, status: number, data: any }}
 */
export async function submitRating(eventId, token, itemId, rating, note = '') {
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemId, rating, note })
  });
  const data = response.ok ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Transition an event to a new state via API.
 * Returns raw response shape so callers can inspect ok/status for race condition tests.
 * @returns {{ ok: boolean, status: number, data: any }}
 */
export async function changeEventState(eventId, newState, currentState, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ state: newState, currentState })
  });
  const data = response.ok ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Start an event (shorthand for changing state from 'created' to 'started').
 * Throws if the operation fails (used in test setup).
 */
export async function startEvent(eventId, adminToken) {
  const result = await changeEventState(eventId, 'started', 'created', adminToken);
  if (!result.ok) {
    throw new Error(`Failed to start event: ${result.data}`);
  }
  return result;
}

// ===================================
// OTP Authentication Helper
// ===================================

const TEST_OTP = '123456';

/**
 * Authenticate via OTP flow in the browser.
 * Navigates to /auth, enters email, fills OTP, and waits for redirect.
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 */
export async function authenticateViaOTP(page, email = 'creator@example.com') {
  await page.goto(`${BASE_URL}/auth`);

  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);

  const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
  await expect(requestButton).toBeEnabled({ timeout: 5000 });
  await requestButton.click();

  const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
  await expect(otpInput).toBeVisible({ timeout: 10000 });
  await otpInput.fill(TEST_OTP);

  const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
  await expect(verifyButton).toBeVisible({ timeout: 5000 });
  await verifyButton.click();

  await Promise.race([
    page.waitForURL(/\/(create-event|dashboard|home|events)/, { timeout: 10000 }),
    page.waitForSelector('[data-testid="auth-success"]', { timeout: 10000 }),
  ]).catch(() => {});
}

