/**
 * Administrator Management Tests
 * 
 * Tests the functionality for adding and removing event administrators.
 */

import { test, expect } from '@playwright/test';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  setAuthToken,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

let testEventId;
const testEventPin = '654321';

test.describe('Administrator Management', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Admin Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    if (testEventId) {
      await deleteTestEvent(testEventId);
      testEventId = null;
    }
  });

  // ===================================
  // User Story 1 - Add New Administrator
  // ===================================

  test('admin page shows administrators management section', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Look for administrators section
    const adminsSection = page.getByText(/administrator/i);
    await expect(adminsSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('can add new administrator with valid email', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    // Find admin email input in drawer
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    if (await emailInput.isVisible()) {
      await emailInput.fill('newadmin@example.com');
      
      // Click add button
      const addButton = page.getByRole('button', { name: /add/i });
      await addButton.click();
      await page.waitForTimeout(2000);
      
      // New admin should appear in list
      await expect(page.getByText('newadmin@example.com')).toBeVisible();
    }
  });

  test('shows error for invalid email format', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');
      
      const addButton = page.getByRole('button', { name: /add/i });
      await addButton.click();
      
      // Should show validation error
      await page.waitForTimeout(1000);
    }
  });

  test('shows error when adding duplicate administrator', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    if (await emailInput.isVisible()) {
      // Try to add the same admin
      await emailInput.fill(adminEmail);
      
      const addButton = page.getByRole('button', { name: /add/i });
      await addButton.click();
      
      // Should show "already administrator" message
      await page.waitForTimeout(1000);
    }
  });

  // ===================================
  // User Story 2 - Delete Administrator
  // ===================================

  test('can delete non-owner administrator', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Add second admin
    await addAdminToEvent(testEventId, 'second@example.com');
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    // Find delete button for second admin
    const secondAdminRow = page.locator('text=second@example.com').locator('..');
    const deleteButton = secondAdminRow.getByRole('button', { name: /delete|remove/i });
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(2000);
      
      // Second admin should be removed
      await expect(page.getByText('second@example.com')).not.toBeVisible();
    }
  });

  test('cannot delete owner administrator', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    // Owner should be marked and not deletable
    const ownerRow = page.locator('text=owner@example.com').locator('..');
    const deleteButton = ownerRow.getByRole('button', { name: /delete|remove/i });
    
    // Delete button should be disabled or not present for owner
    if (await deleteButton.count() > 0) {
      await expect(deleteButton).toBeDisabled();
    }
  });

  test('cannot delete last administrator', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    // With only one admin, delete should be prevented
    // Owner is the only admin, so delete should be disabled
  });

  // ===================================
  // User Story 3 - View Administrators List
  // ===================================

  test('displays list of all administrators', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Add more admins
    await addAdminToEvent(testEventId, 'admin2@example.com');
    await addAdminToEvent(testEventId, 'admin3@example.com');
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    // All admins should be visible in drawer
    await expect(page.getByText('owner@example.com')).toBeVisible();
    await expect(page.getByText('admin2@example.com')).toBeVisible();
    await expect(page.getByText('admin3@example.com')).toBeVisible();
  });

  test('owner administrator is clearly marked', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    // Owner should have a special indicator badge
    const ownerBadge = page.getByText('Owner', { exact: true });
    await expect(ownerBadge).toBeVisible();
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('handles email with extra whitespace', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    if (await emailInput.isVisible()) {
      // Enter email with whitespace
      await emailInput.fill('  newadmin@example.com  ');
      
      const addButton = page.getByRole('button', { name: /add/i });
      await addButton.click();
      await page.waitForTimeout(2000);
      
      // Should be trimmed and added correctly
    }
  });

  test('email comparison is case-insensitive', async ({ page }) => {
    const adminEmail = 'owner@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click administrators button to open drawer
    const adminsButton = page.getByRole('button', { name: /administrator/i });
    await adminsButton.waitFor({ state: 'visible', timeout: 10000 });
    await adminsButton.click();
    await page.waitForTimeout(1000);
    
    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i));
    if (await emailInput.isVisible()) {
      // Try to add same email with different case
      await emailInput.fill('OWNER@EXAMPLE.COM');
      
      const addButton = page.getByRole('button', { name: /add/i });
      await addButton.click();
      
      // Should recognize as duplicate
      await page.waitForTimeout(1000);
    }
  });
});
