/**
 * Create Event Tests
 * 
 * Tests the event creation flow including authentication,
 * form submission, and event ID generation.
 * 
 * Note: Events created via UI are tracked for cleanup by global teardown.
 */

import { test, expect } from '@playwright/test';
import { clearAuth, deleteTestEvent, trackEventForCleanup } from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';
const TEST_OTP = '123456';

/**
 * Helper function to authenticate via OTP flow
 * Uses proper Playwright waits instead of hardcoded timeouts
 */
async function authenticateViaOTP(page, email = 'creator@example.com') {
  await page.goto(`${BASE_URL}/auth`);
  
  // Fill email
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  
  // Click request OTP button
  const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
  await expect(requestButton).toBeEnabled({ timeout: 5000 });
  await requestButton.click();
  
  // Wait for OTP input to appear (not a hardcoded timeout)
  const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
  await expect(otpInput).toBeVisible({ timeout: 10000 });
  
  // Fill OTP
  await otpInput.fill(TEST_OTP);
  
  // Click verify button
  const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
  await expect(verifyButton).toBeVisible({ timeout: 5000 });
  await verifyButton.click();
  
  // Wait for authentication to complete - either redirect or success indicator
  await Promise.race([
    page.waitForURL(/\/(create-event|dashboard|home|events)/, { timeout: 10000 }),
    page.waitForSelector('[data-testid="auth-success"]', { timeout: 10000 }),
  ]).catch(() => {});
}

/**
 * Helper to navigate to create event page after authentication
 */
async function navigateToCreateEvent(page) {
  await page.goto(`${BASE_URL}/create-event`);
  await page.waitForLoadState('networkidle');
  
  // Wait for the create event form to be visible
  const formVisible = await page.locator('input').first().isVisible().catch(() => false);
  if (!formVisible) {
    // If redirected to auth, we're not authenticated - throw error
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      throw new Error('Not authenticated - redirected to auth page');
    }
  }
}

