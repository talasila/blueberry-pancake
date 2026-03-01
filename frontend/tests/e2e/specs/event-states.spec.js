/**
 * Event State Management Tests
 * 
 * Tests the event lifecycle state transitions including
 * start, pause, resume, and complete.
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
  // User Story 1 - Start an Event
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
    
    const stateButton = page.getByRole('button', { name: /state.*created/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const startButton = page.getByRole('button', { name: /^start$/i });
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click({ timeout: 5000 });
    
    const stateIndicator = page.getByRole('button', { name: /state.*started/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });
    
    await page.locator(BOTTLE_1).first().click();
    
    await expect(page.getByText(/select a rating/i)).toBeVisible({ timeout: 5000 });
  });

  test('started event shows pause and complete options', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const { ok, data } = await changeEventState(eventId, 'started', 'created', token);
    if (!ok) throw new Error(`Failed to start event: ${data}`);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click the State button to expand options
    const stateButton = page.getByRole('button', { name: /state.*started/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const pauseButton = page.getByRole('button', { name: /^pause$/i });
    const completeButton = page.getByRole('button', { name: /^(complete|finish)$/i });
    
    await expect(pauseButton).toBeVisible({ timeout: 5000 });
    await expect(completeButton).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 2 - Pause and Resume Event
  // ===================================

  test('administrator can pause started event and regular user cannot rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const { ok, data } = await changeEventState(eventId, 'started', 'created', token);
    if (!ok) throw new Error(`Failed to start event: ${data}`);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click the State button to expand options
    const stateButton = page.getByRole('button', { name: /state.*started/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const pauseButton = page.getByRole('button', { name: /^pause$/i });
    await pauseButton.waitFor({ state: 'visible', timeout: 5000 });
    await pauseButton.scrollIntoViewIfNeeded();
    await pauseButton.click({ timeout: 5000 });
    
    const stateIndicator = page.getByRole('button', { name: /state.*paused/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
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
    
    const stateButton = page.getByRole('button', { name: /state.*paused/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const resumeButton = page.getByRole('button', { name: /^(start|resume)$/i });
    await resumeButton.waitFor({ state: 'visible', timeout: 5000 });
    await resumeButton.scrollIntoViewIfNeeded();
    await resumeButton.click({ timeout: 5000 });
    
    const stateIndicator = page.getByRole('button', { name: /state.*started/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });
    
    await page.locator(BOTTLE_1).first().click();
    
    await expect(page.getByText(/select a rating/i)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 3 - Complete an Event
  // ===================================

  test('administrator can complete started event and regular user can view details', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    const { ok, data } = await changeEventState(eventId, 'started', 'created', token);
    if (!ok) throw new Error(`Failed to start event: ${data}`);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    const stateButton = page.getByRole('button', { name: /state.*started/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const completeButton = page.getByRole('button', { name: /^(complete|finish)$/i });
    await completeButton.waitFor({ state: 'visible', timeout: 5000 });
    await completeButton.scrollIntoViewIfNeeded();
    await completeButton.click({ timeout: 5000 });
    
    const stateIndicator = page.getByRole('button', { name: /state.*(completed|finished)/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
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
    
    const stateButton = page.getByRole('button', { name: /state.*paused/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const completeButton = page.getByRole('button', { name: /^(complete|finish)$/i });
    await completeButton.waitFor({ state: 'visible', timeout: 5000 });
    await completeButton.scrollIntoViewIfNeeded();
    await completeButton.click({ timeout: 5000 });
    
    const stateIndicator = page.getByRole('button', { name: /state.*(completed|finished)/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    await expect(page.getByText('Tap a number to view details')).toBeVisible({ timeout: 5000 });
    
    await page.locator(BOTTLE_1).first().click();
    
    await expect(page.getByRole('heading', { name: /1.*details/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ratings Distribution')).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // User Story 4 - Resume Completed Event
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
    
    // Click the State button to expand options
    const stateButton = page.getByRole('button', { name: /state.*(completed|finished)/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const reopenButton = page.getByRole('button', { name: /^(start|reopen)$/i });
    await reopenButton.waitFor({ state: 'visible', timeout: 5000 });
    await reopenButton.scrollIntoViewIfNeeded();
    await reopenButton.click({ timeout: 5000 });
    
    const stateIndicator = page.getByRole('button', { name: /state.*started/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    await loginAsUserToEvent(page, eventId, 'user@example.com', pin);
    
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });
    
    await page.locator(BOTTLE_1).first().click();
    
    await expect(page.getByText(/select a rating/i)).toBeVisible({ timeout: 5000 });
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('created state shows only Start button', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    const stateButton = page.getByRole('button', { name: /state.*created/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const startButton = page.getByRole('button', { name: /^start$/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    
    const pauseButton = page.getByRole('button', { name: /^pause$/i });
    const completeButton = page.getByRole('button', { name: /^(complete|finish)$/i });
    await expect(pauseButton).not.toBeVisible({ timeout: 3000 });
    await expect(completeButton).not.toBeVisible({ timeout: 3000 });
  });

  test('state indicator shows current state clearly', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Newly created events should specifically show "created" state in the state button
    const stateButton = page.getByRole('button', { name: /state.*created/i });
    await expect(stateButton).toBeVisible({ timeout: 5000 });
  });

  test('state change is reflected in event page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Start event
    const result = await changeEventState(eventId, 'started', 'created', token);
    if (!result.ok) throw new Error(`Failed to start event: ${result.data}`);
    
    // Navigate to admin page where state is displayed explicitly
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Admin page shows the state — verify it reads "Started"
    const stateButton = page.getByRole('button', { name: /state/i });
    await expect(stateButton).toBeVisible({ timeout: 5000 });
    await expect(stateButton).toContainText(/started/i, { timeout: 5000 });
  });

  test('rating is available immediately after navigating from admin page to event page', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);

    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);

    // Start the event via admin UI
    const stateButton = page.getByRole('button', { name: /state.*created/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();

    const startButton = page.getByRole('button', { name: /^start$/i });
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click({ timeout: 5000 });

    const stateIndicator = page.getByRole('button', { name: /state.*started/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });

    // Navigate to event/rating page via in-app menu (SPA navigation)
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.click();

    const backToEvent = page.getByRole('menuitem', { name: 'Back to Event' });
    await expect(backToEvent).toBeVisible({ timeout: 5000 });
    await backToEvent.click();

    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));

    // Rating UI should be available immediately (not after a 30s poll)
    await expect(page.getByText('Tap a number to rate')).toBeVisible({ timeout: 5000 });

    await page.locator(BOTTLE_1).first().click();
    await expect(page.getByText(/select a rating/i)).toBeVisible({ timeout: 5000 });
  });
});
