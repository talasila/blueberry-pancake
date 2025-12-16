import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Supports mobile viewports and multiple browsers
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: false, // Run tests sequentially due to test data dependencies
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid test data conflicts
  reporter: 'html',
  timeout: 60000, // 60 seconds per test
  
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
