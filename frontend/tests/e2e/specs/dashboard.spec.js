/**
 * Dashboard Page Tests
 * 
 * Tests the event dashboard functionality including statistics,
 * item ratings table, and access control.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
  getUserToken,
  BASE_URL,
  API_URL,
  startEvent,
  changeEventState,
  submitRating,
  configureItems,
} from './helpers.js';

test.describe('Dashboard Page', () => {

  // ===================================
  // User Story 1 - Admin Views Dashboard Anytime
  // ===================================

  test('administrator can access dashboard in created state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Should be on dashboard page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/dashboard`));
  });

  test('administrator sees dashboard in created state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Dashboard should load with stats (may show zeros/N/A)
    const dashboard = page.locator('main');
    await expect(dashboard).toBeVisible();
    await expect(page.getByText(/total.*users/i)).toBeVisible({ timeout: 10000 });
  });

  test('administrator sees dashboard in started state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await startEvent(eventId, token);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/dashboard`));
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 2 - Regular User Dashboard Access
  // ===================================

  test('regular user cannot access dashboard before event completed', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await startEvent(eventId, token);
    
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'regularuser@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Wait for event page to fully load after PIN entry
    await page.waitForURL(new RegExp(`/event/${eventId}$`), { timeout: 10000 });
    
    // Try to access dashboard
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Should be redirected to event main page
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('regular user can access dashboard when event is completed', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Complete the event (transition: created -> started -> completed)
    await startEvent(eventId, token);
    
    const completeResult = await changeEventState(eventId, 'completed', 'started', token);
    if (!completeResult.ok) {
      throw new Error(`Failed to complete event: ${completeResult.data}`);
    }
    
    // Verify event is now in completed state
    const verifyResponse = await fetch(`${API_URL}/api/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const eventData = await verifyResponse.json();
    if (eventData.state !== 'completed') {
      throw new Error(`Event state is '${eventData.state}', expected 'completed'`);
    }
    
    // Access as regular user - set up auth token directly like admin tests do
    const userToken = await getUserToken(eventId, 'regularuser@example.com', pin);
    
    // Set the user's token directly (same pattern as admin tests)
    await setAuthToken(page, userToken, 'regularuser@example.com');
    
    // Navigate directly to dashboard
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Should be able to view dashboard (not redirected away)
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/dashboard`));
  });

  // ===================================
  // User Story 3 - View Summary Statistics
  // ===================================

  test('displays four summary statistics', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Should see four statistics
    // Look for specific stat labels
    await expect(page.getByText(/total.*users/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/total.*(bottles|items)/i)).toBeVisible();
    await expect(page.getByText(/total.*ratings/i)).toBeVisible();
    await expect(page.getByText(/ratings.*bottle/i)).toBeVisible();
  });

  test('shows zero/N/A values when no ratings exist', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Stats should show 0 or N/A for new event
    const zeroOrNA = page.getByText(/^0$|N\/A/);
    await expect(zeroOrNA.first()).toBeVisible({ timeout: 10000 });
  });

  // ===================================
  // User Story 4 - Item Ratings Table
  // ===================================

  test('shows items tab with empty state when no items configured', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    
    // Empty state = table present with bottle rows but all ratings show N/A
    const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 10000 });
    await expect(tabPanel.locator('table')).toBeVisible({ timeout: 10000 });
    await expect(tabPanel.getByText('N/A').first()).toBeVisible({ timeout: 5000 });
  });

  test('items tab displays table when items are configured', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items for the event via API
    const configResult = await configureItems(eventId, token, 10);
    expect(configResult.ok).toBe(true);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    
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

  test('table columns are sortable', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items for the event
    const configResult = await configureItems(eventId, token, 10);
    expect(configResult.ok).toBe(true);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    
    // Table should be visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Capture initial row order
    const getFirstCellTexts = async () => {
      const cells = page.locator('table tbody tr td:first-child');
      return cells.allTextContents();
    };
    const initialOrder = await getFirstCellTexts();
    
    // Click on ID column header to sort
    const idHeader = page.getByRole('columnheader', { name: /id/i });
    await expect(idHeader).toBeVisible();
    await idHeader.click();
    
    // Wait for re-render then capture new order
    await expect(async () => {
      const newOrder = await getFirstCellTexts();
      expect(newOrder).not.toEqual(initialOrder);
    }).toPass({ timeout: 5000 });
  });

  test('default sort is by item ID ascending', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items for the event
    const configResult = await configureItems(eventId, token, 10);
    expect(configResult.ok).toBe(true);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    
    // First row should be item 1 (default ascending sort)
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();
    const firstCell = firstRow.locator('td').first();
    await expect(firstCell).toHaveText('1');
  });

  // ===================================
  // User Story 5 - Weighted Average Calculation
  // ===================================

  test('weighted average displays correctly for items with ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items for the event
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    // Get a user token via PIN verification
    const userToken = await getUserToken(eventId, 'rater@example.com', pin);
    
    // Submit ratings for some items
    for (let itemId = 1; itemId <= 3; itemId++) {
      const result = await submitRating(eventId, userToken, itemId, 4);
      if (!result.ok) {
        throw new Error(`Failed to submit rating: ${result.data}`);
      }
    }
    
    // Now view dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Items/Bottles tab
    const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
    await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
    await itemsTab.click();
    
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

  test('users tab is accessible and shows appropriate content', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.waitFor({ state: 'visible', timeout: 10000 });
    await usersTab.click();
    
    const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(activePanel).toBeVisible({ timeout: 10000 });
  });

  test('users tab displays table with correct columns when users have ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items and start event
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    // Create first user and submit ratings
    const user1Token = await getUserToken(eventId, 'user1@example.com', pin);
    
    // Submit ratings for user1
    for (let itemId = 1; itemId <= 3; itemId++) {
      const result = await submitRating(eventId, user1Token, itemId, 4);
      if (!result.ok) throw new Error(`Failed to submit rating: ${result.data}`);
    }
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.waitFor({ state: 'visible', timeout: 10000 });
    await usersTab.click();
    
    // Table should be visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Verify column headers
    await expect(page.getByText(/^user$/i).first()).toBeVisible();
    await expect(page.getByText(/progress/i).first()).toBeVisible();
    await expect(page.getByText(/avg.*rating/i).first()).toBeVisible();
  });

  test('users table displays multiple users with different rating counts', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items and start event
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    // Create first user with 5 ratings
    const user1Token = await getUserToken(eventId, 'alice@example.com', pin);
    
    for (let itemId = 1; itemId <= 5; itemId++) {
      const result = await submitRating(eventId, user1Token, itemId, 4);
      if (!result.ok) throw new Error(`Failed to submit rating: ${result.data}`);
    }
    
    // Create second user with 2 ratings
    const user2Token = await getUserToken(eventId, 'bob@example.com', pin);
    
    for (let itemId = 1; itemId <= 2; itemId++) {
      const result = await submitRating(eventId, user2Token, itemId, 3);
      if (!result.ok) throw new Error(`Failed to submit rating: ${result.data}`);
    }
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    
    // Table should show both users (wait for data to load)
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Both users should be in the table (use .first() since name and email may both show)
    await expect(page.getByText(/alice/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/bob/i).first()).toBeVisible({ timeout: 10000 });
    
    // Table should have at least 2 user rows (admin may also be present)
    const rows = page.locator('table tbody tr');
    await expect(async () => {
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });
  });

  test('users table columns are sortable', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items and start event
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    // Create users with ratings
    const user1Token = await getUserToken(eventId, 'zack@example.com', pin);
    
    const rating1Result = await submitRating(eventId, user1Token, 1, 4);
    if (!rating1Result.ok) throw new Error(`Failed to submit rating: ${rating1Result.data}`);
    
    const user2Token = await getUserToken(eventId, 'anna@example.com', pin);
    
    const rating2Result = await submitRating(eventId, user2Token, 1, 3);
    if (!rating2Result.ok) throw new Error(`Failed to submit rating: ${rating2Result.data}`);
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    
    // Wait for table data to load before sorting
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr')).not.toHaveCount(0, { timeout: 10000 });
    
    // Click on User column header to sort
    const userHeader = page.getByRole('columnheader', { name: /user/i });
    await expect(userHeader).toBeVisible();
    await userHeader.click();
    
    const getFirstCellTexts = async () => {
      const cells = page.locator('table tbody tr td:first-child');
      return cells.allTextContents();
    };
    
    // Wait for sort to reflect in table
    await expect(page.locator('table tbody tr')).not.toHaveCount(0, { timeout: 5000 });
    const afterFirstSort = await getFirstCellTexts();

    await userHeader.click();

    await expect(async () => {
      const afterSecondSort = await getFirstCellTexts();
      expect(afterSecondSort).not.toEqual(afterFirstSort);
    }).toPass({ timeout: 5000 });
  });

  test('users table default sort is by email ascending', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items and start event
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    // Create users in reverse alphabetical order
    const user1Token = await getUserToken(eventId, 'zack@example.com', pin);
    
    const rating1Result = await submitRating(eventId, user1Token, 1, 4);
    if (!rating1Result.ok) throw new Error(`Failed to submit rating: ${rating1Result.data}`);
    
    const user2Token = await getUserToken(eventId, 'anna@example.com', pin);
    
    const rating2Result = await submitRating(eventId, user2Token, 1, 3);
    if (!rating2Result.ok) throw new Error(`Failed to submit rating: ${rating2Result.data}`);
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    
    // Wait for table data to load
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr')).not.toHaveCount(0, { timeout: 10000 });
    
    // First row should be admin (alphabetically first by email: admin@example.com < anna@example.com)
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText(/admin/i, { timeout: 10000 });
    
    // Second row should be anna
    const secondRow = page.locator('table tbody tr').nth(1);
    await expect(secondRow).toContainText(/anna/i, { timeout: 10000 });
  });

  test('clicking user row opens user details drawer', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items and start event
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    // Create user with ratings
    const userToken = await getUserToken(eventId, 'testuser@example.com', pin);
    
    const ratingResult = await submitRating(eventId, userToken, 1, 4);
    if (!ratingResult.ok) throw new Error(`Failed to submit rating: ${ratingResult.data}`);
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    
    // Click on user row
    const userRow = page.locator('table tbody tr').first();
    await userRow.click();
    
    // User details drawer should open
    const drawer = page.locator('[role="dialog"]').or(page.locator('[data-state="open"]'));
    await expect(drawer.first()).toBeVisible({ timeout: 5000 });
    
    // Drawer should contain user info (use .first() since name/email both show same text)
    await expect(page.getByText(/testuser/i).first()).toBeVisible();
  });

  test('users table shows derived name from email when name not set', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Configure items and start event
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    // Create user (no name set, only email)
    const userToken = await getUserToken(eventId, 'john.doe@example.com', pin);
    
    const ratingResult = await submitRating(eventId, userToken, 1, 4);
    if (!ratingResult.ok) throw new Error(`Failed to submit rating: ${ratingResult.data}`);
    
    // View dashboard as admin
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on Users tab
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    
    // Table should show derived name from email (john.doe)
    // Use .first() since name and email both display the derived name
    await expect(page.getByText(/john\.doe/i).first()).toBeVisible();
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles event with only admin user gracefully', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Admin is now counted as a user, so should show 1 user or appropriate value
    // The dashboard should display without errors
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    // Total users should show 1 (the admin) or appropriate stats - scope to main content
    await expect(main.getByText(/^N\/A$|^0$|^1$|no.*ratings/i).first()).toBeVisible();
  });

  test('dashboard renders data after loading', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Dashboard heading should be visible after loading
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    
    // Summary tab content should be populated with stats
    await expect(page.getByText(/total users/i)).toBeVisible();
    await expect(page.getByText(/total bottles/i)).toBeVisible();
  });

  test('refresh button updates dashboard data', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible({ timeout: 5000 });
    
    // Click refresh and verify a new API call is made
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes(`/api/events/${eventId}`)
    );
    await refreshButton.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
  });

  test('dashboard link visible to admin in dropdown menu', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    
    // Open the dropdown menu
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.waitFor({ state: 'visible', timeout: 10000 });
    await menuButton.click();
    
    // Dashboard link should be visible in menu for admin
    const dashboardLink = page.getByRole('menuitem', { name: /dashboard/i }).or(page.getByText(/dashboard/i));
    await expect(dashboardLink.first()).toBeVisible();
  });

  test('dashboard link hidden from regular user in menu when event not completed', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await startEvent(eventId, token);
    
    // Access as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'regularuser@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Wait for event page to load
    await page.waitForURL(new RegExp(`/event/${eventId}$`), { timeout: 10000 });
    
    // Open the dropdown menu
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.waitFor({ state: 'visible', timeout: 10000 });
    await menuButton.click();
    
    // Dashboard link should NOT be visible in menu for regular user when event not completed
    const dashboardLink = page.getByRole('menuitem', { name: /dashboard/i });
    await expect(dashboardLink).not.toBeVisible();
  });
});
