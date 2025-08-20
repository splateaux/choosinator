import { installGlobals } from "@remix-run/node";
import "@testing-library/jest-dom/vitest";

// Set required environment variables for tests
// Use unique session secret for each test run to prevent conflicts
process.env.SESSION_SECRET = `test-session-secret-${Date.now()}-${Math.random()}`;

// Ensure test environment is properly set
process.env.NODE_ENV = "test";
process.env.ARC_ENV = "testing";

installGlobals();
