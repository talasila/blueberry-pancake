/**
 * Global Setup for Playwright E2E Tests
 * 
 * Runs before all tests to:
 * 1. Verify backend and frontend are reachable
 * 2. Reset the TEST#### counter on the backend
 * 3. Clear any leftover tracking files
 */

import { existsSync, unlinkSync } from 'fs';
import { BASE_URL, API_URL, TRACKING_FILE } from './e2e-config.js';

export default async function globalSetup() {
  console.log('\n[E2E Setup] Initializing test environment...');
  
  // 1. Verify backend is reachable
  try {
    const response = await fetch(`${API_URL}/api/test/reset-counter`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });
    
    if (response.ok) {
      console.log('[E2E Setup] Backend reachable, test endpoint reset');
    } else {
      throw new Error(`[E2E Setup] Backend test endpoint failed: ${response.status}`);
    }
  } catch (error) {
    if (error instanceof TypeError || error.name === 'AbortError') {
      console.error('[E2E Setup] Backend is not running on', API_URL);
      throw new Error(`E2E Setup failed: backend unreachable at ${API_URL}. ${error.message}`);
    }
    throw error;
  }

  // 2. Verify frontend is reachable
  try {
    const frontendResp = await fetch(BASE_URL, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    if (!frontendResp.ok) {
      throw new Error(`Frontend returned ${frontendResp.status}`);
    }
    console.log('[E2E Setup] Frontend is reachable at', BASE_URL);
  } catch (error) {
    console.error('[E2E Setup] Frontend is not running on', BASE_URL);
    throw new Error(`E2E Setup failed: frontend unreachable at ${BASE_URL}. ${error.message}`);
  }
  
  // 3. Clear any leftover tracking file from previous runs
  if (existsSync(TRACKING_FILE)) {
    try {
      unlinkSync(TRACKING_FILE);
      console.log('[E2E Setup] Cleared leftover tracking file');
    } catch (error) {
      console.warn('[E2E Setup] Failed to clear tracking file:', error.message);
    }
  }
  
  console.log('[E2E Setup] Ready\n');
}
