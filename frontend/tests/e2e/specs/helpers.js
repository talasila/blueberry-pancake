/**
 * Test Helper Functions for E2E Tests
 * Provides reusable functions for common test operations
 * 
 * Event Naming Convention:
 * - API-created events: TEST0001, TEST0002, etc. (auto-generated)
 * - UI-created events: Random IDs, tracked in .e2e-tracked-events.txt
 */

import { expect } from '@playwright/test';
import { appendFileSync } from 'fs';
import { BASE_URL, API_URL, TEST_OTP, TRACKING_FILE } from '../e2e-config.js';

// Re-exported so specs can import from helpers.js instead of e2e-config.js directly.
// All spec files should use this single import path for consistency.
export { BASE_URL, API_URL };

/**
 * Track a UI-created event ID for cleanup.
 * Uses append-per-line to avoid read-modify-write race conditions
 * when parallel workers call this concurrently.
 */
export function trackEventForCleanup(eventId) {
  if (!eventId) return;
  appendFileSync(TRACKING_FILE, eventId + '\n');
}

/**
 * Create a test event via API
 * Backend auto-generates TEST#### IDs
 * @param {string} name - Event name
 * @param {string} pin - 6-digit PIN
 * @returns {string} The created event ID (TEST####)
 */
export async function createTestEvent(name, pin) {
  const body = { name, pin };
  
  const response = await fetch(`${API_URL}/api/test/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create test event: ${await response.text()}`);
  }
  
  const data = await response.json();
  if (!data.eventId) {
    throw new Error(`createTestEvent: API response missing eventId. Got: ${JSON.stringify(data)}`);
  }
  return data.eventId;
}

/**
 * Delete a test event via API
 */
export async function deleteTestEvent(eventId) {
  try {
    const response = await fetch(`${API_URL}/api/test/events/${eventId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.warn(`Failed to delete test event ${eventId}: ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`Network error deleting test event ${eventId}: ${error.message}`);
    return false;
  }
}

/**
 * Add an administrator to an event and get JWT token
 * @param {string} eventId
 * @param {string} email
 * @param {{ owner?: boolean }} options - Set owner: true to add as event owner
 */
export async function addAdminToEvent(eventId, email, { owner = false } = {}) {
  const response = await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, owner }),
    signal: AbortSignal.timeout(10000),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add admin: ${await response.text()}`);
  }
  
  const data = await response.json();
  if (!data.token) {
    throw new Error(`addAdminToEvent: API response missing token. Got: ${JSON.stringify(data)}`);
  }
  return data.token;
}

/**
 * Extract JWT from the Set-Cookie header of a fetch response.
 * The backend sets the JWT as an httpOnly cookie on auth responses.
 */
function extractJWTFromCookie(response) {
  // Note: headers.get('set-cookie') may concatenate multiple Set-Cookie headers
  // with commas, which could break parsing if cookie values contain commas.
  // Acceptable here since we only need to match the jwt_token cookie.
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
    signal: AbortSignal.timeout(10000),
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
  await page.context().clearCookies();
  
  const currentUrl = page.url();
  if (!currentUrl.startsWith(BASE_URL)) {
    await page.goto(BASE_URL);
  }
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

  let exp;
  let authMethod = null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    exp = payload.exp;
    if (typeof exp !== 'number') {
      throw new Error(`JWT payload missing numeric 'exp' field (got ${typeof exp})`);
    }
    authMethod = payload.authMethod || null;
  } catch (e) {
    throw new Error(`setAuthToken received a malformed JWT (test bug): ${e.message}`);
  }

  await page.context().addCookies([{
    name: 'jwt_token',
    value: token,
    url: BASE_URL,
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
  }]);

  await page.evaluate(({ email, exp, authMethod }) => {
    localStorage.setItem('userSession', JSON.stringify({ email, exp, authMethod }));
    sessionStorage.setItem('email', email);
  }, { email, exp, authMethod });
}

/**
 * Shared locator for the PIN input field.
 * Matches either `input#pin` or a generic 6-char text input (maxlength="6").
 */
