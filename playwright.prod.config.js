const { defineConfig, devices } = require('@playwright/test');

const productionUrl = process.env.PACEFLOW_PRODUCTION_URL
  || 'https://145.239.82.124.sslip.io/rsvp/';

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
