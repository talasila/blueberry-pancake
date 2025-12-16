/**
 * Test Helper Functions for E2E Tests
 * Provides reusable functions for common test operations
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

/**
 * Create a test event via API
 * @param {string} eventId - Optional custom event ID (if null, backend generates one)
 * @param {string} name - Event name
 * @param {string} pin - 6-digit PIN
 * @returns {string} The created event ID
 */
export async function createTestEvent(eventId, name, pin) {
  const body = { name, pin };
  if (eventId) {
    body.eventId = eventId;
  }
  
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
 * Clear authentication (localStorage and sessionStorage)
 */
export async function clearAuth(page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set authentication token in localStorage and email in sessionStorage
 */
export async function setAuthToken(page, token, email = 'admin@example.com') {
  await page.goto(BASE_URL);
  await page.evaluate(({ token, email }) => {
    localStorage.setItem('jwtToken', token);  // App expects 'jwtToken' not 'token'
    sessionStorage.setItem('email', email);
  }, { token, email });
}

/**
 * Navigate and wait for the email entry page, then enter email and submit
 */
export async function submitEmail(page, email) {
  const emailInput = page.locator('input#email');
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(email);
  
  const continueButton = page.getByRole('button', { name: /continue/i });
  await continueButton.click();
  await page.waitForLoadState('networkidle');
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
  await page.waitForTimeout(500);
}

/**
 * Submit the PIN form
 */
export async function submitPIN(page) {
  const submitButton = page.getByRole('button', { name: /access event/i });
  
  // Wait for button to be enabled first
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(500); // Give time for form validation
  
  await submitButton.click();
  
  // Wait for either navigation or error to appear
  await page.waitForTimeout(2000);
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