function pinInputLocator(page) {
  return page.locator('input#pin')
    .or(page.locator('input[type="text"][maxlength="6"]'));
}

/**
 * Shared locator for error messages (alerts and destructive text).
 */
function errorLocator(page) {
  return page.locator('[role="alert"]').or(page.locator('.text-destructive'));
}

/**
 * Navigate and wait for the email entry page, then enter name + email and submit.
 * Handles the case where the page is already past the email step (on PIN page).
 */
export async function submitEmail(page, email, name = 'Test User') {
  const currentUrl = page.url();
  if (/\/pin(\?|$)/.test(new URL(currentUrl).pathname)) {
    return;
  }

  const emailInput = page.locator('input#email');
  const pinInput = pinInputLocator(page);

  try {
    await emailInput.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    if (await pinInput.first().isVisible().catch(() => false)) {
      return;
    }
    throw new Error('submitEmail: neither email nor PIN input appeared within timeout');
  }

  // Fill name field (required alongside email)
  const nameInput = page.locator('input#name');
  await nameInput.fill(name);
  await emailInput.fill(email);

  const continueButton = page.getByRole('button', { name: /continue/i });
  await continueButton.click();
  await page.waitForURL(/\/(pin|otp)$/, { timeout: 10000 });
}

/**
 * Enter a PIN in the PIN input field
 */
export async function enterPIN(page, pin) {
  await page.waitForURL(url => !url.pathname.endsWith('/email'), { timeout: 5000 })
    .catch(() => {
      throw new Error('enterPIN called while on email page - call submitEmail first');
    });
  
  const pinInput = pinInputLocator(page).first();
  
  await pinInput.waitFor({ state: 'visible', timeout: 5000 });
  await pinInput.click();
  await pinInput.fill(pin);
}

/**
 * Submit the PIN form.
 * @returns {'navigated' | 'error'} outcome
 */
export async function submitPIN(page) {
  const submitButton = page.getByRole('button', { name: /join event/i });
  
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  
  await submitButton.click();

  // The losing branch of Promise.race continues running in the background;
  // this is expected — both waiters are harmless once the page has settled.
  const outcome = await Promise.race([
    page.waitForURL(url => !url.pathname.endsWith('/pin'), { timeout: 10000 }).then(() => 'navigated'),
    errorLocator(page).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => 'error'),
  ]);
  return outcome;
}

/**
 * Enter PIN and submit in one action
 */
export async function enterAndSubmitPIN(page, pin) {
  await enterPIN(page, pin);
  return await submitPIN(page);
}

/**
 * Get error message from page (if visible)
 */
export async function getErrorMessage(page, { timeout = 5000 } = {}) {
  try {
    const el = errorLocator(page).first();
    await el.waitFor({ state: 'visible', timeout });
    return await el.textContent();
  } catch {
    return null;
  }
}

/**
 * Get a root admin JWT token
 * @param {string} email - Root admin email address
 * @returns {Promise<string>} JWT token
 */
export async function getRootAdminToken(email) {
  const response = await fetch(`${API_URL}/api/test/root-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(10000),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get root token: ${await response.text()}`);
  }
  
  const data = await response.json();
  if (!data.token) {
    throw new Error(`getRootAdminToken: API response missing token. Got: ${JSON.stringify(data)}`);
  }
  return data.token;
}

/**
 * Set up root admin authentication for a page
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
 * @returns {{ ok: boolean, status: number, data: any }}
 */
export async function submitRating(eventId, token, itemId, rating, note = '') {
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemId, rating, note }),
    signal: AbortSignal.timeout(10000),
  });
  const data = response.ok ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Transition an event to a new state via API.
 * @returns {{ ok: boolean, status: number, data: any }}
 */
export async function changeEventState(eventId, newState, currentState, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ state: newState, currentState }),
    signal: AbortSignal.timeout(10000),
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

/**
 * Fetch event data via API.
 * @returns {{ ok: boolean, status: number, data: any }}
 */
