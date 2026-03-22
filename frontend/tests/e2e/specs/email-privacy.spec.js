/**
 * Email Privacy E2E Tests
 *
 * Verifies that opaque userId replaces email in all guest-facing
 * API responses and rendered pages, while admin exports retain email.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
  submitRating,
  startEvent,
  changeEventState,
  BASE_URL,
  API_URL,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/**
 * Call verify-pin directly and return the full JSON response body.
 * Unlike getUserToken (which only returns the JWT), this gives us the
 * response payload so we can assert on its shape.
 */
async function callVerifyPin(eventId, { email, pin, name } = {}) {
  const body = { pin, email };
  if (name !== undefined) body.name = name;
  const response = await fetch(`${API_URL}/api/events/${eventId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = response.headers.get('content-type')?.includes('json')
    ? await response.json()
    : await response.text();
  return { ok: response.ok, status: response.status, data, response };
}

/**
 * Register a guest via verify-pin with a display name and return the JWT
 * extracted from the Set-Cookie header, plus the JSON body.
 */
async function registerGuest(eventId, email, pin, name) {
  const result = await callVerifyPin(eventId, { email, pin, name: name || email.split('@')[0] });
  if (!result.ok) {
    throw new Error(`registerGuest failed (${result.status}): ${JSON.stringify(result.data)}`);
  }
  const setCookie = result.response.headers.get('set-cookie');
  const match = setCookie?.match(/jwt_token=([^;]+)/);
  if (!match) throw new Error('No JWT cookie in verify-pin response');
  return { token: match[1], body: result.data };
}

/**
 * Parse a CSV string into { headers, rows }.
 * rows is an array of objects keyed by header name.
 */
function parseCSV(csvText) {
  // Strip BOM if present
  const text = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  });
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Email Privacy', () => {

  // -----------------------------------------------------------------------
  // T014: Core email privacy in API responses
  // -----------------------------------------------------------------------

  test('guest dashboard response contains userId and name but no email', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin-dash@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);

    await startEvent(eventId, adminToken);

    // Register two guests and submit ratings
    const { token: guest1Token } = await registerGuest(eventId, 'guest1@example.com', pin, 'Guest One');
    const { token: guest2Token } = await registerGuest(eventId, 'guest2@example.com', pin, 'Guest Two');

    await submitRating(eventId, guest1Token, 1, 4);
    await submitRating(eventId, guest2Token, 1, 3);

    // Complete the event so guests can view the dashboard
    await changeEventState(eventId, 'completed', 'started', adminToken);

    // Fetch dashboard API as guest
    const dashResponse = await fetch(`${API_URL}/api/events/${eventId}/dashboard`, {
      headers: { 'Authorization': `Bearer ${guest1Token}` },
      signal: AbortSignal.timeout(10000),
    });
    expect(dashResponse.ok).toBe(true);

    const dashData = await dashResponse.json();
    expect(Array.isArray(dashData.userSummaries)).toBe(true);
    expect(dashData.userSummaries.length).toBeGreaterThanOrEqual(2);

    for (const summary of dashData.userSummaries) {
      // Must have userId and name
      expect(summary).toHaveProperty('userId');
      expect(summary).toHaveProperty('name');
      // Must NOT have email
      expect(summary).not.toHaveProperty('email');
    }
  });

  // -----------------------------------------------------------------------
  // T014: No userId visible in DOM
  // -----------------------------------------------------------------------

  test('opaque userId values do not appear in rendered page text', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin-dom@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);

    await startEvent(eventId, adminToken);

    // Register guest and submit a rating
    const { token: guestToken } = await registerGuest(eventId, 'domcheck@example.com', pin, 'Dom Check');
    await submitRating(eventId, guestToken, 1, 4);

    // Complete event so guest can see dashboard
    await changeEventState(eventId, 'completed', 'started', adminToken);

    // Navigate to dashboard in browser as guest
    await setAuthToken(page, guestToken, 'domcheck@example.com');
    await page.goto(`${BASE_URL}/event/${eventId}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Get all visible text on the page
    const pageText = await page.locator('body').textContent();

    // No opaque userId (u_ followed by 10+ alphanumeric chars) should appear
    const userIdPattern = /u_[a-zA-Z0-9]{10,}/g;
    const matches = pageText.match(userIdPattern);
    expect(matches).toBeNull();
  });

  // -----------------------------------------------------------------------
  // T017: Registration returns userId not email
  // -----------------------------------------------------------------------

  test('verify-PIN response contains userId and name but no email', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;

    const result = await callVerifyPin(eventId, {
      email: 'pincheck@example.com',
      pin,
      name: 'Pin Check',
    });

    expect(result.ok).toBe(true);
    expect(result.data.user).toBeDefined();
    expect(result.data.user).toHaveProperty('userId');
    expect(result.data.user).toHaveProperty('name');
    expect(result.data.user).not.toHaveProperty('email');
  });

  // -----------------------------------------------------------------------
  // T017: Same userId on re-entry
  // -----------------------------------------------------------------------

  test('re-entering same event returns same userId', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;

    // First registration
    const first = await callVerifyPin(eventId, {
      email: 'reenter@example.com',
      pin,
      name: 'Re Enter',
    });
    expect(first.ok).toBe(true);
    const firstUserId = first.data.user.userId;
    expect(firstUserId).toBeTruthy();

    // Second registration (same email + event)
    const second = await callVerifyPin(eventId, {
      email: 'reenter@example.com',
      pin,
      name: 'Re Enter',
    });
    expect(second.ok).toBe(true);
    expect(second.data.user.userId).toBe(firstUserId);
  });

  // -----------------------------------------------------------------------
  // T019: Admin CSV export retains email
  // -----------------------------------------------------------------------

  test('admin ratings CSV contains email column', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin-csv@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);

    await startEvent(eventId, adminToken);

    // Submit a rating as guest
    const { token: guestToken } = await registerGuest(eventId, 'csvguest@example.com', pin, 'CSV Guest');
    await submitRating(eventId, guestToken, 1, 4);

    // Fetch ratings CSV as admin
    const csvResponse = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      signal: AbortSignal.timeout(10000),
    });
    expect(csvResponse.ok).toBe(true);

    const csvText = await csvResponse.text();
    const csv = parseCSV(csvText);

    expect(csv.headers).toContain('email');
  });

  // -----------------------------------------------------------------------
  // T019: Non-admin CSV has userId instead of email
  // -----------------------------------------------------------------------

  test('guest ratings CSV contains userId column not email', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin-gcsv@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);

    await startEvent(eventId, adminToken);

    // Submit a rating as guest
    const { token: guestToken } = await registerGuest(eventId, 'gcsv@example.com', pin, 'G CSV');
    await submitRating(eventId, guestToken, 1, 4);

    // Fetch ratings CSV as guest (non-admin)
    const csvResponse = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
      headers: { 'Authorization': `Bearer ${guestToken}` },
      signal: AbortSignal.timeout(10000),
    });
    expect(csvResponse.ok).toBe(true);

    const csvText = await csvResponse.text();
    const csv = parseCSV(csvText);

    expect(csv.headers).toContain('userId');
    expect(csv.headers).not.toContain('email');
  });

  // -----------------------------------------------------------------------
  // T023: Name enforcement
  // -----------------------------------------------------------------------

  test('verify-PIN without name returns 400 error', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;

    // Call verify-pin with email and pin but NO name
    const result = await callVerifyPin(eventId, {
      email: 'noname@example.com',
      pin,
      // name intentionally omitted
    });

    expect(result.status).toBe(400);
    // The error message should mention "Display name is required"
    const errorText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    expect(errorText).toContain('Display name is required');
  });

  // -----------------------------------------------------------------------
  // T034: My Progress uses ?mine=true
  // -----------------------------------------------------------------------

  test('ratings with mine=true returns only current user data with no identity columns', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin-mine@example.com';
    const adminToken = await addAdminToEvent(eventId, adminEmail);

    await startEvent(eventId, adminToken);

    // Register two guests and submit ratings
    const { token: guest1Token } = await registerGuest(eventId, 'mine1@example.com', pin, 'Mine One');
    const { token: guest2Token } = await registerGuest(eventId, 'mine2@example.com', pin, 'Mine Two');

    await submitRating(eventId, guest1Token, 1, 4);
    await submitRating(eventId, guest1Token, 2, 3);
    await submitRating(eventId, guest2Token, 1, 2);
    await submitRating(eventId, guest2Token, 3, 1);

    // Fetch ratings with mine=true as guest1
    const mineResponse = await fetch(`${API_URL}/api/events/${eventId}/ratings?mine=true`, {
      headers: { 'Authorization': `Bearer ${guest1Token}` },
      signal: AbortSignal.timeout(10000),
    });
    expect(mineResponse.ok).toBe(true);

    const csvText = await mineResponse.text();
    const csv = parseCSV(csvText);

    // No identity columns
    expect(csv.headers).not.toContain('email');
    expect(csv.headers).not.toContain('userId');

    // Only guest1's ratings (items 1 and 2)
    expect(csv.rows.length).toBe(2);
    const itemIds = csv.rows.map(r => r.itemId || r.itemid);
    expect(itemIds).toContain('1');
    expect(itemIds).toContain('2');
    // Should NOT contain guest2's item 3
    expect(itemIds).not.toContain('3');
  });

});
