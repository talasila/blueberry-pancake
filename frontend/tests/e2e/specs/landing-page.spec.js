/**
 * Landing Page Tests
 *
 * Tests the redesigned landing page with hero section, three-step strip,
 * host-focused CTAs, and demoted event-code input.
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, createTestEvent, deleteTestEvent, addAdminToEvent, setAuthToken } from './helpers.js';
import { DEFAULT_TEST_PIN } from '../e2e-config.js';

test.describe('Landing Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // ===================================
  // Hero content & three-step strip
  // ===================================

  test('displays headline, subtitle, and three-step strip', async ({ page }) => {
    // Headline
    const headline = page.getByRole('heading', { name: /who brought the best bottle/i });
    await expect(headline).toBeVisible();

    // Subtitle
    const subtitle = page.getByText(/host a blind tasting party, rate the mystery bottles/i);
    await expect(subtitle).toBeVisible();

    // Three-step labels
    await expect(page.getByText('Cover')).toBeVisible();
    await expect(page.getByText('Taste')).toBeVisible();
    await expect(page.getByText('Reveal')).toBeVisible();
  });

  // ===================================
  // Unauthenticated CTA navigation
  // ===================================

  test('"Host a Tasting" navigates to auth when unauthenticated', async ({ page }) => {
    const hostButton = page.getByRole('button', { name: /host a tasting/i });
    await expect(hostButton).toBeVisible();
    await hostButton.click();

    await expect(page).toHaveURL(/\/auth/);
  });

  test('"My Events" navigates to auth when unauthenticated', async ({ page }) => {
    const myEventsButton = page.getByRole('button', { name: /my events/i });
    await expect(myEventsButton).toBeVisible();
    await myEventsButton.click();

    await expect(page).toHaveURL(/\/auth/);
  });

  // ===================================
  // Event code input
  // ===================================

  test('"Have an event code?" reveals input, entering code + Go navigates to event page', async ({ page }) => {
    // Code input should not be visible initially
    const codeInput = page.getByPlaceholder(/ABCD1234/i);
    await expect(codeInput).not.toBeVisible();

    // Click the toggle text
    const codeToggle = page.getByText(/have an event code/i);
    await expect(codeToggle).toBeVisible();
    await codeToggle.click();

    // Input and Go button should now appear
    await expect(codeInput).toBeVisible();

    const goButton = page.getByRole('button', { name: /^go$/i });
    await expect(goButton).toBeVisible();
    await expect(goButton).toBeDisabled();

    // Enter a code and submit
    await codeInput.fill('TEST1234');
    await expect(goButton).toBeEnabled();
    await goButton.click();

    await expect(page).toHaveURL(/\/event\/TEST1234/);
  });

  // ===================================
  // Mobile / narrow viewport
  // ===================================

  test('mobile viewport (375px) shows all hero content above fold', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // All primary elements should be visible
    const headline = page.getByRole('heading', { name: /who brought the best bottle/i });
    await expect(headline).toBeVisible();

    const subtitle = page.getByText(/host a blind tasting party, rate the mystery bottles/i);
    await expect(subtitle).toBeVisible();

    await expect(page.getByText('Cover')).toBeVisible();
    await expect(page.getByText('Taste')).toBeVisible();
    await expect(page.getByText('Reveal')).toBeVisible();

    const hostButton = page.getByRole('button', { name: /host a tasting/i });
    await expect(hostButton).toBeVisible();

    const myEventsButton = page.getByRole('button', { name: /my events/i });
    await expect(myEventsButton).toBeVisible();

    const codeToggle = page.getByText(/have an event code/i);
    await expect(codeToggle).toBeVisible();
  });

  test('narrow viewport (320px) three-step icons stay in a single horizontal row', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    // All three step labels should be visible
    const cover = page.getByText('Cover');
    const taste = page.getByText('Taste');
    const reveal = page.getByText('Reveal');

    await expect(cover).toBeVisible();
    await expect(taste).toBeVisible();
    await expect(reveal).toBeVisible();

    // Verify they are in the same horizontal row by checking their bounding boxes
    const coverBox = await cover.boundingBox();
    const tasteBox = await taste.boundingBox();
    const revealBox = await reveal.boundingBox();

    // All three labels should share approximately the same vertical position (within 20px tolerance)
    // This confirms no wrapping occurred
    expect(Math.abs(coverBox.y - tasteBox.y)).toBeLessThan(20);
    expect(Math.abs(tasteBox.y - revealBox.y)).toBeLessThan(20);

    // They should be laid out left-to-right
    expect(coverBox.x).toBeLessThan(tasteBox.x);
    expect(tasteBox.x).toBeLessThan(revealBox.x);
  });
});

// ===================================
// Authenticated user navigation
// ===================================

// Tests in this describe share mutable `eventId`/`token` state via beforeEach/afterEach.
// Playwright runs tests within a describe block serially by default, so this is safe.
test.describe('Landing Page - Authenticated User', () => {
  const adminEmail = 'landing-auth@example.com';
  let eventId;
  let token;

  test.beforeEach(async ({ page }) => {
    eventId = await createTestEvent('Landing Auth Test', DEFAULT_TEST_PIN);
    token = await addAdminToEvent(eventId, adminEmail);
    await setAuthToken(page, token, adminEmail);
  });

  test.afterEach(async () => {
    if (eventId) {
      await deleteTestEvent(eventId);
      eventId = null;
    }
  });

  test('"Host a Tasting" navigates directly to create-event when authenticated', async ({ page }) => {
    await page.goto(BASE_URL);

    const hostButton = page.getByRole('button', { name: /host a tasting/i });
    await hostButton.click();

    await expect(page).toHaveURL(/\/create-event/, { timeout: 5000 });

    const nameInput = page.locator('input#event-name').or(page.getByLabel(/event name/i));
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('"My Events" navigates directly to my-events when authenticated', async ({ page }) => {
    await page.goto(BASE_URL);

    const myEventsButton = page.getByRole('button', { name: /my events/i });
    await myEventsButton.click();

    await expect(page).toHaveURL(/\/my-events/, { timeout: 5000 });

    await expect(page.getByText('My Events')).toBeVisible({ timeout: 5000 });
  });
});
