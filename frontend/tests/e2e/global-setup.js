/**
 * Global Setup for Playwright E2E Tests
 * 
 * Runs before all tests to:
 * 1. Reset the TEST#### counter on the backend
 * 2. Clear any leftover tracking files
 */

import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export default async function globalSetup() {
  console.log('\n[E2E Setup] Initializing test environment...');
  
  const projectRoot = join(process.cwd(), '..');
  const trackingFile = join(projectRoot, '.e2e-tracked-events.json');
  
  // 1. Reset the TEST#### counter on the backend
  try {
    const response = await fetch(`${API_URL}/api/test/reset-counter`, {
      method: 'POST',
    });
    
    if (response.ok) {
      console.log('[E2E Setup] Test event counter reset');
    } else {
      console.warn('[E2E Setup] Failed to reset counter:', response.status);
    }
  } catch (error) {
    console.warn('[E2E Setup] Could not connect to backend to reset counter:', error.message);
    console.warn('[E2E Setup] Make sure the backend is running on', API_URL);
  }
  
  // 2. Clear any leftover tracking file from previous runs
  if (existsSync(trackingFile)) {
    try {
      unlinkSync(trackingFile);
      console.log('[E2E Setup] Cleared leftover tracking file');
    } catch (error) {
      console.warn('[E2E Setup] Failed to clear tracking file:', error.message);
    }
  }
  
  console.log('[E2E Setup] Ready\n');
}
