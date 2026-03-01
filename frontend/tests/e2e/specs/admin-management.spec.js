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
    
    // New admin should appear in list
    await expect(page.getByText('newadmin@example.com')).toBeVisible({ timeout: 5000 });
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
    
    // Find delete button for second admin by its accessible name
    const deleteButton = page.getByRole('button', { name: /delete.*second@example\.com/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/delete|remove/i);
      await dialog.accept();
    });
    await deleteButton.click();
    
    // Second admin should be removed
    const drawer = page.locator('[role="dialog"]');
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
    const deleteButton = page.getByRole('button', { name: /delete.*owner@example\.com/i });
    const count = await deleteButton.count();
    if (count > 0) {
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toMatch(/delete|remove/i);
        await dialog.accept();
      });
      await deleteButton.first().click();
      await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 5000 });
    } else {
      await expect(drawer.getByText(adminEmail)).toBeVisible();
      await expect(deleteButton).toHaveCount(0);
    }
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
    const deleteButton = page.getByRole('button', { name: /delete.*owner@example\.com/i });
    const count = await deleteButton.count();
    if (count > 0) {
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toMatch(/delete|remove/i);
        await dialog.accept();
      });
      await deleteButton.first().click();
      await expect(drawer.getByText(adminEmail)).toBeVisible({ timeout: 5000 });
    } else {
      await expect(drawer.getByText(adminEmail)).toBeVisible();
      await expect(deleteButton).toHaveCount(0);
    }
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
    await expect(page.getByText('owner@example.com')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('admin2@example.com')).toBeVisible();
    await expect(page.getByText('admin3@example.com')).toBeVisible();
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
    
    // Owner should have a special indicator badge
    const ownerBadge = page.getByText('Owner', { exact: true });
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
    
    // Should be trimmed and added correctly
    await expect(page.getByText('newadmin@example.com')).toBeVisible({ timeout: 5000 });
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
