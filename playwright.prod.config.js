const { defineConfig, devices } = require('@playwright/test');

const productionUrl = process.env.HUMMINGREAD_SMOKE_URL;
const expectedChannel = process.env.HUMMINGREAD_EXPECTED_CHANNEL;
if (!productionUrl || !['tester-preview', 'production'].includes(expectedChannel)) {
  throw new Error(
    'Set HUMMINGREAD_SMOKE_URL and HUMMINGREAD_EXPECTED_CHANNEL=tester-preview|production explicitly.'
  );
}

module.exports = defineConfig({
  testDir: './tests-prod',
  testMatch: '**/production-smoke.spec.js',
  timeout: 45000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: productionUrl,
    extraHTTPHeaders: {
      'X-HummingRead-Smoke-Expected-Channel': expectedChannel
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'production-chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'production-mobile-safari',
      use: { ...devices['iPhone 13'] }
    }
  ]
});
