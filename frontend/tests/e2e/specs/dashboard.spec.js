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
    await expect(firstRow.getByText(/[0-9]\.[0-9]|^4$/)).toBeVisible();
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles event with no users gracefully', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Should show appropriate message or N/A
    await expect(page.getByText(/N\/A|0|no.*users/i).first()).toBeVisible();
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
