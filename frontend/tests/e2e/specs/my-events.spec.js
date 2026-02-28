/**
 * My Events Tests
 *
 * Tests the My Events feature including:
 * - Landing page card → OTP auth → events list
 * - Header menu "My Events" link visible for OTP-auth users and navigates to /my-events
 * - Header menu "My Events" NOT visible for PIN-authenticated participants
 * - Empty state for users with no events
 * - Clicking an event navigates to admin page
 * - Standalone page logout icon (replaces hamburger menu on /my-events, /create-event)
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, clearAuth, createTestEvent, deleteTestEvent, addAdminToEvent, setAuthToken, setupRootAdmin, getUserToken, authenticateViaOTP } from './helpers.js';

test.describe('My Events', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('landing page shows My Events card', async ({ page }) => {
    await page.goto(BASE_URL);
    const myEventsCard = page.getByRole('button', { name: /my events/i });
    await expect(myEventsCard).toBeVisible();
  });

  test('My Events card navigates to auth then to my-events page', async ({ page }) => {
    await page.goto(BASE_URL);
    const myEventsButton = page.getByRole('button', { name: /my events|view my events/i });
    await myEventsButton.click();

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/);

    // Authenticate via OTP
    await authenticateViaOTP(page, 'myevents-card@example.com');

    // Should eventually reach /my-events
    await expect(page).toHaveURL(/\/my-events/, { timeout: 15000 });

    // Verify My Events page content
    await expect(page.getByText('My Events')).toBeVisible({ timeout: 5000 });
  });

  test('shows empty state with link to create event when user has no events', async ({ page }) => {
    await page.goto(BASE_URL);

    const myEventsButton = page.getByRole('button', { name: /my events|view my events/i });
    await myEventsButton.click();

    await authenticateViaOTP(page, 'noevents@example.com');

    await expect(page).toHaveURL(/\/my-events/, { timeout: 15000 });

    // Verify empty state message
    await expect(page.getByText(/haven't created any events/i)).toBeVisible({ timeout: 5000 });

    // Verify create event link/button exists
    const createButton = page.getByRole('button', { name: /create an event/i });
    await expect(createButton).toBeVisible();
  });

  test('shows events list with event details for admin with events', async ({ page }) => {
    // Create a test event and add an admin
    const eventId = await createTestEvent('My Events Test', '654321');
    const token = await addAdminToEvent(eventId, 'list-test@example.com');

    try {
      // Set auth and navigate to my-events
      await setAuthToken(page, token, 'list-test@example.com');
      await page.goto(`${BASE_URL}/my-events`);
      // Verify event appears in the list
      await expect(page.getByText('My Events Test')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(eventId)).toBeVisible();
    } finally {
      await deleteTestEvent(eventId);
    }
  });

  test('clicking event in list navigates to admin page', async ({ page }) => {
    const eventId = await createTestEvent('Click Nav Test', '654321');
    const token = await addAdminToEvent(eventId, 'clicknav@example.com');

    try {
      await setAuthToken(page, token, 'clicknav@example.com');
      await page.goto(`${BASE_URL}/my-events`);
      // Wait for event to appear then click it
      const eventLink = page.getByText('Click Nav Test');
      await expect(eventLink).toBeVisible({ timeout: 10000 });
      await eventLink.click();

      // Should navigate to admin page
      await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`), { timeout: 10000 });
    } finally {
      await deleteTestEvent(eventId);
    }
  });

  test('header menu shows My Events for OTP-authenticated admin and navigates on click', async ({ page }) => {
    const eventId = await createTestEvent('Header Menu Test', '654321');
    const token = await addAdminToEvent(eventId, 'headermenu@example.com');

    try {
      await setAuthToken(page, token, 'headermenu@example.com');
      await page.goto(`${BASE_URL}/event/${eventId}/admin`);
      const menuButton = page.getByRole('button', { name: /open menu/i });
      await expect(menuButton).toBeVisible({ timeout: 10000 });
      await menuButton.click();

      // "My Events" should be visible for OTP-authenticated admins
      const myEventsItem = page.locator('button[role="menuitem"]', { hasText: 'My Events' });
      await expect(myEventsItem).toBeVisible({ timeout: 5000 });

      // Clicking it should navigate to /my-events
      await myEventsItem.click();
      await expect(page).toHaveURL(/\/my-events/, { timeout: 10000 });
    } finally {
      await deleteTestEvent(eventId);
    }
  });

  test('header menu does not show My Events for PIN-authenticated user', async ({ page }) => {
    const eventId = await createTestEvent('PIN Menu Test', '654321');

    try {
      const token = await getUserToken(eventId, 'pin-user@example.com', '654321');
      await setAuthToken(page, token, 'pin-user@example.com');
      await page.goto(`${BASE_URL}/event/${eventId}`);
      const menuButton = page.getByRole('button', { name: /open menu/i });
      await expect(menuButton).toBeVisible({ timeout: 10000 });
      await menuButton.click();

      // "My Events" should NOT be visible for PIN-authenticated participants
      await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 3000 });
      const myEventsItem = page.locator('[role="menu"]').getByText('My Events');
      await expect(myEventsItem).not.toBeVisible();

      // Other menu items should still be present
      await expect(page.locator('[role="menu"]').getByText('Profile')).toBeVisible();
      await expect(page.locator('[role="menu"]').getByText('Logout')).toBeVisible();
    } finally {
      await deleteTestEvent(eventId);
    }
  });

  test('header menu still shows My Events after creating an event via UI', async ({ page }) => {
    // Authenticate via OTP and wait for redirect to complete
    await page.goto(`${BASE_URL}/auth`);
    await authenticateViaOTP(page, 'post-create@example.com');
    await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 10000 });

    // Navigate to create event page
    await page.goto(`${BASE_URL}/create-event`);
    // Fill in event name
    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('My Events Persist Test');

    // Capture the create-event API response
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/events') &&
              resp.request().method() === 'POST' &&
              !resp.url().includes('verify-pin')
    );

    const createButton = page.getByRole('button', { name: /create event/i });
    await createButton.click();

    const response = await responsePromise;
    const data = await response.json();
    const createdEventId = data.eventId;
    if (!createdEventId) throw new Error('No eventId returned from create event');

    try {
      // Wait for redirect to admin page
      await page.waitForURL(/\/event\/[0-9A-Z]{8}\/admin/, { timeout: 10000 });

      // Dismiss welcome bottom sheet if present
      const sheet = page.locator('[data-testid="welcome-bottom-sheet"]');
      if (await sheet.isVisible({ timeout: 3000 }).catch(() => false)) {
        const closeBtn = sheet.getByRole('button', { name: /close|dismiss|got it/i });
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
        }
      }

      // Open hamburger menu
      const menuButton = page.getByRole('button', { name: /open menu/i });
      await expect(menuButton).toBeVisible({ timeout: 10000 });
      await menuButton.click();

      // "My Events" must still be visible after event creation
      const myEventsItem = page.locator('button[role="menuitem"]', { hasText: 'My Events' });
      await expect(myEventsItem).toBeVisible({ timeout: 5000 });
    } finally {
      await deleteTestEvent(createdEventId);
    }
  });

  test('unauthenticated user accessing /my-events is redirected to auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/my-events`);
    
    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});

test.describe('Standalone Page Logout Icon', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('my-events page shows logout icon instead of hamburger menu', async ({ page }) => {
    const eventId = await createTestEvent('Logout Icon Test', '654321');
    const token = await addAdminToEvent(eventId, 'logout-icon@example.com');

    try {
      await setAuthToken(page, token, 'logout-icon@example.com');
      await page.goto(`${BASE_URL}/my-events`);
      const logoutIcon = page.getByRole('button', { name: /logout/i });
      await expect(logoutIcon).toBeVisible({ timeout: 5000 });

      const hamburgerMenu = page.getByRole('button', { name: /open menu/i });
      await expect(hamburgerMenu).not.toBeVisible();

      await logoutIcon.click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
    } finally {
      await deleteTestEvent(eventId);
    }
  });

  test('create-event page shows logout icon instead of hamburger menu', async ({ page }) => {
    const eventId = await createTestEvent('Create Page Test', '654321');
    const token = await addAdminToEvent(eventId, 'create-icon@example.com');

    try {
      await setAuthToken(page, token, 'create-icon@example.com');
      await page.goto(`${BASE_URL}/create-event`);
      const logoutIcon = page.getByRole('button', { name: /logout/i });
      await expect(logoutIcon).toBeVisible({ timeout: 5000 });

      const hamburgerMenu = page.getByRole('button', { name: /open menu/i });
      await expect(hamburgerMenu).not.toBeVisible();

      await logoutIcon.click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
    } finally {
      await deleteTestEvent(eventId);
    }
  });

  test('event page still shows hamburger menu with standard items', async ({ page }) => {
    const eventId = await createTestEvent('Menu Regression Test', '654321');
    const token = await addAdminToEvent(eventId, 'menu-reg@example.com');

    try {
      await setAuthToken(page, token, 'menu-reg@example.com');
      await page.goto(`${BASE_URL}/event/${eventId}/admin`);
      const hamburgerMenu = page.getByRole('button', { name: /open menu/i });
      await expect(hamburgerMenu).toBeVisible({ timeout: 10000 });

      const logoutIcon = page.locator('[aria-label="Logout"][role="button"]:not([aria-expanded])');
      await expect(logoutIcon).not.toBeVisible();

      await hamburgerMenu.click();
      await expect(page.getByText('Logout')).toBeVisible({ timeout: 3000 });
      await expect(page.getByText('Profile')).toBeVisible();
    } finally {
      await deleteTestEvent(eventId);
    }
  });

  test('system route shows logout icon that redirects to /system/login', async ({ page }) => {
    await setupRootAdmin(page, 'root@example.com');
    await page.goto(`${BASE_URL}/system/events`);
    const logoutIcon = page.getByRole('button', { name: /logout/i });
    await expect(logoutIcon).toBeVisible({ timeout: 5000 });

    const hamburgerMenu = page.getByRole('button', { name: /open menu/i });
    await expect(hamburgerMenu).not.toBeVisible();

    await logoutIcon.click();
    await expect(page).toHaveURL(/\/system\/login/, { timeout: 10000 });
  });
});