export async function getEvent(eventId, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  const data = response.ok ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Configure items for an event via API.
 * @returns {{ ok: boolean, status: number, data: any }}
 */
export async function configureItems(eventId, token, numberOfItems, excludedItemIds = []) {
  const body = { numberOfItems };
  if (excludedItemIds.length > 0) body.excludedItemIds = excludedItemIds;
  const response = await fetch(`${API_URL}/api/events/${eventId}/item-configuration`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = response.ok ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Open the Bottles (Items) drawer on the admin page.
 * Waits for the button to appear and the drawer to open.
 */
export async function openBottlesDrawer(page) {
  const bottlesButton = page.getByRole('button', { name: /bottles/i });
  await bottlesButton.waitFor({ state: 'visible', timeout: 10000 });
  await bottlesButton.click();
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Dismiss the guest welcome bottom sheet if it's visible.
 * No-op if the sheet doesn't appear (admin login, paused/completed events, etc.).
 */
export async function dismissGuestWelcomeSheet(page) {
  const skipBtn = page.locator('[data-testid="guest-welcome-skip-btn"]');
  try {
    await skipBtn.waitFor({ state: 'visible', timeout: 2000 });
    await skipBtn.click();
    await page.locator('[data-testid="guest-welcome-bottom-sheet"]').waitFor({ state: 'hidden', timeout: 2000 });
  } catch {
    // Sheet didn't appear — nothing to dismiss
  }
}

/**
 * Log in as a user to an event via the browser UI.
 * Clears auth, navigates to the event, enters email & PIN.
 * By default, auto-dismisses the guest welcome bottom sheet so it doesn't
 * block subsequent interactions. Pass { dismissWelcome: false } to keep it open.
 */
export async function loginAsUserToEvent(page, eventId, email, pin, { dismissWelcome = true } = {}) {
  await clearAuth(page);
  await page.goto(`${BASE_URL}/event/${eventId}`);
  await submitEmail(page, email);
  await enterAndSubmitPIN(page, pin);
  if (dismissWelcome) {
    await dismissGuestWelcomeSheet(page);
  }
}

/**
 * Add an admin to an event with addToUsers: true (so they also appear in the users list).
 * Returns the admin JWT token.
 */
export async function addAdminAsUser(eventId, email) {
  const response = await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, addToUsers: true }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`addAdminAsUser failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.token;
}

// ===================================
// OTP Authentication Helper
// ===================================

/**
 * Authenticate via OTP flow in the browser.
 * Navigates to /auth, enters email, fills OTP, and waits for redirect.
 */
export async function authenticateViaOTP(page, email = 'creator@example.com') {
  await page.goto(`${BASE_URL}/auth`);

  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);

  const requestButton = page.locator('form').getByRole('button', { name: /request|send|get.*otp|continue/i });
  await expect(requestButton).toBeEnabled({ timeout: 5000 });
  await requestButton.click();

  const otpInput = page.locator('input#otp').or(page.locator('input[maxlength="6"]'));
  await expect(otpInput).toBeVisible({ timeout: 10000 });
  await otpInput.fill(TEST_OTP);

  const verifyButton = page.locator('form').getByRole('button', { name: /sign in|verify|submit|continue/i });
  await expect(verifyButton).toBeVisible({ timeout: 5000 });
  await verifyButton.click();

  await page.waitForURL(url => !/\/auth\b/.test(url.pathname), { timeout: 15000 });

  const currentUrl = page.url();
  if (currentUrl.includes('/error') || currentUrl.includes('/500') || currentUrl.includes('/404')) {
    throw new Error(`authenticateViaOTP landed on error page: ${currentUrl}`);
  }
}

/**
 * Update rating configuration for an event via API.
 * @param {string} eventId - Event identifier
 * @param {string} token - Admin JWT token
 * @param {object} config - Configuration fields to update (e.g., { personalityEnabled: false })
 * @returns {{ ok: boolean, status: number, data: object|string }}
 */
export async function updateRatingConfig(eventId, token, config) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/rating-configuration`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(config),
    signal: AbortSignal.timeout(10000),
  });
  const data = response.ok ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data };
}
