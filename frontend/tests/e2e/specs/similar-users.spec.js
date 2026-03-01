/**
 * Similar Users Discovery Tests
 * 
 * Tests the similar users feature that allows users to discover
 * other participants with similar taste preferences.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  getUserToken,
  submitRating,
  startEvent,
  loginAsUserToEvent,
} from './helpers.js';

test.describe('Similar Users Discovery', () => {

  // ===================================
  // User Story 1 - Discover Similar Tastes
  // ===================================

  test('Find Similar Tastes button not visible with fewer than 3 ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, token);
    
    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    
    // Gate: wait for the main event page content to render before negative assertion
    await expect(page.getByText(/event has not started yet|tap a number/i)).toBeVisible({ timeout: 10000 });

    // Use the same locator as positive assertions to avoid false negatives
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarButton).not.toBeVisible({ timeout: 5000 });
  });

  test('Find Similar Tastes button appears after 3+ ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Get user token and submit 3 ratings via API
    const userEmail = 'rater@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    
    // Submit 3 ratings (rating scale is 1-4)
    await submitRating(eventId, userToken, 1, 4);
    await submitRating(eventId, userToken, 2, 3);
    await submitRating(eventId, userToken, 3, 4);
    
    await loginAsUserToEvent(page, eventId, userEmail, pin);
    
    // Find Similar Tastes button should now be visible
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarButton).toBeVisible({ timeout: 10000 });
  });

  test('clicking Find Similar Tastes opens drawer', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create user with 3+ ratings
    const userEmail = 'clicker@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRating(eventId, userToken, 1, 4);
    await submitRating(eventId, userToken, 2, 3);
    await submitRating(eventId, userToken, 3, 4);
    
    await loginAsUserToEvent(page, eventId, userEmail, pin);
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
  });

  test('shows "no similar users" message when no matches found', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create only one user with ratings (no other users to match)
    const userEmail = 'lonelyuser@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRating(eventId, userToken, 1, 4);
    await submitRating(eventId, userToken, 2, 3);
    await submitRating(eventId, userToken, 3, 4);
    
    await loginAsUserToEvent(page, eventId, userEmail, pin);
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should show "no similar users" message - scope to drawer
    const drawer = page.locator('[role="dialog"]');
    const noMatchMessage = drawer.getByText(/no similar users found/i);
    await expect(noMatchMessage).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 2 - Compare Ratings with Similar Users
  // ===================================

  test('similar users drawer shows users with overlapping ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create current user with ratings
    const currentUserEmail = 'currentuser@example.com';
    const currentUserToken = await getUserToken(eventId, currentUserEmail, pin);
    await submitRating(eventId, currentUserToken, 1, 4);
    await submitRating(eventId, currentUserToken, 2, 4);
    await submitRating(eventId, currentUserToken, 3, 4);
    
    // Create similar user with overlapping ratings (same items, similar scores)
    const similarUserEmail = 'similaruser@example.com';
    const similarUserToken = await getUserToken(eventId, similarUserEmail, pin);
    await submitRating(eventId, similarUserToken, 1, 4);
    await submitRating(eventId, similarUserToken, 2, 4);
    await submitRating(eventId, similarUserToken, 3, 4);
    
    await loginAsUserToEvent(page, eventId, currentUserEmail, pin);
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should show similar user in the list — scope to drawer
    const drawer = page.locator('[role="dialog"]');
    const similarUserEntry = drawer.getByText(similarUserEmail);
    await expect(similarUserEntry).toBeVisible({ timeout: 10000 });
  });

  test('displays similar users ranked by similarity score', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create current user with ratings
    const currentUserEmail = 'mainuser@example.com';
    const currentUserToken = await getUserToken(eventId, currentUserEmail, pin);
    await submitRating(eventId, currentUserToken, 1, 4);
    await submitRating(eventId, currentUserToken, 2, 4);
    await submitRating(eventId, currentUserToken, 3, 4);
    await submitRating(eventId, currentUserToken, 4, 4);
    
    // Create very similar user (identical ratings)
    const verySimilarEmail = 'verysimilar@example.com';
    const verySimilarToken = await getUserToken(eventId, verySimilarEmail, pin);
    await submitRating(eventId, verySimilarToken, 1, 4);
    await submitRating(eventId, verySimilarToken, 2, 4);
    await submitRating(eventId, verySimilarToken, 3, 4);
    await submitRating(eventId, verySimilarToken, 4, 4);
    
    // Create less similar user (different ratings)
    const lessSimilarEmail = 'lesssimilar@example.com';
    const lessSimilarToken = await getUserToken(eventId, lessSimilarEmail, pin);
    await submitRating(eventId, lessSimilarToken, 1, 1);
    await submitRating(eventId, lessSimilarToken, 2, 2);
    await submitRating(eventId, lessSimilarToken, 3, 1);
    await submitRating(eventId, lessSimilarToken, 4, 2);
    
    await loginAsUserToEvent(page, eventId, currentUserEmail, pin);
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Very similar user should appear (may be first due to higher similarity)
    const verySimilarEntry = page.getByText(verySimilarEmail);
    await expect(verySimilarEntry).toBeVisible({ timeout: 10000 });

    const drawer = page.locator('[role="dialog"]');
    const userEntries = drawer.locator('[data-testid="similar-user-entry"]')
      .or(drawer.locator('button').filter({ hasText: /@example\.com/ }));
    await expect(async () => {
      const allTexts = await userEntries.allTextContents();
      const veryIdx = allTexts.findIndex(t => t.includes(verySimilarEmail));
      const lessIdx = allTexts.findIndex(t => t.includes(lessSimilarEmail));
      expect(veryIdx).not.toBe(-1);
      expect(lessIdx).not.toBe(-1);
      expect(veryIdx).toBeLessThan(lessIdx);
    }).toPass({ timeout: 10000 });
  });

  test('shows user email in similar users list', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create current user
    const currentUserEmail = 'viewer@example.com';
    const currentUserToken = await getUserToken(eventId, currentUserEmail, pin);
    await submitRating(eventId, currentUserToken, 1, 4);
    await submitRating(eventId, currentUserToken, 2, 4);
    await submitRating(eventId, currentUserToken, 3, 4);
    
    // Create similar user (email should be displayed)
    const otherUserEmail = 'otheruser@example.com';
    const otherUserToken = await getUserToken(eventId, otherUserEmail, pin);
    await submitRating(eventId, otherUserToken, 1, 4);
    await submitRating(eventId, otherUserToken, 2, 4);
    await submitRating(eventId, otherUserToken, 3, 4);
    
    await loginAsUserToEvent(page, eventId, currentUserEmail, pin);
    
    // Click Find Similar Tastes
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should display the other user's email — scope to drawer
    const drawer = page.locator('[role="dialog"]');
    const userEmailDisplay = drawer.getByText(otherUserEmail);
    await expect(userEmailDisplay).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('feature not available when event is in created state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(eventId, adminEmail);
    
    // Event stays in created state (not started)
    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    
    // Gate: wait for the main event page content to render before negative assertion
    await expect(page.getByText(/event has not started yet/i)).toBeVisible({ timeout: 10000 });

    // Similar users button should NOT be visible (event not started)
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarButton).not.toBeVisible({ timeout: 5000 });
  });

  test('handles users with no overlapping ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create current user rating items 1, 2, 3
    const currentUserEmail = 'user1@example.com';
    const currentUserToken = await getUserToken(eventId, currentUserEmail, pin);
    await submitRating(eventId, currentUserToken, 1, 4);
    await submitRating(eventId, currentUserToken, 2, 4);
    await submitRating(eventId, currentUserToken, 3, 4);
    
    // Create other user rating completely different items (4, 5, 6) - no overlap
    const otherUserEmail = 'user2@example.com';
    const otherUserToken = await getUserToken(eventId, otherUserEmail, pin);
    await submitRating(eventId, otherUserToken, 4, 4);
    await submitRating(eventId, otherUserToken, 5, 4);
    await submitRating(eventId, otherUserToken, 6, 4);
    
    await loginAsUserToEvent(page, eventId, currentUserEmail, pin);
    
    // Click Find Similar Tastes
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should show no similar users (no overlapping items) - scope to drawer
    const drawer = page.locator('[role="dialog"]');
    const noMatchMessage = drawer.getByText(/no similar users found/i);
    await expect(noMatchMessage).toBeVisible({ timeout: 10000 });
  });

  test('close button closes the similar users drawer', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create user with ratings
    const userEmail = 'closetest@example.com';
    const userToken = await getUserToken(eventId, userEmail, pin);
    await submitRating(eventId, userToken, 1, 4);
    await submitRating(eventId, userToken, 2, 3);
    await submitRating(eventId, userToken, 3, 4);
    
    await loginAsUserToEvent(page, eventId, userEmail, pin);
    
    // Click Find Similar Tastes button to open drawer
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Wait for drawer to open
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    
    // Click close button
    const closeButton = drawer.getByRole('button', { name: /close/i });
    await closeButton.click();
    
    // Implementation-coupled: the drawer uses CSS transform to hide, so Playwright's
    // not.toBeVisible() doesn't work reliably. Checking aria-hidden is the
    // most reliable signal that the drawer has closed.
    await expect(drawer).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
  });

  test('clicking on a similar user opens detail drawer with appropriate sections', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await startEvent(eventId, adminToken);
    
    // Create current user with ratings
    const currentUserEmail = 'detailviewer@example.com';
    const currentUserToken = await getUserToken(eventId, currentUserEmail, pin);
    await submitRating(eventId, currentUserToken, 1, 4);
    await submitRating(eventId, currentUserToken, 2, 3);
    await submitRating(eventId, currentUserToken, 3, 4);
    await submitRating(eventId, currentUserToken, 4, 2);
    
    // Create similar user with overlapping ratings
    const similarUserEmail = 'matcheduser@example.com';
    const similarUserToken = await getUserToken(eventId, similarUserEmail, pin);
    await submitRating(eventId, similarUserToken, 1, 4);
    await submitRating(eventId, similarUserToken, 2, 3);
    await submitRating(eventId, similarUserToken, 3, 4);
    await submitRating(eventId, similarUserToken, 4, 2);
    
    await loginAsUserToEvent(page, eventId, currentUserEmail, pin);
    
    // Click Similar Tastes button to open the list
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Wait for drawer to load and show the similar user - use button role for specificity
    const similarUserButton = page.getByRole('button', { name: new RegExp(similarUserEmail, 'i') });
    await expect(similarUserButton).toBeVisible({ timeout: 10000 });
    
    // Click on the similar user to open detail drawer
    await similarUserButton.click();
    
    // Verify detail drawer opens with appropriate sections
    // Check for user identification (heading with email)
    const detailHeading = page.getByRole('heading', { name: similarUserEmail });
    await expect(detailHeading).toBeVisible({ timeout: 5000 });
    
    // Check for similarity score percentage
    const similarityScore = page.getByText(/taste similarity.*\d+%/i);
    await expect(similarityScore).toBeVisible({ timeout: 5000 });
    
    // Check for common bottles info
    const commonBottles = page.getByText(/common bottles/i);
    await expect(commonBottles.first()).toBeVisible({ timeout: 5000 });
    
    // Check for rating comparison table
    const ratingTable = page.getByRole('table');
    await expect(ratingTable).toBeVisible({ timeout: 5000 });
  });
});
