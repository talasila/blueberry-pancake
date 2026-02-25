/**
 * Hosting Guide E2E Tests
 *
 * Tests the "How to Host a Blind Wine Tasting Party" help guide feature.
 * Covers all user stories: header icon visibility, role selection, host path,
 * guest path, overview/quick-scan, and cross-cutting concerns.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openGuide(page) {
  const icon = page.locator('[data-testid="guide-icon"]');
  await expect(icon).toBeVisible({ timeout: 5000 });
  await icon.click();
  await expect(page.locator('[role="dialog"][aria-label="Hosting guide"]')).toBeVisible({ timeout: 3000 });
}

async function closeGuideViaButton(page) {
  await page.locator('button[aria-label="Close guide"]').click();
  await expect(page.locator('[role="dialog"][aria-label="Hosting guide"]')).toBeHidden({ timeout: 3000 });
}

async function selectRole(page, role) {
  const label = role === 'host' ? /I'm Hosting/i : /I'm a Guest/i;
  await page.getByRole('button', { name: label }).click();
}

// ---------------------------------------------------------------------------
// US1 — Access the Guide from Any Page
// ---------------------------------------------------------------------------

test.describe('US1: Guide access from any page', () => {
  test('header icon visible on landing page', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-testid="guide-icon"]')).toBeVisible();
  });

  test('header icon visible on auth page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    await expect(page.locator('[data-testid="guide-icon"]')).toBeVisible();
  });

  test('guide opens on tap and closes on close button', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await closeGuideViaButton(page);
  });

  test('header icon toggles guide open and closed', async ({ page }) => {
    await page.goto(BASE_URL);
    const icon = page.locator('[data-testid="guide-icon"]');
    await icon.click();
    await expect(page.locator('[role="dialog"][aria-label="Hosting guide"]')).toBeVisible({ timeout: 3000 });
    await icon.click();
    await expect(page.locator('[role="dialog"][aria-label="Hosting guide"]')).toBeHidden({ timeout: 3000 });
  });

  test('guide closes on backdrop click', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    const viewport = page.viewportSize();
    await page.mouse.click(viewport.width / 2, 80);
    await expect(page.locator('[data-testid="guide-icon"]')).toBeVisible({ timeout: 3000 });
  });

  test('guide reopens at role selection after close', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    await closeGuideViaButton(page);
    await openGuide(page);
    await expect(page.getByRole('button', { name: /I'm Hosting/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US2 — Self-Select a Role Path
// ---------------------------------------------------------------------------

test.describe('US2: Role selection', () => {
  test('role selection screen shows two options on open', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await expect(page.getByRole('button', { name: /I'm Hosting/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /I'm a Guest/i })).toBeVisible();
  });

  test('selecting host shows host step content', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    await expect(page.getByText('Pick Your Wines')).toBeVisible();
  });

  test('selecting guest shows guest step content', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'guest');
    await expect(page.getByText("You're Invited!")).toBeVisible();
  });

  test('can navigate back to role selection from a path', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    await page.getByRole('button', { name: /change role/i }).click();
    await expect(page.getByRole('button', { name: /I'm Hosting/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US3 — Host Guide Steps
// ---------------------------------------------------------------------------

test.describe('US3: Host path navigation', () => {
  test('navigate through all 8 host steps via Next button', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');

    const headings = [
      'Pick Your Wines',
      'Cover the Bottles',
      'Set Up Your Space',
      'Invite Your Guests',
      'Create Your Event',
      'Share the Event Link',
      'Taste & Rate',
      'Reveal & Compare',
    ];

    for (let i = 0; i < headings.length; i++) {
      await expect(page.getByRole('heading', { name: headings[i] })).toBeVisible();
      if (i < headings.length - 1) {
        await page.getByRole('button', { name: /next/i }).click();
      }
    }
  });

  test('Back button navigates to previous step', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByRole('heading', { name: 'Cover the Bottles' })).toBeVisible();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('heading', { name: 'Pick Your Wines' })).toBeVisible();
  });

  test('progress indicator updates per step', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    await expect(page.getByText(/1\s*(of|\/)\s*8/i)).toBeVisible();
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/2\s*(of|\/)\s*8/i)).toBeVisible();
  });

  test('final host step shows contextual CTA', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    // Navigate to last step
    for (let i = 0; i < 7; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }
    await expect(page.getByRole('heading', { name: 'Reveal & Compare' })).toBeVisible();
    // Should see a CTA button (either Sign Up or Create Event)
    const cta = page.getByRole('button', { name: /sign up|create your event/i });
    await expect(cta).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US4 — Guest Guide Steps
// ---------------------------------------------------------------------------

test.describe('US4: Guest path navigation', () => {
  test('navigate through all 4 guest steps', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'guest');

    const headings = [
      "You're Invited!",
      'Join the Event',
      'Taste & Rate',
      'See the Results',
    ];

    for (let i = 0; i < headings.length; i++) {
      await expect(page.getByRole('heading', { name: headings[i] })).toBeVisible();
      if (i < headings.length - 1) {
        await page.getByRole('button', { name: /next/i }).click();
      }
    }
  });

  test('final guest step shows guest-specific CTA', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'guest');
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }
    await expect(page.getByText(/ask your host|event link/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US5 — Quick-Scan Overview
// ---------------------------------------------------------------------------

test.describe('US5: Overview / table of contents', () => {
  test('overview shows all step titles for host path', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    await page.getByRole('button', { name: /overview|list|contents/i }).click();
    await expect(page.getByText('Pick Your Wines')).toBeVisible();
    await expect(page.getByText('Reveal & Compare')).toBeVisible();
  });

  test('tapping a title jumps to that step', async ({ page }) => {
    await page.goto(BASE_URL);
    await openGuide(page);
    await selectRole(page, 'host');
    await page.getByRole('button', { name: /overview|list|contents/i }).click();
    await page.getByText('Share the Event Link').click();
    await expect(page.getByText(/6\s*(of|\/)\s*8/i)).toBeVisible();
  });
});
