import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Supports mobile viewports and multiple browsers
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mobile viewports (320px-768px focus)
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['iPhone 12'], // 390x844 (within 320-768px range)
        viewport: { width: 375, height: 667 }, // iPhone SE size
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 },
      },
    },
    // Desktop for completeness
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
