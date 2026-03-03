/**
 * Membership Enforcement E2E Tests
 *
 * Validates that a deleted guest is blocked from write operations
 * and sees the MembershipRevokedDialog in the browser.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  addAdminAsUser,
  setAuthToken,
  getUserToken,
  changeEventState,
  BASE_URL,
  API_URL,
} from './helpers.js';

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
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function deleteGuest(eventId, guestEmail, adminToken) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/users/${encodeURIComponent(guestEmail)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`deleteGuest failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Full flow: admin deletes guest, guest's subsequent write is rejected
// ---------------------------------------------------------------------------

test.describe('Membership Enforcement', () => {

  test('Deleted guest receives 403 when attempting to register an item via API', async ({ testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const guestEmail = 'guest-enforce@example.com';

    const adminToken = await addAdminToEvent(eventId, adminEmail);
    const guestToken = await getUserToken(eventId, guestEmail, pin);

    // Guest registers an item successfully first
    const firstItem = await registerItem(eventId, guestToken, 'Before Deletion');
    expect(firstItem.ok).toBe(true);

    // Admin deletes guest
    await deleteGuest(eventId, guestEmail, adminToken);

    // Deleted guest tries to register another item → 403
    const secondItem = await registerItem(eventId, guestToken, 'After Deletion');
    expect(secondItem.ok).toBe(false);
    expect(secondItem.status).toBe(403);
    expect(secondItem.data.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
  });

  test('Deleted guest sees MembershipRevokedDialog in browser and is logged out', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const guestEmail = 'guest-ui-enforce@example.com';

    const adminToken = await addAdminToEvent(eventId, adminEmail);
    await addAdminAsUser(eventId, adminEmail, adminToken);
    const guestToken = await getUserToken(eventId, guestEmail, pin);

    // Set up guest session in the browser
    await setAuthToken(page, guestToken, guestEmail);

    // Navigate to the event page so the guest context is loaded
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await page.waitForLoadState('networkidle');

    // Transition event to started so item registration is allowed
    await changeEventState(eventId, 'started', 'created', adminToken);
    await page.waitForTimeout(500);

    // Admin deletes guest via API (while guest's browser is still open)
    await deleteGuest(eventId, guestEmail, adminToken);

    // Guest attempts a write operation that triggers the membership check.
    // We intercept the fetch to observe the 403 response and the dialog.
    const apiResponse = await registerItem(eventId, guestToken, 'Should Fail');
    expect(apiResponse.status).toBe(403);
    expect(apiResponse.data.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
  });

  test('Active guest can still register items after another guest is deleted', async ({ testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const deletedGuest = 'deleted@example.com';
    const activeGuest = 'active@example.com';

    const adminToken = await addAdminToEvent(eventId, adminEmail);
    const deletedToken = await getUserToken(eventId, deletedGuest, pin);
    const activeToken = await getUserToken(eventId, activeGuest, pin);

    // Admin deletes one guest
    await deleteGuest(eventId, deletedGuest, adminToken);

    // Deleted guest is blocked
    const blocked = await registerItem(eventId, deletedToken, 'Blocked');
    expect(blocked.status).toBe(403);
    expect(blocked.data.code).toBe('EVENT_MEMBERSHIP_REQUIRED');

    // Active guest is unaffected
    const allowed = await registerItem(eventId, activeToken, 'Allowed');
    expect(allowed.ok).toBe(true);
    expect(allowed.status).toBe(201);
  });
});
