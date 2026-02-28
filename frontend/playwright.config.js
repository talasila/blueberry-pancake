import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Playwright configuration for E2E testing
 * Supports mobile viewports and multiple browsers
 * 
 * Full parallelism is enabled - each test uses isolated fixtures.
 * Tests create their own events via the testEvent fixture in fixtures.js.
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 12,
  reporter: 'html',
  timeout: 60000,
  
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
  
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 12'],
      },
    },
  ],
});
