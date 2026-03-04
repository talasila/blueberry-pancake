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
  dismissGuestWelcomeSheet,
  getUserToken,
  BASE_URL,
  API_URL,
  startEvent,
  changeEventState,
  submitRating,
  configureItems,
} from './helpers.js';

/**
 * Navigate to the dashboard as admin and wait for it to render.
 */
async function goToDashboardAsAdmin(page, eventId) {
  const adminEmail = 'admin@example.com';
  const token = await addAdminToEvent(eventId, adminEmail);
  await setAuthToken(page, token, adminEmail);
  await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  return token;
}

/**
 * Click the Items/Bottles tab and return the active tab panel.
 */
async function clickItemsTab(page) {
  const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
  await itemsTab.waitFor({ state: 'visible', timeout: 10000 });
  await itemsTab.click();
  const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
  await expect(tabPanel).toBeVisible({ timeout: 10000 });
  return tabPanel;
}

/**
 * Click the Users tab and return the active tab panel.
 */
async function clickUsersTab(page) {
  const usersTab = page.getByRole('tab', { name: /users/i });
  await usersTab.waitFor({ state: 'visible', timeout: 10000 });
  await usersTab.click();
  const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
  await expect(tabPanel).toBeVisible({ timeout: 10000 });
  return tabPanel;
}

