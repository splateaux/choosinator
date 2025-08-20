/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/setup-test-env.ts"],
    include: ["app/**/*.test.ts", "app/**/*.test.tsx", "test/**/*.test.ts"],
    exclude: [
      "node_modules/**/*",
      "server/node_modules/**/*",
      "**/*.spec.ts",
      "**/*.spec.js",
      "tests/**/*",
      "**/node_modules/**/*",
      "**/dist/**/*",
      "**/build/**/*",
    ],
  },
});
