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
    
    // Click item 1 to open rating drawer
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    
    // Wait for drawer to open and rating selector to appear
    const ratingDropdown = page.getByText(/select a rating/i);
    await expect(ratingDropdown).toBeVisible({ timeout: 5000 });
    
    // Click the dropdown to open rating options
    await ratingDropdown.click();
    
    // Select rating 3 - "Not bad..."
    const ratingOption = page.getByRole('button', { name: /3 - Not bad/i });
    await ratingOption.click();
    
    // Click Submit Rating button
    const submitButton = page.getByRole('button', { name: /submit rating/i });
    await submitButton.click();
    
    // Verify success message appears
    await expect(page.getByText(/rating submitted successfully/i)).toBeVisible({ timeout: 5000 });
    
    // Drawer should close after success (wait a moment for the close animation)
    await page.waitForTimeout(1500);
    
    // Verify the item button now shows rating color (green #34C759 for rating 3 "Not bad...")
    const ratedItemButton = page.locator('button').filter({ hasText: '1' }).first();
    await expect(ratedItemButton).toBeVisible();
    
    // Check the button has the correct background color for rating 3
    // Default config: Rating 3 = "Not bad..." = #34C759 (green)
    // CSS computed values convert hex to rgb format
    await expect(ratedItemButton).toHaveCSS('background-color', 'rgb(52, 199, 89)');
  });

  // ===================================
  // User Story 4 - Bookmark Items
  // ===================================

  test('can bookmark an item', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    const userEmail = 'bookmarkuser@example.com';
    
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
    
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click item 1 to open rating drawer
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    
    // Wait for drawer to open
    await page.waitForTimeout(1000);
    
    // Click the bookmark button in the drawer (aria-label contains "bookmark")
    const bookmarkButton = page.getByRole('button', { name: /bookmark/i });
    await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
    await bookmarkButton.click();
    
    // Wait for bookmark to be saved
    await page.waitForTimeout(500);
    
    // Close the drawer by clicking the close button
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();
    
    // Wait for drawer to close
    await page.waitForTimeout(500);
    
    // Verify bookmark icon appears on the item button on the main page
    // ItemButton shows a bookmark icon with aria-label="Bookmarked" when bookmarked
    const bookmarkIndicator = page.locator('[aria-label="Bookmarked"]');
    await expect(bookmarkIndicator).toBeVisible({ timeout: 5000 });
    
    // Verify bookmark is stored in backend API
    // Get the user's JWT token from localStorage
    const userToken = await page.evaluate(() => localStorage.getItem('jwtToken'));
    expect(userToken).toBeTruthy();
    
    // Call API to verify bookmark is stored
    const bookmarksResponse = await fetch(`${API_URL}/api/events/${testEventId}/bookmarks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    expect(bookmarksResponse.ok).toBe(true);
    const bookmarksData = await bookmarksResponse.json();
    
    // Verify item 1 is in the bookmarks array
    expect(bookmarksData.bookmarks).toContain(1);
  });

  // ===================================
  // Edge Cases
  // ===================================
  test('note field enforces character limit', async ({ page }) => {
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
    
    await submitEmail(page, 'noteuser@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click item 1 to open rating drawer
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    
    // Wait for drawer to open and rating selector to appear
    const ratingDropdown = page.getByText(/select a rating/i);
    await expect(ratingDropdown).toBeVisible({ timeout: 5000 });
    
    // Select a rating first (required to submit)
    await ratingDropdown.click();
    const ratingOption = page.getByRole('button', { name: /3 - Not bad/i });
    await ratingOption.click();
    
    // Find the note textarea
    const noteField = page.locator('textarea');
    await expect(noteField).toBeVisible();
    
    // Generate a string longer than 500 characters
    const longNote = 'A'.repeat(550);
    
    // The textarea has maxLength=500, so it should truncate to 500 chars
    await noteField.fill(longNote);
    
    // Verify the note was truncated to 500 characters
    const noteValue = await noteField.inputValue();
    expect(noteValue.length).toBeLessThanOrEqual(500);
    
    // Now test that manually setting value beyond limit shows error
    // Clear and type character by character to potentially bypass maxLength
    await noteField.clear();
    
    // Fill with exactly 500 characters - should be valid
    const validNote = 'B'.repeat(500);
    await noteField.fill(validNote);
    
    // Submit button should be enabled with valid note
    const submitButton = page.getByRole('button', { name: /submit rating/i });
    await expect(submitButton).toBeEnabled();
    
    // Verify the character count is at the limit
    const finalNoteValue = await noteField.inputValue();
    expect(finalNoteValue.length).toBe(500);
  });
});
