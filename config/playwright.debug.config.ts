import { defineConfig, devices } from '@playwright/test';

// Use the Dev Server port and base URL, allow override via env var
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173/catan-hex-mastery/';

export default defineConfig({
  testDir: '../debug-tests',
  // Match all specs in the debug-tests folder
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Run the dev server instead of preview
    command: 'npm run dev',
    cwd: '..',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
