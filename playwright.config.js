const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  webServer: {
    command: 'node server.js',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120000,
  },
  
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      testIgnore: '**/test-offline-production.spec.js',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-safari',
      testIgnore: '**/test-offline-production.spec.js',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
