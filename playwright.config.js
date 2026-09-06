const { defineConfig, devices } = require("@playwright/test");

const testPort = Number(process.env.HUMMINGREAD_TEST_PORT || process.env.PORT || 43181);
const testHost = process.env.HUMMINGREAD_TEST_HOST || process.env.HOST || "127.0.0.1";
const testMarker = process.env.HUMMINGREAD_TEST_MARKER || "playwright-r2";
const testOrigin = process.env.PLAYWRIGHT_BASE_URL || `http://${testHost}:${testPort}`;

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 45000,
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  workers: Number(process.env.PLAYWRIGHT_WORKERS || 6),
  reporter: "list",

  ...(process.env.PLAYWRIGHT_BASE_URL ? {} : {
    webServer: {
      command: `HOST=${testHost} PORT=${testPort} HUMMINGREAD_TEST_MARKER=${testMarker} node server.js`,
      url: `${testOrigin}/__hummingread_test__/marker`,
      reuseExistingServer: false,
      timeout: 60000,
    }
  }),

  use: {
    baseURL: testOrigin,
    trace: "off",
    screenshot: "off",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testIgnore: "**/test-offline-production.spec.js",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-safari",
      testIgnore: "**/test-offline-production.spec.js",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
