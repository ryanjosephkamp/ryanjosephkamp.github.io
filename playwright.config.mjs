import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web-qa",
  outputDir: ".ai/design/v2-tooling-qa/test-results",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4179",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run serve",
    reuseExistingServer: true,
    timeout: 120000,
    url: "http://127.0.0.1:4179",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
