/**
 * Landing Page Tests
 * 
 * Tests the landing page interface including join event, create event,
 * and navigation functionality.
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, createTestEvent, deleteTestEvent, addAdminToEvent, setAuthToken } from './helpers.js';
import { DEFAULT_TEST_PIN } from '../e2e-config.js';

test.describe('Landing Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // ===================================
  // User Story 1 - Join Event Interface
  // ===================================

  test('displays event ID input field and Join button', async ({ page }) => {
    // Event ID input should be visible
    const eventIdInput = page.locator('input#event-id');
    await expect(eventIdInput).toBeVisible();
    
    // Join button should be visible
    const joinButton = page.getByRole('button', { name: /join/i });
    await expect(joinButton).toBeVisible();
  });

  test('allows typing in event ID field', async ({ page }) => {
    const eventIdInput = page.locator('input#event-id');
    await eventIdInput.fill('TEST1234');
    
    await expect(eventIdInput).toHaveValue('TEST1234');
  });

  test('Join button is disabled when event ID is empty', async ({ page }) => {
    const joinButton = page.getByRole('button', { name: /join/i });
    await expect(joinButton).toBeDisabled();
  });

  test('Join button is enabled when event ID is entered', async ({ page }) => {
    const eventIdInput = page.locator('input#event-id');
    await eventIdInput.fill('TEST1234');
    
    const joinButton = page.getByRole('button', { name: /join/i });
    await expect(joinButton).toBeEnabled();
  });

  test('clicking Join navigates to event page', async ({ page }) => {
    const eventIdInput = page.locator('input#event-id');
    await eventIdInput.fill('TEST1234');
    
    const joinButton = page.getByRole('button', { name: /join/i });
    await joinButton.click();
    
    // Should navigate to event page (will redirect to email entry)
    await expect(page).toHaveURL(/\/event\/TEST1234/);
  });

  // ===================================
  // User Story 2 - Create Event Interface
  // ===================================

  test('displays Create button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create/i });
    await expect(createButton).toBeVisible();
  });

  test('clicking Create navigates to auth page', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create/i });
    await createButton.click();
    
    // Should navigate to auth page for OTP authentication
    await expect(page).toHaveURL(/\/auth/);
  });

  // ===================================
  // Edge Cases
  // ===================================

  // Verifies the input field accepts long text without crashing or truncating.
  // Does not test app behavior (e.g. validation or error) for oversized event IDs.
  test('handles long event ID input', async ({ page }) => {
    const eventIdInput = page.locator('input#event-id');
    const longText = 'A'.repeat(100);
    await eventIdInput.fill(longText);
    
    // Input should accept the text
    await expect(eventIdInput).toHaveValue(longText);
  });

  test('page is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // All main elements should still be visible
    const eventIdInput = page.locator('input#event-id');
    const joinButton = page.getByRole('button', { name: /join/i });
    const createButton = page.getByRole('button', { name: /create/i });
    
    await expect(eventIdInput).toBeVisible();
    await expect(joinButton).toBeVisible();
    await expect(createButton).toBeVisible();
  });

});

// Tests in this describe share mutable `eventId`/`token` state via beforeEach/afterEach.
// Playwright runs tests within a describe block serially by default, so this is safe.
test.describe('Landing Page - Authenticated User', () => {
  const adminEmail = 'landing-auth@example.com';
  let eventId;
  let token;

  test.beforeEach(async ({ page }) => {
    eventId = await createTestEvent('Landing Auth Test', DEFAULT_TEST_PIN);
    token = await addAdminToEvent(eventId, adminEmail);
    await setAuthToken(page, token, adminEmail);
  });

  test.afterEach(async () => {
    if (eventId) {
      await deleteTestEvent(eventId);
      eventId = null;
    }
  });

  test('clicking Create navigates directly to create-event when authenticated', async ({ page }) => {
    await page.goto(BASE_URL);

    const createButton = page.getByRole('button', { name: /create/i });
    await createButton.click();

    await expect(page).toHaveURL(/\/create-event/, { timeout: 5000 });

    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('clicking My Events navigates directly to my-events when authenticated', async ({ page }) => {
    await page.goto(BASE_URL);

    const myEventsButton = page.getByRole('button', { name: /my events|view my events/i });
    await myEventsButton.click();

    await expect(page).toHaveURL(/\/my-events/, { timeout: 5000 });

    await expect(page.getByText('My Events')).toBeVisible({ timeout: 5000 });
  });
});
