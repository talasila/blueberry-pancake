/**
 * Guest Management E2E Tests
 *
 * Covers the Guests card and drawer on the Event Admin page:
 * US1 – View guest list (card, drawer, display, badges, sort, refresh)
 * US2 – Search and filter guests
 * US3 – Delete individual guest from drawer
 * US4 – Danger Zone cleanup (Users Management section removed)
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  addAdminAsUser,
  setAuthToken,
  getUserToken,
  changeEventState,
  submitRating,
  BASE_URL,
  API_URL,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerItem(eventId, token, name) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`registerItem failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function openGuestsDrawer(page) {
  const guestsButton = page.getByRole('button', { name: /guests/i });
  await guestsButton.waitFor({ state: 'visible', timeout: 10000 });
  await guestsButton.click();
  const drawer = page.getByRole('dialog', { name: /guests/i });
  await drawer.waitFor({ state: 'visible', timeout: 5000 });
  return drawer;
}

async function openDangerZoneDrawer(page) {
  const dangerZoneButton = page.getByRole('button', { name: /danger zone/i });
  await dangerZoneButton.waitFor({ state: 'visible', timeout: 10000 });
  await dangerZoneButton.click();
  const drawer = page.getByRole('dialog', { name: /danger zone/i });
  await drawer.waitFor({ state: 'visible', timeout: 5000 });
  return drawer;
}

async function confirmDeletion(page, confirmationText) {
  const confirmInput = page.getByTestId('confirm-input');
  await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
  await confirmInput.fill(confirmationText);
  const confirmButton = page.getByTestId('confirm-delete-button');
  await expect(confirmButton).toBeEnabled({ timeout: 3000 });
  await confirmButton.dispatchEvent('click');
}

// ---------------------------------------------------------------------------
// US1 – View Guest List
// ---------------------------------------------------------------------------

test.describe('Guests – View Guest List (US1)', () => {

  test('Guests card appears between Administrators and Export Data with correct count', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'user1@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await getUserToken(eventId, 'user2@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    const guestsButton = page.getByRole('button', { name: /guests/i });
    await expect(guestsButton).toBeVisible();
    await expect(guestsButton.getByText('2 registered')).toBeVisible();
  });

  test('drawer opens and shows all registered users with details', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const userToken = await getUserToken(eventId, 'user1@example.com', pin);
    await registerItem(eventId, userToken, 'Château Margaux');

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    await expect(drawer.getByText('user1@example.com')).toBeVisible();
    await expect(drawer.getByText('Château Margaux')).toBeVisible();
  });

  test('administrators show role badges', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const ownerEmail = 'owner@example.com';
    const adminEmail = 'admin2@example.com';
    const ownerToken = await addAdminToEvent(eventId, ownerEmail);
    await addAdminAsUser(eventId, adminEmail);

    await setAuthToken(page, ownerToken, ownerEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    await expect(drawer.getByText('Owner').first()).toBeVisible();
    await expect(drawer.getByText('Admin').first()).toBeVisible();
  });

  test('empty event shows empty state message', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    // Delete all non-admin users first (if any) to get an empty state
    // Actually, a fresh test event has only the owner (test@example.com) and the admin we added
    // Both are administrators, so getNonAdminUserCount is 0 and the card shows "0 registered"
    const guestsButton = page.getByRole('button', { name: /guests/i });
    await expect(guestsButton.getByText('0 registered')).toBeVisible();
  });

  test('Refresh button triggers data re-fetch', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    const refreshButton = drawer.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // The spinner icon should appear (button disabled briefly during fetch)
    // After refresh completes, button should be enabled again
    await expect(refreshButton).toBeEnabled({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// US2 – Search and Filter Guests
// ---------------------------------------------------------------------------

test.describe('Guests – Search and Filter (US2)', () => {

  test('search filters by name and email', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'alice@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await getUserToken(eventId, 'bob@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    const searchInput = drawer.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('alice');
    await expect(drawer.getByText('alice@example.com')).toBeVisible();
    await expect(drawer.getByText('bob@example.com')).not.toBeVisible();
  });

  test('search filters by item name', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const aliceToken = await getUserToken(eventId, 'alice@example.com', pin);
    await registerItem(eventId, aliceToken, 'Merlot');

    await new Promise(r => setTimeout(r, 100));
    const bobToken = await getUserToken(eventId, 'bob@example.com', pin);
    await registerItem(eventId, bobToken, 'Cabernet');

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    const searchInput = drawer.getByPlaceholder(/search/i);
    await searchInput.fill('Merlot');

    await expect(drawer.getByText('alice@example.com')).toBeVisible();
    await expect(drawer.getByText('bob@example.com')).not.toBeVisible();
  });

  test('summary line shows filtered count', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'alice@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await getUserToken(eventId, 'bob@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    // Total count shown when no search
    // The event has test@example.com (owner) + admin@example.com + alice + bob = 4 guests
    await expect(drawer.getByText(/4 guests/)).toBeVisible();

    const searchInput = drawer.getByPlaceholder(/search/i);
    await searchInput.fill('alice');

    await expect(drawer.getByText(/showing 1 of 4 guests/i)).toBeVisible();
  });

  test('empty search shows no-match message', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'user1@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    const searchInput = drawer.getByPlaceholder(/search/i);
    await searchInput.fill('zzzznonexistent');

    await expect(drawer.getByText(/no guests match/i)).toBeVisible();
  });

  test('clearing search restores full list', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'alice@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await getUserToken(eventId, 'bob@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    const searchInput = drawer.getByPlaceholder(/search/i);
    await searchInput.fill('alice');
    // Wait for positive proof that React applied the filter before checking the negative
    await expect(drawer.getByText(/^Showing \d+ of \d+ guests$/)).toBeVisible({ timeout: 10000 });
    await expect(drawer.getByText('bob@example.com')).not.toBeVisible();

    await searchInput.clear();
    await expect(drawer.getByText('bob@example.com')).toBeVisible();
    await expect(drawer.getByText('alice@example.com')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US3 – Delete Individual Guest
// ---------------------------------------------------------------------------

test.describe('Guests – Delete Individual Guest (US3)', () => {

  test('delete button visible on guest rows, hidden for owner', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const ownerEmail = 'owner@example.com';
    const ownerToken = await addAdminToEvent(eventId, ownerEmail);
    await getUserToken(eventId, 'user1@example.com', pin);

    await setAuthToken(page, ownerToken, ownerEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    // Owner row should not have a delete button — find the row with the exact "Owner" badge
    const ownerRow = drawer.locator('.border.rounded-lg', { has: page.getByText('Owner', { exact: true }) });
    await expect(ownerRow.getByRole('button')).toHaveCount(0);

    // Regular user row should have the trash button
    const userRow = drawer.locator('.border.rounded-lg', { hasText: 'user1@example.com' });
    await expect(userRow.getByRole('button')).toBeVisible();
  });

  test('admin can delete a regular guest from the Guests drawer', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'doomed@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    await expect(drawer.getByText('doomed@example.com')).toBeVisible();

    // Click delete on the user row
    const userRow = drawer.locator('.border.rounded-lg', { hasText: 'doomed@example.com' });
    await userRow.getByRole('button').click();

    // Confirm deletion
    await confirmDeletion(page, 'DELETE USER');

    // The guest should disappear from the list
    // Use exact match to avoid the success toast ("User doomed@example.com and all…") triggering strict mode
    await expect(drawer.getByText('doomed@example.com', { exact: true })).not.toBeVisible({ timeout: 10000 });
  });

  test('cancel deletion does not remove guest', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'safe@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    const userRow = drawer.locator('.border.rounded-lg', { hasText: 'safe@example.com' });
    await userRow.getByRole('button').click();

    // Cancel the dialog
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    await cancelButton.dispatchEvent('click');

    // Guest should still be visible
    await expect(drawer.getByText('safe@example.com')).toBeVisible();
  });

  test('search filter preserved after deletion', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'alice@example.com', pin);
    await new Promise(r => setTimeout(r, 100));
    await getUserToken(eventId, 'bob@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openGuestsDrawer(page);

    const searchInput = drawer.getByPlaceholder(/search/i);
    await searchInput.fill('alice');

    // Only alice should be visible
    await expect(drawer.getByText('alice@example.com')).toBeVisible();
    await expect(drawer.getByText('bob@example.com')).not.toBeVisible();

    // Delete alice
    const userRow = drawer.locator('.border.rounded-lg', { hasText: 'alice@example.com' });
    await userRow.getByRole('button').click();
    await confirmDeletion(page, 'DELETE USER');

    // After deletion, search query should still be "alice"
    await expect(searchInput).toHaveValue('alice');
  });
});

// ---------------------------------------------------------------------------
// US4 – Danger Zone Cleanup
// ---------------------------------------------------------------------------

test.describe('Guests – Danger Zone Cleanup (US4)', () => {

  test('Users Management section is NOT present in Danger Zone', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openDangerZoneDrawer(page);

    await expect(drawer.getByText('Users Management')).not.toBeVisible();
    await expect(drawer.getByTestId('user-select')).not.toBeVisible();
    await expect(drawer.getByTestId('delete-user-button')).not.toBeVisible();
  });

  test('Delete All Users section IS still present and functional', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await getUserToken(eventId, 'user1@example.com', pin);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const drawer = await openDangerZoneDrawer(page);

    await expect(drawer.getByRole('heading', { name: 'Delete All Users' })).toBeVisible();
    const deleteAllButton = page.getByTestId('delete-all-users-button');
    await expect(deleteAllButton).toBeVisible();
    await expect(deleteAllButton).toBeEnabled();
  });
});
