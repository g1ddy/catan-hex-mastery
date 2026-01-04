import { defineConfig, devices } from '@playwright/test';

// Unique port for screenshot generation to avoid conflicts
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}/catan-hex-mastery/`;

export default defineConfig({
  // Point specifically to the documentation scripts
  testDir: '../docs/scripts',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    // We can add Mobile Chrome here if needed, but the script handles viewport resizing explicitly
  ],

  webServer: {
    // Run preview on the custom port
    command: `npm run preview -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    cwd: '..',
    timeout: 120 * 1000,
  },
});
