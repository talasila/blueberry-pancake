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
 * Helper: Change event state via API
 */
async function changeEventState(eventId, newState, currentState, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ state: newState, currentState })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to change state: ${await response.text()}`);
  }
}

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
    body: JSON.stringify(itemData)
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
    body: JSON.stringify({ itemId: itemIdToAssign })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to assign item ID: ${await response.text()}`);
  }
  
  return response.json();
}

/**
 * Helper: Get items via API
 */
async function getItemsViaAPI(eventId, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/items`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get items: ${await response.text()}`);
  }
  
  return response.json();
}

/**
 * Helper: Navigate to Profile page and wait for it to load
 */
async function navigateToProfilePage(page, eventId) {
  await page.goto(`${BASE_URL}/event/${eventId}/profile`);
  await page.waitForLoadState('networkidle');
  
  // Wait for profile form to load
  await page.getByRole('heading', { name: /profile/i }).waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Helper: Open the Bottles drawer on admin page
 */
async function openBottlesDrawer(page) {
  const bottlesButton = page.getByRole('button', { name: /bottles/i });
  await bottlesButton.waitFor({ state: 'visible', timeout: 10000 });
  await bottlesButton.click();
  await page.waitForTimeout(500);
}

/**
 * Helper: Switch to Assignment tab in Bottles drawer
 */
async function switchToAssignmentTab(page) {
  const assignmentTab = page.getByRole('tab', { name: /assignment/i });
  await assignmentTab.waitFor({ state: 'visible', timeout: 5000 });
  await assignmentTab.click();
  await page.waitForTimeout(500);
}

// =============================================
// TEST SUITE
// =============================================

test.describe('Item Registration', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Item Assignment Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  test.afterAll(async () => {
    // Safety net cleanup
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  // ===================================
  // Item Registration State Tests
  // ===================================

  test('can register item when event is in "created" state', async ({ page }) => {
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, testEventId);
    
    // Look for "Add Bottle" button
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).toBeVisible();
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
    
    // Wait for success - item should appear in list
    await page.waitForTimeout(2000);
    
    // Verify item appears in the list
    const itemName = page.getByText('Test Wine 2020');
    await expect(itemName).toBeVisible();
  });

  test('can register item when event is in "started" state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event via API
    await changeEventState(testEventId, 'started', 'created', token);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, testEventId);
    
    // Look for "Add Bottle" button - should be visible in started state
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Fill in item form
    const nameInput = page.locator('input#itemName');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Started State Wine');
    
    // Submit the form
    const registerButton = page.getByRole('button', { name: /register bottle/i });
    await registerButton.click();
    
    // Wait for success
    await page.waitForTimeout(2000);
    
    // Verify item appears in the list
    const itemName = page.getByText('Started State Wine');
    await expect(itemName).toBeVisible();
  });

  test('cannot register item when event is in "paused" state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start then pause event via API
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'paused', 'started', token);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, testEventId);
    
    // "Add Bottle" button should NOT be visible in paused state
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).not.toBeVisible();
    
    // Should see a warning message about registration not available
    const warningMessage = page.getByText(/registration.*only available|not available/i);
    await expect(warningMessage).toBeVisible();
  });

  test('cannot register item when event is in "completed" state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start then complete event via API
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'completed', 'started', token);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Navigate to profile page
    await navigateToProfilePage(page, testEventId);
    
    // "Add Bottle" button should NOT be visible in completed state
    const addButton = page.getByRole('button', { name: /add bottle/i });
    await expect(addButton).not.toBeVisible();
    
    // Should see a warning message about registration not available
    const warningMessage = page.getByText(/registration.*only available|not available/i);
    await expect(warningMessage).toBeVisible();
  });
});

