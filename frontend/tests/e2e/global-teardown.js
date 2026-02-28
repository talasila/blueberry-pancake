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
import { join } from 'path';
import { API_URL } from './e2e-config.js';

async function deleteEventViaAPI(eventId) {
  try {
    const response = await fetch(`${API_URL}/api/test/events/${eventId}`, { method: 'DELETE' });
    return response.ok;
  } catch (error) {
    console.warn(`[E2E Cleanup] Failed to delete event ${eventId}: ${error.message}`);
    return false;
  }
}

export default async function globalTeardown() {
  console.log('\n[E2E Cleanup] Starting post-test cleanup...');
  
  const projectRoot = join(process.cwd(), '..');
  const trackingFile = join(projectRoot, '.e2e-tracked-events.json');
  
  let trackedEventsDeleted = 0;

  // 1. Clean up tracked UI-created events via API
  if (existsSync(trackingFile)) {
    try {
      const tracked = readFileSync(trackingFile, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      
      const results = await Promise.all(tracked.map(eventId => deleteEventViaAPI(eventId)));
      trackedEventsDeleted = results.filter(Boolean).length;
      
      if (trackedEventsDeleted > 0) {
        console.log(`[E2E Cleanup] Deleted ${trackedEventsDeleted} tracked events via API`);
      }
      
      // 2. Clear the tracking file
      unlinkSync(trackingFile);
    } catch (error) {
      console.warn(`[E2E Cleanup] Error processing tracking file: ${error.message}`);
    }
  }

  // 3. Bulk-cleanup TEST* events via API (catch-all)
  try {
    const response = await fetch(`${API_URL}/api/test/cleanup`, { method: 'POST' });
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
