/**
 * Playwright Test Fixtures
 * 
 * Provides isolated test fixtures for each test, enabling full parallelism.
 * Each test gets its own testEvent that is automatically created and cleaned up.
 */

import { test as base } from '@playwright/test';
import { createTestEvent, deleteTestEvent } from './helpers.js';
import { DEFAULT_TEST_PIN } from '../e2e-config.js';

/**
 * Sanitize event name to only contain allowed characters
 */
function sanitizeEventName(name) {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50);
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend({
  /**
   * testEvent fixture - provides an isolated event for each test
   * 
   * Usage:
   *   test('my test', async ({ page, testEvent }) => {
   *     const { eventId, pin } = testEvent;
   *     // ... test code
   *   });
   * 
   * The event is automatically cleaned up after the test completes.
   */
  testEvent: async ({}, use, testInfo) => {
    const eventName = sanitizeEventName(`Test ${testInfo.title}`);
    const pin = DEFAULT_TEST_PIN;
    
    const eventId = await createTestEvent(eventName, pin);
    
    await use({ eventId, pin });
    
    try {
      await deleteTestEvent(eventId);
    } catch (error) {
      console.warn(`Cleanup warning for event ${eventId}: ${error.message}`);
    }
  },
});

/**
 * Re-export expect from Playwright for convenience
 */
export { expect } from '@playwright/test';
