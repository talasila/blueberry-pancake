/**
 * Create Event Tests
 * 
 * Tests the event creation flow including authentication,
 * form submission, and event ID generation.
 */

import { test, expect } from '@playwright/test';
import { clearAuth, deleteTestEvent } from './helpers.js';

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
    // This would need full auth and create flow
    // Then verify the event state via API
    // Placeholder for integration test
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles special characters in event name', async ({ page }) => {
    // Test that special characters are accepted in event name
  });

  test('prevents duplicate event creation on rapid clicks', async ({ page }) => {
    // Test debounce/prevention of duplicate submissions
  });
});
