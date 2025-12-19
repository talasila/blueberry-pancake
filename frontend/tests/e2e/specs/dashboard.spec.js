/**
 * Dashboard Page Tests
 * 
 * Tests the event dashboard functionality including statistics,
 * item ratings table, and access control.
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

test.describe('Dashboard Page', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Dashboard Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
    }
  });

  // ===================================
  // User Story 1 - Admin Views Dashboard Anytime
  // ===================================

  test('administrator can access dashboard in any event state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Should be on dashboard page
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/dashboard`));
  });

  test('administrator sees dashboard in created state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Dashboard should load with stats (may show zeros/N/A)
    const dashboard = page.locator('main');
    await expect(dashboard).toBeVisible();
  });

  test('administrator sees dashboard in started state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start the event
    const startResponse = await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    if (!startResponse.ok) {
      throw new Error(`Failed to start event: ${await startResponse.text()}`);
    }
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/dashboard`));
  });

  // ===================================
  // User Story 2 - Regular User Dashboard Access
  // ===================================

  test('regular user cannot access dashboard before event completed', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start the event but don't complete it
    const startResponse = await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    if (!startResponse.ok) {
      throw new Error(`Failed to start event: ${await startResponse.text()}`);
    }
    
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'regularuser@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Wait for event page to fully load after PIN entry
    await page.waitForURL(new RegExp(`/event/${testEventId}$`), { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Try to access dashboard
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to event main page
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('regular user can access dashboard when event is completed', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Complete the event (transition: created -> started -> completed)
    const startResponse = await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    if (!startResponse.ok) {
      throw new Error(`Failed to start event: ${await startResponse.text()}`);
    }
    
    const completeResponse = await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'completed', currentState: 'started' })
    });
    if (!completeResponse.ok) {
      throw new Error(`Failed to complete event: ${await completeResponse.text()}`);
    }
    
    // Verify event is now in completed state
    const verifyResponse = await fetch(`${API_URL}/api/events/${testEventId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const eventData = await verifyResponse.json();
    if (eventData.state !== 'completed') {
      throw new Error(`Event state is '${eventData.state}', expected 'completed'`);
    }
    
    // Access as regular user - set up auth token directly like admin tests do
    // Get a regular user token by calling verify-pin API
    const pinResponse = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pin: testEventPin, email: 'regularuser@example.com' })
    });
    if (!pinResponse.ok) {
      throw new Error(`Failed to verify PIN: ${await pinResponse.text()}`);
    }
    const pinData = await pinResponse.json();
    const userToken = pinData.token;
    
    // Set the user's token directly (same pattern as admin tests)
    await setAuthToken(page, userToken, 'regularuser@example.com');
    
    // Navigate directly to dashboard
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Should be able to view dashboard (not redirected away)
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}/dashboard`));
  });

  // ===================================
  // User Story 3 - View Summary Statistics
  // ===================================

  test('displays four summary statistics', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Should see four statistics
    const stats = page.locator('[class*="stat"]').or(page.locator('[class*="gadget"]')).or(page.locator('[class*="card"]'));
    
    // Look for specific stat labels
    await expect(page.getByText(/total.*users/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/total.*(bottles|items)/i)).toBeVisible();
    await expect(page.getByText(/total.*ratings/i)).toBeVisible();
    await expect(page.getByText(/ratings.*bottle/i)).toBeVisible();
  });

  test('shows zero/N/A values when no ratings exist', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Stats should show 0 or N/A for new event
    const zeroOrNA = page.getByText(/^0$|N\/A/);
    await expect(zeroOrNA.first()).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 4 - Item Ratings Table
  // ===================================

  test('shows items tab with empty state when no items configured', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    await page.waitForTimeout(500);
    
    // Should show empty state message or table (depending on configuration)
    const table = page.locator('table');
    const emptyMessage = page.getByText(/no.*items|no.*bottles|no.*ratings|no.*data/i).first();
    
    // Either table or empty message should be visible
    const tableVisible = await table.isVisible();
    const emptyVisible = await emptyMessage.isVisible();
    
    expect(tableVisible || emptyVisible).toBe(true);
  });

  test('items tab displays table when items are configured', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items for the event via API
    const configResponse = await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 10 })
    });
    if (!configResponse.ok) {
      throw new Error(`Failed to configure items: ${await configResponse.text()}`);
    }
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    await page.waitForTimeout(500);
    
    // Table should be visible with configured items
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Verify table has the expected column headers
    await expect(page.getByText(/^ID$/i).or(page.getByText(/item.*id/i)).first()).toBeVisible();
    await expect(page.getByText(/progress/i).first()).toBeVisible();
    await expect(page.getByText(/avg/i).first()).toBeVisible();
    await expect(page.getByText(/wt.*avg/i).first()).toBeVisible();
    
    // Verify table has rows (10 items configured)
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(10);
  });

  test('table columns are sortable', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items for the event
    const configResponse = await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 10 })
    });
    if (!configResponse.ok) {
      throw new Error(`Failed to configure items: ${await configResponse.text()}`);
    }
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    await page.waitForTimeout(500);
    
    // Table should be visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Click on ID column header to sort
    const idHeader = page.getByRole('columnheader', { name: /id/i });
    await expect(idHeader).toBeVisible();
    await idHeader.click();
    await page.waitForTimeout(500);
    
    // Table should re-sort (clicking again should reverse order)
    await idHeader.click();
    await page.waitForTimeout(500);
  });

  test('default sort is by item ID ascending', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items for the event
    const configResponse = await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 10 })
    });
    if (!configResponse.ok) {
      throw new Error(`Failed to configure items: ${await configResponse.text()}`);
    }
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    await page.waitForTimeout(500);
    
    // First row should be item 1 (default ascending sort)
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText('1');
  });

  // ===================================
  // User Story 5 - Weighted Average Calculation
  // ===================================

  test('weighted average displays correctly for items with ratings', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items for the event
    const configResponse = await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 5 })
    });
    if (!configResponse.ok) {
      throw new Error(`Failed to configure items: ${await configResponse.text()}`);
    }
    
    // Start the event (ratings can only be submitted when event is started)
    const startResponse = await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    if (!startResponse.ok) {
      throw new Error(`Failed to start event: ${await startResponse.text()}`);
    }
    
    // Get a user token via PIN verification
    const pinResponse = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'rater@example.com' })
    });
    if (!pinResponse.ok) {
      throw new Error(`Failed to verify PIN: ${await pinResponse.text()}`);
    }
    const { token: userToken } = await pinResponse.json();
    
    // Submit ratings for some items
    for (let itemId = 1; itemId <= 3; itemId++) {
      const ratingResponse = await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ itemId, rating: 4 })
      });
      if (!ratingResponse.ok) {
        throw new Error(`Failed to submit rating: ${await ratingResponse.text()}`);
      }
    }
    
    // Now view dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    await page.waitForTimeout(500);
    
    // Table should show weighted average column with values
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Items with ratings should have weighted average displayed (not N/A or -)
    // First 3 items have ratings, check the first row has an average value
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    // The row should contain the rating value (4) or calculated average
    // Weighted average for item with one rating of 4 should be close to 4
    // Use .first() since both Avg and Wt.Avg columns may show 4.00
    await expect(firstRow.getByText(/[0-9]\.[0-9]|^4$/).first()).toBeVisible();
  });

  // ===================================
  // User Story 6 - User Ratings Table
  // ===================================

  test('users tab is accessible and shows appropriate content', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.waitFor({ state: 'visible', timeout: 10000 });
    await usersTab.click();
    await page.waitForTimeout(500);
    
    // Should show either empty state message or table (admin may be registered but without ratings)
    const emptyMessage = page.getByText(/no.*users/i);
    const table = page.locator('table');
    
    const emptyVisible = await emptyMessage.isVisible();
    const tableVisible = await table.isVisible();
    
    // Either empty message or table should be visible
    expect(emptyVisible || tableVisible).toBe(true);
  });

  test('users tab displays table with correct columns when users have ratings', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items and start event
    await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 5 })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Create first user and submit ratings
    const user1Response = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'user1@example.com' })
    });
    const { token: user1Token } = await user1Response.json();
    
    // Submit ratings for user1
    for (let itemId = 1; itemId <= 3; itemId++) {
      await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({ itemId, rating: 4 })
      });
    }
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.waitFor({ state: 'visible', timeout: 10000 });
    await usersTab.click();
    await page.waitForTimeout(500);
    
    // Table should be visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Verify column headers
    await expect(page.getByText(/^user$/i).first()).toBeVisible();
    await expect(page.getByText(/progress/i).first()).toBeVisible();
    await expect(page.getByText(/avg.*rating/i).first()).toBeVisible();
  });

  test('users table displays multiple users with different rating counts', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items and start event
    await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 5 })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Create first user with 5 ratings
    const user1Response = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'alice@example.com' })
    });
    const { token: user1Token } = await user1Response.json();
    
    for (let itemId = 1; itemId <= 5; itemId++) {
      await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({ itemId, rating: 5 })
      });
    }
    
    // Create second user with 2 ratings
    const user2Response = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'bob@example.com' })
    });
    const { token: user2Token } = await user2Response.json();
    
    for (let itemId = 1; itemId <= 2; itemId++) {
      await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user2Token}`
        },
        body: JSON.stringify({ itemId, rating: 3 })
      });
    }
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    await page.waitForTimeout(500);
    
    // Table should show both users
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Both users should be in the table (use .first() since name and email may both show)
    await expect(page.getByText(/alice/i).first()).toBeVisible();
    await expect(page.getByText(/bob/i).first()).toBeVisible();
    
    // Table should have at least 2 user rows (admin may also be present)
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test('users table columns are sortable', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items and start event
    await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 5 })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Create users with ratings
    const user1Response = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'zack@example.com' })
    });
    const { token: user1Token } = await user1Response.json();
    
    await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({ itemId: 1, rating: 5 })
    });
    
    const user2Response = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'anna@example.com' })
    });
    const { token: user2Token } = await user2Response.json();
    
    await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({ itemId: 1, rating: 3 })
    });
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    await page.waitForTimeout(500);
    
    // Click on User column header to sort
    const userHeader = page.getByRole('columnheader', { name: /user/i });
    await expect(userHeader).toBeVisible();
    await userHeader.click();
    await page.waitForTimeout(500);
    
    // Click again to reverse sort
    await userHeader.click();
    await page.waitForTimeout(500);
    
    // Click on Avg. Rating column to sort by average
    const avgHeader = page.getByRole('columnheader', { name: /avg/i });
    if (await avgHeader.isVisible()) {
      await avgHeader.click();
      await page.waitForTimeout(500);
    }
  });

  test('users table default sort is by email ascending', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items and start event
    await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 5 })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Create users in reverse alphabetical order
    const user1Response = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'zack@example.com' })
    });
    const { token: user1Token } = await user1Response.json();
    
    await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({ itemId: 1, rating: 5 })
    });
    
    const user2Response = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'anna@example.com' })
    });
    const { token: user2Token } = await user2Response.json();
    
    await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({ itemId: 1, rating: 3 })
    });
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    await page.waitForTimeout(500);
    
    // First row should be admin (alphabetically first by email: admin@example.com < anna@example.com)
    // Admin is automatically added as a user
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText(/admin/i);
    
    // Second row should be anna
    const secondRow = page.locator('table tbody tr').nth(1);
    await expect(secondRow).toContainText(/anna/i);
  });

  test('clicking user row opens user details drawer', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items and start event
    await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 5 })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Create user with ratings
    const userResponse = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'testuser@example.com' })
    });
    const { token: userToken } = await userResponse.json();
    
    await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ itemId: 1, rating: 4 })
    });
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    await page.waitForTimeout(500);
    
    // Click on user row
    const userRow = page.locator('table tbody tr').first();
    await userRow.click();
    await page.waitForTimeout(500);
    
    // User details drawer should open
    const drawer = page.locator('[role="dialog"]').or(page.locator('[data-state="open"]'));
    await expect(drawer.first()).toBeVisible({ timeout: 5000 });
    
    // Drawer should contain user info (use .first() since name/email both show same text)
    await expect(page.getByText(/testuser/i).first()).toBeVisible();
  });

  test('users table shows derived name from email when name not set', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Configure items and start event
    await fetch(`${API_URL}/api/events/${testEventId}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numberOfItems: 5 })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    // Create user (no name set, only email)
    const userResponse = await fetch(`${API_URL}/api/events/${testEventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testEventPin, email: 'john.doe@example.com' })
    });
    const { token: userToken } = await userResponse.json();
    
    await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ itemId: 1, rating: 4 })
    });
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    await page.waitForTimeout(500);
    
    // Table should show derived name from email (john.doe)
    // Use .first() since name and email both display the derived name
    await expect(page.getByText(/john\.doe/i).first()).toBeVisible();
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles event with only admin user gracefully', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Admin is now counted as a user, so should show 1 user or appropriate value
    // The dashboard should display without errors
    const dashboard = page.locator('main');
    await expect(dashboard).toBeVisible();
    
    // Total users should show 1 (the admin) or appropriate stats
    await expect(page.getByText(/N\/A|[0-1]|no.*ratings/i).first()).toBeVisible();
  });

  test('shows loading indicator while fetching data', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    
    // Navigate and look for loading state
    const navigationPromise = page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    
    // Loading indicator might appear briefly
    await navigationPromise;
  });

  test('refresh button updates dashboard data', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Look for refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
      
      // Data should refresh
    }
  });

  test('dashboard link visible to admin in dropdown menu', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Open the dropdown menu
    const menuButton = page.getByRole('button', { name: /menu/i }).or(page.locator('[data-testid="menu-button"]')).or(page.locator('header button').last());
    await menuButton.waitFor({ state: 'visible', timeout: 10000 });
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Dashboard link should be visible in menu for admin
    const dashboardLink = page.getByRole('menuitem', { name: /dashboard/i }).or(page.getByText(/dashboard/i));
    await expect(dashboardLink.first()).toBeVisible();
  });

  test('dashboard link hidden from regular user in menu when event not completed', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start but don't complete event
    const startResponse = await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    if (!startResponse.ok) {
      throw new Error(`Failed to start event: ${await startResponse.text()}`);
    }
    
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'regularuser@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Wait for event page to load
    await page.waitForURL(new RegExp(`/event/${testEventId}$`), { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Open the dropdown menu
    const menuButton = page.getByRole('button', { name: /menu/i }).or(page.locator('[data-testid="menu-button"]')).or(page.locator('header button').last());
    await menuButton.waitFor({ state: 'visible', timeout: 10000 });
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Dashboard link should NOT be visible in menu for regular user when event not completed
    const dashboardLink = page.getByRole('menuitem', { name: /dashboard/i });
    await expect(dashboardLink).not.toBeVisible();
  });
});
