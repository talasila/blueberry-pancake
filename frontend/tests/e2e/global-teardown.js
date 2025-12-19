/**
 * Global Teardown for Playwright E2E Tests
 * 
 * Cleans up all test events after the test run completes.
 * 
 * Cleanup strategy:
 * 1. Delete all TEST* directories (created by test helper API)
 * 2. Delete any tracked UI-created events
 * 3. Clear the tracking file
 */

import { rmSync, readdirSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export default async function globalTeardown() {
  console.log('\n[E2E Cleanup] Starting post-test cleanup...');
  
  const projectRoot = join(process.cwd(), '..');
  const eventsDir = join(projectRoot, 'data', 'events');
  const trackingFile = join(projectRoot, '.e2e-tracked-events.json');
  
  let testEventsDeleted = 0;
  let trackedEventsDeleted = 0;
  
  // 1. Delete all TEST* directories
  if (existsSync(eventsDir)) {
    try {
      const entries = readdirSync(eventsDir);
      const testDirs = entries.filter(name => name.startsWith('TEST'));
      
      for (const dir of testDirs) {
        const dirPath = join(eventsDir, dir);
        try {
          rmSync(dirPath, { recursive: true, force: true });
          testEventsDeleted++;
        } catch (error) {
          console.warn(`[E2E Cleanup] Failed to delete ${dir}: ${error.message}`);
        }
      }
      
      if (testEventsDeleted > 0) {
        console.log(`[E2E Cleanup] Deleted ${testEventsDeleted} TEST* events`);
      }
    } catch (error) {
      console.warn(`[E2E Cleanup] Error reading events directory: ${error.message}`);
    }
  }
  
  // 2. Delete tracked UI-created events
  if (existsSync(trackingFile)) {
    try {
      const tracked = JSON.parse(readFileSync(trackingFile, 'utf-8'));
      
      for (const eventId of tracked) {
        // Skip TEST* events (already handled above)
        if (eventId.startsWith('TEST')) continue;
        
        const eventPath = join(eventsDir, eventId);
        if (existsSync(eventPath)) {
          try {
            rmSync(eventPath, { recursive: true, force: true });
            trackedEventsDeleted++;
          } catch (error) {
            console.warn(`[E2E Cleanup] Failed to delete tracked event ${eventId}: ${error.message}`);
          }
        }
      }
      
      if (trackedEventsDeleted > 0) {
        console.log(`[E2E Cleanup] Deleted ${trackedEventsDeleted} tracked UI-created events`);
      }
      
      // 3. Clear the tracking file
      unlinkSync(trackingFile);
    } catch (error) {
      console.warn(`[E2E Cleanup] Error processing tracking file: ${error.message}`);
    }
  }
  
  const total = testEventsDeleted + trackedEventsDeleted;
  if (total === 0) {
    console.log('[E2E Cleanup] No test events to clean up');
  }
  
  console.log('[E2E Cleanup] Complete\n');
}
