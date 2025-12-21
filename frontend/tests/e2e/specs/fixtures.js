/**
 * Playwright Test Fixtures
 * 
 * Provides isolated test fixtures for each test, enabling full parallelism.
 * Each test gets its own testEvent that is automatically created and cleaned up.
 */

import { test as base } from '@playwright/test';
import { createTestEvent, deleteTestEvent } from './helpers.js';

/**
 * Default PIN for test events
 */
const DEFAULT_TEST_PIN = '654321';

/**
 * Sanitize event name to only contain allowed characters
 * Removes special characters that may cause validation errors
 */
function sanitizeEventName(name) {
  // Replace special characters with spaces, then collapse multiple spaces
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
    // Create a unique event name using sanitized test title for debugging
    const eventName = sanitizeEventName(`Test ${testInfo.title}`);
    const pin = DEFAULT_TEST_PIN;
    
    // Create the event
    const eventId = await createTestEvent(null, eventName, pin);
    
    // Provide the event to the test
    await use({ eventId, pin });
    
    // Cleanup after test completes
    try {
      await deleteTestEvent(eventId);
    } catch (error) {
      // Ignore cleanup errors - event might already be deleted by test
      console.warn(`Cleanup warning for event ${eventId}: ${error.message}`);
    }
  },
});

/**
 * Re-export expect from Playwright for convenience
 */
export { expect } from '@playwright/test';
