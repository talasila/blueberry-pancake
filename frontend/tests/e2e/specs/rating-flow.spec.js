/**
 * Rating Flow Tests
 * 
 * Tests the item rating functionality including viewing items,
 * submitting ratings, and bookmark management.
 */

import { test, expect } from './fixtures.js';
import {
  BASE_URL,
  API_URL,
  addAdminToEvent,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
  startEvent,
} from './helpers.js';

test.describe('Rating Flow', () => {

  // ===================================
  // User Story 1 - View and Access Items
  // ===================================

  test('displays item buttons on event page', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should see item buttons
    // Look for item buttons (numbered 1, 2, 3, etc.)
    const itemButton = page.locator('button').filter({ hasText: /^1$/ });
    await expect(itemButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking item button opens drawer', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Click on item 1
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
    await itemButton.click();
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.first()).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Rate Items (Started Event)
  // ===================================

  test('shows rating interface when event is started', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    // First, start the event as admin
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await startEvent(eventId, token);
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Click item button
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
    await itemButton.click();
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    const ratingControl = drawer.locator('[role="slider"]')
      .or(drawer.locator('input[type="range"]'))
      .or(drawer.getByText(/select a rating/i));
    
    await expect(ratingControl.first()).toBeVisible({ timeout: 5000 });
  });

  test('can submit rating for an item', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await startEvent(eventId, token);
    
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'rater@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Click item 1 to open rating drawer
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
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
    
    // The drawer hides via CSS transform (translateY) rather than display:none, so
    // Playwright's not.toBeVisible() still considers it visible. We check aria-hidden instead.
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('aria-hidden', 'true', { timeout: 10000 });
    
    // Verify the item button now shows rating color (green #34C759 for rating 3 "Not bad...")
    const ratedItemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
    await expect(ratedItemButton).toBeVisible();
    
    // Theme-dependent: rating 3 maps to green. If this assertion fails due to
    // a theme change, update the expected RGB value to match the new palette.
    await expect(ratedItemButton).toHaveCSS('background-color', 'rgb(52, 199, 89)');
  });

  // Note: User Story 3 (View Ratings) is covered in dashboard.spec.js

  // ===================================
  // User Story 4 - Bookmark Items
  // ===================================

  test('can bookmark an item', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    const userEmail = 'bookmarkuser@example.com';
    
    await startEvent(eventId, token);
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, pin);
    
    // Click item 1 to open rating drawer
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
    await itemButton.click();
    
    // Click the bookmark button in the drawer (aria-label contains "bookmark")
    const bookmarkButton = page.getByRole('button', { name: /bookmark/i });
    await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
    await bookmarkButton.click();
    
    // Close the drawer by clicking the close button
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();
    
    // Verify bookmark icon appears on the item button on the main page
    // ItemButton shows a bookmark icon with aria-label="Bookmarked" when bookmarked
    const bookmarkIndicator = page.locator('[aria-label="Bookmarked"]');
    await expect(bookmarkIndicator).toBeVisible({ timeout: 5000 });
    
    // Verify bookmark is stored in backend API
    // Get JWT from the httpOnly cookie via Playwright
    const cookies = await page.context().cookies();
    const jwtCookie = cookies.find(c => c.name === 'jwt_token');
    expect(jwtCookie).toBeTruthy();
    
    // Call API to verify bookmark is stored
    const bookmarksResponse = await fetch(`${API_URL}/api/events/${eventId}/bookmarks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtCookie.value}`
      },
      signal: AbortSignal.timeout(10000),
    });
    
    expect(bookmarksResponse.ok).toBe(true);
    const bookmarksData = await bookmarksResponse.json();
    
    // Verify item 1 is in the bookmarks array
    expect(bookmarksData.bookmarks).toContain(1);
  });

  // ===================================
  // Edge Cases
  // ===================================
  test('note field enforces character limit', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await startEvent(eventId, token);
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    await submitEmail(page, 'noteuser@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Click item 1 to open rating drawer
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
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
    
    // Verify exactly 500 characters (the limit) is accepted
    await noteField.clear();
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
