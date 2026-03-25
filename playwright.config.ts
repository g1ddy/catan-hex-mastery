import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  use: {
    baseURL: 'http://localhost:5173/catan-hex-mastery/',
    trace: 'on-first-retry',
  },
});
