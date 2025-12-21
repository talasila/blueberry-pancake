import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Supports mobile viewports and multiple browsers
 * 
 * Full parallelism is enabled - each test uses isolated fixtures.
 * Tests create their own events via the testEvent fixture in fixtures.js.
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true, // Tests run in parallel - each test has isolated fixtures
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 12, // Auto-detect CPU cores
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
