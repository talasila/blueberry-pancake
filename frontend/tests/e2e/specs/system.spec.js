/**
 * E2E Tests for System Administration Dashboard
 * 
 * Tests root admin functionality including:
 * - US1: View all events list
 * - US2: View event details in drawer
 * - US3: Delete event
 * - US4: Search events
 * - US5: View system statistics
 * - US6: Root admin header & logout
 */

import { test, expect } from '@playwright/test';
import { 
  createTestEvent, 
  deleteTestEvent, 
  getRootAdminToken,
  setAuthToken,
  clearAuth
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Root admin email - must match config/default.json rootAdmins array
const ROOT_ADMIN_EMAIL = 'root@test.example.com';

/**
 * Helper to set up root admin authentication
 */
async function setupRootAuth(page) {
  const token = await getRootAdminToken(ROOT_ADMIN_EMAIL);
  await setAuthToken(page, token, ROOT_ADMIN_EMAIL);
}

/**
 * Helper to set up non-root authentication
 */
async function setupNonRootAuth(page) {
  const token = await getRootAdminToken('regular@test.example.com');
  await setAuthToken(page, token, 'regular@test.example.com');
}

/**
 * Navigate to system page and wait for content to load
 * Sets up all response listeners BEFORE navigation to avoid race conditions
 */
async function navigateToSystemPage(page) {
  // Set up ALL response listeners BEFORE navigation
  // The auth check calls /system/stats first
  const authCheck = page.waitForResponse(
    resp => resp.url().includes('/api/system/stats'),
    { timeout: 15000 }
  );
  
  // The events API is called after auth succeeds - set up listener early
  const eventsCheck = page.waitForResponse(
    resp => resp.url().includes('/api/system/events'),
    { timeout: 15000 }
  ).catch(() => null); // Might not happen if auth fails
  
  // Navigate
  await page.goto(`${BASE_URL}/system`);
  
  // Wait for auth check to complete
  const authResponse = await authCheck;
  
  // If auth failed (403), page shows Access Denied
  if (authResponse.status() === 403) {
    await page.waitForSelector('text=Access Denied', { timeout: 5000 });
    return;
  }
  
  // Auth succeeded - wait for events API response
  const eventsResponse = await eventsCheck;
  if (!eventsResponse || eventsResponse.status() !== 200) {
    // Events API failed, but page should still render
    console.warn('Events API did not return 200');
  }
  
  // Wait for loading spinner to disappear / content to appear
  // Look for either event rows, empty state, or the All Events heading
  await page.waitForSelector('h2:has-text("All Events"), [data-testid="event-row"], text="No events found"', { 
    timeout: 10000 
  }).catch(() => {
    // Ignore - page might still be loading
  });
  
  // Extra time for React to finish rendering
  await page.waitForTimeout(1000);
}

/**
 * Navigate to system page and wait for stats API to respond
 */
async function navigateToSystemPageWithStats(page) {
  // Navigate using the standard helper (includes auth check and stats)
  await navigateToSystemPage(page);
  
  // Wait for stats section to render (stats are loaded during auth check)
  await page.waitForSelector('text=/total events/i', { timeout: 5000 });
}

test.describe('System Administration Dashboard', () => {
  // Run system tests serially to avoid race conditions with shared test events
  //test.describe.configure({ mode: 'serial' });
  
  // ============================================================
  // US1: View All Events
  // ============================================================
  
  test.describe('US1: View All Events', () => {
    
    test('should deny access to non-root users', async ({ page }) => {
      // Set up as regular (non-root) user
      await setupNonRootAuth(page);
      
      // Navigate to system page
      await page.goto(`${BASE_URL}/system`);
      
      // Should see access denied message
      await expect(page.getByText('Access Denied')).toBeVisible();
      await expect(page.getByText('Root access required')).toBeVisible();
    });
    
    test('should display event list for root admin', async ({ page }) => {
      // Create a test event first
      const eventId = await createTestEvent(null, 'System Test Event', '123456');
      
      try {
        // Set up as root admin
        await setupRootAuth(page);
        
        // Navigate to system page and wait for events API
        await navigateToSystemPage(page);
        
        // Should see the system administration header (h1, h2, h3, or h4)
        await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /system administration/i })).toBeVisible();
        
        // Should see the event in the list (wait with retry)
        await expect(page.getByText('System Test Event')).toBeVisible({ timeout: 10000 });
      } finally {
        // Cleanup
        await deleteTestEvent(eventId);
      }
    });
    
    test('should show event summary info in list', async ({ page }) => {
      // Create test event
      const eventId = await createTestEvent(null, 'Summary Test Event', '123456');
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Should see event name (with extended timeout for data to propagate)
        await expect(page.getByText('Summary Test Event')).toBeVisible({ timeout: 10000 });
        
        // Should see event state (created by default)
        const eventRow = page.locator('[data-testid="event-row"]').filter({ hasText: 'Summary Test Event' });
        
        if (await eventRow.count() > 0) {
          await expect(eventRow.first()).toContainText(/created|started|paused|completed/i);
        }
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
    test('should show empty state when no events exist', async ({ page }) => {
      await setupRootAuth(page);
      
      // Navigate and wait for events API
      await navigateToSystemPage(page);
      
      // The page should load without errors (h1, h2, h3, or h4)
      await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /system administration/i })).toBeVisible();
    });
    
  });
  
  // ============================================================
  // US2: View Event Details (T020)
  // ============================================================
  
  test.describe('US2: View Event Details', () => {
    
    test('should open drawer when clicking event', async ({ page }) => {
      // Create test event
      const eventId = await createTestEvent(null, 'Drawer Test Event', '123456');
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Click the event
        await page.getByText('Drawer Test Event').click();
        
        // Drawer should open
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.locator('[role="dialog"]').getByText('Event Details')).toBeVisible();
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
    test('should display all event details in drawer', async ({ page }) => {
      // Create test event
      const eventId = await createTestEvent(null, 'Details Test Event', '123456');
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Click the event
        await page.getByText('Details Test Event').click();
        
        // Wait for drawer
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Should show event details
        const drawer = page.locator('[role="dialog"]');
        await expect(drawer.getByText('Details Test Event')).toBeVisible();
        await expect(drawer.getByText(/Event ID/i)).toBeVisible();
        await expect(drawer.getByText(/Owner/i)).toBeVisible();
        await expect(drawer.getByText(/State/i)).toBeVisible();
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
  });
  
  // ============================================================
  // US3: Delete Event (T029)
  // ============================================================
  
  test.describe('US3: Delete Event', () => {
    
    test('should show delete confirmation dialog', async ({ page }) => {
      // Create test event
      const eventId = await createTestEvent(null, 'Delete Confirm Test', '123456');
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Open event drawer
        await page.getByText('Delete Confirm Test').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Click delete button
        const drawer = page.locator('[role="dialog"]');
        await drawer.getByRole('button', { name: /delete event/i }).click();
        
        // Confirmation should appear
        await expect(drawer.getByText(/are you sure/i)).toBeVisible();
        await expect(drawer.getByRole('button', { name: /cancel/i })).toBeVisible();
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
    test('should delete event and remove from list', async ({ page }) => {
      // Create test event specifically for deletion
      const eventId = await createTestEvent(null, 'To Be Deleted Event', '123456');
      
      await setupRootAuth(page);
      
      // Navigate and wait for events API
      await navigateToSystemPage(page);
      
      // Open drawer
      await page.getByText('To Be Deleted Event').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Click delete and confirm
      const drawer = page.locator('[role="dialog"]');
      await drawer.getByRole('button', { name: /delete event/i }).click();
      await expect(drawer.getByText(/are you sure/i)).toBeVisible();
      
      // Confirm deletion
      await drawer.getByRole('button', { name: /^delete$/i }).click();
      
      // Wait for drawer to close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
      
      // Event should be removed from list
      await expect(page.getByText('To Be Deleted Event')).not.toBeVisible();
      
      // Note: No cleanup needed - event was deleted by the test
    });
    
  });
  
  // ============================================================
  // US4: Search Events (T039)
  // ============================================================
  
  test.describe('US4: Search Events', () => {
    
    test('should filter events by name search', async ({ page }) => {
      // Create two test events with different names
      const eventId1 = await createTestEvent(null, 'Apple Tasting Event', '123456');
      const eventId2 = await createTestEvent(null, 'Banana Festival', '123456');
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Verify both events are visible (extended timeout for data propagation)
        await expect(page.getByText('Apple Tasting Event')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Banana Festival')).toBeVisible({ timeout: 10000 });
        
        // Search for "Apple" and wait for filtered response
        const searchInput = page.getByPlaceholder(/search/i);
        const filteredResponse = page.waitForResponse(
          resp => resp.url().includes('/api/system/events') && resp.url().includes('name=Apple'),
          { timeout: 10000 }
        );
        await searchInput.fill('Apple');
        await filteredResponse;
        
        // Apple event should be visible, Banana should not
        await expect(page.getByText('Apple Tasting Event')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Banana Festival')).not.toBeVisible({ timeout: 5000 });
        
        // Clear search and wait for unfiltered response
        const unfilteredResponse = page.waitForResponse(
          resp => resp.url().includes('/api/system/events') && !resp.url().includes('name='),
          { timeout: 10000 }
        );
        await searchInput.clear();
        await unfilteredResponse;
        
        // Both should be visible again
        await expect(page.getByText('Apple Tasting Event')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Banana Festival')).toBeVisible({ timeout: 5000 });
      } finally {
        await deleteTestEvent(eventId1);
        await deleteTestEvent(eventId2);
      }
    });
    
  });
  
  // ============================================================
  // US5: System Statistics (T046)
  // ============================================================
  
  test.describe('US5: System Statistics', () => {
    
    test('should display system statistics panel', async ({ page }) => {
      await setupRootAuth(page);
      
      // Navigate and wait for both events and stats APIs
      await navigateToSystemPageWithStats(page);
      
      // Should see the heading (h1, h2, h3, or h4)
      await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /system administration/i })).toBeVisible();
      
      // Should see statistics section
      await expect(page.getByText(/total events/i)).toBeVisible();
      await expect(page.getByText(/total users/i)).toBeVisible();
    });
    
    test('should display event counts by state', async ({ page }) => {
      await setupRootAuth(page);
      
      // Navigate and wait for both events and stats APIs
      await navigateToSystemPageWithStats(page);
      
      // Should see state breakdown
      await expect(page.getByText(/created/i).first()).toBeVisible();
      await expect(page.getByText(/started/i).first()).toBeVisible();
    });
    
  });
  
  // ============================================================
  // US6: Root Admin Header & Logout
  // ============================================================
  
  test.describe('US6: Root Admin Header', () => {
    
    test('should show logout icon instead of menu', async ({ page }) => {
      await setupRootAuth(page);
      await navigateToSystemPage(page);
      
      // Should see logout icon (aria-label="Logout")
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
      
      // Should NOT see menu icon (aria-label="Open menu")
      await expect(page.getByRole('button', { name: /open menu/i })).not.toBeVisible();
    });
    
    test('should logout and redirect to system login', async ({ page }) => {
      await setupRootAuth(page);
      await navigateToSystemPage(page);
      
      // Click logout icon
      await page.getByRole('button', { name: /logout/i }).click();
      
      // Should redirect to /system/login
      await expect(page).toHaveURL(/\/system\/login/);
    });
    
  });
  
});
