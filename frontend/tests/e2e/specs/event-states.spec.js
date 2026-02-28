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
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
  changeEventState,
  BASE_URL,
} from './helpers.js';

test.describe('Event State Management', () => {

  // ===================================
  // User Story 1 - Start an Event
  // ===================================

  test('new event is in "created" state and regular user cannot rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    // Access event as regular user via PIN
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should see "Event has not started yet" message on main page
    const notStartedMessage = page.getByText(/event has not started yet/i);
    await expect(notStartedMessage).toBeVisible();
    
    // Click on one of the 20 bottle items to try rating
    const bottleItem = page.locator('button').filter({ hasText: /^1$/ }).first();
    await bottleItem.click();
    
    // Drawer should open with message that rating is not available
    const drawerMessage = page.getByText('This event has not started yet. Rating is not available.');
    await expect(drawerMessage).toBeVisible();
  });

  test('administrator can start event and regular user can rate', async ({ page, testEvent }) => {
    const { eventId, pin } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    // Admin starts the event
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Click the State button to expand options
    const stateButton = page.getByRole('button', { name: /state.*created/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    // Click start button — use JS click to handle mobile viewport where dropdown animation
    // may leave the button below the fold momentarily
    const startButton = page.getByRole('button', { name: /start/i });
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click({ timeout: 5000 });
    
    // Event should now be started
    const stateIndicator = page.getByRole('button', { name: /state.*started/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    // Now login as regular user via PIN
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should see "Tap a number to rate" message
    const rateMessage = page.getByText('Tap a number to rate');
    await expect(rateMessage).toBeVisible();
    
    // Click on a bottle item to open rating drawer
    const bottleItem = page.locator('button').filter({ hasText: /^1$/ }).first();
    await bottleItem.click();
    
    // Drawer should open with rating selector
    const ratingSelector = page.getByText(/select a rating/i);
    await expect(ratingSelector).toBeVisible();
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
    
    // Now pause and complete buttons should be visible
    const pauseButton = page.getByRole('button', { name: /pause/i });
    const completeButton = page.getByRole('button', { name: /complete|finish/i });
    
    await expect(pauseButton).toBeVisible();
    await expect(completeButton).toBeVisible();
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
    
    const pauseButton = page.getByRole('button', { name: /pause/i });
    await pauseButton.waitFor({ state: 'visible', timeout: 5000 });
    await pauseButton.scrollIntoViewIfNeeded();
    await pauseButton.click({ timeout: 5000 });
    
    // Event should now be paused
    const stateIndicator = page.getByRole('button', { name: /state.*paused/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    // Now login as regular user via PIN
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should see "Event is paused" message on main page
    const pausedMessage = page.getByText('Event is paused');
    await expect(pausedMessage).toBeVisible();
    
    // Click on a bottle item to try rating
    const bottleItem = page.locator('button').filter({ hasText: /^1$/ }).first();
    await bottleItem.click();
    
    // Drawer should open with message that rating is not available
    const drawerMessage = page.getByText('This event is currently paused. Rating is not available.');
    await expect(drawerMessage).toBeVisible();
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
    
    const startButton = page.getByRole('button', { name: /start|resume/i });
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click({ timeout: 5000 });
    
    // Event should now be started again
    const stateIndicator = page.getByRole('button', { name: /state.*started/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    // Now login as regular user via PIN
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should see "Tap a number to rate" message
    const rateMessage = page.getByText('Tap a number to rate');
    await expect(rateMessage).toBeVisible();
    
    // Click on a bottle item to open rating drawer
    const bottleItem = page.locator('button').filter({ hasText: /^1$/ }).first();
    await bottleItem.click();
    
    // Drawer should open with rating selector
    const ratingSelector = page.getByText(/select a rating/i);
    await expect(ratingSelector).toBeVisible();
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
    
    const completeButton = page.getByRole('button', { name: /complete|finish/i });
    await completeButton.waitFor({ state: 'visible', timeout: 5000 });
    await completeButton.scrollIntoViewIfNeeded();
    await completeButton.click({ timeout: 5000 });
    
    // Event should now be completed
    const stateIndicator = page.getByRole('button', { name: /state.*(completed|finished)/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    // Now login as regular user via PIN
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should see "Tap a number to view details" message
    const viewDetailsMessage = page.getByText('Tap a number to view details');
    await expect(viewDetailsMessage).toBeVisible();
    
    // Click on a bottle item to view details
    const bottleItem = page.locator('button').filter({ hasText: /^1$/ }).first();
    await bottleItem.click();
    
    // Drawer should open with header containing number and "Details"
    const drawerHeader = page.getByRole('heading', { name: /1.*details/i });
    await expect(drawerHeader).toBeVisible();
    
    // Should show Ratings Distribution section
    const ratingsDistribution = page.getByText('Ratings Distribution');
    await expect(ratingsDistribution).toBeVisible();
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
    
    const completeButton = page.getByRole('button', { name: /complete|finish/i });
    await completeButton.waitFor({ state: 'visible', timeout: 5000 });
    await completeButton.scrollIntoViewIfNeeded();
    await completeButton.click({ timeout: 5000 });
    
    // Event should now be completed
    const stateIndicator = page.getByRole('button', { name: /state.*(completed|finished)/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    // Now login as regular user via PIN
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should see "Tap a number to view details" message
    const viewDetailsMessage = page.getByText('Tap a number to view details');
    await expect(viewDetailsMessage).toBeVisible();
    
    // Click on a bottle item to view details
    const bottleItem = page.locator('button').filter({ hasText: /^1$/ }).first();
    await bottleItem.click();
    
    // Drawer should open with header containing number and "Details"
    const drawerHeader = page.getByRole('heading', { name: /1.*details/i });
    await expect(drawerHeader).toBeVisible();
    
    // Should show Ratings Distribution section
    const ratingsDistribution = page.getByText('Ratings Distribution');
    await expect(ratingsDistribution).toBeVisible();
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
    
    const startButton = page.getByRole('button', { name: /start|reopen/i });
    await startButton.waitFor({ state: 'visible', timeout: 5000 });
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click({ timeout: 5000 });
    
    // Event should now be started again
    const stateIndicator = page.getByRole('button', { name: /state.*started/i });
    await expect(stateIndicator).toBeVisible({ timeout: 10000 });
    
    // Now login as regular user via PIN
    await clearAuth(page);
    await page.goto(`${BASE_URL}/event/${eventId}`);
    await submitEmail(page, 'user@example.com');
    await enterAndSubmitPIN(page, pin);
    
    // Should be on main event page
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}$`));
    
    // Should see "Tap a number to rate" message
    const rateMessage = page.getByText('Tap a number to rate');
    await expect(rateMessage).toBeVisible();
    
    // Click on a bottle item to open rating drawer
    const bottleItem = page.locator('button').filter({ hasText: /^1$/ }).first();
    await bottleItem.click();
    
    // Drawer should open with rating selector
    const ratingSelector = page.getByText(/select a rating/i);
    await expect(ratingSelector).toBeVisible();
  });

  // ===================================
  // Edge Cases
  // ===================================

  test('only valid state transitions are shown', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    const stateButton = page.getByRole('button', { name: /state.*created/i });
    await stateButton.scrollIntoViewIfNeeded();
    await stateButton.click();
    
    const startButton = page.getByRole('button', { name: /start/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    
    const pauseButton = page.getByRole('button', { name: /^pause$/i });
    const completeButton = page.getByRole('button', { name: /complete|finish/i });
    await expect(pauseButton).not.toBeVisible();
    await expect(completeButton).not.toBeVisible();
  });

  test('state indicator shows current state clearly', async ({ page, testEvent }) => {
    const { eventId } = testEvent;
    const adminEmail = 'admin@example.com';
    const token = await addAdminToEvent(eventId, adminEmail);
    
    await setAuthToken(page, token, adminEmail);
    await page.goto(`${BASE_URL}/event/${eventId}/admin`);
    
    // Newly created events should specifically show "created" state
    const createdStateText = page.getByText(/created/i);
    await expect(createdStateText.first()).toBeVisible({ timeout: 5000 });
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
    await expect(stateButton).toContainText(/started/i);
  });
});
