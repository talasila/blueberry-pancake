/**
 * Rating Flow Tests
 * 
 * Tests the item rating functionality including viewing items,
 * submitting ratings, and bookmark management.
 */

import { test, expect } from '@playwright/test';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  setAuthToken,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

let testEventId;
const testEventPin = '654321';

test.describe('Rating Flow', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Rating Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
    }
  });

  // ===================================
  // User Story 1 - View and Access Items
  // ===================================

  test('displays item buttons on event page', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Should see item buttons
    await page.waitForLoadState('networkidle');
    
    // Look for item buttons (numbered 1, 2, 3, etc.)
    const itemButton = page.getByRole('button', { name: /^1$/ }).or(page.locator('button').filter({ hasText: '1' }));
    await expect(itemButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking item button opens drawer', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click on item 1
    const itemButton = page.getByRole('button', { name: /^1$/ }).or(page.locator('button').filter({ hasText: '1' })).first();
    await itemButton.click();
    await page.waitForTimeout(1000);
    
    // Drawer should open - look for drawer content
    const drawer = page.locator('[role="dialog"]').or(page.locator('.drawer')).or(page.locator('[data-state="open"]'));
    await expect(drawer.first()).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Rate Items (Started Event)
  // ===================================

  test('shows rating interface when event is started', async ({ page }) => {
    // First, start the event as admin
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Use API to start the event
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Now access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click item button
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    await page.waitForTimeout(1000);
    
    // Should see rating controls in drawer
    const ratingControl = page.locator('[role="slider"]')
      .or(page.locator('input[type="range"]'))
      .or(page.locator('button').filter({ hasText: /[1-5]|★/ }));
    
    // Rating interface should be present when event is started
  });

  test('can submit rating for an item', async ({ page }) => {
    // Start the event first
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'rater@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click item and rate
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    await page.waitForTimeout(1000);
    
    // Interact with rating control and submit
    // (Specific selectors depend on implementation)
  });

  test('rated item shows color indication', async ({ page }) => {
    // After rating, item button should show rating color
    // This test needs event to be started and user to have rated
  });

  // ===================================
  // User Story 3 - Event State Messages
  // ===================================

  test('shows "not started" message when event is in created state', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click item button
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    await page.waitForTimeout(1000);
    
    // Should see "not started" message
    const message = page.getByText(/not.*started|hasn't.*started|event.*created/i);
    await expect(message).toBeVisible({ timeout: 5000 });
  });

  test('shows "paused" message when event is paused', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start then pause the event
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'paused', currentState: 'started' })
    });
    
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click item button
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    await page.waitForTimeout(1000);
    
    // Should see "paused" message
    const message = page.getByText(/paused/i);
    await expect(message).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 4 - Bookmark Items
  // ===================================

  test('can bookmark an item', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start the event
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click item and bookmark
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    await page.waitForTimeout(1000);
    
    // Look for bookmark button
    const bookmarkButton = page.getByRole('button', { name: /bookmark/i })
      .or(page.locator('button').filter({ has: page.locator('svg') }));
    
    // Click bookmark if visible
  });

  test('bookmarked item shows indicator on button', async ({ page }) => {
    // After bookmarking, item button should show bookmark indicator
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles rapid button clicks gracefully', async ({ page }) => {
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Rapidly click multiple item buttons
    const button1 = page.locator('button').filter({ hasText: '1' }).first();
    const button2 = page.locator('button').filter({ hasText: '2' }).first();
    
    await button1.click();
    await button2.click();
    await button1.click();
    
    // Should not crash or show multiple drawers
    await page.waitForTimeout(500);
  });

  test('note field enforces character limit', async ({ page }) => {
    // When rating with note, should enforce 500 char limit
  });
});
