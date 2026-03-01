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
  BASE_URL,
  createTestEvent, 
  deleteTestEvent, 
  getRootAdminToken,
  setAuthToken,
} from './helpers.js';
import { DEFAULT_TEST_PIN } from '../e2e-config.js';

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
 * Helper to set up non-root authentication.
 * Uses getRootAdminToken() because it's the same JWT-minting endpoint —
 * the function name is misleading but the resulting token only carries
 * root privileges if the email is in the rootAdmins config list.
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
  );
  
  // Navigate
  await page.goto(`${BASE_URL}/system`);
  
  // Wait for auth check to complete
  const authResponse = await authCheck;
  
  if (!authResponse.ok()) {
    throw new Error(`Root admin authentication failed: ${authResponse.status()} ${authResponse.statusText()}`);
  }
  
  // Auth succeeded - wait for events API response (will throw on timeout)
  const eventsResponse = await eventsCheck;
  expect(eventsResponse.status()).toBe(200);
  
  await page.locator('h2').filter({ hasText: 'All Events' })
    .or(page.locator('[data-testid="event-row"]'))
    .or(page.getByText('No events found'))
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
  
}

/**
 * Navigate to system page and wait for stats API to respond
 */
async function navigateToSystemPageWithStats(page) {
  // Navigate using the standard helper (includes auth check and stats)
  await navigateToSystemPage(page);
  
  // Wait for stats section to render (stats are loaded during auth check)
  await page.getByText(/total events/i).waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('System Administration Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  
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
      const eventId = await createTestEvent('System Test Event', DEFAULT_TEST_PIN);
      
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
      const eventId = await createTestEvent('Summary Test Event', DEFAULT_TEST_PIN);
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Should see event name (with extended timeout for data to propagate)
        await expect(page.getByText('Summary Test Event')).toBeVisible({ timeout: 10000 });
        
        // The event row should show the "created" state (the default for new events)
        const eventRow = page.locator('[data-testid="event-row"]').filter({ hasText: 'Summary Test Event' });
        await expect(eventRow.first()).toBeVisible({ timeout: 5000 });
        await expect(eventRow.first()).toContainText(/created/i);
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
    test('should show event list or empty state for root admin', async ({ page }) => {
      await setupRootAuth(page);
      
      // Navigate and wait for events API
      await navigateToSystemPage(page);
      
      // The page should load without errors (h1, h2, h3, or h4)
      await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /system administration/i })).toBeVisible();

      // Should display either event list or empty state message
      const content = page.locator('[data-testid="event-row"]').or(page.getByText(/no events found/i));
      await expect(content.first()).toBeVisible({ timeout: 10000 });
    });
    
  });
  
  // ============================================================
  // US2: View Event Details (T020)
  // ============================================================
  
  test.describe('US2: View Event Details', () => {
    
    test('should open drawer when clicking event', async ({ page }) => {
      // Create test event
      const eventId = await createTestEvent('Drawer Test Event', DEFAULT_TEST_PIN);
      
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
      const eventId = await createTestEvent('Details Test Event', DEFAULT_TEST_PIN);
      
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
      const eventId = await createTestEvent('Delete Confirm Test', DEFAULT_TEST_PIN);
      
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
      const uniqueName = `Delete Test ${Date.now()}`;
      const eventId = await createTestEvent(uniqueName, DEFAULT_TEST_PIN);
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Open drawer
        await page.getByText(uniqueName).click();
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
        await expect(page.getByText(uniqueName)).not.toBeVisible();
      } catch (error) {
        // Clean up if deletion via UI failed
        await deleteTestEvent(eventId);
        throw error;
      }
    });
    
  });
  
  // ============================================================
  // US4: Search Events (T039)
  // ============================================================
  
  test.describe('US4: Search Events', () => {
    
    test('should filter events by event ID search', async ({ page }) => {
      const eventId = await createTestEvent('ID Search Test Event', DEFAULT_TEST_PIN);
      
      try {
        await setupRootAuth(page);
        await navigateToSystemPage(page);
        
        // Wait for event to appear
        await expect(page.getByText('ID Search Test Event')).toBeVisible({ timeout: 15000 });
        
        // Search by event ID
        const searchInput = page.getByPlaceholder(/search/i);
        const filteredResponse = page.waitForResponse(
          resp => resp.url().includes('/api/system/events') && resp.url().includes('search='),
          { timeout: 10000 }
        );
        await searchInput.fill(eventId);
        await filteredResponse;
        
        // Event should appear in results
        await expect(page.getByText('ID Search Test Event')).toBeVisible({ timeout: 5000 });
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
    test('should treat whitespace-only search as empty', async ({ page }) => {
      const eventId = await createTestEvent('Whitespace Search Test', DEFAULT_TEST_PIN);
      
      try {
        await setupRootAuth(page);
        await navigateToSystemPage(page);
        
        await expect(page.getByText('Whitespace Search Test')).toBeVisible({ timeout: 15000 });
        
        const searchInput = page.getByPlaceholder(/search/i);
        await searchInput.fill('   ');
        
        // Events should still be visible (default view, not filtered) after debounce
        await expect(page.getByText('Whitespace Search Test')).toBeVisible({ timeout: 15000 });
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
    test('should filter events by name search', async ({ page }) => {
      // Create two test events with different names
      const eventId1 = await createTestEvent('Apple Tasting Event', DEFAULT_TEST_PIN);
      const eventId2 = await createTestEvent('Banana Festival', DEFAULT_TEST_PIN);
      
      try {
        await setupRootAuth(page);
        
        // Navigate and wait for events API
        await navigateToSystemPage(page);
        
        // Verify both events are visible (use .first() to tolerate leftover duplicates)
        await expect(page.getByText('Apple Tasting Event').first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Banana Festival').first()).toBeVisible({ timeout: 10000 });
        
        // Search for "Apple" and wait for filtered response
        const searchInput = page.getByPlaceholder(/search/i);
        const filteredResponse = page.waitForResponse(
          resp => resp.url().includes('/api/system/events') && resp.url().includes('search=Apple'),
          { timeout: 10000 }
        );
        await searchInput.fill('Apple');
        await filteredResponse;
        
        // Apple event should be visible, Banana should not
        await expect(page.getByText('Apple Tasting Event').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Banana Festival')).not.toBeVisible({ timeout: 5000 });
        
        // Clear search and wait for unfiltered response
        const unfilteredResponse = page.waitForResponse(
          resp => resp.url().includes('/api/system/events') && !resp.url().includes('search='),
          { timeout: 10000 }
        );
        await searchInput.clear();
        await unfilteredResponse;
        
        // Both should be visible again
        await expect(page.getByText('Apple Tasting Event').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Banana Festival').first()).toBeVisible({ timeout: 5000 });
      } finally {
        await deleteTestEvent(eventId1);
        await deleteTestEvent(eventId2);
      }
    });
    
  });
  
  // ============================================================
  // Event Card & Drawer Details
  // ============================================================
  
  test.describe('Event Card & Drawer Details', () => {
    
    test('should show event ID and PIN on event card', async ({ page }) => {
      const eventId = await createTestEvent('Card PIN Test Event', DEFAULT_TEST_PIN);
      
      try {
        await setupRootAuth(page);
        await navigateToSystemPage(page);
        
        // Find the event row
        const eventRow = page.locator('[data-testid="event-row"]').filter({ hasText: 'Card PIN Test Event' });
        await expect(eventRow.first()).toBeVisible({ timeout: 15000 });
        
        // Event card should display the event ID and PIN
        await expect(eventRow.first()).toContainText(eventId);
        await expect(eventRow.first()).toContainText(DEFAULT_TEST_PIN);
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
    test('should display PIN in event details drawer', async ({ page }) => {
      const eventId = await createTestEvent('Drawer PIN Test', '987654');
      
      try {
        await setupRootAuth(page);
        await navigateToSystemPage(page);
        
        // Click the event to open drawer
        await page.getByText('Drawer PIN Test').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Drawer should show the PIN
        const drawer = page.locator('[role="dialog"]');
        await expect(drawer.getByText('Event PIN')).toBeVisible({ timeout: 10000 });
        await expect(drawer.getByText('987654')).toBeVisible({ timeout: 5000 });
      } finally {
        await deleteTestEvent(eventId);
      }
    });
    
  });
  
  // ============================================================
  // Default View Label
  // ============================================================
  
  test.describe('Default View', () => {
    
    test('should display events and show "most recent" label only when capped', async ({ page }) => {
      await setupRootAuth(page);
      await navigateToSystemPage(page);

      const eventRows = page.locator('[data-testid="event-row"]');
      // Wait for either event rows or empty state to appear before counting
      await page.locator('[data-testid="event-row"]').or(page.getByText(/no events found/i)).first()
        .waitFor({ state: 'visible', timeout: 10000 });
      const rowCount = await eventRows.count();

      // Events list or empty state should always render
      const content = eventRows.or(page.getByText(/no events found/i));
      await expect(content.first()).toBeVisible({ timeout: 10000 });

      // The "most recent" label should be visible only when the page caps at 25 rows
      const label = page.getByText('Showing 25 most recent events');
      if (rowCount >= 25) {
        await expect(label).toBeVisible();
      } else {
        await expect(label).not.toBeVisible();
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
      
      // Should see state breakdown — match the pattern "State: Count"
      const main = page.locator('main');
      await expect(main.getByText(/created\s*[:]\s*\d+/i).or(main.getByText(/created/i).first())).toBeVisible();
      await expect(main.getByText(/started\s*[:]\s*\d+/i).or(main.getByText(/started/i).first())).toBeVisible();
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
