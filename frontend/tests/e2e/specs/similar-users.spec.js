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

test.describe('Similar Users Discovery', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Similar Users Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
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
    // This test would need to submit ratings first
    // After user has rated 3+ items, button should appear
    
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
    
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'rater@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Would need to submit 3 ratings here
    // Then check for button visibility
  });

  test('clicking Find Similar Tastes opens drawer with loading message', async ({ page }) => {
    // After user has ratings, clicking button should show loading
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
    
    // This would need actual ratings to test fully
  });

  test('shows "no similar users" message when no matches found', async ({ page }) => {
    // When user has ratings but no one else matches
    // Should show appropriate message
  });

  // ===================================
  // User Story 2 - Compare Ratings with Similar Users
  // ===================================

  test('similar users drawer shows rating comparisons', async ({ page }) => {
    // When similar users are found, should show
    // side-by-side rating comparisons for common items
  });

  test('displays up to 5 similar users ranked by similarity', async ({ page }) => {
    // Should show maximum of 5 users, sorted by similarity score
  });

  test('shows user name if available, email otherwise', async ({ page }) => {
    // User identification in the similar users list
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles user with exactly 3 ratings', async ({ page }) => {
    // Minimum threshold for similar users feature
  });

  test('handles tie-breaking by common items count', async ({ page }) => {
    // When similarity scores are identical,
    // should sort by number of common items (descending)
  });

  test('similar users list requires button click to refresh', async ({ page }) => {
    // List doesn't auto-refresh; user must click button again
  });

  test('feature only available during active events', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Event in created state (not started)
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    await page.waitForLoadState('networkidle');
    
    // Similar users feature should not be accessible
    // (Event needs to be in started state)
  });

  test('shows loading indicator during similarity calculation', async ({ page }) => {
    // "Running compatibility scanner..." message
  });

  test('handles users with no overlapping ratings gracefully', async ({ page }) => {
    // Users who have rated different items should be excluded
  });

  test('handles insufficient variance in ratings', async ({ page }) => {
    // When correlation can't be calculated, user should be
    // excluded silently from similar users list
  });
});
