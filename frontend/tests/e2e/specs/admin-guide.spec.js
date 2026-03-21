/**
 * Event Guide E2E Tests
 *
 * Tests the unified event guide on the admin page — a scrollable list of
 * 11 steps grouped by phase with done/now/ahead visual states based on
 * event lifecycle.
 */

import { test, expect } from './fixtures.js';
import { addAdminToEvent, setAuthToken, changeEventState, BASE_URL } from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupAdmin(page, eventId) {
  const adminEmail = 'admin@example.com';
  const token = await addAdminToEvent(eventId, adminEmail);
  await setAuthToken(page, token, adminEmail);
}

async function navigateToAdmin(page, eventId) {
  await page.goto(`${BASE_URL}/event/${eventId}/admin`);
}

async function transitionEventViaAPI(eventId, targetState, currentState) {
  const adminEmail = 'admin@example.com';
  const token = await addAdminToEvent(eventId, adminEmail);
  const result = await changeEventState(eventId, targetState, currentState, token);
  if (!result.ok) throw new Error(`State transition ${currentState} → ${targetState} failed: ${result.data}`);
}

async function transitionTo(eventId, targetState) {
  const transitions = {
    started: [['started', 'created']],
    paused: [
      ['started', 'created'],
      ['paused', 'started'],
    ],
    completed: [
      ['started', 'created'],
      ['completed', 'started'],
    ],
  };
  const steps = transitions[targetState] || [];
  for (const [target, current] of steps) {
    await transitionEventViaAPI(eventId, target, current);
  }
}

async function openEventGuide(page) {
  await page.getByRole('button', { name: 'Open menu' }).click();
  const guideItem = page.getByRole('menuitem', { name: /admin guide/i });
  await expect(guideItem).toBeVisible({ timeout: 5000 });
  await guideItem.click();
  await expect(page.locator('[role="dialog"][aria-label="Event guide"]')).toBeVisible({
    timeout: 5000,
  });
}

async function closeGuideViaButton(page) {
  await page.locator('button[aria-label="Close guide"]').click();
  await expect(page.locator('[role="dialog"][aria-label="Event guide"]')).toBeHidden({
    timeout: 3000,
  });
}

const GUIDE_DIALOG = '[role="dialog"][aria-label="Event guide"]';

// All 11 step headings in order
const ALL_HEADINGS = [
  'Plan & Create Your Event',
  'Prepare Your Supplies',
  'Set Out the QR Code',
  'Collect, Cover & Number the Bottles',
  'Configure Your Items',
  'Start the Event',
  'Guests Taste & Rate',
  'Pause the Event',
  'Reveal & Match the Bottles',
  'Declare the Winner',
  'Complete the Event',
];

const PHASE_HEADERS = [
  'Before the Event',
  'Event Day \u2014 Setup',
  'During the Tasting',
  'The Reveal',
];

// ---------------------------------------------------------------------------
// US1: Access the event guide from admin page
// ---------------------------------------------------------------------------

test.describe('US1: Event guide access', () => {
  test('guide accessible from hamburger menu on admin page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('menuitem', { name: /admin guide/i })).toBeVisible();
  });

  test('menu item toggles guide open and closed', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    await expect(page.locator(GUIDE_DIALOG)).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: /admin guide/i }).click();
    await expect(page.locator(GUIDE_DIALOG)).toBeHidden({ timeout: 3000 });
  });

  test('guide closes on close button and can be reopened', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    await closeGuideViaButton(page);
    await openEventGuide(page);
    await expect(page.locator(GUIDE_DIALOG)).toBeVisible({ timeout: 3000 });
  });

  test('guide closes on backdrop click', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    await page.locator('[data-testid="event-guide-backdrop"]').click({ force: true });
    await expect(page.locator(GUIDE_DIALOG)).toBeHidden({ timeout: 5000 });
  });

  test('guide closes on Escape key', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    await page.keyboard.press('Escape');
    await expect(page.locator(GUIDE_DIALOG)).toBeHidden({ timeout: 3000 });
  });

  test('guide has correct ARIA attributes', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const dialog = page.locator(GUIDE_DIALOG);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-label', 'Event guide');
  });
});

// ---------------------------------------------------------------------------
// US2: Scrollable list with all steps and phase headers
// ---------------------------------------------------------------------------

