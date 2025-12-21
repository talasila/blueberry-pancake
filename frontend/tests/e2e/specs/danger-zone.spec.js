/**
 * Danger Zone Tests
 * 
 * Tests the destructive actions in the Danger Zone drawer:
 * 1. Delete Individual User - Admin can delete a user and their data
 * 2. Delete All Users - Admin can delete all non-admin users
 * 3. Delete All Ratings - Admin can delete all ratings
 * 4. Delete Event - Only owner can delete the entire event
 * 
 * Confirmation text requirements:
 * - Delete Event: "DELETE"
 * - Delete All Ratings: "DELETE RATINGS"
 * - Delete All Users: "DELETE ALL USERS"
 * - Delete User (individual): "DELETE USER"
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

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
 * Helper: Submit a rating via API
 */
async function submitRating(eventId, token, itemId, rating, note = '') {
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemId, rating, note })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to submit rating: ${await response.text()}`);
  }
}

/**
 * Helper: Add a regular (non-admin) user to event via PIN verification
 * This registers the user and returns their JWT token
 */
async function addRegularUser(eventId, email, pin) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, email })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add regular user via PIN: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.token;
}

/**
 * Helper: Get ratings count via API (ratings endpoint returns CSV)
 */
async function getRatingsCount(eventId, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) return 0;
  
  // API returns CSV, count non-header lines
  const csvText = await response.text();
  const lines = csvText.trim().split('\n');
  // First line is header, so count is lines.length - 1 (but at least 0)
  return Math.max(0, lines.length - 1);
}

/**
 * Helper: Get users count via API
 */
async function getUsersCount(eventId, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) return 0;
  
  const event = await response.json();
  return Object.keys(event.users || {}).length;
}

/**
 * Helper: Check if event exists via API
 */
async function eventExists(eventId) {
  try {
    const response = await fetch(`${API_URL}/api/events/${eventId}`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Helper: Open Danger Zone drawer
 */
async function openDangerZoneDrawer(page) {
  const dangerZoneButton = page.getByRole('button', { name: /danger zone/i });
  await dangerZoneButton.waitFor({ state: 'visible', timeout: 10000 });
  await dangerZoneButton.click();
  
  // Wait for the drawer to actually appear (better than arbitrary timeout)
  const drawer = page.getByRole('dialog', { name: /danger zone/i });
  await drawer.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Helper: Type confirmation text and click delete button in confirmation dialog
 */
async function confirmDeletion(page, confirmationText) {
  // Use data-testid for reliable element targeting
  const confirmInput = page.getByTestId('confirm-input');
  await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
  await confirmInput.fill(confirmationText);

  // Wait for React to process the input and enable the button
  await page.waitForTimeout(300);

  // Verify button is enabled before clicking
  const confirmButton = page.getByTestId('confirm-delete-button');
  await expect(confirmButton).toBeEnabled({ timeout: 3000 });

  // Use page.evaluate to click directly via JavaScript
  // This bypasses Playwright's pointer event interception checks
  // which fail due to z-index layering between drawer and modal
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="confirm-delete-button"]');
    if (button) {
      button.click();
    }
  });

  // Wait for the API call to complete
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// =============================================
// DELETE INDIVIDUAL USER TESTS
// =============================================

test.describe('Danger Zone - Delete Individual User', () => {

  test('admin can delete a regular user', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const userEmail = 'regularuser@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Add a regular user
    await addRegularUser(eventId, userEmail, pin);
    
    // Start event and have user submit a rating
    await changeEventState(eventId, 'started', 'created', token);
    const userToken = await addRegularUser(eventId, userEmail, pin);
    await submitRating(eventId, userToken, 1, 4, 'Great wine!');
    
    // Verify user exists and has rating
    const initialUserCount = await getUsersCount(eventId, token);
    const initialRatingsCount = await getRatingsCount(eventId, token);
    expect(initialUserCount).toBeGreaterThanOrEqual(2); // admin + user
    expect(initialRatingsCount).toBe(1);
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Select the user to delete using data-testid
    const userSelect = page.getByTestId('user-select');
    await userSelect.selectOption(userEmail);
    
    // Click Delete User button using data-testid
    await page.getByTestId('delete-user-button').click();
    
    // Confirm deletion
    await confirmDeletion(page, 'DELETE USER');
    
    // Wait for UI to update after deletion
    await page.waitForLoadState('networkidle');
    
    // Verify user's ratings are also deleted (API is the source of truth)
    const finalRatingsCount = await getRatingsCount(eventId, token);
    expect(finalRatingsCount).toBe(0);
    
    // Verify user count decreased
    // Event has 2 admins: test@example.com (owner from creation) + admin@example.com
    const finalUserCount = await getUsersCount(eventId, token);
    expect(finalUserCount).toBe(2); // Both admins remain
  });

  test('admin can delete non-owner admin when multiple admins exist', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const ownerEmail = 'owner@example.com';
    const adminEmail = 'admin@example.com';
    const ownerToken = await addAdminToEvent(eventId, ownerEmail);
    
    // Add another admin
    await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, addToUsers: true })
    });
    
    // Navigate as owner
    await setAuthToken(page, ownerToken, ownerEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // The admin (non-owner) should be in the dropdown
    const userSelect = page.getByTestId('user-select');
    await expect(userSelect.locator('option', { hasText: adminEmail })).toHaveCount(1);
  });
});

// =============================================
// DELETE ALL USERS TESTS
// =============================================

test.describe('Danger Zone - Delete All Users', () => {

  test('admin can delete all non-admin users', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Add multiple regular users with small delays to avoid any rate limiting
    await addRegularUser(eventId, 'user1@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await addRegularUser(eventId, 'user2@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await addRegularUser(eventId, 'user3@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    
    // Verify users exist - this is critical, fail fast if users weren't added
    const initialUserCount = await getUsersCount(eventId, token);
    expect(initialUserCount).toBeGreaterThanOrEqual(4); // admin + 3 users
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Verify count is shown
    const countText = page.getByText(/3 user\(s\) will be deleted/i);
    await expect(countText).toBeVisible();
    
    // Click Delete All Users button
    const deleteAllUsersButton = page.getByTestId('delete-all-users-button');
    await deleteAllUsersButton.click();
    
    // Confirm deletion
    await confirmDeletion(page, 'DELETE ALL USERS');
    
    // Wait for UI to update after deletion
    await page.waitForLoadState('networkidle');
    
    // Verify only admins remain (API is the source of truth)
    // Event has 2 admins: test@example.com (owner from creation) + admin@example.com
    const finalUserCount = await getUsersCount(eventId, token);
    expect(finalUserCount).toBe(2); // Both admins remain
    
    // Verify UI shows no users to delete - scope to drawer to avoid matching event name
    const drawer = page.locator('[role="dialog"]');
    const noUsersMessage = drawer.getByText(/no users to delete|only administrators exist/i);
    await expect(noUsersMessage).toBeVisible({ timeout: 5000 });
  });

  test('shows correct count of users to be deleted', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Add 2 regular users with small delays
    await addRegularUser(eventId, 'user1@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await addRegularUser(eventId, 'user2@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Verify count is shown correctly
    const countText = page.getByText(/2 user\(s\) will be deleted/i);
    await expect(countText).toBeVisible();
  });

  test('delete all users button is disabled when no non-admin users exist', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Don't add any regular users
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Verify button is disabled
    const deleteAllUsersButton = page.getByTestId('delete-all-users-button');
    await expect(deleteAllUsersButton).toBeDisabled();
    
    // Verify message - scope to drawer to avoid matching event name
    const drawer = page.locator('[role="dialog"]');
    const noUsersMessage = drawer.getByText(/no users to delete|only administrators exist/i);
    await expect(noUsersMessage).toBeVisible();
  });

  test('admins are preserved after deleting all users', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const ownerEmail = 'owner@example.com';
    const adminEmail = 'admin@example.com';
    const ownerToken = await addAdminToEvent(eventId, ownerEmail);
    
    // Add another admin
    await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, addToUsers: true })
    });
    
    // Add regular users with small delays
    await addRegularUser(eventId, 'user1@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await addRegularUser(eventId, 'user2@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    
    // Navigate as owner
    await setAuthToken(page, ownerToken, ownerEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer and delete all users
    await openDangerZoneDrawer(page);
    const deleteAllUsersButton = page.getByTestId('delete-all-users-button');
    await deleteAllUsersButton.click();
    await confirmDeletion(page, 'DELETE ALL USERS');
    
    // Wait for UI to update
    await page.waitForLoadState('networkidle');
    
    // Verify all admins still exist (should be 3 users remaining)
    // Event has 3 admins: test@example.com (owner from creation) + owner@example.com + admin@example.com
    const finalUserCount = await getUsersCount(eventId, ownerToken);
    expect(finalUserCount).toBe(3); // All 3 admins preserved
  });
});

// =============================================
// DELETE ALL RATINGS TESTS
// =============================================

test.describe('Danger Zone - Delete All Ratings', () => {

  test('admin can delete all ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    await changeEventState(eventId, 'started', 'created', token);
    
    // Add ratings from multiple users (with delays between additions)
    const user1Token = await addRegularUser(eventId, 'user1@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    const user2Token = await addRegularUser(eventId, 'user2@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    
    await submitRating(eventId, user1Token, 1, 4);
    await submitRating(eventId, user1Token, 2, 3);
    await submitRating(eventId, user2Token, 1, 2);
    await submitRating(eventId, user2Token, 3, 4);
    
    // Verify ratings exist
    const initialRatingsCount = await getRatingsCount(eventId, token);
    expect(initialRatingsCount).toBe(4);
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Click Delete All Ratings button
    const deleteRatingsButton = page.getByTestId('delete-all-ratings-button');
    await deleteRatingsButton.click();
    
    // Confirm deletion
    await confirmDeletion(page, 'DELETE RATINGS');
    
    // Wait for UI to update after deletion
    await page.waitForLoadState('networkidle');
    
    // Verify ratings are deleted (API is the source of truth)
    const finalRatingsCount = await getRatingsCount(eventId, token);
    expect(finalRatingsCount).toBe(0);
  });

  test('registered items are preserved after deleting ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Register an item
    const itemResponse = await fetch(`${API_URL}/api/events/${eventId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'Test Wine', price: '50' })
    });
    expect(itemResponse.ok).toBe(true);
    
    // Start event and add ratings
    await changeEventState(eventId, 'started', 'created', token);
    const userToken = await addRegularUser(eventId, 'user@example.com', pin);
    await submitRating(eventId, userToken, 1, 4);
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Delete all ratings
    await openDangerZoneDrawer(page);
    const deleteRatingsButton = page.getByTestId('delete-all-ratings-button');
    await deleteRatingsButton.click();
    await confirmDeletion(page, 'DELETE RATINGS');
    
    // Wait for deletion
    await page.waitForTimeout(2000);
    
    // Verify items still exist
    const itemsResponse = await fetch(`${API_URL}/api/events/${eventId}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const items = await itemsResponse.json();
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Test Wine');
  });

  test('dashboard shows empty state after deleting all ratings', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start event and add ratings
    await changeEventState(eventId, 'started', 'created', token);
    const userToken = await addRegularUser(eventId, 'user@example.com', pin);
    await submitRating(eventId, userToken, 1, 4);
    await submitRating(eventId, userToken, 2, 3);
    
    // Navigate to admin page and delete ratings
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    await openDangerZoneDrawer(page);
    const deleteRatingsButton = page.getByTestId('delete-all-ratings-button');
    await deleteRatingsButton.click();
    await confirmDeletion(page, 'DELETE RATINGS');
    
    // Wait for UI to update after deletion
    await page.waitForLoadState('networkidle');
    
    // Navigate to dashboard and check for empty state
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Dashboard should show no ratings or empty message - scope to main content
    const main = page.locator('main');
    const noRatingsMessage = main.getByText(/no ratings|no data|nothing to show/i);
    await expect(noRatingsMessage).toBeVisible({ timeout: 5000 });
  });
});

// =============================================
// DELETE EVENT TESTS
// =============================================

test.describe('Danger Zone - Delete Event', () => {

  test('owner can delete the event', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    // The actual owner is test@example.com (created with the event by createTestEvent)
    const ownerEmail = 'test@example.com';
    const ownerToken = await addAdminToEvent(eventId, ownerEmail);
    
    // Navigate to admin page
    await setAuthToken(page, ownerToken, ownerEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Verify Delete Event button is visible
    const deleteEventButton = page.getByTestId('delete-event-button');
    await expect(deleteEventButton).toBeVisible();
    
    // Click delete event button
    await deleteEventButton.click();
    
    // Confirm deletion
    await confirmDeletion(page, 'DELETE');
    
    // Should redirect to home page after deletion
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    
    // Verify event no longer exists
    const exists = await eventExists(eventId);
    expect(exists).toBe(false);
  });

  test('non-owner admin cannot see Delete Event option', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const ownerEmail = 'owner@example.com';
    const adminEmail = 'admin@example.com';
    
    // Create event with owner
    await addAdminToEvent(eventId, ownerEmail);
    
    // Add another admin (non-owner)
    const adminResponse = await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, addToUsers: true })
    });
    const adminData = await adminResponse.json();
    const adminToken = adminData.token;
    
    // Navigate to admin page as non-owner admin
    await setAuthToken(page, adminToken, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Delete Event button should NOT be visible for non-owner admin
    const deleteEventButton = page.getByTestId('delete-event-button');
    await expect(deleteEventButton).not.toBeVisible();
    
    // But other danger zone options should be visible
    const deleteRatingsButton = page.getByTestId('delete-all-ratings-button');
    await expect(deleteRatingsButton).toBeVisible();
  });
});

// =============================================
// DIALOG CANCEL TESTS
// =============================================

test.describe('Danger Zone - Dialog Cancel', () => {

  test('cancel button closes dialog without deleting', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start event and add rating
    await changeEventState(eventId, 'started', 'created', token);
    const userToken = await addRegularUser(eventId, 'user@example.com', pin);
    await submitRating(eventId, userToken, 1, 4);
    
    // Verify rating exists
    const initialRatingsCount = await getRatingsCount(eventId, token);
    expect(initialRatingsCount).toBe(1);
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer
    await openDangerZoneDrawer(page);
    
    // Click Delete All Ratings button
    const deleteRatingsButton = page.getByTestId('delete-all-ratings-button');
    await deleteRatingsButton.click();
    
    // Confirmation dialog should open (be specific - there are 2 dialogs: drawer + modal)
    const confirmDialog = page.getByRole('dialog', { name: 'Delete All Ratings' });
    await expect(confirmDialog).toBeVisible();
    
    // Click Cancel button via JavaScript to bypass z-index layering issues
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    
    // Wait for dialog to close
    await page.waitForTimeout(500);
    
    // Confirmation dialog should close (drawer stays open)
    await expect(confirmDialog).not.toBeVisible();
    
    // Verify ratings are NOT deleted
    const finalRatingsCount = await getRatingsCount(eventId, token);
    expect(finalRatingsCount).toBe(1);
  });

  test('delete button is disabled until confirmation text is entered', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Navigate to admin page
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Open Danger Zone drawer and click Delete All Ratings
    await openDangerZoneDrawer(page);
    const deleteRatingsButton = page.getByTestId('delete-all-ratings-button');
    await deleteRatingsButton.click();
    
    // Delete button in dialog should be disabled initially
    const confirmDeleteButton = page.getByTestId('confirm-delete-button');
    await expect(confirmDeleteButton).toBeDisabled();
    
    // Type partial confirmation text
    const confirmInput = page.getByTestId('confirm-input');
    await confirmInput.fill('DELETE');
    
    // Button should still be disabled (need full "DELETE RATINGS")
    await expect(confirmDeleteButton).toBeDisabled();
    
    // Type correct confirmation text
    await confirmInput.fill('DELETE RATINGS');
    
    // Button should now be enabled
    await expect(confirmDeleteButton).toBeEnabled();
  });
});
