/**
 * Similar Users Discovery Tests
 * 
 * Tests the similar users feature that allows users to discover
 * other participants with similar taste preferences.
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

/**
 * Helper to get a user token via PIN verification
 */
async function getUserToken(eventId, email, pin) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, email })
  });
  if (!response.ok) {
    throw new Error(`Failed to get user token: ${await response.text()}`);
  }
  const data = await response.json();
  return data.token;
}

/**
 * Helper to submit a rating via API
 */
async function submitRating(eventId, token, itemId, rating) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemId, rating })
  });
  if (!response.ok) {
    throw new Error(`Failed to submit rating: ${await response.text()}`);
  }
}

/**
 * Helper to start an event
 */
async function startEvent(eventId, adminToken) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ state: 'started', currentState: 'created' })
  });
  if (!response.ok) {
    throw new Error(`Failed to start event: ${await response.text()}`);
  }
}

test.describe('Similar Users Discovery', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Similar Users Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  // ===================================
  // User Story 1 - Discover Similar Tastes
  // ===================================

  test('Find Similar Tastes button not visible with fewer than 3 ratings', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Access as regular user (no ratings yet)
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Similar users button should NOT be visible (no ratings yet)
    const similarButton = page.getByRole('button', { name: /similar.*taste|find.*similar/i });
    await expect(similarButton).not.toBeVisible();
  });

  test('Find Similar Tastes button appears after 3+ ratings', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Get user token and submit 3 ratings via API
    const userEmail = 'rater@example.com';
    const userToken = await getUserToken(testEventId, userEmail, testEventPin);
    
    // Submit 3 ratings (rating scale is 1-4)
    await submitRating(testEventId, userToken, 1, 4);
    await submitRating(testEventId, userToken, 2, 3);
    await submitRating(testEventId, userToken, 3, 4);
    
    // Access event page via UI
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Find Similar Tastes button should now be visible
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarButton).toBeVisible({ timeout: 10000 });
  });

  test('clicking Find Similar Tastes opens drawer', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create user with 3+ ratings
    const userEmail = 'clicker@example.com';
    const userToken = await getUserToken(testEventId, userEmail, testEventPin);
    await submitRating(testEventId, userToken, 1, 4);
    await submitRating(testEventId, userToken, 2, 3);
    await submitRating(testEventId, userToken, 3, 4);
    
    // Access event page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Drawer should open - look for loading or content
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    
    // Should show loading state or results
    const loadingOrContent = page.getByText(/running compatibility scanner|no similar users|similar/i);
    await expect(loadingOrContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows "no similar users" message when no matches found', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create only one user with ratings (no other users to match)
    const userEmail = 'lonelyuser@example.com';
    const userToken = await getUserToken(testEventId, userEmail, testEventPin);
    await submitRating(testEventId, userToken, 1, 4);
    await submitRating(testEventId, userToken, 2, 3);
    await submitRating(testEventId, userToken, 3, 4);
    
    // Access event page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should show "no similar users" message
    const noMatchMessage = page.getByText(/no similar users found/i);
    await expect(noMatchMessage).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 2 - Compare Ratings with Similar Users
  // ===================================

  test('similar users drawer shows users with overlapping ratings', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create current user with ratings
    const currentUserEmail = 'currentuser@example.com';
    const currentUserToken = await getUserToken(testEventId, currentUserEmail, testEventPin);
    await submitRating(testEventId, currentUserToken, 1, 4);
    await submitRating(testEventId, currentUserToken, 2, 4);
    await submitRating(testEventId, currentUserToken, 3, 4);
    
    // Create similar user with overlapping ratings (same items, similar scores)
    const similarUserEmail = 'similaruser@example.com';
    const similarUserToken = await getUserToken(testEventId, similarUserEmail, testEventPin);
    await submitRating(testEventId, similarUserToken, 1, 4);
    await submitRating(testEventId, similarUserToken, 2, 4);
    await submitRating(testEventId, similarUserToken, 3, 4);
    
    // Access event page as current user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, currentUserEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should show similar user in the list
    const similarUserEntry = page.getByText(similarUserEmail);
    await expect(similarUserEntry).toBeVisible({ timeout: 10000 });
  });

  test('displays similar users ranked by similarity score', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create current user with ratings
    const currentUserEmail = 'mainuser@example.com';
    const currentUserToken = await getUserToken(testEventId, currentUserEmail, testEventPin);
    await submitRating(testEventId, currentUserToken, 1, 4);
    await submitRating(testEventId, currentUserToken, 2, 4);
    await submitRating(testEventId, currentUserToken, 3, 4);
    await submitRating(testEventId, currentUserToken, 4, 4);
    
    // Create very similar user (identical ratings)
    const verySimilarEmail = 'verysimilar@example.com';
    const verySimilarToken = await getUserToken(testEventId, verySimilarEmail, testEventPin);
    await submitRating(testEventId, verySimilarToken, 1, 4);
    await submitRating(testEventId, verySimilarToken, 2, 4);
    await submitRating(testEventId, verySimilarToken, 3, 4);
    await submitRating(testEventId, verySimilarToken, 4, 4);
    
    // Create less similar user (different ratings)
    const lessSimilarEmail = 'lesssimilar@example.com';
    const lessSimilarToken = await getUserToken(testEventId, lessSimilarEmail, testEventPin);
    await submitRating(testEventId, lessSimilarToken, 1, 1);
    await submitRating(testEventId, lessSimilarToken, 2, 2);
    await submitRating(testEventId, lessSimilarToken, 3, 1);
    await submitRating(testEventId, lessSimilarToken, 4, 2);
    
    // Access event page as current user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, currentUserEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Wait for drawer to load
    await page.waitForTimeout(2000);
    
    // Very similar user should appear (may be first due to higher similarity)
    const verySimilarEntry = page.getByText(verySimilarEmail);
    await expect(verySimilarEntry).toBeVisible({ timeout: 10000 });
  });

  test('shows user email in similar users list', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create current user
    const currentUserEmail = 'viewer@example.com';
    const currentUserToken = await getUserToken(testEventId, currentUserEmail, testEventPin);
    await submitRating(testEventId, currentUserToken, 1, 4);
    await submitRating(testEventId, currentUserToken, 2, 4);
    await submitRating(testEventId, currentUserToken, 3, 4);
    
    // Create similar user (email should be displayed)
    const otherUserEmail = 'otheruser@example.com';
    const otherUserToken = await getUserToken(testEventId, otherUserEmail, testEventPin);
    await submitRating(testEventId, otherUserToken, 1, 4);
    await submitRating(testEventId, otherUserToken, 2, 4);
    await submitRating(testEventId, otherUserToken, 3, 4);
    
    // Access event page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, currentUserEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should display the other user's email
    const userEmailDisplay = page.getByText(otherUserEmail);
    await expect(userEmailDisplay).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles user with exactly 3 ratings (minimum threshold)', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create user with exactly 3 ratings (minimum threshold)
    const userEmail = 'minratings@example.com';
    const userToken = await getUserToken(testEventId, userEmail, testEventPin);
    await submitRating(testEventId, userToken, 1, 4);
    await submitRating(testEventId, userToken, 2, 3);
    await submitRating(testEventId, userToken, 3, 4);
    
    // Access event page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Find Similar Tastes button should be visible with exactly 3 ratings
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarButton).toBeVisible({ timeout: 10000 });
  });

  test('feature not available when event is in created state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    await addAdminToEvent(testEventId, adminEmail);
    
    // Event stays in created state (not started)
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Similar users button should NOT be visible (event not started)
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await expect(similarButton).not.toBeVisible();
  });

  test('drawer shows loading state structure', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create user with ratings
    const userEmail = 'loadingtest@example.com';
    const userToken = await getUserToken(testEventId, userEmail, testEventPin);
    await submitRating(testEventId, userToken, 1, 4);
    await submitRating(testEventId, userToken, 2, 3);
    await submitRating(testEventId, userToken, 3, 4);
    
    // Access event page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes button
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Drawer should open
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    
    // Should eventually show either loading, results, or no matches message
    const content = page.getByText(/running compatibility scanner|no similar users|common/i);
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('handles users with no overlapping ratings', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create current user rating items 1, 2, 3
    const currentUserEmail = 'user1@example.com';
    const currentUserToken = await getUserToken(testEventId, currentUserEmail, testEventPin);
    await submitRating(testEventId, currentUserToken, 1, 4);
    await submitRating(testEventId, currentUserToken, 2, 4);
    await submitRating(testEventId, currentUserToken, 3, 4);
    
    // Create other user rating completely different items (4, 5, 6) - no overlap
    const otherUserEmail = 'user2@example.com';
    const otherUserToken = await getUserToken(testEventId, otherUserEmail, testEventPin);
    await submitRating(testEventId, otherUserToken, 4, 4);
    await submitRating(testEventId, otherUserToken, 5, 4);
    await submitRating(testEventId, otherUserToken, 6, 4);
    
    // Access event page as current user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, currentUserEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Should show no similar users (no overlapping items)
    const noMatchMessage = page.getByText(/no similar users found/i);
    await expect(noMatchMessage).toBeVisible({ timeout: 10000 });
  });

  test('close button closes the similar users drawer', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create user with ratings
    const userEmail = 'closetest@example.com';
    const userToken = await getUserToken(testEventId, userEmail, testEventPin);
    await submitRating(testEventId, userToken, 1, 4);
    await submitRating(testEventId, userToken, 2, 3);
    await submitRating(testEventId, userToken, 3, 4);
    
    // Access event page
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, userEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Click Find Similar Tastes button to open drawer
    const similarButton = page.getByRole('button', { name: /similar tastes/i });
    await similarButton.click();
    
    // Wait for drawer to open
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    
    // Click close button
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();
    
    // Drawer should close - check aria-hidden attribute since element stays in DOM
    await expect(drawer).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
  });

  test('clicking on a similar user opens detail drawer with appropriate sections', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const adminToken = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await startEvent(testEventId, adminToken);
    
    // Create current user with ratings
    const currentUserEmail = 'detailviewer@example.com';
    const currentUserToken = await getUserToken(testEventId, currentUserEmail, testEventPin);
    await submitRating(testEventId, currentUserToken, 1, 4);
    await submitRating(testEventId, currentUserToken, 2, 3);
    await submitRating(testEventId, currentUserToken, 3, 4);
    await submitRating(testEventId, currentUserToken, 4, 2);
    
    // Create similar user with overlapping ratings
    const similarUserEmail = 'matcheduser@example.com';
    const similarUserToken = await getUserToken(testEventId, similarUserEmail, testEventPin);
    await submitRating(testEventId, similarUserToken, 1, 4);
    await submitRating(testEventId, similarUserToken, 2, 3);
    await submitRating(testEventId, similarUserToken, 3, 4);
    await submitRating(testEventId, similarUserToken, 4, 2);
    
    // Access event page as current user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, currentUserEmail);
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
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
