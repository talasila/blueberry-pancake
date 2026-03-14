/**
 * Item/Bottle Assignment Tests
 * 
 * Tests the complete item registration and assignment workflow:
 * 1. Item registration on Profile page (created/started states only)
 * 2. Item ID assignment on Admin page (paused state only)
 * 3. Item details visibility in ItemDetailsDrawer (completed state)
 * 
 * Flow:
 * - Users register items (name, price, description) when event is "created" or "started"
 * - Admin assigns item IDs to registered items when event is "paused"
 * - Users view item details when event is "completed" (or admin at any time)
 */

import { test, expect } from './fixtures.js';
import {
  BASE_URL,
  API_URL,
  addAdminToEvent,
  getUserToken,
  submitRating,
  setAuthToken,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
  changeEventState,
  openBottlesDrawer,
} from './helpers.js';

/**
 * Helper: Register an item via API
 */
async function registerItemViaAPI(eventId, itemData, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(itemData),
    signal: AbortSignal.timeout(10000),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to register item: ${await response.text()}`);
  }
  
  return response.json();
}

/**
 * Helper: Assign item ID via API
 */
async function assignItemIdViaAPI(eventId, itemId, itemIdToAssign, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/items/${itemId}/assign-item-id`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemId: itemIdToAssign }),
    signal: AbortSignal.timeout(10000),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to assign item ID: ${await response.text()}`);
  }
  
  return response.json();
}

/**
 * Helper: Navigate to Profile page and wait for it to load
 */
async function navigateToProfilePage(page, eventId) {
  await page.goto(`${BASE_URL}/event/${eventId}/profile`);
  await page.getByRole('heading', { name: /profile/i }).waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Helper: Switch to Assignment tab in Bottles drawer
 */
async function switchToAssignmentTab(page) {
  const assignmentTab = page.getByRole('tab', { name: /assignment/i });
  await assignmentTab.waitFor({ state: 'visible', timeout: 5000 });
  await assignmentTab.click();
}

// =============================================
// TEST SUITE
// =============================================

test.describe('Item Registration', () => {

  // ===================================
  // Item Registration State Tests
  // ===================================

  test('can register item when event is in "created" state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, eventId);
    
    // Look for "Add Bottle" button (event context must load first)
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    
    // Fill in item form
    const nameInput = page.locator('input#itemName');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Test Wine 2020');
    
    const priceInput = page.locator('input#itemPrice');
    await priceInput.fill('$45.00');
    
    const descriptionInput = page.locator('textarea#itemDescription');
    await descriptionInput.fill('A lovely test wine');
    
    // Submit the form
    const registerButton = page.getByRole('button', { name: /register bottle/i });
    await registerButton.click();
    
    // Verify item appears in the list
    await expect(page.getByText('Test Wine 2020')).toBeVisible({ timeout: 10000 });
  });

  test('can register item when event is in "started" state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start event via API
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, eventId);
    
    // Look for "Add Bottle" button - should be visible in started state
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    
    // Fill in item form
    const nameInput = page.locator('input#itemName');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Started State Wine');
    
    // Submit the form
    const registerButton = page.getByRole('button', { name: /register bottle/i });
    await registerButton.click();
    
    // Verify item appears in the list
    await expect(page.getByText('Started State Wine')).toBeVisible({ timeout: 10000 });
  });

  test('cannot register item when event is in "paused" state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start then pause event via API
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, eventId);
    
    // Should see a warning message about registration not available (wait for event context to load)
    const main = page.locator('main');
    const warningMessage = main.getByText(/registration.*only available|not available/i);
    await expect(warningMessage).toBeVisible({ timeout: 10000 });

    // "Add Bottle" button should NOT be visible in paused state
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).not.toBeVisible();
  });

  test('cannot register item when event is in "completed" state', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start then complete event via API
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'completed', 'started', token)).ok).toBe(true);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, eventId);
    
    // Should see a warning message about registration not available (wait for event context to load)
    const main = page.locator('main');
    const warningMessage = main.getByText(/registration.*only available|not available/i);
    await expect(warningMessage).toBeVisible({ timeout: 10000 });

    // "Add Bottle" button should NOT be visible in completed state
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).not.toBeVisible();
  });
});

test.describe('Item Assignment', () => {

  // ===================================
  // Assignment Tab Availability Tests
  // ===================================

  test('assignment controls not available when event is "created"', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await registerItemViaAPI(eventId, { name: 'Test Wine' }, token);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);

    const drawer = page.locator('[role="dialog"]');
    const instruction = drawer.locator('[data-testid="instruction-text"]');
    await expect(instruction).toContainText(/Match each numbered/i);
    await expect(instruction).toContainText(/only available when the event is paused/i);

    const button1 = drawer.locator('[data-testid="assignment-button-1"]');
    await expect(button1).toBeVisible();
    await expect(button1).toBeDisabled();
  });

  test('assignment controls not available when event is "started"', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await registerItemViaAPI(eventId, { name: 'Test Wine' }, token);

    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);

    const drawer = page.locator('[role="dialog"]');
    const instruction = drawer.locator('[data-testid="instruction-text"]');
    await expect(instruction).toContainText(/Match each numbered/i);
    await expect(instruction).toContainText(/only available when the event is paused/i);

    const button1 = drawer.locator('[data-testid="assignment-button-1"]');
    await expect(button1).toBeVisible();
    await expect(button1).toBeDisabled();
  });

  test('can assign item ID when event is "paused"', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await registerItemViaAPI(eventId, {
      name: 'Chateau Test 2019',
      price: '50',
      description: 'A fine test wine'
    }, token);

    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);

    const drawer = page.locator('[role="dialog"]');

    // Tap unassigned number button to open the bottom sheet picker
    const button1 = drawer.locator('[data-testid="assignment-button-1"]');
    await expect(button1).toBeEnabled({ timeout: 5000 });
    await button1.click();

    // Bottom sheet should appear with the registered bottle
    const sheet = page.locator('[data-testid="bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet.getByText('Chateau Test 2019')).toBeVisible();

    // Tap the bottle to assign it
    await sheet.getByText('Chateau Test 2019').click();

    // Verify success toast
    const successToast = page.getByText(/assigned successfully/i);
    await expect(successToast).toBeVisible({ timeout: 10000 });
  });

  test('can clear item ID assignment', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const registeredItem = await registerItemViaAPI(eventId, {
      name: 'Clearable Wine'
    }, token);

    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);
    await assignItemIdViaAPI(eventId, registeredItem.id, 5, token);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);

    const drawer = page.locator('[role="dialog"]');

    // Tap the assigned number button to open review sheet
    const button5 = drawer.locator('[data-testid="assignment-button-5"]');
    await expect(button5).toBeEnabled({ timeout: 5000 });
    await button5.click();

    // Bottom sheet should show the assigned bottle with Clear option
    const sheet = page.locator('[data-testid="bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet.getByText('Clearable Wine', { exact: true })).toBeVisible();

    // Clear the assignment
    await sheet.locator('[data-testid="clear-assignment-btn"]').click();

    const clearToast = page.getByText(/cleared/i);
    await expect(clearToast).toBeVisible({ timeout: 10000 });
  });

  test('can reassign to different item ID', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const registeredItem = await registerItemViaAPI(eventId, {
      name: 'Reassignable Wine'
    }, token);

    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);
    await assignItemIdViaAPI(eventId, registeredItem.id, 3, token);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);

    const drawer = page.locator('[role="dialog"]');

    // Step 1: Clear the current assignment on #3
    const button3 = drawer.locator('[data-testid="assignment-button-3"]');
    await expect(button3).toBeEnabled({ timeout: 5000 });
    await button3.click();

    const sheet = page.locator('[data-testid="bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await sheet.locator('[data-testid="clear-assignment-btn"]').click();

    await expect(page.getByText(/cleared/i)).toBeVisible({ timeout: 10000 });

    // Step 2: Assign the bottle to a different number (#7)
    const button7 = drawer.locator('[data-testid="assignment-button-7"]');
    await expect(button7).toBeEnabled({ timeout: 5000 });
    await button7.click();

    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet.getByText('Reassignable Wine', { exact: true })).toBeVisible();
    await sheet.getByText('Reassignable Wine', { exact: true }).click();

    const successToast = page.getByText(/assigned successfully/i);
    await expect(successToast).toBeVisible({ timeout: 10000 });
  });

  test('available IDs exclude already-assigned IDs', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const item1 = await registerItemViaAPI(eventId, { name: 'Wine One' }, token);
    await registerItemViaAPI(eventId, { name: 'Wine Two' }, token);

    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);
    await assignItemIdViaAPI(eventId, item1.id, 5, token);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);

    const drawer = page.locator('[role="dialog"]');

    // Tap an unassigned number to open the bottom sheet picker
    const button1 = drawer.locator('[data-testid="assignment-button-1"]');
    await expect(button1).toBeEnabled({ timeout: 5000 });
    await button1.click();

    // Bottom sheet should only show Wine Two (Wine One is already assigned to #5)
    const sheet = page.locator('[data-testid="bottom-sheet"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet.getByText('Wine Two')).toBeVisible();
    await expect(sheet.getByText('Wine One')).not.toBeVisible();
  });
});

test.describe('Item Details Integration', () => {

  // ===================================
  // Item Details Drawer Tests
  // ===================================

  test('shows registered item details in drawer after assignment', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Register an item with full details
    const registeredItem = await registerItemViaAPI(eventId, { 
      name: 'Grand Reserve 2018',
      price: '125.50',
      description: 'An exceptional vintage with notes of blackberry'
    }, token);
    
    // Start, pause, assign to ID 1, then complete
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);
    await assignItemIdViaAPI(eventId, registeredItem.id, 1, token);
    expect((await changeEventState(eventId, 'completed', 'paused', token)).ok).toBe(true);
    
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on event page in completed state
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Click on item 1 to open details drawer
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
    await itemButton.click();
    
    // Should show the registered item name
    const itemName = page.getByText('Grand Reserve 2018');
    await expect(itemName).toBeVisible({ timeout: 10000 });
    
    // Should show the price
    const itemPrice = page.getByText(/125\.50|\$125/);
    await expect(itemPrice).toBeVisible();
    
    // Should show the description
    const itemDescription = page.getByText(/blackberry/i);
    await expect(itemDescription).toBeVisible();
  });

  test('shows "No item registered" message when no assignment', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start then complete event WITHOUT registering/assigning any items
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'completed', 'started', token)).ok).toBe(true);
    
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on event page in completed state
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Click on item 1 to open details drawer
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
    await itemButton.click();
    
    // Should show "No item registered" message - scope to the drawer to avoid matching event name
    const drawer = page.locator('[role="dialog"]');
    const noItemMessage = drawer.getByText(/no .+ registered or assigned/i);
    await expect(noItemMessage).toBeVisible({ timeout: 10000 });
  });

  test('admin can view item details in drawer before event is completed', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Register an item
    const registeredItem = await registerItemViaAPI(eventId, { 
      name: 'Admin Preview Wine',
      price: '75'
    }, token);
    
    // Start, pause, and assign
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);
    await assignItemIdViaAPI(eventId, registeredItem.id, 2, token);
    
    // Admin accesses dashboard page (where admin can view item details when paused)
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on the Bottles/Items tab
    const bottlesTab = page.getByRole('tab', { name: /bottles|items/i });
    await bottlesTab.click();
    
    // Find and click on item ID 2 card in the items list
    const itemCard = page.locator('button').filter({ hasText: /avg:/i }).filter({ hasText: '2' }).first();
    await expect(itemCard).toBeVisible({ timeout: 10000 });
    await itemCard.click();
    
    // Should show the registered item name
    const itemName = page.getByText('Admin Preview Wine');
    await expect(itemName).toBeVisible({ timeout: 10000 });
  });

  test('shows item details accessed from dashboard ratings table', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const userEmail = 'rater@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Register an item
    const registeredItem = await registerItemViaAPI(eventId, { 
      name: 'Dashboard Access Wine',
      price: '90'
    }, token);
    
    // Start event
    expect((await changeEventState(eventId, 'started', 'created', token)).ok).toBe(true);
    
    // Add a rating via API to have data in dashboard
    const userToken = await getUserToken(eventId, userEmail, pin);
    const ratingResult = await submitRating(eventId, userToken, 3, 4, 'Great wine!');
    expect(ratingResult.ok).toBe(true);
    
    // Pause, assign, and complete
    expect((await changeEventState(eventId, 'paused', 'started', token)).ok).toBe(true);
    await assignItemIdViaAPI(eventId, registeredItem.id, 3, token);
    expect((await changeEventState(eventId, 'completed', 'paused', token)).ok).toBe(true);
    
    // Access the dashboard page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    
    // Click on the Bottles/Items tab to see the ratings table
    const bottlesTab = page.getByRole('tab', { name: /bottles|items/i });
    await bottlesTab.click();
    
    // Find and click on item ID 3 card in the items list
    const itemCard = page.locator('button').filter({ hasText: /avg:/i }).filter({ hasText: '3' }).first();
    await expect(itemCard).toBeVisible({ timeout: 10000 });
    await itemCard.click();
    
    // Should show the registered item name
    const itemName = page.getByText('Dashboard Access Wine');
    await expect(itemName).toBeVisible({ timeout: 10000 });
  });
});
