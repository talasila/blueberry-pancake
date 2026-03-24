/**
 * Privacy Policy E2E Tests
 *
 * Verifies the privacy policy page renders correctly, is publicly accessible,
 * and the bottom sheet opens from the email entry and auth pages.
 */

import { test, expect } from './fixtures.js';
import { BASE_URL } from './helpers.js';

// =============================================================================
// US1 — View Privacy Policy (standalone page)
// =============================================================================

test.describe('Privacy Policy Page', () => {

  test('renders without authentication', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await expect(page.getByText('Privacy Policy', { exact: true }).first()).toBeVisible();
  });

  test('displays all 6 sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);

    const sections = [
      'What we collect',
      'Third-party services',
      'Cookies',
      'Data retention',
      'Your rights',
      'Contact',
    ];

    for (const section of sections) {
      await expect(page.getByRole('heading', { name: section })).toBeVisible();
    }
  });

  test('Resend link opens in new tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);

    const resendLink = page.getByRole('link', { name: /Resend's privacy policy/i });
    await expect(resendLink).toBeVisible();
    await expect(resendLink).toHaveAttribute('target', '_blank');
    await expect(resendLink).toHaveAttribute('rel', /noopener/);
  });

  test('displays Last updated date', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await expect(page.getByText(/Last updated:/)).toBeVisible();
  });

  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/privacy`);
    await expect(page.getByText('Privacy Policy', { exact: true }).first()).toBeVisible();

    // Verify no horizontal overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox.width).toBeLessThanOrEqual(375);
  });
});

// =============================================================================
// US2 — Privacy bottom sheet on Email Entry Page
// =============================================================================

test.describe('Privacy bottom sheet on Email Entry Page', () => {

  test('privacy policy button is visible on email entry page', async ({ page, testEvent }) => {
    await page.goto(`${BASE_URL}/event/${testEvent.eventId}/email`);
    const privacyButton = page.getByRole('button', { name: /Privacy Policy/i });
    await expect(privacyButton).toBeVisible();
  });

  test('clicking privacy policy opens bottom sheet with all sections', async ({ page, testEvent }) => {
    await page.goto(`${BASE_URL}/event/${testEvent.eventId}/email`);
    const privacyButton = page.getByRole('button', { name: /Privacy Policy/i });
    await privacyButton.click();

    // Bottom sheet should appear with the policy content
    const sheet = page.getByTestId('bottom-sheet');
    await expect(sheet).toBeVisible();

    // All sections should be visible within the sheet
    for (const section of ['What we collect', 'Third-party services', 'Cookies', 'Data retention', 'Your rights', 'Contact']) {
      await expect(sheet.getByRole('heading', { name: section })).toBeVisible();
    }
  });

  test('closing bottom sheet keeps user on email entry page', async ({ page, testEvent }) => {
    await page.goto(`${BASE_URL}/event/${testEvent.eventId}/email`);
    const privacyButton = page.getByRole('button', { name: /Privacy Policy/i });
    await privacyButton.click();

    await expect(page.getByTestId('bottom-sheet')).toBeVisible();

    // Close by clicking backdrop
    await page.getByTestId('bottom-sheet-backdrop').click();

    // Should still be on the email entry page
    await expect(page).toHaveURL(`${BASE_URL}/event/${testEvent.eventId}/email`);
  });
});

// =============================================================================
// US3 — Privacy bottom sheet on Auth Page
// =============================================================================

test.describe('Privacy bottom sheet on Auth Page', () => {

  test('privacy policy button is visible on auth page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    const privacyButton = page.getByRole('button', { name: /Privacy Policy/i });
    await expect(privacyButton).toBeVisible();
  });

  test('clicking privacy policy opens bottom sheet', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    const privacyButton = page.getByRole('button', { name: /Privacy Policy/i });
    await privacyButton.click();

    const sheet = page.getByTestId('bottom-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'What we collect' })).toBeVisible();
  });
});