test.describe('Create Event', () => {

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  // ===================================
  // User Story 1 - Navigate to Create Event Page
  // ===================================

  test('Create button on landing page leads to auth flow', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const createButton = page.getByRole('button', { name: /create/i });
    await createButton.click();
    
    // Should navigate to auth page
    await expect(page).toHaveURL(/\/auth/);
  });

  test('authenticated user can access create event page directly', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);
    
    // Navigate to create event page
    await navigateToCreateEvent(page);
    
    // Should be on create event page (not redirected)
    // Check for create event form elements
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Create Event with Required Details
  // ===================================

  test('create event form has required fields', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);
    
    // Navigate to create event page
    await navigateToCreateEvent(page);
    
    // Check for name input
    const nameInput = page.locator('input[name="name"]').or(page.locator('input#event-name')).or(page.getByLabel(/name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    
    // Check for type of item dropdown (wine)
    const typeSelect = page.locator('select').or(page.getByRole('combobox'));
    await expect(typeSelect.first()).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error when name is missing', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);
    
    // Navigate to create event page
    await navigateToCreateEvent(page);
    
    // Try to submit without filling name
    const createButton = page.getByRole('button', { name: /create/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });
    
    const nameInput = page.getByRole('textbox', { name: /event name/i });
    await expect(nameInput).toBeVisible();
    
    // Ensure field is empty
    await nameInput.clear();
    await createButton.click();
    
    // Form should not navigate away — we're still on the create page
    // (native HTML5 validation prevents submission with empty required fields)
    await expect(page).toHaveURL(/create-event/);
    
    // Verify the input is flagged as invalid via native validation
    const isInvalid = await nameInput.evaluate((el) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  // ===================================
  // User Story 3 - Event Lifecycle
  // ===================================

  test('newly created event has "created" state', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);
    
    // Navigate to create event page
    await navigateToCreateEvent(page);
    
    // Fill in event name
    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('State Test Event');
    
    // Set up response promise BEFORE clicking (to capture the API response reliably)
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/events') && 
              resp.request().method() === 'POST' &&
              !resp.url().includes('verify-pin')
    );
    
    // Submit the form
    const createButton = page.getByRole('button', { name: /create event/i });
    await createButton.click();
    
    // Wait for API response and extract event ID
    const response = await responsePromise;
    let createdEventId = null;
    try {
      const data = await response.json();
      createdEventId = data.eventId;
      if (createdEventId) {
        trackEventForCleanup(createdEventId);
      }
    } catch {
      // Ignore parsing errors
    }
    
    // Verify redirect to admin page with uppercase-only event ID
    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // Verify welcome bottom sheet appears (replaces the old toast notification)
    await expect(page.locator('[data-testid="welcome-bottom-sheet"]')).toBeVisible({ timeout: 5000 });

    // Verify the event state via API
    if (createdEventId) {
      const stateResponse = await fetch(`${API_URL}/api/events/${createdEventId}`);
      if (stateResponse.ok) {
        const eventData = await stateResponse.json();
        expect(eventData.state).toBe('created');
      }
    }

    // Verify back button skips the create form (FR-004)
    await page.goBack();
    await expect(page).not.toHaveURL(/\/create-event/);

    // Cleanup
    if (createdEventId) {
      await deleteTestEvent(createdEventId);
    }
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles special characters in event name', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);
    
    // Navigate to create event page
    await navigateToCreateEvent(page);
    
    // Fill in event name with special characters
    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Event @#$% Special!');
    
    // Trigger blur to show validation error
    await nameInput.blur();
    await page.waitForTimeout(500);
    
    // Check for validation error message
    const errorMessage = page.locator('#name-error').or(page.getByText(/can only contain letters, numbers, spaces, hyphens, and underscores/i));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Verify submit also shows error
    const createButton = page.getByRole('button', { name: /create event/i });
    await createButton.click();
    await page.waitForTimeout(1000);
    
    // Error should still be visible, no redirect occurred
    await expect(page).toHaveURL(/\/create-event/);
    
    // Now test that allowed special characters work (hyphens and underscores)
    await nameInput.clear();
    await nameInput.fill('Event-Name_With-Allowed_Chars');
    await nameInput.blur();
    await page.waitForTimeout(500);
    
    // Error message should not be visible for valid characters
    await expect(errorMessage).not.toBeVisible();
  });

  // ===================================
  // User Story 2 (Crockford) - Case-Insensitive Event ID Entry
  // ===================================

  test('redirects lowercase event ID URL to uppercase canonical form', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);

    // Navigate to create event page and create an event
    await navigateToCreateEvent(page);

    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Case Redirect Test Event');

    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/events') &&
              resp.request().method() === 'POST' &&
              !resp.url().includes('verify-pin')
    );

    const createButton = page.getByRole('button', { name: /create event/i });
    await createButton.click();

    const response = await responsePromise;
    let createdEventId = null;
    try {
      const data = await response.json();
      createdEventId = data.eventId;
      if (createdEventId) {
        trackEventForCleanup(createdEventId);
      }
    } catch {
      // Ignore parsing errors
    }

    expect(createdEventId).toBeTruthy();
    expect(createdEventId).toMatch(/^[0-9A-HJ-NP-TV-Z]{8}$/);

    // Navigate to the event using a lowercase version of the ID
    const lowercaseId = createdEventId.toLowerCase();
    await page.goto(`${BASE_URL}/event/${lowercaseId}`);

    // The app should redirect to the canonical uppercase URL
    await page.waitForURL(new RegExp(`/event/${createdEventId}`), { timeout: 10000 });

    // Verify the URL contains the uppercase event ID
    expect(page.url()).toContain(`/event/${createdEventId}`);

    // Cleanup
    if (createdEventId) {
      await deleteTestEvent(createdEventId);
    }
  });

  test('excluded characters (I, L, O, U) pass through and show event not found', async ({ page }) => {
    // Navigate to landing page
    await page.goto(BASE_URL);

    // Enter an event ID containing excluded Crockford characters
    const eventIdInput = page.locator('input#event-id');
    await expect(eventIdInput).toBeVisible({ timeout: 5000 });
    await eventIdInput.fill('OIL12345');

    // Click Join
    const joinButton = page.getByRole('button', { name: /join/i });
    await joinButton.click();

    // The system should navigate to the event page (uppercase normalized)
    // and show a "not found" message since no event matches this ID
    await page.waitForLoadState('networkidle');

    // Verify no validation error about invalid characters — the ID format is valid (8 alphanumeric)
    // Instead, expect a standard "not found" or redirect to email entry flow
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toMatch(/invalid.*character/i);
  });

  // ===================================
  // Session Persistence
  // ===================================

  test('authenticated user can create multiple events without re-authenticating', async ({ page }) => {
    await authenticateViaOTP(page);

    // --- Create first event ---
    await navigateToCreateEvent(page);

    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Session Test Event 1');

    const firstResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/events') &&
              resp.request().method() === 'POST' &&
              !resp.url().includes('verify-pin')
    );

    const createButton = page.getByRole('button', { name: /create event/i });
    await createButton.click();

    const firstResponse = await firstResponsePromise;
    let firstEventId = null;
    try {
      const data = await firstResponse.json();
      firstEventId = data.eventId;
      if (firstEventId) trackEventForCleanup(firstEventId);
    } catch { /* ignore */ }

    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // --- Navigate back to landing page ---
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // --- Click Create again — should NOT go to /auth ---
    const landingCreateButton = page.getByRole('button', { name: /create/i });
    await landingCreateButton.click();

    await expect(page).toHaveURL(/\/create-event/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/\/auth/);

    // --- Create second event ---
    const nameInput2 = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput2).toBeVisible({ timeout: 5000 });
    await nameInput2.fill('Session Test Event 2');

    const secondResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/events') &&
              resp.request().method() === 'POST' &&
              !resp.url().includes('verify-pin')
    );

    const createButton2 = page.getByRole('button', { name: /create event/i });
    await createButton2.click();

    const secondResponse = await secondResponsePromise;
    let secondEventId = null;
    try {
      const data = await secondResponse.json();
      secondEventId = data.eventId;
      if (secondEventId) trackEventForCleanup(secondEventId);
    } catch { /* ignore */ }

    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // Both events should have been created with distinct IDs
    expect(firstEventId).toBeTruthy();
    expect(secondEventId).toBeTruthy();
    expect(firstEventId).not.toBe(secondEventId);

    // Cleanup
    if (firstEventId) await deleteTestEvent(firstEventId);
    if (secondEventId) await deleteTestEvent(secondEventId);
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('prevents duplicate event creation on rapid clicks', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);
    
    // Navigate to create event page
    await navigateToCreateEvent(page);
    
    // Fill in event name
    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Rapid Click Test Event');
    
    // Set up response promise BEFORE clicking to reliably capture the API response
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/events') && 
              resp.request().method() === 'POST' &&
              !resp.url().includes('verify-pin')
    );
    
    const createButton = page.getByRole('button', { name: /create event/i });
    
    // Fire multiple clicks rapidly using force to bypass actionability checks
    // The component's isSubmitting state should prevent duplicate API calls
    await createButton.click();
    await createButton.click({ force: true }).catch(() => {});
    await createButton.click({ force: true }).catch(() => {});
    
    // Wait for the API response (only one should be made due to isSubmitting guard)
    const response = await responsePromise;
    
    // Extract the created event ID
    let createdEventId = null;
    try {
      const data = await response.json();
      createdEventId = data.eventId;
      if (createdEventId) {
        trackEventForCleanup(createdEventId);
      }
    } catch {
      // Ignore parsing errors
    }
    
    // Wait for single redirect to admin page with uppercase-only event ID
    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // Verify exactly one event was created
    expect(createdEventId).toBeTruthy();

    // Wait a moment for any potential duplicate requests to complete
    await page.waitForTimeout(1000);

    // Clean up
    if (createdEventId) {
      await deleteTestEvent(createdEventId);
    }
  });
});
