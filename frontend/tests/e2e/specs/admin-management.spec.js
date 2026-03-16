/**
 * Administrator Management Tests
 * 
 * Tests the functionality for adding and removing event administrators.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
  BASE_URL,
} from './helpers.js';

/**
 * Open the Administrators drawer for a given admin on the admin page.
 */
async function openAdminsDrawer(page, eventId, email) {
  const token = await addAdminToEvent(eventId, email);
  await setAuthToken(page, token, email);
  await page.goto(`${BASE_URL}/event/${eventId}/admin`);
  const peopleButton = page.getByRole('button', { name: /people/i });
  await peopleButton.waitFor({ state: 'visible', timeout: 10000 });
  await peopleButton.click();
  const drawer = page.getByRole('dialog', { name: /people/i });
  await drawer.waitFor({ state: 'visible', timeout: 5000 });
  const adminsTab = drawer.getByRole('tab', { name: /admins/i });
  await adminsTab.click();
}

/**
 * Set up a confirm dialog handler that accepts, validates the message, and
 * resolves/rejects the returned promise.
 */
function acceptConfirmDialog(page, messagePattern) {
  return new Promise((resolve, reject) => {
    page.once('dialog', async (dialog) => {
      try {
        expect(dialog.message()).toMatch(messagePattern);
        await dialog.accept();
        resolve();
      } catch (e) { reject(e); }
    });
  });
}

test.describe('Administrator Management', () => {

  // ===================================
  // User Story 1 - Add New Administrator
  // ===================================

  test('admin page shows administrators management section', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    const peopleSection = page.getByRole('button', { name: /people/i });
    await expect(peopleSection).toBeVisible({ timeout: 10000 });
  });

  test('can add new administrator with valid email', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await openAdminsDrawer(page, eventId, 'owner@example.com');
    
    const drawer = page.locator('[role="dialog"]');
    const emailInput = drawer.locator('input[type="email"]').or(drawer.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('newadmin@example.com');
    
    await drawer.getByRole('button', { name: /add/i }).click();
    
    await expect(drawer.getByText('newadmin@example.com')).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid email format', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await openAdminsDrawer(page, eventId, 'owner@example.com');
    
    const drawer = page.locator('[role="dialog"]');
    const emailInput = drawer.locator('input[type="email"]').or(drawer.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('invalid-email');
    
    const addButton = drawer.getByRole('button', { name: /add/i });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();
    
    await expect(drawer.getByText(/invalid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows error when adding duplicate administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    await openAdminsDrawer(page, eventId, adminEmail);
    
    const drawer = page.locator('[role="dialog"]');
    const emailInput = drawer.locator('input[type="email"]').or(drawer.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill(adminEmail);
    
    await drawer.getByRole('button', { name: /add/i }).click();
    
    await expect(drawer.getByText(/already exists/i)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Delete Administrator
  // ===================================

  test('can delete non-owner administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    await addAdminToEvent(eventId, 'second@example.com');
    await openAdminsDrawer(page, eventId, adminEmail);
    
    const drawer = page.locator('[role="dialog"]');
    const deleteButton = drawer.getByRole('button', { name: /delete.*second@example\.com/i }).first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    
    const dialogPromise = acceptConfirmDialog(page, /delete|remove/i);
    await deleteButton.click();
    await dialogPromise;
    
    // Second admin should be removed
    await expect(drawer.getByText('second@example.com')).not.toBeVisible({ timeout: 5000 });
  });

  test('cannot delete owner administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    await addAdminToEvent(eventId, 'second@example.com');
    await openAdminsDrawer(page, eventId, adminEmail);
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 10000 });

    const deleteButton = drawer.getByRole('button', { name: /delete.*owner@example\.com/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    const dialogPromise = acceptConfirmDialog(page, /delete|remove/i);
    await deleteButton.first().click();
    await dialogPromise;

    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 5000 });
  });

  test('cannot delete last administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    await openAdminsDrawer(page, eventId, adminEmail);
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 10000 });

    const deleteButton = drawer.getByRole('button', { name: /delete.*owner@example\.com/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    const dialogPromise = acceptConfirmDialog(page, /delete|remove/i);
    await deleteButton.first().click();
    await dialogPromise;

    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 3 - View Administrators List
  // ===================================

  test('displays list of all administrators', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await addAdminToEvent(eventId, 'admin2@example.com');
    await addAdminToEvent(eventId, 'admin3@example.com');
    await openAdminsDrawer(page, eventId, 'owner@example.com');
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText('owner@example.com')).toBeVisible({ timeout: 5000 });
    await expect(drawer.getByText('admin2@example.com')).toBeVisible();
    await expect(drawer.getByText('admin3@example.com')).toBeVisible();
  });

  test('owner administrator is clearly marked', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await openAdminsDrawer(page, eventId, 'owner@example.com');
    
    const drawer = page.locator('[role="dialog"]');
    const ownerBadge = drawer.getByText('Owner', { exact: true });
    await expect(ownerBadge).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles email with extra whitespace', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await openAdminsDrawer(page, eventId, 'owner@example.com');
    
    const drawer = page.locator('[role="dialog"]');
    const emailInput = drawer.locator('input[type="email"]').or(drawer.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('  newadmin@example.com  ');
    
    await drawer.getByRole('button', { name: /add/i }).click();
    
    await expect(drawer.getByText('newadmin@example.com')).toBeVisible({ timeout: 5000 });
  });

  test('email comparison is case-insensitive', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await openAdminsDrawer(page, eventId, 'owner@example.com');
    
    const drawer = page.locator('[role="dialog"]');
    const emailInput = drawer.locator('input[type="email"]').or(drawer.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('OWNER@EXAMPLE.COM');
    
    await drawer.getByRole('button', { name: /add/i }).click();
    
    await expect(drawer.getByText(/already exists/i)).toBeVisible({ timeout: 5000 });
  });
});
