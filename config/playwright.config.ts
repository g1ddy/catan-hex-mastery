import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:4173/catan-hex-mastery/';

export default defineConfig({
  testDir: '../tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12 Pro'],
        // Emulate mobile viewport behavior
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'iPad Pro 12.9 Landscape',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 1366, height: 1024 },
      },
    },
  ],
  webServer: {
    command: 'npm run preview',
    cwd: '..',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
