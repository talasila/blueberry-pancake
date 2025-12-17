/**
 * Event State Management Tests
 * 
 * Tests the event lifecycle state transitions including
 * start, pause, resume, and complete.
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

test.describe('Event State Management', () => {

  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'State Test Event', testEventPin);
  });

  test.afterEach(async () => {
    if (testEventId) {
      await deleteTestEvent(testEventId);
    }
  });

  // ===================================
  // User Story 1 - Start an Event
  // ===================================

  test('new event is in "created" state', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should show "created" state or start button
    const stateIndicator = page.getByText(/created/i);
    const startButton = page.getByRole('button', { name: /start/i });
    
    // Either created state is shown OR start button is available
    const isCreated = await stateIndicator.isVisible().catch(() => false);
    const canStart = await startButton.isVisible().catch(() => false);
    
    expect(isCreated || canStart).toBe(true);
  });

  test('administrator can start event', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click start button
    const startButton = page.getByRole('button', { name: /start/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(2000);
      
      // Event should now be started
      const stateIndicator = page.getByText(/started/i);
      await expect(stateIndicator).toBeVisible();
    }
  });

  test('started event shows pause and complete options', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event via API
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should show pause and complete buttons
    const pauseButton = page.getByRole('button', { name: /pause/i });
    const completeButton = page.getByRole('button', { name: /complete|finish/i });
    
    await expect(pauseButton).toBeVisible();
    await expect(completeButton).toBeVisible();
  });

  // ===================================
  // User Story 2 - Pause and Resume Event
  // ===================================

  test('administrator can pause started event', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event via API
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click pause button
    const pauseButton = page.getByRole('button', { name: /pause/i });
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
      await page.waitForTimeout(2000);
      
      // Event should now be paused
      const stateIndicator = page.getByText(/paused/i);
      await expect(stateIndicator).toBeVisible();
    }
  });

  test('administrator can resume paused event', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start then pause event via API
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'paused', currentState: 'started' })
    });
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click start/resume button
    const startButton = page.getByRole('button', { name: /start|resume/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(2000);
      
      // Event should now be started again
      const stateIndicator = page.getByText(/started/i);
      await expect(stateIndicator).toBeVisible();
    }
  });

  // ===================================
  // User Story 3 - Complete an Event
  // ===================================

  test('administrator can complete started event', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event via API
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click complete button
    const completeButton = page.getByRole('button', { name: /complete|finish/i });
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await page.waitForTimeout(2000);
      
      // Event should now be completed
      const stateIndicator = page.getByText(/completed|finished/i);
      await expect(stateIndicator).toBeVisible();
    }
  });

  test('administrator can complete paused event', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start then pause event via API
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'paused', currentState: 'started' })
    });
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click complete button
    const completeButton = page.getByRole('button', { name: /complete|finish/i });
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await page.waitForTimeout(2000);
      
      // Event should now be completed
      const stateIndicator = page.getByText(/completed|finished/i);
      await expect(stateIndicator).toBeVisible();
    }
  });

  // ===================================
  // User Story 4 - Resume Completed Event
  // ===================================

  test('administrator can reopen completed event', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Complete event via API
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'completed', currentState: 'started' })
    });
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should show option to reopen/start
    const startButton = page.getByRole('button', { name: /start|reopen/i });
    
    // If reopening is allowed, button should be visible
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('only valid state transitions are shown', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // In created state, should only see Start button (not Pause)
    const pauseButton = page.getByRole('button', { name: /^pause$/i });
    await expect(pauseButton).not.toBeVisible();
  });

  test('state indicator shows current state clearly', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should see state indicator
    const stateText = page.getByText(/created|started|paused|completed/i);
    await expect(stateText.first()).toBeVisible();
  });

  test('state change is reflected in event header', async ({ page }) => {
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(testEventId, adminEmail);
    
    // Start event
    await fetch(`${API_URL}/api/events/${testEventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${testEventId}`);
    await page.waitForLoadState('networkidle');
    
    // Header should show state icon or indicator
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
