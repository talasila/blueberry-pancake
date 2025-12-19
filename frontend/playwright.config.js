import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Supports mobile viewports and multiple browsers
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: false, // Tests within a file run sequentially (they share testEventId)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined, // Auto-detect CPU cores for file-level parallelism
  reporter: 'html',
  timeout: 60000, // 60 seconds per test
  
  // Global setup/teardown for test event cleanup
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Mobile-first testing (default viewport)
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],

  // Note: Start frontend (port 3000) and backend (port 3001) manually before running tests
});