test.describe('Item Assignment', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Item Assignment Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  test.afterAll(async () => {
    // Safety net cleanup
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  // ===================================
  // Assignment Tab Availability Tests
  // ===================================

  test('assignment controls not available when event is "created"', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item first (event is in created state)
    await registerItemViaAPI(testEventId, { name: 'Test Wine' }, token);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Bottles drawer
    await openBottlesDrawer(page);
    
    // Switch to Assignment tab
    await switchToAssignmentTab(page);
    
    // Assignment dropdown should NOT be visible (not in paused state)
    // Look for the assignment select or a message indicating assignment is not available
    const assignmentMessage = page.getByText(/assignment.*paused|pause.*assign/i);
    await expect(assignmentMessage).toBeVisible();
  });

  test('assignment controls not available when event is "started"', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item first
    await registerItemViaAPI(testEventId, { name: 'Test Wine' }, token);
    
    // Start event
    await changeEventState(testEventId, 'started', 'created', token);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Bottles drawer
    await openBottlesDrawer(page);
    
    // Switch to Assignment tab
    await switchToAssignmentTab(page);
    
    // Assignment should not be available message
    const assignmentMessage = page.getByText(/assignment.*paused|pause.*assign/i);
    await expect(assignmentMessage).toBeVisible();
  });

  test('can assign item ID when event is "paused"', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item first
    const registeredItem = await registerItemViaAPI(testEventId, { 
      name: 'Chateau Test 2019',
      price: '50',
      description: 'A fine test wine'
    }, token);
    
    // Start then pause event
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'paused', 'started', token);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Bottles drawer
    await openBottlesDrawer(page);
    
    // Switch to Assignment tab
    await switchToAssignmentTab(page);
    
    // Wait for items to load
    await page.waitForTimeout(1000);
    
    // Find and click the item card to expand it (assignment dropdown only shows when expanded)
    const itemCard = page.locator('.cursor-pointer', { hasText: 'Chateau Test 2019' });
    await itemCard.click();
    await page.waitForTimeout(500);
    
    // Find the assignment dropdown inside the expanded section
    // It's a select with "Select ID" or "Clear assignment" option, NOT the filter dropdown
    const assignSelect = page.locator('select').filter({ hasText: /Select ID|Clear assignment/ });
    await assignSelect.waitFor({ state: 'visible', timeout: 5000 });
    
    // Select item ID 1
    await assignSelect.selectOption('1');
    
    // Wait for assignment to complete
    await page.waitForTimeout(2000);
    
    // Verify assignment was successful - check for success toast or visual indicator
    const successToast = page.getByText(/assigned successfully|assignment.*success/i);
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });

  test('can clear item ID assignment', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item
    const registeredItem = await registerItemViaAPI(testEventId, { 
      name: 'Clearable Wine'
    }, token);
    
    // Start, pause, and assign via API
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'paused', 'started', token);
    await assignItemIdViaAPI(testEventId, registeredItem.id, 5, token);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Bottles drawer and go to Assignment tab
    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);
    
    await page.waitForTimeout(1000);
    
    // Find and click the item card to expand it
    const itemCard = page.locator('.cursor-pointer', { hasText: 'Clearable Wine' });
    await itemCard.click();
    await page.waitForTimeout(500);
    
    // Find the assignment dropdown (should show current value)
    const assignSelect = page.locator('select').filter({ hasText: /Clear assignment/ });
    await assignSelect.waitFor({ state: 'visible', timeout: 5000 });
    await expect(assignSelect).toHaveValue('5');
    
    // Clear assignment by selecting empty option
    await assignSelect.selectOption('');
    
    // Wait for clear to complete
    await page.waitForTimeout(2000);
    
    // Verify clear was successful
    const clearToast = page.getByText(/cleared|assignment.*removed/i);
    await expect(clearToast).toBeVisible({ timeout: 5000 });
  });

  test('can reassign to different item ID', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item
    const registeredItem = await registerItemViaAPI(testEventId, { 
      name: 'Reassignable Wine'
    }, token);
    
    // Start, pause, and assign to ID 3
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'paused', 'started', token);
    await assignItemIdViaAPI(testEventId, registeredItem.id, 3, token);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Bottles drawer and go to Assignment tab
    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);
    
    await page.waitForTimeout(1000);
    
    // Find and click the item card to expand it
    const itemCard = page.locator('.cursor-pointer', { hasText: 'Reassignable Wine' });
    await itemCard.click();
    await page.waitForTimeout(500);
    
    // Find the assignment dropdown (should have value 3)
    const assignSelect = page.locator('select').filter({ hasText: /Clear assignment/ });
    await assignSelect.waitFor({ state: 'visible', timeout: 5000 });
    await expect(assignSelect).toHaveValue('3');
    
    // Reassign to ID 7
    await assignSelect.selectOption('7');
    
    // Wait for reassignment
    await page.waitForTimeout(2000);
    
    // Verify success
    const successToast = page.getByText(/assigned successfully|ID 7/i);
    await expect(successToast).toBeVisible({ timeout: 5000 });
    
    // Dropdown should now show 7
    await expect(assignSelect).toHaveValue('7');
  });

  test('available IDs exclude already-assigned IDs', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register two items
    const item1 = await registerItemViaAPI(testEventId, { name: 'Wine One' }, token);
    const item2 = await registerItemViaAPI(testEventId, { name: 'Wine Two' }, token);
    
    // Start, pause, and assign item1 to ID 5
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'paused', 'started', token);
    await assignItemIdViaAPI(testEventId, item1.id, 5, token);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Bottles drawer and go to Assignment tab
    await openBottlesDrawer(page);
    await switchToAssignmentTab(page);
    
    await page.waitForTimeout(1000);
    
    // Find and click Wine Two card to expand it
    const wineTwoCard = page.locator('.cursor-pointer', { hasText: 'Wine Two' });
    await wineTwoCard.click();
    await page.waitForTimeout(500);
    
    // Find the assignment dropdown for Wine Two
    const assignSelect = page.locator('select').filter({ hasText: /Select ID/ });
    await assignSelect.waitFor({ state: 'visible', timeout: 5000 });
    
    // Check that option 5 is NOT present (it's assigned to Wine One)
    const option5 = assignSelect.locator('option[value="5"]');
    await expect(option5).toHaveCount(0);
  });
});

