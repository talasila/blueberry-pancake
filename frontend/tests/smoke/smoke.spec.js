/**
 * Production Smoke Test — Full Event Lifecycle
 *
 * Exercises the critical path: auth → create → configure → start → rate → dashboard → cleanup.
 * Creates a temporary event and deletes it at the end (with safety-net cleanup on failure).
 *
 * The OTP step pauses and prompts for manual entry in the terminal.
 * 
 * Checks -
 * API health check
 * Landing page renders
 * Full event lifecycle (single test with 8 labeled steps):
 *     OTP auth (pauses for manual input)
 *     Create event (intercepts API response for eventId + PIN)
 *     Modify item config (20 → 5 bottles)
 *     Start event
 *     Regular user joins via PIN and rates item 1 (fresh browser context)
 *     Admin views dashboard
 *     Delete all ratings via Danger Zone
 *     Delete event via Danger Zone
 *     finally block attempts API cleanup if the test fails midway
 *
 * Required env vars:
 *   APP_URL      - Deployed app URL (e.g. https://your-app.example.com)
 *   SMOKE_EMAIL  - Email address where you receive OTP codes
 *
 * Usage:
 *   APP_URL=https://app.example.com SMOKE_EMAIL=you@example.com \
 *     npx playwright test --config tests/smoke/smoke.config.js --headed
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL?.replace(/\/$/, '');
const SMOKE_EMAIL = process.env.SMOKE_EMAIL;

if (!APP_URL) throw new Error('APP_URL env var is required');
if (!SMOKE_EMAIL) throw new Error('SMOKE_EMAIL env var is required');

// ─── Test Suite ─────────────────────────────────────────

test.describe('Production Smoke Test', () => {
  test.describe.configure({ mode: 'serial' });

  // ── 1. Health Check ───────────────────────────────────

  test('API health check', async ({ request }) => {
    const resp = await request.get(`${APP_URL}/api/health`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.storage?.initialized).toBe(true);
  });

  // ── 2. Landing Page ───────────────────────────────────

  test('Landing page loads', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input#event-id')).toBeVisible();
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible();
  });

  // ── 3. Full Event Lifecycle ───────────────────────────

  test('Full event lifecycle', async ({ page, browser }) => {
    test.setTimeout(180_000); // 3 min to allow manual OTP entry

    let eventId = null;
    let eventPIN = null;
    let adminJWT = null;

    try {
      // ── Step 1: OTP Authentication ──

      await test.step('Authenticate via OTP', async () => {
        await page.goto(`${APP_URL}/auth`);
        await page.waitForLoadState('networkidle');

        const emailInput = page.locator('input#email');
        await expect(emailInput).toBeVisible({ timeout: 10_000 });
        await emailInput.fill(SMOKE_EMAIL);

        const requestButton = page.getByRole('button', { name: /request otp/i });
        await expect(requestButton).toBeEnabled({ timeout: 30_000 });

        // Click and wait for OTP input; retry if Turnstile verification wasn't ready yet
        const otpInput = page.locator('input#otp');
        await expect(async () => {
          await requestButton.click();
          await expect(otpInput).toBeVisible({ timeout: 5_000 });
        }).toPass({ timeout: 45_000, intervals: [3_000] });

        // Pause so the operator can type the OTP into the browser.
        // Check your email, type the 6-digit code into the OTP field,
        // then click the green ▶ Resume button in the page overlay.
        console.log(`\n  📧 OTP sent to: ${SMOKE_EMAIL}`);
        console.log('     Type the OTP into the browser, then click ▶ Resume.\n');
        await page.pause();

        // Verify the operator entered a valid OTP before proceeding
        const otpValue = await otpInput.inputValue();
        expect(otpValue, 'OTP field should contain 6 digits after resume').toMatch(/^\d{6}$/);

        const verifyButton = page.getByRole('button', { name: /verify otp/i });
        await expect(verifyButton).toBeEnabled({ timeout: 5000 });
        await verifyButton.click();

        await expect(page.getByText(/authentication successful/i)).toBeVisible({ timeout: 10_000 });
        await page.waitForURL((url) => !new URL(url).pathname.includes('/auth'), { timeout: 10_000 });

        // JWT is now stored as an httpOnly cookie, read it via Playwright API
        const cookies = await page.context().cookies();
        const jwtCookie = cookies.find(c => c.name === 'jwt_token');
        adminJWT = jwtCookie?.value;
        expect(adminJWT).toBeTruthy();
      });

      // ── Step 2: Create Event ──

      await test.step('Create event', async () => {
        await page.goto(`${APP_URL}/create-event`);
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/create-event/, { timeout: 5000 });

        const nameInput = page.locator('input#event-name');
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        await nameInput.fill('Smoke Test Event');

        const responsePromise = page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/events') &&
            resp.request().method() === 'POST' &&
            !resp.url().includes('verify-pin'),
        );

        await page.getByRole('button', { name: /create event/i }).click();

        const response = await responsePromise;
        const data = await response.json();
        eventId = data.eventId;
        eventPIN = data.pin;

        expect(eventId).toBeTruthy();
        expect(eventPIN).toBeTruthy();
        expect(eventId).toMatch(/^[0-9A-HJ-NP-TV-Z]{8}$/);

        await page.waitForURL(new RegExp(`/event/${eventId}/admin`), { timeout: 10_000 });

        // Post-creation welcome sheet replaced the old "event created" banner
        await expect(page.getByText(/your event is ready/i)).toBeVisible({ timeout: 10_000 });
        await page.getByTestId('welcome-got-it').click();

        console.log(`\n  🎉 Event created: ${eventId} (PIN: ${eventPIN})\n`);
      });

      // ── Step 3: Modify Item Configuration ──

      await test.step('Modify item configuration (20 → 5 bottles)', async () => {
        const bottlesButton = page.getByRole('button', { name: /bottles/i });
        await bottlesButton.waitFor({ state: 'visible', timeout: 10_000 });
        await bottlesButton.click();

        const bottlesInput = page.getByRole('spinbutton');
        await bottlesInput.waitFor({ state: 'visible', timeout: 5000 });
        await page.waitForLoadState('networkidle');

        await bottlesInput.fill('5');
        await page.getByRole('button', { name: /save/i }).click();
        await page.waitForTimeout(1000);

        // Reload to close drawer and confirm save
        await page.goto(`${APP_URL}/event/${eventId}/admin`);
        await page.waitForLoadState('networkidle');
      });

      // ── Step 4: Start Event ──

      await test.step('Change event state to started', async () => {
        const stateButton = page.getByRole('button', { name: /state.*created/i });
        await stateButton.scrollIntoViewIfNeeded();
        await stateButton.click();
        await page.waitForTimeout(500);

        const startButton = page.getByRole('button', { name: /start/i });
        await startButton.waitFor({ state: 'visible', timeout: 5000 });
        await startButton.scrollIntoViewIfNeeded();
        await startButton.click({ force: true });
        await page.waitForTimeout(2000);

        await expect(
          page.getByRole('button', { name: /state.*started/i }),
        ).toBeVisible({ timeout: 5000 });
      });

      // ── Step 5: Regular User Joins via PIN and Rates ──

      await test.step('Regular user joins via PIN and rates a wine', async () => {
        const userContext = await browser.newContext();
        const userPage = await userContext.newPage();

        try {
          await userPage.goto(`${APP_URL}/event/${eventId}`);
          await userPage.waitForLoadState('networkidle');

          // Email entry
          const emailInput = userPage.locator('input#email');
          await emailInput.waitFor({ state: 'visible', timeout: 5000 });
          await emailInput.fill('smoketest-user@example.com');
          await userPage.getByRole('button', { name: /continue/i }).click();

          // PIN entry
          await userPage.waitForURL(/\/pin$/, { timeout: 5000 });
          const pinInput = userPage
            .locator('input#pin')
            .or(userPage.locator('input[type="text"][maxlength="6"]'))
            .first();
          await pinInput.waitFor({ state: 'attached', timeout: 5000 });
          await pinInput.click();
          await pinInput.fill(eventPIN);
          await userPage.waitForTimeout(500);

          const accessButton = userPage.getByRole('button', { name: /access event/i });
          await expect(accessButton).toBeEnabled({ timeout: 5000 });
          await accessButton.click();

          // Event page
          await userPage.waitForURL(new RegExp(`/event/${eventId}$`), { timeout: 10_000 });
          await userPage.waitForLoadState('networkidle');

          // Dismiss guest welcome bottom sheet if it appeared after PIN login
          const skipBtn = userPage.locator('[data-testid="guest-welcome-skip-btn"]');
          try {
            await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
            await skipBtn.click();
            await userPage.locator('[data-testid="guest-welcome-bottom-sheet"]').waitFor({ state: 'hidden', timeout: 2000 });
          } catch {
            // Sheet didn't appear — continue
          }

          await expect(userPage.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });

          // Rate item 1 with a "3 - Not bad..."
          await userPage.locator('button').filter({ hasText: '1' }).first().click();

          const ratingDropdown = userPage.getByText(/select a rating/i);
          await expect(ratingDropdown).toBeVisible({ timeout: 5000 });
          await ratingDropdown.click();

          await userPage.getByRole('button', { name: /3 - Not bad/i }).click();
          await userPage.getByRole('button', { name: /submit rating/i }).click();

          await expect(
            userPage.getByText(/rating submitted successfully/i),
          ).toBeVisible({ timeout: 5000 });
        } finally {
          await userContext.close();
        }
      });

      // ── Step 6: Admin Views Dashboard ──

      await test.step('Admin views dashboard with rating data', async () => {
        await page.goto(`${APP_URL}/event/${eventId}/dashboard`);
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(new RegExp(`/event/${eventId}/dashboard`));
        await expect(page.getByText(/total.*users/i)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/total.*ratings/i)).toBeVisible();

        const itemsTab = page.getByRole('tab', { name: /items|bottles/i });
        await itemsTab.waitFor({ state: 'visible', timeout: 10_000 });
        await itemsTab.click();
        await page.waitForTimeout(500);

        await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
      });

      // ── Step 7: Delete All Ratings ──

      await test.step('Delete all ratings via Danger Zone', async () => {
        await page.goto(`${APP_URL}/event/${eventId}/admin`);
        await page.waitForLoadState('networkidle');

        const dangerButton = page.getByRole('button', { name: /danger zone/i });
        await dangerButton.waitFor({ state: 'visible', timeout: 10_000 });
        await dangerButton.click();

        const drawer = page.getByRole('dialog', { name: /danger zone/i });
        await drawer.waitFor({ state: 'visible', timeout: 5000 });

        await page.getByTestId('delete-all-ratings-button').click();

        const confirmInput = page.getByTestId('confirm-input');
        await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
        await confirmInput.fill('DELETE RATINGS');
        await page.waitForTimeout(300);

        await expect(page.getByTestId('confirm-delete-button')).toBeEnabled({ timeout: 3000 });
        // Click via JS to bypass z-index layering between drawer and modal
        await page.evaluate(() => {
          document.querySelector('[data-testid="confirm-delete-button"]')?.click();
        });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      });

      // ── Step 8: Delete Event ──

      await test.step('Delete event via Danger Zone', async () => {
        await page.goto(`${APP_URL}/event/${eventId}/admin`);
        await page.waitForLoadState('networkidle');

        const dangerButton = page.getByRole('button', { name: /danger zone/i });
        await dangerButton.waitFor({ state: 'visible', timeout: 10_000 });
        await dangerButton.click();

        const drawer = page.getByRole('dialog', { name: /danger zone/i });
        await drawer.waitFor({ state: 'visible', timeout: 5000 });

        const deleteEventButton = page.getByTestId('delete-event-button');
        await expect(deleteEventButton).toBeVisible({ timeout: 5000 });
        await deleteEventButton.click();

        const confirmInput = page.getByTestId('confirm-input');
        await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
        await confirmInput.fill('DELETE');
        await page.waitForTimeout(300);

        await expect(page.getByTestId('confirm-delete-button')).toBeEnabled({ timeout: 3000 });
        await page.evaluate(() => {
          document.querySelector('[data-testid="confirm-delete-button"]')?.click();
        });

        // Should redirect to home page
        await page.waitForURL(
          (url) => new URL(url).pathname === '/',
          { timeout: 10_000 },
        );

        eventId = null; // Prevent safety-net cleanup
      });

    } finally {
      // Safety net: if the test failed before the event was deleted, try API cleanup
      if (eventId && adminJWT) {
        console.warn(`\n  ⚠ Test failed — attempting cleanup of event ${eventId}...`);
        try {
          const resp = await fetch(`${APP_URL}/api/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminJWT}` },
          });
          if (resp.ok) {
            console.log(`  ✓ Event ${eventId} cleaned up successfully\n`);
          } else {
            console.warn(`  ✗ Cleanup returned HTTP ${resp.status} — delete event ${eventId} manually\n`);
          }
        } catch (e) {
          console.warn(`  ✗ Cleanup failed: ${e.message}`);
          console.warn(`  → Delete event ${eventId} from the System Admin page (/system)\n`);
        }
      }
    }
  });
});