// Timeout convention: 10000ms for initial page loads/data fetching, 5000ms for subsequent UI interactions
test.describe('Dashboard Page', () => {

  // ===================================
  // User Story 1 - Admin Views Dashboard Anytime
  // ===================================

  test('administrator can access and see dashboard in created state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await goToDashboardAsAdmin(page, eventId);
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/dashboard`));
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/total.*users/i)).toBeVisible({ timeout: 10000 });
  });

  test('administrator sees dashboard in started state', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const token = await goToDashboardAsAdmin(page, eventId);
    await startEvent(eventId, token);
    
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
    await dismissGuestWelcomeSheet(page);
    
    // Wait for event page to fully load after PIN entry
    await page.waitForURL(new RegExp(`/event/${eventId}$`), { timeout: 10000 });
    
    // Try to access dashboard
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Should be redirected back to the event main page (not dashboard)
    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
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
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify event state: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
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
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
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
    await goToDashboardAsAdmin(page, eventId);
    
    const tabPanel = await clickItemsTab(page);
    await expect(tabPanel.locator('table')).toBeVisible({ timeout: 10000 });
    await expect(tabPanel.getByText('N/A').first()).toBeVisible({ timeout: 5000 });
  });

  test('items tab displays table when items are configured', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const configResult = await configureItems(eventId, token, 10);
    expect(configResult.ok).toBe(true);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickItemsTab(page);
    const table = tabPanel.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    await expect(tabPanel.getByText(/^ID$/i).or(tabPanel.getByText(/item.*id/i)).first()).toBeVisible();
    await expect(tabPanel.getByText(/progress/i).first()).toBeVisible();
    await expect(tabPanel.getByText(/avg/i).first()).toBeVisible();
    await expect(tabPanel.getByText(/wt.*avg/i).first()).toBeVisible();
    
    const rows = tabPanel.locator('table tbody tr');
    await expect(rows).toHaveCount(10);
  });

  test('table columns are sortable', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const configResult = await configureItems(eventId, token, 10);
    expect(configResult.ok).toBe(true);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickItemsTab(page);
    await expect(tabPanel.locator('table')).toBeVisible({ timeout: 10000 });
    
    const getFirstCellTexts = async () => {
      return tabPanel.locator('table tbody tr td:first-child').allTextContents();
    };
    const initialOrder = await getFirstCellTexts();
    expect(initialOrder.length).toBeGreaterThan(0);
    
    const idHeader = tabPanel.getByRole('columnheader', { name: /id/i });
    await expect(idHeader).toBeVisible();
    await idHeader.click();
    
    await expect(async () => {
      const newOrder = await getFirstCellTexts();
      expect(newOrder).not.toEqual(initialOrder);
    }).toPass({ timeout: 5000 });
  });

  test('default sort is by item ID ascending', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const configResult = await configureItems(eventId, token, 10);
    expect(configResult.ok).toBe(true);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickItemsTab(page);
    
    const firstRow = tabPanel.locator('table tbody tr').first();
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
    
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    
    await startEvent(eventId, token);
    
    const userToken = await getUserToken(eventId, 'rater@example.com', pin);
    for (let itemId = 1; itemId <= 3; itemId++) {
      const result = await submitRating(eventId, userToken, itemId, 4);
      if (!result.ok) throw new Error(`Failed to submit rating: ${result.data}`);
    }
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickItemsTab(page);
    const table = tabPanel.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    const firstRow = tabPanel.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    const wtAvgHeader = tabPanel.getByText(/wt.*avg/i).first();
    await expect(wtAvgHeader).toBeVisible();
    const lastCell = firstRow.locator('td').last();
    await expect(lastCell).toContainText(/\d+\.\d+/, { timeout: 5000 });
  });

  // ===================================
  // User Story 6 - User Ratings Table
  // ===================================

  test('users tab displays table with correct columns when users have ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    await startEvent(eventId, token);
    
    const user1Token = await getUserToken(eventId, 'user1@example.com', pin);
    for (let itemId = 1; itemId <= 3; itemId++) {
      const result = await submitRating(eventId, user1Token, itemId, 4);
      if (!result.ok) throw new Error(`Failed to submit rating: ${result.data}`);
    }
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickUsersTab(page);
    const table = tabPanel.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    await expect(tabPanel.getByText(/^user$/i).first()).toBeVisible();
    await expect(tabPanel.getByText(/progress/i).first()).toBeVisible();
    await expect(tabPanel.getByText(/avg.*rating/i).first()).toBeVisible();
  });

  test('users table displays multiple users with different rating counts', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    await startEvent(eventId, token);
    
    // Alice: 5 ratings, Bob: 2 ratings
    const user1Token = await getUserToken(eventId, 'alice@example.com', pin);
    for (let itemId = 1; itemId <= 5; itemId++) {
      const result = await submitRating(eventId, user1Token, itemId, 4);
      if (!result.ok) throw new Error(`Failed to submit rating: ${result.data}`);
    }
    
    const user2Token = await getUserToken(eventId, 'bob@example.com', pin);
    for (let itemId = 1; itemId <= 2; itemId++) {
      const result = await submitRating(eventId, user2Token, itemId, 3);
      if (!result.ok) throw new Error(`Failed to submit rating: ${result.data}`);
    }
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickUsersTab(page);
    const table = tabPanel.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    await expect(tabPanel.getByText(/alice/i).first()).toBeVisible({ timeout: 10000 });
    await expect(tabPanel.getByText(/bob/i).first()).toBeVisible({ timeout: 10000 });
    
    const rows = tabPanel.locator('table tbody tr');
    await expect(async () => {
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });
    
    // Verify the two users have different progress values (5/5 vs 2/5).
    // Strip email from row text to compare only the data columns, since the
    // mobile layout may render cells differently than desktop.
    const aliceRow = tabPanel.locator('table tbody tr').filter({ hasText: /alice/i });
    const bobRow = tabPanel.locator('table tbody tr').filter({ hasText: /bob/i });
    const aliceText = (await aliceRow.first().textContent()).replace(/alice@example\.com/gi, '').trim();
    const bobText = (await bobRow.first().textContent()).replace(/bob@example\.com/gi, '').trim();
    expect(aliceText).not.toBe(bobText);
  });

  test('users table columns are sortable', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    await startEvent(eventId, token);
    
    const user1Token = await getUserToken(eventId, 'zack@example.com', pin);
    const rating1Result = await submitRating(eventId, user1Token, 1, 4);
    if (!rating1Result.ok) throw new Error(`Failed to submit rating: ${rating1Result.data}`);
    
    const user2Token = await getUserToken(eventId, 'anna@example.com', pin);
    const rating2Result = await submitRating(eventId, user2Token, 1, 3);
    if (!rating2Result.ok) throw new Error(`Failed to submit rating: ${rating2Result.data}`);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickUsersTab(page);
    const table = tabPanel.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(tabPanel.locator('table tbody tr')).not.toHaveCount(0, { timeout: 10000 });
    
    const userHeader = tabPanel.getByRole('columnheader', { name: /user/i });
    await expect(userHeader).toBeVisible();
    await userHeader.click();
    
    const getFirstCellTexts = async () => {
      return tabPanel.locator('table tbody tr td:first-child').allTextContents();
    };
    
    // Brief wait for React to apply the sort from the first click
    await expect(tabPanel.locator('table tbody tr')).not.toHaveCount(0, { timeout: 5000 });
    const afterFirstSort = await getFirstCellTexts();

    await userHeader.click();

    // Second click toggles sort direction — order must change
    await expect(async () => {
      const afterSecondSort = await getFirstCellTexts();
      expect(afterSecondSort).not.toEqual(afterFirstSort);
    }).toPass({ timeout: 5000 });
  });

  test('users table default sort is by email ascending', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const configResult = await configureItems(eventId, token, 5);
    expect(configResult.ok).toBe(true);
    await startEvent(eventId, token);
    
    const user1Token = await getUserToken(eventId, 'zack@example.com', pin);
    const rating1Result = await submitRating(eventId, user1Token, 1, 4);
    if (!rating1Result.ok) throw new Error(`Failed to submit rating: ${rating1Result.data}`);
    
    const user2Token = await getUserToken(eventId, 'anna@example.com', pin);
    const rating2Result = await submitRating(eventId, user2Token, 1, 3);
    if (!rating2Result.ok) throw new Error(`Failed to submit rating: ${rating2Result.data}`);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    const tabPanel = await clickUsersTab(page);
    const table = tabPanel.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(tabPanel.locator('table tbody tr')).not.toHaveCount(0, { timeout: 10000 });
    
    // admin@example.com sorts before anna@example.com
    const firstRow = tabPanel.locator('table tbody tr').first();
    await expect(firstRow).toContainText(/admin/i, { timeout: 10000 });
    
    const secondRow = tabPanel.locator('table tbody tr').nth(1);
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
    
    // Click on Users tab and wait for content to load
    const usersTab = page.getByRole('tab', { name: /users/i });
    await usersTab.click();
    
    // Wait for the testuser row to appear in the users table
    const userRow = page.locator('table tbody tr').filter({ hasText: /testuser/i });
    await expect(userRow.first()).toBeVisible({ timeout: 10000 });
    await userRow.first().click();
    
    // Verify a drawer/dialog opened with user-related content (not a bottle details drawer)
    await expect(async () => {
      const dialogs = page.locator('[role="dialog"]');
      const count = await dialogs.count();
      let found = false;
      for (let i = 0; i < count; i++) {
        const text = await dialogs.nth(i).textContent();
        if (/testuser/i.test(text)) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    }).toPass({ timeout: 10000 });
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
    
    // With only an admin and no ratings, stats should show 0 or N/A for rating-related fields
    await expect(main.getByText(/^0$|^N\/A$/).first()).toBeVisible();
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

  test('refresh button triggers data refetch without errors', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText(/total users/i)).toBeVisible({ timeout: 10000 });

    // Click refresh and verify a dashboard-specific API call is made
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes(`/api/events/${eventId}`) && resp.request().method() === 'GET'
    );
    await refreshButton.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Verify the dashboard content is still rendered after refresh
    await expect(page.getByText(/total users/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/total.*(bottles|items)/i)).toBeVisible({ timeout: 5000 });
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
    await dismissGuestWelcomeSheet(page);
    
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
