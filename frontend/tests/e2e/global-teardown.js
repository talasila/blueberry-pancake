/**
 * Global Teardown for Playwright E2E Tests
 * 
 * Cleans up all test events after the test run completes.
 * Uses the test API to delete events (no direct filesystem access).
 * 
 * Cleanup strategy:
 * 1. Delete all TEST* events via API
 * 2. Delete any tracked UI-created events via API
 * 3. Clear the tracking file
 */

import { existsSync, readFileSync, unlinkSync } from 'fs';
import { API_URL, TRACKING_FILE } from './e2e-config.js';

async function deleteEventViaAPI(eventId) {
  try {
    const response = await fetch(`${API_URL}/api/test/events/${eventId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch (error) {
    console.warn(`[E2E Cleanup] Failed to delete event ${eventId}: ${error.message}`);
    return false;
  }
}

export default async function globalTeardown() {
  console.log('\n[E2E Cleanup] Starting post-test cleanup...');
  
  const trackingFile = TRACKING_FILE;
  
  let trackedEventsDeleted = 0;

  // 1. Clean up tracked UI-created events via API
  if (existsSync(trackingFile)) {
    try {
      const tracked = [...new Set(
        readFileSync(trackingFile, 'utf-8')
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
      )];
      
      const results = await Promise.all(tracked.map(eventId => deleteEventViaAPI(eventId)));
      trackedEventsDeleted = results.filter(Boolean).length;
      const failedCount = results.length - trackedEventsDeleted;
      
      if (trackedEventsDeleted > 0) {
        console.log(`[E2E Cleanup] Deleted ${trackedEventsDeleted}/${results.length} tracked events via API`);
      }
      if (failedCount > 0) {
        console.warn(`[E2E Cleanup] Failed to delete ${failedCount} tracked events`);
      }
      
      // 2. Clear the tracking file
      unlinkSync(trackingFile);
    } catch (error) {
      console.warn(`[E2E Cleanup] Error processing tracking file: ${error.message}`);
    }
  }

  // 3. Bulk-cleanup TEST* events via API (catch-all)
  try {
    const response = await fetch(`${API_URL}/api/test/cleanup`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      console.log(`[E2E Cleanup] Bulk API cleanup: ${data.deleted ?? 0} TEST* events`);
    }
  } catch (error) {
    console.warn(`[E2E Cleanup] Bulk cleanup endpoint failed: ${error.message}`);
  }
  
  if (trackedEventsDeleted === 0) {
    console.log('[E2E Cleanup] No tracked events to clean up');
  }
  
  console.log('[E2E Cleanup] Complete\n');
}
