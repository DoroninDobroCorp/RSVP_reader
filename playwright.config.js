const { defineConfig, devices } = require('@playwright/test');

const testPort = Number(process.env.HUMMINGREAD_TEST_PORT || 43181);
const testMarker = process.env.HUMMINGREAD_TEST_MARKER || 'playwright-r2';
const testOrigin = `http://127.0.0.1:${testPort}`;

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
    command: `HOST=127.0.0.1 PORT=${testPort} HUMMINGREAD_TEST_MARKER=${testMarker} node server.js`,
    url: `${testOrigin}/__hummingread_test__/marker`,
    reuseExistingServer: false,
    timeout: 120000,
  },
  
  use: {
    baseURL: testOrigin,
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
