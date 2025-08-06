import { installGlobals } from "@remix-run/node";
import "@testing-library/jest-dom/vitest";

// Set required environment variables for tests
process.env.SESSION_SECRET = "test-session-secret";

installGlobals();
