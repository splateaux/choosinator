import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: [
    ["html"],
    ["list"], // Add list reporter for better console output
  ],
  // Remove isolation settings to identify real issues
  // workers: 1, // Run tests serially to avoid conflicts
  // retries: 0, // Don't retry failed tests
  use: {
    actionTimeout: 0,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3333",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Remove webServer config to prevent hangs
  // You'll need to start the dev server manually before running tests
});
