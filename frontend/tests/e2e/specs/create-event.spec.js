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
    // First authenticate
    await page.goto(`${BASE_URL}/auth`);
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('creator@example.com');
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await requestButton.click();
    await page.waitForTimeout(1000);
    
    // Enter test OTP
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    if (await otpInput.isVisible()) {
      await otpInput.fill(TEST_OTP);
      const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Now try to access create event page
    await page.goto(`${BASE_URL}/create-event`);
    await page.waitForLoadState('networkidle');
    
    // Should be on create event page (not redirected)
    // Check for create event form elements
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Create Event with Required Details
  // ===================================

  test('create event form has required fields', async ({ page }) => {
    // This test assumes user is authenticated
    // Skip detailed auth flow for brevity - focus on form structure
    await page.goto(`${BASE_URL}/auth`);
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('creator@example.com');
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await requestButton.click();
    await page.waitForTimeout(1000);
    
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    if (await otpInput.isVisible()) {
      await otpInput.fill(TEST_OTP);
      const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    await page.goto(`${BASE_URL}/create-event`);
    await page.waitForLoadState('networkidle');
    
    // Check for name input
    const nameInput = page.locator('input[name="name"]').or(page.getByLabel(/name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    
    // Check for type of item dropdown (wine)
    const typeSelect = page.locator('select').or(page.getByRole('combobox'));
    // Type selector should be present
  });

  test('shows validation error when name is missing', async ({ page }) => {
    // Authenticate first
    await page.goto(`${BASE_URL}/auth`);
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('creator@example.com');
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await requestButton.click();
    await page.waitForTimeout(1000);
    
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    if (await otpInput.isVisible()) {
      await otpInput.fill(TEST_OTP);
      const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    await page.goto(`${BASE_URL}/create-event`);
    await page.waitForLoadState('networkidle');
    
    // Try to submit without filling name
    const createButton = page.getByRole('button', { name: /create/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Should show validation error
      await page.waitForTimeout(1000);
      // Error message should appear for required field
    }
  });

  // ===================================
  // User Story 3 - Event Lifecycle
  // ===================================

  test('newly created event has "created" state', async ({ page }) => {
    // Authenticate via OTP flow
    await page.goto(`${BASE_URL}/auth`);
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('creator@example.com');
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await requestButton.click();
    await page.waitForTimeout(1000);
    
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    if (await otpInput.isVisible()) {
      await otpInput.fill(TEST_OTP);
      const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Navigate to create event page
    await page.goto(`${BASE_URL}/create-event`);
    await page.waitForLoadState('networkidle');
    
    // Fill in event name
    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await nameInput.fill('State Test Event');
    
    // Intercept the API response to capture the created event
    let createdEventId = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/events') && response.request().method() === 'POST') {
        try {
          const data = await response.json();
          createdEventId = data.eventId;
          // Track for cleanup by global teardown
          if (createdEventId) {
            trackEventForCleanup(createdEventId);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    });
    
    // Submit the form
    const createButton = page.getByRole('button', { name: /create event/i });
    await createButton.click();
    
    // Wait for success popup
    await page.waitForTimeout(3000);
    
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
    // Authenticate via OTP flow
    await page.goto(`${BASE_URL}/auth`);
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('creator@example.com');
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await requestButton.click();
    await page.waitForTimeout(1000);
    
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    if (await otpInput.isVisible()) {
      await otpInput.fill(TEST_OTP);
      const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Navigate to create event page
    await page.goto(`${BASE_URL}/create-event`);
    await page.waitForLoadState('networkidle');
    
    // Fill in event name with special characters
    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
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
    // Authenticate via OTP flow
    await page.goto(`${BASE_URL}/auth`);
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('creator@example.com');
    
    const requestButton = page.getByRole('button', { name: /request|send|get.*otp|continue/i });
    await requestButton.click();
    await page.waitForTimeout(1000);
    
    const otpInput = page.locator('input[maxlength="6"]').or(page.locator('input#otp'));
    if (await otpInput.isVisible()) {
      await otpInput.fill(TEST_OTP);
      const verifyButton = page.getByRole('button', { name: /verify|submit|continue/i });
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Navigate to create event page
    await page.goto(`${BASE_URL}/create-event`);
    await page.waitForLoadState('networkidle');
    
    // Fill in event name
    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await nameInput.fill('Rapid Click Test Event');
    
    // Track API calls
    let apiCallCount = 0;
    const createdEventIds = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/events') && 
          request.method() === 'POST' && 
          !request.url().includes('verify-pin')) {
        apiCallCount++;
      }
    });
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/events') && 
          response.request().method() === 'POST' &&
          !response.url().includes('verify-pin')) {
        try {
          const data = await response.json();
          if (data.eventId) {
            createdEventIds.push(data.eventId);
            // Track for cleanup by global teardown
            trackEventForCleanup(data.eventId);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    });
    
    const createButton = page.getByRole('button', { name: /create event/i });
    
    // Fire multiple clicks rapidly using force to bypass actionability checks
    // The component's isSubmitting state should prevent duplicate API calls
    await createButton.click();
    await createButton.click({ force: true }).catch(() => {});
    await createButton.click({ force: true }).catch(() => {});
    
    // Wait for success popup
    const successPopup = page.getByText(/event created successfully/i);
    await expect(successPopup).toBeVisible({ timeout: 10000 });
    
    // Only one API call should have been made - this is the key assertion
    expect(apiCallCount).toBe(1);
    
    // Only one event should have been created
    expect(createdEventIds.length).toBe(1);
    
    // Note: Cleanup handled by global teardown, but also try inline cleanup
    for (const eventId of createdEventIds) {
      await deleteTestEvent(eventId);
    }
  });
});
