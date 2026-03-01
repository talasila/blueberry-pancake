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

test.describe('Administrator Management', () => {
  // Each test performs its own setup (addAdminToEvent + setAuthToken + goto) rather
  // than using beforeEach, because the admin/email combinations vary per scenario.

  // ===================================
  // User Story 1 - Add New Administrator
  // ===================================

  test('admin page shows administrators management section', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    const adminsSection = page.getByRole('button', { name: /administrator/i });
    await expect(adminsSection).toBeVisible({ timeout: 10000 });
  });

  test('can add new administrator with valid email', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    // Find admin email input in drawer
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('newadmin@example.com');
    
    // Click add button
    const addButton = page.getByRole('button', { name: /add/i });
    await addButton.click();
    
    // New admin should appear in list (scoped to drawer)
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText('newadmin@example.com')).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid email format', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('invalid-email');
    
    const addButton = page.getByRole('button', { name: /add/i });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();
    
    // Should show validation error inside the dialog
    const drawer = page.locator('[role="dialog"]');
    const errorMessage = drawer.getByText(/invalid email/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('shows error when adding duplicate administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill(adminEmail);
    
    const addButton = page.getByRole('button', { name: /add/i });
    await addButton.click();
    
    // Scope to the dialog to avoid matching the event name in the header
    const drawer = page.locator('[role="dialog"]');
    const duplicateError = drawer.getByText(/already exists/i);
    await expect(duplicateError).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Delete Administrator
  // ===================================

  test('can delete non-owner administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Add second admin
    await addAdminToEvent(eventId, 'second@example.com');
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    const drawer = page.locator('[role="dialog"]');
    const deleteButton = drawer.getByRole('button', { name: /delete.*second@example\.com/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    
    const dialogPromise = new Promise((resolve) => {
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toMatch(/delete|remove/i);
        await dialog.accept();
        resolve();
      });
    });
    await deleteButton.click();
    await dialogPromise;
    
    // Second admin should be removed
    await expect(drawer.getByText('second@example.com')).not.toBeVisible({ timeout: 5000 });
  });

  test('cannot delete owner administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const secondAdmin = 'second@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    await addAdminToEvent(eventId, secondAdmin);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 10000 });

    // The owner delete button should be present (the app shows it) but clicking it
    // should be rejected server-side, leaving the owner in place.
    const deleteButton = drawer.getByRole('button', { name: /delete.*owner@example\.com/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    const dialogPromise = new Promise((resolve) => {
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toMatch(/delete|remove/i);
        await dialog.accept();
        resolve();
      });
    });
    await deleteButton.first().click();
    await dialogPromise;

    // Owner should still be present after the delete attempt
    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 5000 });
  });

  test('cannot delete last administrator', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 10000 });

    const deleteButton = drawer.getByRole('button', { name: /delete.*owner@example\.com/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    const dialogPromise = new Promise((resolve) => {
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toMatch(/delete|remove/i);
        await dialog.accept();
        resolve();
      });
    });
    await deleteButton.first().click();
    await dialogPromise;

    // Last admin should still be present after the delete attempt
    await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 3 - View Administrators List
  // ===================================

  test('displays list of all administrators', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Add more admins
    await addAdminToEvent(eventId, 'admin2@example.com');
    await addAdminToEvent(eventId, 'admin3@example.com');
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    // All admins should be visible in drawer
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText('owner@example.com')).toBeVisible({ timeout: 5000 });
    await expect(drawer.getByText('admin2@example.com')).toBeVisible();
    await expect(drawer.getByText('admin3@example.com')).toBeVisible();
  });

  test('owner administrator is clearly marked', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    // Owner should have a special indicator badge (scoped to drawer)
    const drawer = page.locator('[role="dialog"]');
    const ownerBadge = drawer.getByText('Owner', { exact: true });
    await expect(ownerBadge).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles email with extra whitespace', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('  newadmin@example.com  ');
    
    const addButton = page.getByRole('button', { name: /add/i });
    await addButton.click();
    
    // Should be trimmed and added correctly (scoped to drawer)
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText('newadmin@example.com')).toBeVisible({ timeout: 5000 });
  });

  test('email comparison is case-insensitive', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('OWNER@EXAMPLE.COM');
    
    const addButton = page.getByRole('button', { name: /add/i });
    await addButton.click();
    
    // Should recognize as duplicate (case-insensitive match) — scope to dialog
    const drawer = page.locator('[role="dialog"]');
    const duplicateError = drawer.getByText(/already exists/i);
    await expect(duplicateError).toBeVisible({ timeout: 5000 });
  });
});
