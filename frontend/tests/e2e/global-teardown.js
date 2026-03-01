/**
 * Global Teardown for Playwright E2E Tests
 * 
 * Cleans up all test events after the test run completes.
 * Uses the test API to delete events (no direct filesystem access).
 * 
 * Cleanup strategy:
 * 1. Delete tracked UI-created events via API, then clear the tracking file
 * 2. Bulk-cleanup TEST* events via API (catch-all)
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
  
  let trackedEventsDeleted = 0;

  // Step 1: Clean up tracked UI-created events via API
  if (existsSync(TRACKING_FILE)) {
    try {
      const tracked = [...new Set(
        readFileSync(TRACKING_FILE, 'utf-8')
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
    } catch (error) {
      console.warn(`[E2E Cleanup] Error processing tracking file: ${error.message}`);
    } finally {
      try { unlinkSync(TRACKING_FILE); } catch { /* already gone */ }
    }
  }

  // Step 2: Bulk-cleanup TEST* events via API (catch-all)
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
