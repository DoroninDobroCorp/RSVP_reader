const { test, expect } = require("@playwright/test");

test("release tests use the owned marked server instead of port 8081", async ({ request, baseURL }) => {
  const expectedPort = String(process.env.HUMMINGREAD_TEST_PORT || 43181);
  expect(new URL(baseURL).port).toBe(expectedPort);
  const marker = await request.get("/__hummingread_test__/marker");
  expect(marker.ok()).toBe(true);
  expect(await marker.json()).toEqual({ marker: "playwright-r2" });
  const page = await request.get("/");
  expect(page.ok()).toBe(true);
  expect(await page.text()).toContain("HummingRead");
});
