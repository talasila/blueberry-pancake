/**
 * Event State Management Tests
 *
 * Tests the event lifecycle state transitions via the inline
 * EventProgressStepper (no drawer — buttons are on the page).
 */

import { test, expect } from './fixtures.js';
import {
  addAdminToEvent,
  setAuthToken,
  changeEventState,
  loginAsUserToEvent,
  BASE_URL,
} from './helpers.js';

const BOTTLE_1 = 'button >> text=/^1$/';

test.describe('Event State Management', () => {

  // ===================================
  // User Story 1 – Start an Event
  // ===================================

  test('new event is in "created" state and regular user cannot rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);

    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));

    const notStartedMessage = page.getByText(/event has not started yet/i);
    await expect(notStartedMessage).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();

    const drawerMessage = page.getByText('This event has not started yet. Rating is not available.');
    await expect(drawerMessage).toBeVisible({ timeout: 5000 });
  });

  test('administrator can start event and regular user can rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    const startButton = page.getByRole('button', { name: 'Start Tasting' });
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    await startButton.click();

    await expect(page.getByText(/Guests are rating/)).toBeVisible({ timeout: 10000 });

    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    await expect(page.getByText(/^Rate /)).toBeVisible({ timeout: 5000 });
  });

  test('started event shows pause and complete options', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const { ok, data } = await changeEventState(eventId, 'started', 'created', token);
    if (!ok) throw new Error(`Failed to start event: ${data}`);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await expect(page.getByRole('button', { name: 'Pause for Reveal' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Complete Event' })).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 – Pause and Resume Event
  // ===================================

  test('administrator can pause started event and regular user cannot rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const { ok, data } = await changeEventState(eventId, 'started', 'created', token);
    if (!ok) throw new Error(`Failed to start event: ${data}`);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    const pauseButton = page.getByRole('button', { name: 'Pause for Reveal' });
    await pauseButton.waitFor({ state: 'visible', timeout: 5000 });
    await pauseButton.click();

    await expect(page.getByText(/Assign.*to item numbers/)).toBeVisible({ timeout: 10000 });

    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.getByText('Event is paused')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    const drawerMessage = page.getByText('This event is currently paused. Rating is not available.');
    await expect(drawerMessage).toBeVisible({ timeout: 5000 });
  });

  test('administrator can resume paused event and regular user can rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const startResult = await changeEventState(eventId, 'started', 'created', token);
    if (!startResult.ok) throw new Error(`Failed to start event: ${startResult.data}`);

    const pauseResult = await changeEventState(eventId, 'paused', 'started', token);
    if (!pauseResult.ok) throw new Error(`Failed to pause event: ${pauseResult.data}`);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    // Resume is a backward transition — requires confirmation
    const resumeButton = page.getByRole('button', { name: 'Resume Tasting' });
    await resumeButton.waitFor({ state: 'visible', timeout: 5000 });
    await resumeButton.click();

    // Confirm in alert dialog
    const confirmButton = page.getByRole('button', { name: 'Resume Tasting' }).last();
    await confirmButton.waitFor({ state: 'visible', timeout: 3000 });
    await confirmButton.click();

    await expect(page.getByText(/Guests are rating/)).toBeVisible({ timeout: 10000 });

    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    await expect(page.getByText(/^Rate /)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 3 – Complete an Event
  // ===================================

  test('administrator can complete started event and regular user can view details', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const { ok, data } = await changeEventState(eventId, 'started', 'created', token);
    if (!ok) throw new Error(`Failed to start event: ${data}`);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    const completeButton = page.getByRole('button', { name: 'Complete Event' });
    await completeButton.waitFor({ state: 'visible', timeout: 5000 });
    await completeButton.click();

    await expect(page.getByText(/The event is over/)).toBeVisible({ timeout: 10000 });

    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.getByText('Tap a number to view details')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    await expect(page.getByRole('heading', { name: /1.*details/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ratings Distribution')).toBeVisible({ timeout: 5000 });
  });

  test('administrator can complete paused event and regular user can view details', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const startResult = await changeEventState(eventId, 'started', 'created', token);
    if (!startResult.ok) throw new Error(`Failed to start event: ${startResult.data}`);

    const pauseResult = await changeEventState(eventId, 'paused', 'started', token);
    if (!pauseResult.ok) throw new Error(`Failed to pause event: ${pauseResult.data}`);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    const completeButton = page.getByRole('button', { name: 'Announce Results' });
    await completeButton.waitFor({ state: 'visible', timeout: 5000 });
    await completeButton.click();

    await expect(page.getByText(/The event is over/)).toBeVisible({ timeout: 10000 });

    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.getByText('Tap a number to view details')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    await expect(page.getByRole('heading', { name: /1.*details/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ratings Distribution')).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 4 – Resume Completed Event
  // ===================================

  test('administrator can reopen completed event and regular user can rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const startResult = await changeEventState(eventId, 'started', 'created', token);
    if (!startResult.ok) throw new Error(`Failed to start event: ${startResult.data}`);

    const completeResult = await changeEventState(eventId, 'completed', 'started', token);
    if (!completeResult.ok) throw new Error(`Failed to complete event: ${completeResult.data}`);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    // Reopen is a backward transition — requires confirmation
    const reopenButton = page.getByRole('button', { name: 'Reopen Tasting' });
    await reopenButton.waitFor({ state: 'visible', timeout: 5000 });
    await reopenButton.click();

    const confirmButton = page.getByRole('button', { name: 'Reopen Tasting' }).last();
    await confirmButton.waitFor({ state: 'visible', timeout: 3000 });
    await confirmButton.click();

    await expect(page.getByText(/Guests are rating/)).toBeVisible({ timeout: 10000 });

    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    await expect(page.getByText(/^Rate /)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('created state shows only Start Tasting button', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await expect(page.getByRole('button', { name: 'Start Tasting' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Pause for Reveal' })).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Complete Event' })).not.toBeVisible({ timeout: 3000 });
  });

  test('stepper shows current phase label', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    const stepper = page.getByRole('list', { name: 'Event progress' });
    await expect(stepper).toBeVisible({ timeout: 5000 });
    await expect(stepper.getByText('Setup')).toBeVisible();
    await expect(stepper.getByText('Tasting')).toBeVisible();
    await expect(stepper.getByText('Reveal')).toBeVisible();
    await expect(stepper.getByText('Results')).toBeVisible();
  });

  test('state change is reflected in the stepper context', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    const result = await changeEventState(eventId, 'started', 'created', token);
    if (!result.ok) throw new Error(`Failed to start event: ${result.data}`);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await expect(page.getByText(/Guests are rating/)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // Guardrail notes
  // ===================================

  test('stepper shows guardrail info when no bottles registered and Start works in one click', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    await expect(page.getByText(/No.*registered yet/)).toBeVisible({ timeout: 5000 });

    const startButton = page.getByRole('button', { name: 'Start Tasting' });
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    await expect(page.getByText(/Guests are rating/)).toBeVisible({ timeout: 10000 });
  });

  test('rating is available immediately after navigating from admin page to event page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    const startButton = page.getByRole('button', { name: 'Start Tasting' });
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    await startButton.click();

    await expect(page.getByText(/Guests are rating/)).toBeVisible({ timeout: 10000 });

    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.click();

    const backToEvent = page.getByRole('menuitem', { name: 'Back to Event' });
    await expect(backToEvent).toBeVisible({ timeout: 5000 });
    await backToEvent.click();

    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    await expect(page.getByText(/^Rate /)).toBeVisible({ timeout: 5000 });
  });
});
