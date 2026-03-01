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
 */
export async function addAdminToEvent(eventId, email) {
  const response = await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
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
 * Navigate and wait for the email entry page, then enter email and submit.
 * Handles the case where the page is already past the email step (on PIN page).
 */
export async function submitEmail(page, email) {
  const currentUrl = page.url();
  if (/\/pin(\?|$)/.test(new URL(currentUrl).pathname)) {
    return;
  }
  
  const emailInput = page.locator('input#email');
  const pinInput = page.locator('input#pin')
    .or(page.locator('input[type="text"][maxlength="6"]'))
    .or(page.locator('[data-input-otp]'))
    .first();

  const visibleLocator = emailInput.or(pinInput);
  await visibleLocator.first().waitFor({ state: 'visible', timeout: 5000 });

  if (await pinInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    return;
  }
  await emailInput.fill(email);
  
  const continueButton = page.getByRole('button', { name: /continue/i });
  await continueButton.click();
  await page.waitForURL(/\/(pin|otp)$/, { timeout: 10000 });
}

/**
 * Enter a PIN in the PIN input field
 */
export async function enterPIN(page, pin) {
  await page.waitForURL(url => !new URL(url).pathname.endsWith('/email'), { timeout: 5000 })
    .catch(() => {
      throw new Error('enterPIN called while on email page - call submitEmail first');
    });
  
  // maxlength="6" is not OTP-specific — it matches any 6-char text input.
  // Acceptable here because we combine it with #pin and [data-input-otp] via .or().
  const pinInput = page.locator('input#pin')
    .or(page.locator('input[type="text"][maxlength="6"]'))
    .or(page.locator('[data-input-otp]'))
    .first();
  
  await pinInput.waitFor({ state: 'visible', timeout: 5000 });
  await pinInput.click();
  await pinInput.fill(pin);
}

/**
 * Submit the PIN form.
 * @returns {'navigated' | 'error'} outcome
 */
export async function submitPIN(page) {
  const submitButton = page.getByRole('button', { name: /access event/i });
  
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  
  await submitButton.click();

  // The losing branch of Promise.race continues running in the background;
  // this is expected — both waiters are harmless once the page has settled.
  const outcome = await Promise.race([
    page.waitForURL(url => !new URL(url).pathname.endsWith('/pin'), { timeout: 10000 }).then(() => 'navigated'),
    page.locator('[role="alert"]').or(page.locator('.text-destructive')).or(page.locator('.text-red-500')).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => 'error'),
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
  const errorLocator = page.locator('.text-destructive')
    .or(page.locator('.text-red-500'))
    .or(page.locator('[role="alert"]'));

  try {
    const el = errorLocator.first();
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

  // maxlength="6" is a broad selector — it matches any 6-char text input, not just OTP fields.
  const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
  await expect(otpInput).toBeVisible({ timeout: 10000 });
  await otpInput.fill(TEST_OTP);

  const verifyButton = page.locator('form').getByRole('button', { name: /verify|submit|continue/i });
  await expect(verifyButton).toBeVisible({ timeout: 5000 });
  await verifyButton.click();

  // The losing branch of Promise.race continues running in the background;
  // this is expected — both waiters are harmless once the page has settled.
  await Promise.race([
    page.waitForURL(url => !/\/auth\b/.test(url.pathname), { timeout: 15000 }),
    page.locator('[data-testid="auth-success"]').waitFor({ state: 'visible', timeout: 15000 }),
  ]);

  const currentUrl = page.url();
  if (currentUrl.includes('/error') || currentUrl.includes('/500') || currentUrl.includes('/404')) {
    throw new Error(`authenticateViaOTP landed on error page: ${currentUrl}`);
  }
}
