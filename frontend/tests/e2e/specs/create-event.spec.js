/**
 * Create Event Tests
 * 
 * Tests the event creation flow including authentication,
 * form submission, and event ID generation.
 * 
 * Note: Events created via UI are tracked for cleanup by global teardown.
 */

import { test, expect } from '@playwright/test';
import { clearAuth, deleteTestEvent, trackEventForCleanup, authenticateViaOTP, addAdminToEvent, BASE_URL, API_URL } from './helpers.js';

/**
 * Helper to navigate to create event page after authentication
 */
async function navigateToCreateEvent(page) {
  await page.goto(`${BASE_URL}/create-event`);
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 5000 });
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
    const nameInput = page.locator('input[name="name"]').or(page.locator('input#event-name')).or(page.getByLabel(/event name/i));
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
    const data = await response.json();
    const createdEventId = data.eventId;
    expect(createdEventId).toBeTruthy();
    trackEventForCleanup(createdEventId);
    
    // Verify redirect to admin page with uppercase-only event ID
    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // Verify welcome bottom sheet appears (replaces the old toast notification)
    await expect(page.locator('[data-testid="welcome-bottom-sheet"]')).toBeVisible({ timeout: 5000 });

    // Verify the event state via API
    const token = await addAdminToEvent(createdEventId, 'creator@example.com');
    const stateResponse = await fetch(`${API_URL}/api/events/${createdEventId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(stateResponse.ok).toBe(true);
    const eventData = await stateResponse.json();
    expect(eventData.state).toBe('created');

    // Verify back button skips the create form (FR-004)
    await page.goBack();
    await expect(page).not.toHaveURL(/\/create-event/);

    // Cleanup
    await deleteTestEvent(createdEventId);
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
    
    // Check for validation error message
    const errorMessage = page.locator('#name-error').or(page.getByText(/can only contain letters, numbers, spaces, hyphens, and underscores/i));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Verify submit also shows error
    const createButton = page.getByRole('button', { name: /create event/i });
    await createButton.click();
    
    // Error should still be visible, no redirect occurred
    await expect(page).toHaveURL(/\/create-event/);
    
    // Now test that allowed special characters work (hyphens and underscores)
    await nameInput.clear();
    await nameInput.fill('Event-Name_With-Allowed_Chars');
    await nameInput.blur();
    
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
    const data = await response.json();
    const createdEventId = data.eventId;
    expect(createdEventId).toBeTruthy();
    trackEventForCleanup(createdEventId);

    expect(createdEventId).toMatch(/^[0-9A-HJ-NP-TV-Z]{8}$/);

    // Navigate to the event using a lowercase version of the ID
    const lowercaseId = createdEventId.toLowerCase();
    await page.goto(`${BASE_URL}/event/${lowercaseId}`);

    // The app should redirect to the canonical uppercase URL
    await page.waitForURL(new RegExp(`/event/${createdEventId}`), { timeout: 10000 });

    // Verify the URL contains the uppercase event ID
    expect(page.url()).toContain(`/event/${createdEventId}`);

    // Cleanup
    await deleteTestEvent(createdEventId);
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
    // Verify no validation error about invalid characters — the ID format is valid (8 alphanumeric)
    // Instead, expect a standard "not found" or redirect to email entry flow
    await expect(page.locator('body')).not.toContainText(/invalid.*character/i);

    // Should show event not found or prompt for email
    await expect(
      page.getByText(/not found/i).or(page.getByText(/enter.*email/i)).or(page.locator('input[type="email"]')).first()
    ).toBeVisible({ timeout: 10000 });
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
    const data1 = await firstResponse.json();
    const firstEventId = data1.eventId;
    expect(firstEventId).toBeTruthy();
    trackEventForCleanup(firstEventId);

    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // --- Navigate back to landing page ---
    await page.goto(BASE_URL);
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
    const data2 = await secondResponse.json();
    const secondEventId = data2.eventId;
    expect(secondEventId).toBeTruthy();
    trackEventForCleanup(secondEventId);

    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // Both events should have been created with distinct IDs
    expect(firstEventId).not.toBe(secondEventId);

    // Cleanup
    await deleteTestEvent(firstEventId);
    await deleteTestEvent(secondEventId);
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
    
    let postCount = 0;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/api/events') && !req.url().includes('/state')) {
        postCount++;
      }
    });

    const createButton = page.getByRole('button', { name: /create event/i });
    
    // Fire multiple clicks rapidly using force to bypass actionability checks
    // The component's isSubmitting state should prevent duplicate API calls
    await createButton.click();
    // Intentional: button may detach during navigation
    await createButton.click({ force: true }).catch(e => {
      if (!e.message.includes('Target closed') && !e.message.includes('detached')) throw e;
    });
    await createButton.click({ force: true }).catch(e => {
      if (!e.message.includes('Target closed') && !e.message.includes('detached')) throw e;
    });
    
    // Wait for the API response (only one should be made due to isSubmitting guard)
    const response = await responsePromise;
    expect(postCount).toBe(1);

    const data = await response.json();
    const createdEventId = data.eventId;
    expect(createdEventId).toBeTruthy();
    trackEventForCleanup(createdEventId);
    
    // Wait for single redirect to admin page with uppercase-only event ID
    await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

    // Clean up
    await deleteTestEvent(createdEventId);
  });
});
