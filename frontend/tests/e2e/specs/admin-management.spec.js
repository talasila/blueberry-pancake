/**
 * Administrator Management Tests
 * 
 * Tests the functionality for adding and removing event administrators.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test.describe('Administrator Management', () => {

  // ===================================
  // User Story 1 - Add New Administrator
  // ===================================

  test('admin page shows administrators management section', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Look for administrators section
    const adminsSection = page.getByText(/administrator/i);
    await expect(adminsSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('can add new administrator with valid email', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
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
    const { eventId, pin } = testEvent;
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
    await addButton.click({ force: true });
    
    // Should show validation error inside the dialog
    const drawer = page.locator('[role="dialog"]');
    const errorMessage = drawer.getByText(/invalid email/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('shows error when adding duplicate administrator', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
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
    const { eventId, pin } = testEvent;
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
    
    // Accept the native window.confirm() dialog that appears on click
    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();
    
    // Second admin should be removed
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer.getByText('second@example.com')).not.toBeVisible({ timeout: 5000 });
  });

  test('cannot delete owner administrator', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    // Owner should be marked and not deletable
    const ownerRow = page.locator('text=owner@example.com').locator('..');
    const deleteButton = ownerRow.getByRole('button', { name: /delete|remove/i });
    
    // Delete button should be disabled or not present for owner
    const deleteButtonCount = await deleteButton.count();
    if (deleteButtonCount > 0) {
      await expect(deleteButton).toBeDisabled();
    } else {
      expect(deleteButtonCount).toBe(0);
    }
  });

  test('cannot delete last administrator', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    
    // With only one admin (owner), the delete button should be disabled or absent
    const ownerRow = page.locator('text=owner@example.com').locator('..');
    const deleteButton = ownerRow.getByRole('button', { name: /delete|remove/i });
    
    const deleteButtonCount = await deleteButton.count();
    if (deleteButtonCount > 0) {
      await expect(deleteButton).toBeDisabled();
    } else {
      // Delete button is not rendered at all — that's the expected behavior
      expect(deleteButtonCount).toBe(0);
    }
  });

  // ===================================
  // User Story 3 - View Administrators List
  // ===================================

  test('displays list of all administrators', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
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
    const { eventId, pin } = testEvent;
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
    const { eventId, pin } = testEvent;
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
    const { eventId, pin } = testEvent;
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