test.describe('US2: Structure and content', () => {
  test('guide displays all 11 steps in a scrollable list', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    for (const heading of ALL_HEADINGS) {
      await expect(drawer.getByText(heading, { exact: false })).toBeAttached();
    }
  });

  test('phase section headers are visible', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    for (const header of PHASE_HEADERS) {
      await expect(drawer.getByText(header)).toBeAttached();
    }
  });

  test('step content covers key topics: registration, rating lock, assignment', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Step 1 (now, expanded) mentions rating settings
    const step1 = drawer.locator('[data-testid="guide-step-step-1"]');
    await expect(step1.getByText(/rating/i)).toBeVisible();
    // Step 4 (now, expanded) mentions guest registration
    const step4 = drawer.locator('[data-testid="guide-step-step-4"]');
    await expect(step4.getByText(/register/i)).toBeVisible();
    // Step 9 is ahead (collapsed) — expand it to check content
    const step9 = drawer.locator('[data-testid="guide-step-step-9"]');
    await step9.locator('button').first().click();
    await expect(step9.getByText(/Assignment tab/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US3: Expand / collapse steps
// ---------------------------------------------------------------------------

test.describe('US3: Expand and collapse', () => {
  test('"now" steps are auto-expanded, "ahead" steps are collapsed', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Step 1 (now) — description visible
    const step1 = drawer.locator('[data-testid="guide-step-step-1"]');
    await expect(step1.getByText(/Pick a date/i)).toBeVisible();
    // Step 7 (ahead) — description hidden
    const step7 = drawer.locator('[data-testid="guide-step-step-7"]');
    await expect(step7.getByText(/taste each bottle/i)).toBeHidden();
  });

  test('tapping a step toggles its description', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    const step1 = drawer.locator('[data-testid="guide-step-step-1"]');
    // Starts expanded
    await expect(step1.getByText(/Pick a date/)).toBeVisible();
    // Collapse
    await step1.locator('button').first().click();
    await expect(step1.getByText(/Pick a date/)).toBeHidden();
    // Expand again
    await step1.locator('button').first().click();
    await expect(step1.getByText(/Pick a date/)).toBeVisible();
  });

  test('can expand an "ahead" step manually', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Step 7 is ahead — click to expand
    const step7 = drawer.locator('[data-testid="guide-step-step-7"]');
    await step7.locator('button').first().click();
    await expect(step7.getByText(/taste each bottle/i)).toBeVisible();
  });

  test('expand state resets on reopen', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Collapse step 1
    const step1 = drawer.locator('[data-testid="guide-step-step-1"]');
    await step1.locator('button').first().click();
    await expect(step1.getByText(/Pick a date/)).toBeHidden();
    // Close and reopen — should be expanded again
    await closeGuideViaButton(page);
    await openEventGuide(page);
    await expect(drawer.locator('[data-testid="guide-step-step-1"]').getByText(/Pick a date/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US4: Visual states by lifecycle (created, started, paused, completed)
// ---------------------------------------------------------------------------

test.describe('US4: Visual states by lifecycle', () => {
  test('created state: steps 1-6 are "now" (expanded), steps 7-11 are "ahead"', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Now steps expanded
    await expect(drawer.locator('[data-testid="guide-step-step-1"]').getByText(/Pick a date/i)).toBeVisible();
    await expect(drawer.locator('[data-testid="guide-step-step-6"]').getByText(/hit Start/i)).toBeVisible();
    // Ahead steps collapsed
    await expect(drawer.locator('[data-testid="guide-step-step-7"]').getByText(/taste each bottle/i)).toBeHidden();
    await expect(drawer.locator('[data-testid="guide-step-step-11"]').getByText(/Mark the event as complete/i)).toBeHidden();
  });

  test('started state: steps 1-6 are "done", step 7 is "now", steps 8-11 are "ahead"', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'started');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Step 7 expanded (now)
    await expect(drawer.locator('[data-testid="guide-step-step-7"]').getByText(/taste each bottle/i)).toBeVisible();
    // Step 8 collapsed (ahead)
    await expect(drawer.locator('[data-testid="guide-step-step-8"]').getByText(/everyone is done tasting/i)).toBeHidden();
  });

  test('paused state: steps 1-7 are "done", steps 8-10 are "now", step 11 is "ahead"', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'paused');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Step 8 expanded (now)
    await expect(drawer.locator('[data-testid="guide-step-step-8"]').getByText(/everyone is done tasting/i)).toBeVisible();
    // Step 9 expanded (now)
    await expect(drawer.locator('[data-testid="guide-step-step-9"]').getByText(/Assignment tab/i)).toBeVisible();
    // Step 10 expanded (now)
    await expect(drawer.locator('[data-testid="guide-step-step-10"]').getByText(/dashboard/i)).toBeVisible();
    // Step 11 collapsed (ahead)
    await expect(drawer.locator('[data-testid="guide-step-step-11"]').getByText(/Mark the event as complete/i)).toBeHidden();
  });

  test('completed state: steps 1-10 are "done", step 11 is "now"', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'completed');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    // Step 11 expanded (now)
    await expect(drawer.locator('[data-testid="guide-step-step-11"]').getByText(/Mark the event as complete/i)).toBeVisible();
    // Step 1 should be done (collapsed)
    await expect(drawer.locator('[data-testid="guide-step-step-1"]').getByText(/Pick a date/i)).toBeHidden();
  });

  test('guide reflects new state after transition (close and reopen)', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    // Open in created state — step 1 is "now"
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    await expect(drawer.locator('[data-testid="guide-step-step-1"]').getByText(/Pick a date/i)).toBeVisible();
    await closeGuideViaButton(page);
    // Transition to started
    await transitionTo(eventId, 'started');
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    // Now step 7 should be "now"
    await expect(drawer.locator('[data-testid="guide-step-step-7"]').getByText(/taste each bottle/i)).toBeVisible();
    // Step 1 should be "done" (collapsed)
    await expect(drawer.locator('[data-testid="guide-step-step-1"]').getByText(/Pick a date/i)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// US5: Mobile viewport
// ---------------------------------------------------------------------------

test.describe('US5: Mobile viewport', () => {
  test('all steps render without horizontal overflow at 320px', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await page.setViewportSize({ width: 320, height: 568 });
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    await expect(drawer).toBeVisible({ timeout: 5000 });
    const hasOverflow = await drawer.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(hasOverflow).toBe(false);
  });

  test('all 11 steps are present at 320px viewport', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await page.setViewportSize({ width: 320, height: 568 });
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openEventGuide(page);
    const drawer = page.locator(GUIDE_DIALOG);
    for (const heading of ALL_HEADINGS) {
      await expect(drawer.getByText(heading, { exact: false })).toBeAttached();
    }
  });
});
