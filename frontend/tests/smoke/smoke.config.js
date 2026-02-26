import { defineConfig } from '@playwright/test';

const APP_URL = process.env.APP_URL?.replace(/\/$/, '');
if (!APP_URL) {
  throw new Error(
    'APP_URL environment variable is required.\n' +
    'Usage: APP_URL=https://your-app.com SMOKE_EMAIL=you@example.com npx playwright test --config tests/smoke/smoke.config.js'
  );
}

export default defineConfig({
  testDir: '.',
  testMatch: 'smoke.spec.js',
  timeout: 30_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: APP_URL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'smoke-report' }],
  ],
});
