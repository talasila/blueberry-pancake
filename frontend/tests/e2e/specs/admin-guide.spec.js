/**
 * Admin Guide E2E Tests
 *
 * Tests the state-aware admin guide feature on the event admin page.
 * Covers all 6 user stories: state-aware access, setup walkthrough,
 * running state, completed state, paused state, and quick-reference overview.
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
  // addAdminToEvent is idempotent — the API handles duplicate admin adds gracefully,
  // so calling it every transition is safe and keeps the helper self-contained.
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

async function openAdminGuide(page) {
  await page.getByRole('button', { name: 'Open menu' }).click();
  const guideItem = page.getByRole('menuitem', { name: /admin guide/i });
  await expect(guideItem).toBeVisible({ timeout: 3000 });
  await guideItem.click();
  await expect(page.locator('[role="dialog"][aria-label="Admin guide"]')).toBeVisible({
    timeout: 3000,
  });
}

async function closeGuideViaButton(page) {
  await page.locator('button[aria-label="Close guide"]').click();
  await expect(page.locator('[role="dialog"][aria-label="Admin guide"]')).toBeHidden({
    timeout: 3000,
  });
}

async function navigateToStep(page, stepIndex) {
  for (let i = 0; i < stepIndex; i++) {
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.waitFor({ state: 'visible', timeout: 5000 });
    await nextButton.click();
  }
}

// ---------------------------------------------------------------------------
// US1 — Access a State-Aware Admin Guide
// ---------------------------------------------------------------------------

test.describe('US1: State-aware admin guide access', () => {
  test('admin guide accessible from hamburger menu on admin page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('menuitem', { name: /admin guide/i })).toBeVisible();
  });

  test('menu item toggles admin guide open and closed', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await expect(page.locator('[role="dialog"][aria-label="Admin guide"]')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: /admin guide/i }).click();
    await expect(page.locator('[role="dialog"][aria-label="Admin guide"]')).toBeHidden({ timeout: 3000 });
  });

  test('guide opens on header icon tap with content matching "created" state', async ({
    page,
    testEvent,
  }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await expect(page.getByRole('heading', { name: 'Name Your Event' })).toBeVisible();
  });

  test('guide shows "started" content after transition', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'started');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await expect(page.getByRole('heading', { name: 'Your Event is Live' })).toBeVisible();
  });

  test('guide shows "paused" content after transition', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'paused');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await expect(page.getByRole('heading', { name: 'Event is Paused' })).toBeVisible();
  });

  test('guide shows "completed" content after transition', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'completed');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await expect(page.getByRole('heading', { name: "It's a Wrap!" })).toBeVisible();
  });

  test('guide closes on close button and can be reopened from menu', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await closeGuideViaButton(page);
    await openAdminGuide(page);
    await expect(page.locator('[role="dialog"][aria-label="Admin guide"]')).toBeVisible({ timeout: 3000 });
  });

  test('guide closes on backdrop click', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await page.locator('[data-testid="admin-guide-backdrop"]').click({ force: true });
    await expect(page.locator('[role="dialog"][aria-label="Admin guide"]')).toBeHidden({
      timeout: 5000,
    });
  });
});

// ---------------------------------------------------------------------------
// US2 — Walk Through Event Setup (created state, 7 steps)
// ---------------------------------------------------------------------------

test.describe('US2: Created state walkthrough', () => {
  const CREATED_HEADINGS = [
    'Name Your Event',
    'Set Up Your Items',
    'Configure Ratings',
    'Enable Note Suggestions',
    'Add Co-Administrators',
    'Share the PIN',
    'Ready to Go!',
  ];

  test('created-state guide shows 7 steps', async ({ page, testEvent }) => {
    // NOTE: step count is verified against the CREATED_HEADINGS constant
    // defined in this test file, not derived from the UI.  If the product
    // adds/removes a step, this constant must be updated manually.
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    for (let i = 0; i < CREATED_HEADINGS.length; i++) {
      await expect(page.getByRole('heading', { name: CREATED_HEADINGS[i] })).toBeVisible();
      if (i < CREATED_HEADINGS.length - 1) {
        await navigateToStep(page, 1);
      }
    }
  });

  test('progress indicator updates correctly', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await expect(page.getByText(/1\s*(of|\/)\s*7/i)).toBeVisible();
    await navigateToStep(page, 1);
    await expect(page.getByText(/2\s*(of|\/)\s*7/i)).toBeVisible();
  });

  test('rating configuration step contains locking warning', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 2);
    const drawer = page.locator('[role="dialog"][aria-label="Admin guide"]');
    await expect(drawer.getByText(/lock permanently/i)).toBeVisible();
  });

  test('final step shows informational CTA (not an action button)', async ({
    page,
    testEvent,
  }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 6);
    const drawer = page.locator('[role="dialog"][aria-label="Admin guide"]');
    await expect(drawer.getByRole('heading', { name: 'Ready to Go!' })).toBeVisible();
    await expect(drawer.getByText(/^Look for the Start Event button/i)).toBeVisible();
  });

  test('Back button navigates to previous step', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 1);
    await expect(page.getByRole('heading', { name: 'Set Up Your Items' })).toBeVisible();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('heading', { name: 'Name Your Event' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US3 — Understand Running State (started state, 4 steps)
// ---------------------------------------------------------------------------

test.describe('US3: Started state walkthrough', () => {
  const STARTED_HEADINGS = [
    'Your Event is Live',
    'What Guests See',
    'Need a Break?',
    'Time to Wrap Up',
  ];

  test('started-state guide shows 4 steps', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'started');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    for (let i = 0; i < STARTED_HEADINGS.length; i++) {
      await expect(page.getByRole('heading', { name: STARTED_HEADINGS[i] })).toBeVisible();
      if (i < STARTED_HEADINGS.length - 1) {
        await navigateToStep(page, 1);
      }
    }
  });

  test('content explains guest experience and pause option', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'started');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    const drawer = page.locator('[role="dialog"][aria-label="Admin guide"]');
    await navigateToStep(page, 1);
    await expect(drawer.getByText(/number grid/i)).toBeVisible();
    await navigateToStep(page, 1);
    await expect(drawer.getByText(/Pause the event/i)).toBeVisible();
  });

  test('final step shows informational CTA about completing', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'started');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 3);
    const drawer = page.locator('[role="dialog"][aria-label="Admin guide"]');
    await expect(drawer.getByText(/^Look for the Complete Event button/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US4 — Wrap Up After Completion (completed state, 4 steps)
// ---------------------------------------------------------------------------

test.describe('US4: Completed state walkthrough', () => {
  const COMPLETED_HEADINGS = [
    "It's a Wrap!",
    'View the Dashboard',
    'Export Your Data',
    'Want to Reopen?',
  ];

  test('completed-state guide shows 4 steps', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'completed');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    for (let i = 0; i < COMPLETED_HEADINGS.length; i++) {
      await expect(page.getByRole('heading', { name: COMPLETED_HEADINGS[i] })).toBeVisible();
      if (i < COMPLETED_HEADINGS.length - 1) {
        await navigateToStep(page, 1);
      }
    }
  });

  test('content covers dashboard, export, and reopen', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'completed');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    const drawer = page.locator('[role="dialog"][aria-label="Admin guide"]');
    await navigateToStep(page, 1);
    await expect(drawer.getByRole('heading', { name: 'View the Dashboard' })).toBeVisible();
    await navigateToStep(page, 1);
    await expect(drawer.getByRole('heading', { name: 'Export Your Data' })).toBeVisible();
    await navigateToStep(page, 1);
    await expect(drawer.getByRole('heading', { name: 'Want to Reopen?' })).toBeVisible();
  });

  test('final step shows informational CTA about reopening', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'completed');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 3);
    await expect(page.getByText(/reopen via the state management/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US5 — Understand Paused State (paused state, 3 steps)
// ---------------------------------------------------------------------------

test.describe('US5: Paused state walkthrough', () => {
  const PAUSED_HEADINGS = ['Event is Paused', 'Assign Item IDs', 'Resume or Finish'];

  test('paused-state guide shows 3 steps', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'paused');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    for (let i = 0; i < PAUSED_HEADINGS.length; i++) {
      await expect(page.getByRole('heading', { name: PAUSED_HEADINGS[i] })).toBeVisible();
      if (i < PAUSED_HEADINGS.length - 1) {
        await navigateToStep(page, 1);
      }
    }
  });

  test('content explains item ID assignment is only available while paused', async ({
    page,
    testEvent,
  }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'paused');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 1);
    await expect(page.getByText(/only time/i)).toBeVisible();
  });

  test('final step shows informational CTA about resuming or completing', async ({
    page,
    testEvent,
  }) => {
    const { eventId } = testEvent;
    await transitionTo(eventId, 'paused');
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 2);
    const drawer = page.locator('[role="dialog"][aria-label="Admin guide"]');
    await expect(drawer.getByText(/^Use Resume or Complete/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// US6 — Quick-Reference Any Setting (overview)
// ---------------------------------------------------------------------------

test.describe('US6: Overview / quick-reference', () => {
  test('overview button visible in drawer header', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await expect(page.locator('button[aria-label="Show overview"]')).toBeVisible();
  });

  test('tapping overview shows list of all step titles for current state', async ({
    page,
    testEvent,
  }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await page.locator('button[aria-label="Show overview"]').click();
    await expect(page.getByText('Name Your Event')).toBeVisible();
    await expect(page.getByText('Ready to Go!')).toBeVisible();
  });

  test('tapping a step title jumps to that step', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await page.locator('button[aria-label="Show overview"]').click();
    await page.getByRole('button', { name: /Share the PIN/ }).click();
    await expect(page.getByText(/6\s*(of|\/)\s*7/i)).toBeVisible();
  });

  test('current step is highlighted in overview', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await navigateToStep(page, 1);
    await page.locator('button[aria-label="Show overview"]').click();
    const secondItem = page.locator('button[aria-current="step"]');
    await expect(secondItem).toBeVisible();
    await expect(secondItem).toContainText('Set Up Your Items');
  });

  test('back button returns from overview to step view', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    await setupAdmin(page, eventId);
    await navigateToAdmin(page, eventId);
    await openAdminGuide(page);
    await page.locator('button[aria-label="Show overview"]').click();
    const backButton = page.locator('button[aria-label="Back to step"]');
    await backButton.waitFor({ state: 'visible', timeout: 15000 });
    await backButton.click();
    await expect(page.getByRole('heading', { name: 'Name Your Event' })).toBeVisible();
  });
});