test.describe('Item Details Integration', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Item Details Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  test.afterAll(async () => {
    // Safety net cleanup
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  // ===================================
  // Item Details Drawer Tests
  // ===================================

  test('shows registered item details in drawer after assignment', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item with full details
    const registeredItem = await registerItemViaAPI(testEventId, { 
      name: 'Grand Reserve 2018',
      price: '125.50',
      description: 'An exceptional vintage with notes of blackberry'
    }, token);
    
    // Start, pause, assign to ID 1, then complete
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'paused', 'started', token);
    await assignItemIdViaAPI(testEventId, registeredItem.id, 1, token);
    await changeEventState(testEventId, 'completed', 'paused', token);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Should be on event page in completed state
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
    await page.waitForLoadState('networkidle');
    
    // Click on item 1 to open details drawer
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    
    // Drawer should open
    await page.waitForTimeout(1000);
    
    // Should show the registered item name
    const itemName = page.getByText('Grand Reserve 2018');
    await expect(itemName).toBeVisible();
    
    // Should show the price
    const itemPrice = page.getByText(/125\.50|\$125/);
    await expect(itemPrice).toBeVisible();
    
    // Should show the description
    const itemDescription = page.getByText(/blackberry/i);
    await expect(itemDescription).toBeVisible();
  });

  test('shows "No item registered" message when no assignment', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start then complete event WITHOUT registering/assigning any items
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'completed', 'started', token);
    
    // Access event as regular user
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, testEventPin);
    
    // Should be on event page in completed state
    await expect(page).toHaveURL(new RegExp(`/event/${testEventId}$`));
    await page.waitForLoadState('networkidle');
    
    // Click on item 1 to open details drawer
    const itemButton = page.locator('button').filter({ hasText: '1' }).first();
    await itemButton.click();
    
    // Drawer should open
    await page.waitForTimeout(1000);
    
    // Should show "No item registered" message
    const noItemMessage = page.getByText(/no.*item.*registered|no.*bottle.*registered/i);
    await expect(noItemMessage).toBeVisible();
  });

  test('admin can view item details in drawer before event is completed', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item
    const registeredItem = await registerItemViaAPI(testEventId, { 
      name: 'Admin Preview Wine',
      price: '75'
    }, token);
    
    // Start, pause, and assign
    await changeEventState(testEventId, 'started', 'created', token);
    await changeEventState(testEventId, 'paused', 'started', token);
    await assignItemIdViaAPI(testEventId, registeredItem.id, 2, token);
    
    // Admin accesses dashboard page (where admin can view item details when paused)
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on the Bottles/Items tab
    const bottlesTab = page.getByRole('tab', { name: /bottles|items/i });
    await bottlesTab.click();
    await page.waitForTimeout(500);
    
    // Find and click on item ID 2 in the table
    const itemCell = page.getByRole('cell', { name: '2' }).or(
      page.locator('td', { hasText: /^2$/ })
    ).first();
    await itemCell.click();
    
    // Drawer should open and show item details for admin
    await page.waitForTimeout(1000);
    
    // Should show the registered item name
    const itemName = page.getByText('Admin Preview Wine');
    await expect(itemName).toBeVisible();
  });

  test('shows item details accessed from dashboard ratings table', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const userEmail = 'rater@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Register an item
    const registeredItem = await registerItemViaAPI(testEventId, { 
      name: 'Dashboard Access Wine',
      price: '90'
    }, token);
    
    // Start event
    await changeEventState(testEventId, 'started', 'created', token);
    
    // Add a rating via API to have data in dashboard
    const userToken = await addAdminToEvent(testEventId, userEmail);
    await fetch(`${API_URL}/api/events/${testEventId}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ itemId: 3, rating: 4, note: 'Great wine!' })
    });
    
    // Pause, assign, and complete
    await changeEventState(testEventId, 'paused', 'started', token);
    await assignItemIdViaAPI(testEventId, registeredItem.id, 3, token);
    await changeEventState(testEventId, 'completed', 'paused', token);
    
    // Access the dashboard page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Click on the Bottles/Items tab to see the ratings table
    const bottlesTab = page.getByRole('tab', { name: /bottles|items/i });
    await bottlesTab.click();
    await page.waitForTimeout(500);
    
    // Find and click on item ID 3 in the ratings table
    const itemCell = page.getByRole('cell', { name: '3' }).or(
      page.locator('td', { hasText: /^3$/ })
    ).first();
    await itemCell.click();
    
    // Drawer should open
    await page.waitForTimeout(1000);
    
    // Should show the registered item name
    const itemName = page.getByText('Dashboard Access Wine');
    await expect(itemName).toBeVisible();
  });
});
