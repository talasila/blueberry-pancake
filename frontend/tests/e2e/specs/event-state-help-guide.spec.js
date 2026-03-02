/**
 * Event State Help Guide E2E Tests
 *
 * Covers the inline help in the event state management section (state drawer):
 * what each state means for admin/guest.
 */

import { test, expect } from './fixtures.js';
import { addAdminToEvent, setAuthToken, changeEventState, BASE_URL } from './helpers.js';

/** Navigate to event admin page and open the state drawer (SideDrawer with Start/Pause/Complete). */
async function openStateDrawer(page, eventId) {
  await page.goto(`${BASE_URL}/event/${eventId}/admin`);
  const stateButton = page.getByRole('button', { name: /state/i });
  await stateButton.scrollIntoViewIfNeeded();
  await stateButton.click();
  await page.getByRole('button', { name: /^start$|^pause$|^complete$/i }).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
}

/** Expand the inline help inside the state drawer. */
async function expandHelp(page) {
  const trigger = page.getByTestId('event-state-help-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
}

/** Get the expanded "What each state means" content panel. Use after expandHelp(); scopes assertions so we don't match state button help above. */
function getHelpPanel(page) {
  return page.getByTestId('event-state-help-content');
}

test.describe('Event state help guide', () => {

  // -------------------------------------------------------------------------
  // Help visible and openable (US3, SC-001)
  // -------------------------------------------------------------------------
  test('state drawer shows help trigger and one tap opens help', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const token = await addAdminToEvent(eventId, 'admin@example.com');
    await setAuthToken(page, token, 'admin@example.com');
    await openStateDrawer(page, eventId);
    await expect(page.getByRole('button', { name: 'What each state means' })).toBeVisible();
    await expandHelp(page);
    const helpPanel = getHelpPanel(page);
    await expect(helpPanel).toBeVisible({ timeout: 3000 });
    await expect(helpPanel.getByText('Host can:', { exact: false }).first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Per-state admin/guest content (US2)
  // -------------------------------------------------------------------------
  test('expanded help shows what each state means for admin and guest', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const token = await addAdminToEvent(eventId, 'admin@example.com');
    await setAuthToken(page, token, 'admin@example.com');
    await openStateDrawer(page, eventId);
    await expandHelp(page);
    const helpPanel = getHelpPanel(page);
    await expect(helpPanel).toBeVisible();
    await expect(page.getByRole('button', { name: 'What each state means' })).toBeVisible();
    await expect(helpPanel.getByText('Host can:', { exact: false }).first()).toBeVisible();
    await expect(helpPanel.getByText('Guest can:', { exact: false }).first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Help content visible for event in different states
  // -------------------------------------------------------------------------
  test('help shows state descriptions when event is started', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const token = await addAdminToEvent(eventId, 'admin@example.com');
    const { ok } = await changeEventState(eventId, 'started', 'created', token);
    if (!ok) throw new Error('Failed to start event');
    await setAuthToken(page, token, 'admin@example.com');
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    const stateButton = page.getByRole('button', { name: /state.*started/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    await expandHelp(page);
    const helpPanel = getHelpPanel(page);
    await expect(helpPanel).toBeVisible({ timeout: 5000 });
    await expect(helpPanel.getByText('Started').first()).toBeVisible();
    await expect(helpPanel.getByText('Host can:', { exact: false }).first()).toBeVisible();
  });

  test('help shows state descriptions when event is created', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const token = await addAdminToEvent(eventId, 'admin@example.com');
    await setAuthToken(page, token, 'admin@example.com');
    await openStateDrawer(page, eventId);
    await expandHelp(page);
    const helpPanel = getHelpPanel(page);
    await expect(helpPanel).toBeVisible({ timeout: 5000 });
    await expect(helpPanel.getByText('Created').first()).toBeVisible();
    await expect(helpPanel.getByText('Guest can:', { exact: false }).first()).toBeVisible();
  });
});
