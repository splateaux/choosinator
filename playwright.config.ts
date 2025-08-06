import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/*.test.ts", "**/test/**"],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: "html",
  use: {
    actionTimeout: 0,
    baseURL: "http://localhost:3334",
    trace: "on-first-retry",
  },
});
