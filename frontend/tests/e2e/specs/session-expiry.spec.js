/**
 * Session Expiration UX Tests
 *
 * Verifies that when a user's session expires, the app shows a
 * friendly re-auth dialog instead of a silent error.
 *
 * Strategy: use page.route() to intercept API responses and return 401,
 * and also make the refresh endpoint fail, to simulate full token expiry
 * without waiting for actual time-based expiry.
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  loginAsUserToEvent,
  setAuthToken,
  startEvent,
  BASE_URL,
} from './helpers.js';

test.describe('Session Expiration — PIN User', () => {

  test('shows re-auth dialog when rating submission gets 401 and refresh fails', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;

    // Start the event first, then login (so item buttons render immediately)
    const adminToken = await addAdminToEvent(eventId, 'admin-session@example.com');
    await startEvent(eventId, adminToken);
    await loginAsUserToEvent(page, eventId, 'session-test@example.com', pin);

    // Intercept: make refresh endpoint fail
    await page.route('**/api/auth/refresh', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Refresh token expired"}' })
    );

    // Intercept: make the next rating POST return 401
    await page.route('**/api/events/*/ratings', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Unauthorized"}' });
      }
      return route.continue();
    });

    // Click item 1 to open rating drawer
    const itemButton = page.locator('button').filter({ hasText: /^1$/ }).first();
    await itemButton.click();

    // Wait for drawer and select a rating
    const ratingGroup = page.locator('[role="radiogroup"]');
    await expect(ratingGroup).toBeVisible({ timeout: 5000 });
    const ratingOption = page.locator('[role="radio"]').first();
    await ratingOption.click();

    // Submit the rating
    const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Save")').first();
    await submitBtn.click();

    // Session expired dialog should appear
    await expect(page.getByTestId('session-expired-dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Welcome back!')).toBeVisible();
    await expect(page.getByTestId('session-expired-pin-input')).toBeVisible();
  });

  test('PIN re-auth in session dialog dismisses it on success', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'session-reauth@example.com', pin);

    // Trigger session-expired event directly via page.evaluate (simpler for this test)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { authMethod: 'pin', email: 'session-reauth@example.com' },
      }));
    });

    // Dialog should appear
    await expect(page.getByTestId('session-expired-dialog')).toBeVisible({ timeout: 3000 });

    // Remove route intercepts so real PIN verification works
    // Enter PIN and submit
    await page.getByTestId('session-expired-pin-input').fill(pin);
    await page.getByTestId('session-expired-pin-submit').click();

    // Dialog should dismiss on successful re-auth
    await expect(page.getByTestId('session-expired-dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid PIN in session dialog', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'session-badpin@example.com', pin);

    // Trigger session-expired
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { authMethod: 'pin', email: 'session-badpin@example.com' },
      }));
    });

    await expect(page.getByTestId('session-expired-dialog')).toBeVisible({ timeout: 3000 });

    // Enter wrong PIN
    await page.getByTestId('session-expired-pin-input').fill('000000');
    await page.getByTestId('session-expired-pin-submit').click();

    // Error should appear, dialog stays open
    await expect(page.getByTestId('session-expired-error')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('session-expired-dialog')).toBeVisible();
  });

  test('dialog appears on visibilitychange when session has expired', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'session-vis@example.com', pin);

    // Intercept refresh to fail
    await page.route('**/api/auth/refresh', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Refresh token expired"}' })
    );

    // Expire the session client-side and trigger visibilitychange
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('userSession'));
      if (session) {
        session.exp = Math.floor(Date.now() / 1000) - 3600; // expired 1 hour ago
        localStorage.setItem('userSession', JSON.stringify(session));
      }
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Session expired dialog should appear
    await expect(page.getByTestId('session-expired-dialog')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Session Expiration — PIN Silent Renewal', () => {

  test('silently renews session on visibilitychange when refresh succeeds', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'session-silent@example.com', pin);

    // Intercept refresh to succeed with PIN-style response
    await page.route('**/api/auth/refresh', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { userId: 'u_silent', exp: Math.floor(Date.now() / 1000) + 86400, authMethod: 'pin' },
          message: 'Token refreshed successfully',
        }),
      })
    );

    // Expire the session client-side and trigger visibilitychange
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('userSession'));
      if (session) {
        session.exp = Math.floor(Date.now() / 1000) - 3600;
        localStorage.setItem('userSession', JSON.stringify(session));
      }
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait briefly for the async refresh to complete
    await page.waitForTimeout(500);

    // Session expired dialog should NOT appear — refresh succeeded silently
    await expect(page.getByTestId('session-expired-dialog')).not.toBeVisible();
  });

  test('dialog shows correct identity after race between visibility and polling', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'session-race@example.com', pin);

    // Intercept refresh to fail
    await page.route('**/api/auth/refresh', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Refresh token expired"}' })
    );

    // Expire session and trigger visibilitychange
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('userSession'));
      if (session) {
        session.exp = Math.floor(Date.now() / 1000) - 3600;
        localStorage.setItem('userSession', JSON.stringify(session));
      }
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Exactly one dialog should appear (not duplicated, not stuck)
    await expect(page.getByTestId('session-expired-dialog')).toBeVisible({ timeout: 5000 });

    // The PIN input should be visible (auth method correctly identified as PIN, not null)
    await expect(page.getByTestId('session-expired-pin-input')).toBeVisible();
  });

  test('second tab picks up renewed session without showing dialog', async ({ page, context, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'session-multitab@example.com', pin);

    // Simulate silent refresh by updating localStorage with a renewed session
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('userSession'));
      if (session) {
        session.exp = Math.floor(Date.now() / 1000) + 86400; // refreshed: valid for 24h
        localStorage.setItem('userSession', JSON.stringify(session));
      }
    });

    // Open a second tab in the same browser context (shares cookies + localStorage)
    const page2 = await context.newPage();
    await page2.goto(`${BASE_URL}/event/${eventId}`);

    // The second tab should load the event page without a session-expired dialog
    await page2.waitForTimeout(1000);
    await expect(page2.getByTestId('session-expired-dialog')).not.toBeVisible();

    await page2.close();
  });

  test('prompted re-auth works with recovery email from localStorage', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'session-recovery@example.com', pin);

    // Verify pin:email was persisted during login
    const storedEmail = await page.evaluate((eid) => localStorage.getItem(`pin:email:${eid}`), eventId);
    expect(storedEmail).toBe('session-recovery@example.com');

    // Trigger session-expired with null email (simulating the post-041 scenario)
    await page.evaluate((eid) => {
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { authMethod: 'pin', email: null, eventId: eid },
      }));
    }, eventId);

    // Dialog should appear
    await expect(page.getByTestId('session-expired-dialog')).toBeVisible({ timeout: 3000 });

    // Enter correct PIN — recovery email from localStorage should make this work
    await page.getByTestId('session-expired-pin-input').fill(pin);
    await page.getByTestId('session-expired-pin-submit').click();

    // Dialog should dismiss on successful re-auth
    await expect(page.getByTestId('session-expired-dialog')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Session Expiration — OTP Admin', () => {

  test('shows redirect dialog for OTP admin session expiration', async ({ page, testEvent }) => {
    const { eventId } = testEvent;

    // Login as admin via OTP
    const adminToken = await addAdminToEvent(eventId, 'admin-otp-session@example.com');
    await setAuthToken(page, adminToken, 'admin-otp-session@example.com');
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));

    // Trigger session-expired with OTP auth method
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { authMethod: 'otp', email: 'admin-otp-session@example.com' },
      }));
    });

    // Dialog should appear with OTP-specific messaging
    await expect(page.getByTestId('session-expired-dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/verify your email/i)).toBeVisible();
    await expect(page.getByTestId('session-expired-otp-continue')).toBeVisible();

    // Should not show PIN input
    await expect(page.getByTestId('session-expired-pin-input')).not.toBeVisible();
  });

  test('OTP continue button redirects to OTP page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;

    const adminToken = await addAdminToEvent(eventId, 'admin-otp-redir@example.com');
    await setAuthToken(page, adminToken, 'admin-otp-redir@example.com');
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/admin`));

    // Trigger session-expired
    await page.evaluate((eid) => {
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { authMethod: 'otp', email: 'admin-otp-redir@example.com', eventId: eid },
      }));
    }, eventId);

    await expect(page.getByTestId('session-expired-otp-continue')).toBeVisible({ timeout: 3000 });
    await page.getByTestId('session-expired-otp-continue').click();

    // Should navigate to OTP entry page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}/otp`), { timeout: 5000 });
  });
});
