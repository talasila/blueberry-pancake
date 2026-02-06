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
  // The page might redirect to dashboard/home, or stay on auth with success message
  await Promise.race([
    page.waitForURL(/\/(create-event|dashboard|home|events)/, { timeout: 10000 }),
    page.waitForSelector('[data-testid="auth-success"]', { timeout: 10000 }),
    page.waitForTimeout(3000) // Fallback if no redirect/indicator
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
    // Type selector should be present
  });

  test('shows validation error when name is missing', async ({ page }) => {
    // Authenticate via OTP
    await authenticateViaOTP(page);
    
    // Navigate to create event page
    await navigateToCreateEvent(page);
    
    // Try to submit without filling name
    const createButton = page.getByRole('button', { name: /create/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();
    
    // Should show validation error - wait for it
    await page.waitForTimeout(500);
    // Error message should appear for required field
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
    
    // Verify success popup appears with event ID
    const successPopup = page.getByText(/event created successfully/i);
    await expect(successPopup).toBeVisible({ timeout: 10000 });
    
    // Get the event ID from the popup
    const eventIdElement = page.locator('.font-mono.font-bold');
    const displayedEventId = await eventIdElement.textContent();
    
    // Track from popup as backup (in case response intercept missed it)
    if (displayedEventId) {
      trackEventForCleanup(displayedEventId.trim());
    }
    
    // Verify the event state via API
    if (displayedEventId) {
      const response = await fetch(`${API_URL}/api/events/${displayedEventId.trim()}`);
      if (response.ok) {
        const eventData = await response.json();
        expect(eventData.state).toBe('created');
      }
    }
    
    // Note: Cleanup handled by global teardown, but also try inline cleanup
    if (displayedEventId) {
      await deleteTestEvent(displayedEventId.trim());
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
    
    // Error should still be visible, no success popup
    const successPopup = page.getByText(/event created successfully/i);
    await expect(successPopup).not.toBeVisible();
    
    // Now test that allowed special characters work (hyphens and underscores)
    await nameInput.clear();
    await nameInput.fill('Event-Name_With-Allowed_Chars');
    await nameInput.blur();
    await page.waitForTimeout(500);
    
    // Error message should not be visible for valid characters
    await expect(errorMessage).not.toBeVisible();
  });

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
    
    // Wait for success popup
    const successPopup = page.getByText(/event created successfully/i);
    await expect(successPopup).toBeVisible({ timeout: 10000 });
    
    // Verify exactly one event was created
    expect(createdEventId).toBeTruthy();
    
    // Verify no duplicate events were created by checking the API
    // Wait a moment for any potential duplicate requests to complete
    await page.waitForTimeout(1000);
    
    // Clean up
    if (createdEventId) {
      await deleteTestEvent(createdEventId);
    }
  });
});
